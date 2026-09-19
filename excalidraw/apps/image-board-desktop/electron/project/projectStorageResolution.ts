import fs from "node:fs/promises";
import path from "node:path";
import { randomInt } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { ProjectRoom } from "../room/projectRoom";
import type { ProjectRoomSceneElement } from "../../src/shared/projectRoomProtocol";
import {
  updateProjectDocument,
  withProjectDocumentLock,
  type ProjectDocument,
} from "./projectDocument";
import {
  captureLayout,
  mergeExternalLayout,
  type ProjectLayout,
} from "./projectLayout";
import { addNativeRecoveryLinks, recoverImageRecords } from "./projectRecovery";
import { parseProjectImageRecords } from "./projectImageRecords";
import { parseProjectScene } from "./projectReadIntegrity";
import { createMaintenanceBackup, buildProjectManifest } from "../projectFs";
import { writeJsonAtomic, writeTextAtomic } from "./atomicProjectFile";
import { getSceneContentHash } from "../../src/shared/sceneVersion";
import { readOptionalText } from "./projectReconstruction";
const object = (v: unknown): v is ProjectDocument =>
  !!v && typeof v === "object" && !Array.isArray(v);
// Intake retries may advance while the native dialog is open. They do not
// change the choice being reviewed and must be retained by the eventual write.
const sameReviewedDocument = (a: string | null, b: string | null) => {
  if (a === b) return true;
  try {
    const left = JSON.parse(a ?? "null"),
      right = JSON.parse(b ?? "null");
    if (!object(left) || !object(right)) return false;
    const { intake: _a, updatedAt: _at, ...leftReviewed } = left;
    const { intake: _b, updatedAt: _bt, ...rightReviewed } = right;
    return isDeepStrictEqual(leftReviewed, rightReviewed);
  } catch {
    return false;
  }
};
const comparable = (e: ProjectRoomSceneElement | undefined) =>
  e &&
  Object.fromEntries(
    Object.entries(e)
      .filter(
        ([k]) =>
          !["version", "versionNonce", "updated", "customData"].includes(k),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  );
const describe = (e: ProjectRoomSceneElement | undefined) =>
  !e
    ? "不存在"
    : `x=${e.x}, y=${e.y}, ${e.width}×${e.height}, 角度=${e.angle}${
        e.isDeleted ? "（已删除）" : ""
      }${typeof e.text === "string" ? `，文字：${e.text.slice(0, 30)}` : ""}`;
export const previewStorageResolution = async (room: ProjectRoom) => {
  const root = room.identity.canonicalProjectPath;
  const [projectText, sceneText, pendingText] = await Promise.all(
    ["project.json", "scene.excalidraw.json", "cache/scene-commit.json"].map(
      (f) => readOptionalText(path.join(root, f)),
    ),
  );
  const snapshot = room.getSnapshot();
  let document: ProjectDocument | null = null;
  try {
    const value = JSON.parse(projectText ?? "null");
    if (object(value)) document = value;
  } catch {
    /* A valid room can preserve an otherwise lost project. */
  }
  if (
    document &&
    ((document.formatVersion !== undefined && document.formatVersion !== 2) ||
      (document.projectId && document.projectId !== room.identity.projectId))
  )
    throw Error("项目身份或格式不匹配，不能覆盖文件。");
  let native: {
    elements: ProjectRoomSceneElement[];
    [key: string]: unknown;
  } | null = null;
  try {
    const parsed = parseProjectScene(sceneText ?? "");
    if (
      !Array.isArray(parsed.elements) ||
      !parsed.elements.every(
        (e) =>
          object(e) &&
          typeof e.id === "string" &&
          e.id.length > 0 &&
          typeof e.type === "string" &&
          ["x", "y", "width", "height", "angle", "version"].every(
            (k) => typeof e[k] === "number" && Number.isFinite(e[k]),
          ) &&
          e.width >= 0 &&
          e.height >= 0,
      )
    )
      throw Error("无效场景元素");
    if (
      new Set(parsed.elements.map((e) => e.id)).size !== parsed.elements.length
    )
      throw Error("原生场景含重复元素身份");
    native = parsed as {
      elements: ProjectRoomSceneElement[];
      [key: string]: unknown;
    };
  } catch {
    /* The current canvas remains a recoverable version. */
  }
  const completeDocument =
    !!document?.projectId && document.formatVersion === 2;
  document = {
    ...buildProjectManifest(path.basename(root)),
    ...document,
    projectId: room.identity.projectId,
  };
  document.projectId = room.identity.projectId;
  if (!completeDocument || !object(document.imageRecords))
    document.imageRecords = (
      await recoverImageRecords(
        root,
        { elements: snapshot.scene.elements },
        document.imageRecords,
      )
    ).records;
  let external: ReturnType<typeof mergeExternalLayout> | null = null;
  try {
    if (native) {
      external = mergeExternalLayout(
        native.elements,
        native.elements,
        document.layout,
      );
      if (external.issues.length) external = null;
    }
  } catch {
    /* Invalid disk positions can be repaired using the current canvas. */
  }
  const current = new Map(snapshot.scene.elements.map((e) => [e.id, e]));
  const nativeById = new Map(native?.elements.map((e) => [e.id, e]) ?? []);
  const changes = (external?.elements ?? []).flatMap((e) => {
    const local = current.get(e.id);
    current.delete(e.id);
    if (
      JSON.stringify(comparable(local)) === JSON.stringify(comparable(e)) &&
      JSON.stringify(comparable(nativeById.get(e.id))) ===
        JSON.stringify(comparable(e))
    )
      return [];
    return [
      {
        id: e.id,
        current: describe(local),
        external: describe(e),
        native: describe(nativeById.get(e.id)),
      },
    ];
  });
  for (const e of current.values())
    changes.push({
      id: e.id,
      current: describe(e),
      external: "不存在",
      native: "不存在",
    });
  const nativeDiffers =
    !!native &&
    !!external &&
    JSON.stringify(native.elements.map(comparable)) !==
      JSON.stringify(external.elements.map(comparable));
  return {
    nativeDiffers,
    root,
    projectText,
    sceneText,
    pendingText,
    document,
    native: native ?? {
      type: "excalidraw",
      version: 2,
      source: "CoreStudio",
      elements: [],
      appState: {},
      files: {},
    },
    canUpdate: completeDocument && !!native,
    sequence: snapshot.sequence,
    current: snapshot.scene.elements,
    external: external?.elements ?? null,
    changes,
  };
};
export type StorageResolutionPreview = Awaited<
  ReturnType<typeof previewStorageResolution>
>;
export const commitStorageResolution = async (
  room: ProjectRoom,
  preview: StorageResolutionPreview,
  choice: "current" | "external" | "native",
) => {
  if (choice !== "current" && !preview.external)
    throw Error("文件版本不可读取，请保留当前画布或先修复文件。");
  let backupPath = "";
  await room.resolveStorageConflict(preview.sequence, async () => {
    if (room.identity.canonicalProjectPath !== preview.root)
      throw Error("预览后项目位置发生变化，请重试。");
    const check = async () => {
      const current = await Promise.all(
        [
          "project.json",
          "scene.excalidraw.json",
          "cache/scene-commit.json",
        ].map((f) => readOptionalText(path.join(preview.root, f))),
      );
      if (
        !(preview.canUpdate
          ? sameReviewedDocument(current[0], preview.projectText)
          : current[0] === preview.projectText) ||
        current[1] !== preview.sceneText ||
        current[2] !== preview.pendingText
      )
        throw Error("预览后文件发生变化，请重新查看冲突。");
    };
    await check();
    backupPath = await createMaintenanceBackup({
      projectPath: preview.root,
      reason: "resolve-layout-conflict",
    });
    await writeJsonAtomic(path.join(backupPath, "scene-current.json"), {
      ...preview.native,
      elements: preview.current,
    });
    if (preview.pendingText !== null)
      await writeTextAtomic(
        path.join(backupPath, "scene-commit.json"),
        preview.pendingText,
      );
    await check();
    const current = new Map(preview.current.map((e) => [e.id, e]));
    const chosen =
      choice === "current"
        ? preview.current
        : choice === "native"
        ? preview.native.elements
        : preview.external!;
    const ids = new Set(chosen.map((e) => e.id));
    const elements = [
      ...chosen,
      ...preview.current
        .filter((e) => !ids.has(e.id))
        .map((e) => ({ ...e, isDeleted: true })),
    ].map((e) => ({
      ...e,
      version: Math.max(e.version, current.get(e.id)?.version ?? 0) + 1,
      versionNonce: randomInt(0x7fffffff),
    }));
    const scene = addNativeRecoveryLinks(
      { ...preview.native, elements },
      { projectId: preview.document.projectId, name: preview.document.name },
      parseProjectImageRecords(preview.document.imageRecords).imageRecords,
    );
    const next = JSON.stringify(scene, null, 2),
      projectRevision = getSceneContentHash(next);
    const update = (doc: ProjectDocument) => {
      const previous: ProjectLayout | undefined =
        object(doc.layout) && object(doc.layout.elements)
          ? {
              ...doc.layout,
              order: Array.isArray(doc.layout.order) ? doc.layout.order : [],
              elements: { ...doc.layout.elements },
            }
          : undefined;
      if (previous)
        for (const e of elements) {
          const old = previous.elements[e.id];
          if (
            old &&
            (!object(old) ||
              !["x", "y", "width", "height", "angle"].every(
                (k) => typeof old[k] === "number" && Number.isFinite(old[k]),
              ) ||
              old.width < 0 ||
              old.height < 0)
          )
            delete previous.elements[e.id];
        }
      doc.imageRecords = preview.document.imageRecords;
      doc.layout = {
        ...captureLayout(elements, previous),
        sceneHash: projectRevision,
      };
      doc.updatedAt = new Date().toISOString();
    };
    if (preview.canUpdate) {
      await updateProjectDocument(
        preview.root,
        (doc) => {
          if (!sameReviewedDocument(JSON.stringify(doc), preview.projectText))
            throw Error("预览后项目发生变化，请重试。");
          update(doc);
        },
        { before: preview.sceneText!, after: next },
        { discardPending: preview.pendingText },
      );
    } else {
      await withProjectDocumentLock(preview.root, async () => {
        await check();
        if (
          (await readOptionalText(path.join(preview.root, "project.json"))) !==
            preview.projectText ||
          (await readOptionalText(
            path.join(preview.root, "scene.excalidraw.json"),
          )) !== preview.sceneText
        )
          throw Error("修复前文件发生变化，请重试。");
        if (preview.pendingText !== null)
          await fs.unlink(path.join(preview.root, "cache/scene-commit.json"));
        const doc = { ...preview.document };
        update(doc);
        await writeTextAtomic(
          path.join(preview.root, "scene.excalidraw.json"),
          next,
        );
        await writeJsonAtomic(path.join(preview.root, "project.json"), doc);
      });
    }
    return { elements, projectRevision };
  });
  room.publishAssetRecords(
    parseProjectImageRecords(preview.document.imageRecords).imageRecords,
  );
  return backupPath;
};
