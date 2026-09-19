import fs from "node:fs/promises";
import path from "node:path";
import { writeJsonAtomic, writeTextAtomic } from "./atomicProjectFile";

export type ProjectDocument = Record<string, any>;
const sections: Record<string, string> = {
  "image-records.json": "imageRecords",
  "image-intake.json": "intake",
};
const sectionBaselines = new WeakMap<object, Record<string, unknown>>();
export const withProjectSectionBaseline = <T extends Record<string, unknown>>(
  value: T,
  baseline: Record<string, unknown>,
): T => {
  sectionBaselines.set(value, baseline);
  return value;
};
const mergeSection = (current: unknown, next: unknown) => {
  if (!object(next)) return next;
  const base = sectionBaselines.get(next);
  if (!base) return next;
  if (!object(current)) throw new Error("项目数据部分无法合并，已保留原件。");
  const result = { ...current };
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    if (JSON.stringify(base[key]) === JSON.stringify(next[key])) continue;
    if (
      JSON.stringify(current[key]) !== JSON.stringify(base[key]) &&
      JSON.stringify(current[key]) !== JSON.stringify(next[key])
    )
      throw Object.assign(new Error(`外部修改与保存冲突：${key}`), {
        code: "PROJECT_STORAGE_DIVERGED",
      });
    if (key in next) result[key] = next[key];
    else delete result[key];
  }
  return result;
};
const reserved = ["imageRecords", "intake", "layout"];
const queues = new Map<string, Promise<unknown>>();
export const withProjectDocumentLock = async <T>(
  root: string,
  work: () => Promise<T>,
): Promise<T> => {
  const key = path.resolve(root),
    previous = queues.get(key) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(work);
  queues.set(key, task);
  try {
    return await task;
  } finally {
    if (queues.get(key) === task) queues.delete(key);
  }
};
const object = (value: unknown): value is ProjectDocument =>
  !!value && typeof value === "object" && !Array.isArray(value);
const sceneCommitFile = (root: string) =>
  path.join(root, "cache", "scene-commit.json");
const recoverSceneCommitUnlocked = async (root: string) => {
  let raw: string;
  try {
    raw = await fs.readFile(sceneCommitFile(root), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  let pending: ProjectDocument;
  try {
    pending = JSON.parse(raw);
    if (
      !object(pending) ||
      pending.schemaVersion !== 1 ||
      !["projectBefore", "projectAfter", "sceneBefore", "sceneAfter"].every(
        (k) => typeof pending[k] === "string",
      )
    )
      throw new Error();
    const before = JSON.parse(pending.projectBefore),
      after = JSON.parse(pending.projectAfter);
    if (
      !object(before) ||
      !object(after) ||
      typeof before.projectId !== "string" ||
      after.projectId !== before.projectId ||
      before.formatVersion !== 2 ||
      after.formatVersion !== 2
    )
      throw new Error();
    for (const text of [pending.sceneBefore, pending.sceneAfter]) {
      const scene = JSON.parse(text);
      if (!object(scene) || !Array.isArray(scene.elements)) throw new Error();
    }
  } catch {
    throw Object.assign(
      new Error(
        "未完成的保存记录无法读取，已保留现场，请检查 cache/scene-commit.json。",
      ),
      { code: "PROJECT_STORAGE_DIVERGED" },
    );
  }
  const projectFile = path.join(root, "project.json"),
    sceneFile = path.join(root, "scene.excalidraw.json");
  const [project, scene] = await Promise.all([
    fs.readFile(projectFile, "utf8"),
    fs.readFile(sceneFile, "utf8"),
  ]);
  if (
    ![pending.projectBefore, pending.projectAfter].includes(project) ||
    ![pending.sceneBefore, pending.sceneAfter].includes(scene)
  )
    throw Object.assign(
      new Error(
        "未完成的保存与外部修改冲突，已保留双方，请检查 cache/scene-commit.json。",
      ),
      { code: "PROJECT_STORAGE_DIVERGED" },
    );
  if (scene !== pending.sceneAfter)
    await writeTextAtomic(sceneFile, pending.sceneAfter);
  if ((await fs.readFile(projectFile, "utf8")) !== project)
    throw Object.assign(new Error("恢复期间项目文件发生外部修改冲突。"), {
      code: "PROJECT_STORAGE_DIVERGED",
    });
  if (project !== pending.projectAfter)
    await writeTextAtomic(projectFile, pending.projectAfter);
  if (
    (await fs.readFile(sceneCommitFile(root), "utf8")) !== raw ||
    (await fs.readFile(projectFile, "utf8")) !== pending.projectAfter ||
    (await fs.readFile(sceneFile, "utf8")) !== pending.sceneAfter
  )
    throw Object.assign(
      new Error("保存完成核验期间发生外部修改冲突，恢复记录已保留。"),
      { code: "PROJECT_STORAGE_DIVERGED" },
    );
  await fs.unlink(sceneCommitFile(root));
};
export const recoverProjectSceneCommit = (root: string) =>
  withProjectDocumentLock(root, () => recoverSceneCommitUnlocked(root));
const compactIntake = (value: unknown) => {
  if (!object(value) || !object(value.entries)) return value;
  return {
    ...value,
    entries: Object.fromEntries(
      Object.entries(value.entries).map(([hash, entry]) => {
        if (
          !object(entry) ||
          entry.phase !== "accepted" ||
          !object(entry.record) ||
          !object(entry.element)
        )
          return [hash, entry];
        const { element, record, ...rest } = entry;
        return [
          hash,
          { ...rest, fileId: record.fileId, elementId: element.id },
        ];
      }),
    ),
  };
};
export const readProjectDocument = async (root: string) => {
  const text = await fs.readFile(path.join(root, "project.json"), "utf8");
  let document: ProjectDocument;
  try {
    document = JSON.parse(text);
    if (!object(document)) throw new Error("项目数据必须是对象。");
  } catch (cause) {
    throw Object.assign(new Error("项目数据无法解析，已保留原文件。"), {
      code: "PROJECT_MANIFEST_INVALID",
      cause,
    });
  }
  if (
    document.formatVersion !== undefined &&
    ![1, 2].includes(document.formatVersion)
  ) {
    throw Object.assign(new Error("无法写入未知版本的项目数据。"), {
      code: "PROJECT_FORMAT_UNSUPPORTED",
    });
  }
  return { document, text };
};
export const updateProjectDocument = async <T>(
  root: string,
  update: (doc: ProjectDocument) => T | Promise<T>,
  scene?: { before: string; after: string },
  resolution?: { discardPending: string | null },
) =>
  withProjectDocumentLock(root, async () => {
    const checkPending = async () => {
      let raw: string | null = null;
      try {
        raw = await fs.readFile(sceneCommitFile(root), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (raw !== resolution?.discardPending)
        throw new Error("预览后待保存记录发生变化，请重新查看冲突。");
    };
    if (resolution) await checkPending();
    else await recoverSceneCommitUnlocked(root);
    const { document, text } = await readProjectDocument(root);
    const result = await update(document),
      file = path.join(root, "project.json");
    if ((await fs.readFile(file, "utf8")) !== text)
      throw Object.assign(
        new Error("项目文件已在外部修改，请重新读取后保存。"),
        { code: "PROJECT_STORAGE_DIVERGED" },
      );
    const next = JSON.stringify(document, null, 2);
    const discardPending = async () => {
      if (!resolution) return;
      await checkPending();
      if (resolution.discardPending !== null)
        await fs.unlink(sceneCommitFile(root));
    };
    if (scene) {
      const sceneFile = path.join(root, "scene.excalidraw.json");
      if ((await fs.readFile(sceneFile, "utf8")) !== scene.before)
        throw Object.assign(new Error("原生画布已在外部修改，保存暂停。"), {
          code: "PROJECT_STORAGE_DIVERGED",
        });
      await discardPending();
      if (scene.after !== scene.before) {
        await writeJsonAtomic(sceneCommitFile(root), {
          schemaVersion: 1,
          projectBefore: text,
          projectAfter: next,
          sceneBefore: scene.before,
          sceneAfter: scene.after,
        });
        await recoverSceneCommitUnlocked(root);
      } else if (next !== text) await writeTextAtomic(file, next);
    } else {
      await discardPending();
      if (next !== text) await writeTextAtomic(file, next);
    }
    return result;
  });

// Compatibility boundary: existing callers address logical sections, not extra files.
export const readProjectDataText = async (file: string): Promise<string> => {
  const name = path.basename(file),
    root = path.dirname(file);
  if (name !== "project.json" && !sections[name])
    return fs.readFile(file, "utf8");
  let snapshot;
  try {
    snapshot = await readProjectDocument(root);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" &&
      name !== "project.json"
    )
      return fs.readFile(file, "utf8");
    throw error;
  }
  const { document, text } = snapshot;
  if (document.formatVersion !== 2)
    return name === "project.json" ? text : fs.readFile(file, "utf8");
  if (name === "project.json") {
    const manifest = { ...document };
    for (const key of reserved) delete manifest[key];
    return JSON.stringify(manifest);
  }
  const value = document[sections[name]];
  if (value === undefined && name === "image-intake.json")
    throw Object.assign(new Error("接纳状态缺失"), { code: "ENOENT" });
  if (name === "image-intake.json" && object(value) && object(value.entries)) {
    let scene: ProjectDocument = {};
    try {
      scene = JSON.parse(
        await fs.readFile(path.join(root, "scene.excalidraw.json"), "utf8"),
      );
    } catch {
      /* Layout remains available if the native scene needs repair. */
    }
    const elements = new Map<string, any>(
      (Array.isArray(scene.elements) ? scene.elements : []).map((e: any) => [
        e.id,
        e,
      ]),
    );
    const entries: ProjectDocument = {};
    for (const [hash, entry] of Object.entries(value.entries)) {
      if (!object(entry)) continue;
      if (entry.phase !== "accepted" || entry.element) {
        entries[hash] = entry;
        continue;
      }
      const record = document.imageRecords?.[entry.fileId];
      const element = elements.get(entry.elementId);
      if (record && element) entries[hash] = { ...entry, record, element };
    }
    return JSON.stringify({ ...value, entries });
  }
  return JSON.stringify(value ?? {});
};
export const writeProjectDataJson = async (file: string, value: unknown) => {
  const name = path.basename(file),
    root = path.dirname(file);
  if (name !== "project.json" && !sections[name])
    return writeJsonAtomic(file, value);
  await updateProjectDocument(root, async (doc) => {
    if (doc.formatVersion !== 2) {
      if (name === "project.json") {
        if (!object(value)) throw new Error("项目清单必须是对象");
        Object.assign(doc, value);
      } else await writeJsonAtomic(file, value);
      return;
    }
    if (name === "project.json") {
      if (!object(value)) throw new Error("项目清单必须是对象");
      for (const [key, field] of Object.entries(value))
        if (!reserved.includes(key)) doc[key] = field;
    } else if (
      name === "image-intake.json" &&
      object(value) &&
      object(value.entries)
    ) {
      doc.intake = compactIntake(value);
    } else doc[sections[name]] = mergeSection(doc[sections[name]], value);
  });
};
export const migrateProjectDocument = async (root: string) =>
  withProjectDocumentLock(root, async () => {
    await recoverSceneCommitUnlocked(root);
    const { document, text } = await readProjectDocument(root);
    if (document.formatVersion === 2) {
      // A crash after publishing v2 may leave old files behind. Remove only
      // exact semantic copies; changed or malformed legacy files stay intact.
      for (const [name, key] of Object.entries(sections)) {
        const file = path.join(root, name);
        try {
          const raw = await fs.readFile(file, "utf8");
          const value = JSON.parse(raw);
          const normalized = key === "intake" ? compactIntake(value) : value;
          if (
            JSON.stringify(normalized) === JSON.stringify(document[key]) &&
            (await fs.readFile(path.join(root, "project.json"), "utf8")) ===
              text &&
            (await fs.readFile(file, "utf8")) === raw
          )
            await fs.unlink(file);
        } catch (error) {
          if (
            !(error instanceof SyntaxError) &&
            (error as NodeJS.ErrnoException).code !== "ENOENT"
          )
            throw error;
        }
      }
      return;
    }
    const consumed: Array<{ file: string; text: string }> = [];
    for (const [name, key] of Object.entries(sections)) {
      const file = path.join(root, name);
      try {
        const raw = await fs.readFile(file, "utf8"),
          value = JSON.parse(raw);
        if (!object(value)) throw new Error(`${name} 格式错误，已保留原件。`);
        document[key] = key === "intake" ? compactIntake(value) : value;
        consumed.push({ file, text: raw });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        if (key === "imageRecords") document[key] = {};
      }
    }
    document.formatVersion = 2;
    document.imageRecordsFile = "project.json";
    for (const item of consumed)
      if ((await fs.readFile(item.file, "utf8")) !== item.text)
        throw new Error("迁移期间文件被外部修改。");
    if ((await fs.readFile(path.join(root, "project.json"), "utf8")) !== text)
      throw new Error("迁移期间项目被外部修改。");
    await writeJsonAtomic(path.join(root, "project.json"), document);
    const saved = await readProjectDocument(root);
    if (JSON.stringify(saved.document) !== JSON.stringify(document))
      throw new Error("项目迁移验证失败。");
    for (const item of consumed)
      if ((await fs.readFile(item.file, "utf8")) === item.text)
        await fs.unlink(item.file);
  });
