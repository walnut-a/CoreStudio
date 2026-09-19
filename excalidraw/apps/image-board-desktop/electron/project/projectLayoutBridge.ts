import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectRoom } from "../room/projectRoom";
import { getSceneContentHash } from "../../src/shared/sceneVersion";
import { captureLayout, mergeExternalLayout } from "./projectLayout";
import { addNativeRecoveryLinks } from "./projectRecovery";
import { parseProjectImageRecords } from "./projectImageRecords";
import { readProjectDocument, updateProjectDocument } from "./projectDocument";

export const synchronizeProjectLayout = async (
  projectPath: string,
  room?: ProjectRoom,
) => {
  const { document } = await readProjectDocument(projectPath);
  if (document.formatVersion !== 2) return;
  if (room && document.projectId !== room.identity.projectId)
    throw new Error("项目身份发生变化，已暂停接纳外部排布，请重新定位项目。");
  const nativeText = await fs.readFile(
    path.join(projectPath, "scene.excalidraw.json"),
    "utf8",
  );
  const native = JSON.parse(nativeText);
  if (!Array.isArray(native.elements))
    throw new Error("原生画布无法读取，已保留原文件。");
  const nativeHash = getSceneContentHash(nativeText);
  if (document.layout?.sceneHash && document.layout.sceneHash !== nativeHash) {
    throw Object.assign(
      new Error("原生画布与整理信息基线不同，已保留两份文件，请检查外部修改。"),
      { code: "PROJECT_STORAGE_DIVERGED" },
    );
  }
  const baseline = native.elements;
  const current = room?.getSnapshot().scene.elements ?? baseline;
  const merged = mergeExternalLayout(baseline, current, document.layout);
  if (room) {
    if (merged.elements.some((e, i) => e !== current[i])) {
      room.applyMaintenanceOperation({
        ...room.identity,
        operationId: randomUUID(),
        baseSequence: room.sequence,
        elements: merged.elements,
      });
      await room.flushPersistence();
      return merged.issues;
    } else if (room.lifecycle === "storage-error") {
      await room.flushPersistence();
      return merged.issues;
    }
    const completed = {
      ...captureLayout(baseline, document.layout),
      sceneHash: nativeHash,
    };
    if (JSON.stringify(completed) !== JSON.stringify(document.layout))
      await updateProjectDocument(projectPath, async (doc) => {
        if (
          JSON.stringify(doc.layout) !== JSON.stringify(document.layout) ||
          (await fs.readFile(
            path.join(projectPath, "scene.excalidraw.json"),
            "utf8",
          )) !== nativeText
        )
          throw new Error("补建整理信息期间项目发生变化，请重试。");
        doc.layout = completed;
      });
    return merged.issues;
  }
  const recoverable = addNativeRecoveryLinks(
    { ...native, elements: merged.elements },
    { projectId: document.projectId, name: document.name },
    parseProjectImageRecords(document.imageRecords).imageRecords,
  );
  const next =
    JSON.stringify(recoverable) !== JSON.stringify(native)
      ? JSON.stringify(recoverable, null, 2)
      : nativeText;
  await updateProjectDocument(
    projectPath,
    async (doc) => {
      if (JSON.stringify(doc.layout) !== JSON.stringify(document.layout))
        throw new Error("整理信息读取期间发生变化。");
      const file = path.join(projectPath, "scene.excalidraw.json");
      if ((await fs.readFile(file, "utf8")) !== nativeText)
        throw new Error("原生画布读取期间发生变化。");
      doc.layout = {
        ...captureLayout(merged.elements, doc.layout),
        sceneHash: getSceneContentHash(next),
      };
    },
    { before: nativeText, after: next },
  );
  return merged.issues;
};

export const createProjectLayoutRuntime = (
  beforeSync?: (room: ProjectRoom) => Promise<void>,
) => {
  const workers = new Map<ProjectRoom, { stop: () => Promise<void> }>();
  return {
    attach(room: ProjectRoom) {
      if (workers.has(room)) return;
      let closed = false,
        busy = false,
        lastSequence = room.sequence,
        lastChanged = Date.now(),
        lastSignature = "",
        lastError = "",
        pending: Promise<unknown> = Promise.resolve();
      const timer = setInterval(() => {
        if (closed || busy) return;
        if (room.sequence !== lastSequence) {
          lastSequence = room.sequence;
          lastChanged = Date.now();
          return;
        }
        if (Date.now() - lastChanged < 500) return;
        busy = true;
        pending = (async () => {
          await beforeSync?.(room);
          const root = room.identity.canonicalProjectPath;
          const stats = await Promise.all(
            ["project.json", "scene.excalidraw.json"].map((f) =>
              fs.stat(path.join(root, f), { bigint: true }),
            ),
          );
          const signature =
            stats
              .map((s) => `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}`)
              .join("/") + `/${room.sequence}`;
          if (signature === lastSignature) return;
          lastSignature = signature;
          const issues = await synchronizeProjectLayout(root, room);
          if (issues?.length)
            throw new Error(
              `整理信息中 ${issues.length} 条记录无效，已隔离；请检查：${issues
                .slice(0, 5)
                .join("、")}`,
            );
          if (lastError) {
            lastError = "";
            room.clearExternalStorageError();
          }
        })()
          .catch((error) => {
            const message =
              error instanceof Error ? error.message : String(error);
            if (message !== lastError) {
              lastError = message;
              room.reportExternalStorageError(new Error(message));
            }
          })
          .finally(() => {
            busy = false;
          });
      }, 1000);
      timer.unref?.();
      workers.set(room, {
        stop: async () => {
          closed = true;
          clearInterval(timer);
          await pending;
        },
      });
    },
    async stop(room: ProjectRoom) {
      const worker = workers.get(room);
      workers.delete(room);
      await worker?.stop();
    },
  };
};
