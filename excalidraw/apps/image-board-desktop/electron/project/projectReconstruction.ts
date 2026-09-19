import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildProjectManifest, createMaintenanceBackup } from "../projectFs";
import {
  discoverExternalImageFiles,
  resolveExternalImagePath,
} from "./externalImageFiles";
import { writeJsonAtomic, writeTextAtomic } from "./atomicProjectFile";
import { withProjectDocumentLock } from "./projectDocument";
import { addNativeRecoveryLinks } from "./projectRecovery";
import {
  captureLayout,
  INTAKE_IMAGE_GAP,
  INTAKE_LAYOUT_MAX_WIDTH,
} from "./projectLayout";
import { getSceneContentHash } from "../../src/shared/sceneVersion";
import type { ImageRecord } from "../../src/shared/projectTypes";

export const readOptionalText = async (
  file: string,
): Promise<string | null> => {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
};
const parse = (text: string | null) => {
  try {
    return JSON.parse(text ?? "null");
  } catch {
    return null;
  }
};
export type ReconstructionPreview = {
  root: string;
  projectText: string | null;
  sceneText: string | null;
  pendingText: string | null;
  records: ImageRecord[];
  signatures: Record<string, string>;
  issues: string[];
};
const signature = async (file: string) => {
  const s = await fs.stat(file, { bigint: true });
  return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}`;
};
export const previewProjectReconstruction = async (
  root: string,
  decode: (input: {
    buffer: Buffer;
    mimeType: string;
  }) => Promise<{ width: number; height: number }>,
): Promise<ReconstructionPreview | null> => {
  root = await fs.realpath(root);
  const projectText = await readOptionalText(path.join(root, "project.json"));
  const sceneText = await readOptionalText(
    path.join(root, "scene.excalidraw.json"),
  );
  const pendingText = await readOptionalText(
    path.join(root, "cache/scene-commit.json"),
  );
  const project = parse(projectText),
    scene = parse(sceneText);
  // A valid representation or a future format must never be replaced by image-only recovery.
  if (
    project &&
    typeof project === "object" &&
    !Array.isArray(project) &&
    (project.formatVersion > 2 || typeof project.projectId === "string")
  )
    return null;
  if (scene && Array.isArray(scene.elements)) return null;
  const discovery = await discoverExternalImageFiles(root, { recursive: true });
  const records: ImageRecord[] = [];
  const signatures: Record<string, string> = {};
  const issues = discovery.issues.map((i) => i.path);
  const hashes = new Set<string>();
  for (const candidate of discovery.files) {
    try {
      const file = await resolveExternalImagePath(root, candidate.relativePath),
        before = await signature(file);
      const stat = await fs.stat(file);
      if (stat.size > 64 * 1024 * 1024) throw Error("超过64MiB");
      const buffer = await fs.readFile(file),
        dimensions = await decode({ buffer, mimeType: candidate.mimeType });
      if (
        !Number.isFinite(dimensions.width) ||
        !Number.isFinite(dimensions.height) ||
        dimensions.width <= 0 ||
        dimensions.height <= 0 ||
        dimensions.width * dimensions.height > 64_000_000
      )
        throw Error("尺寸无效");
      if ((await signature(file)) !== before) throw Error("读取期间变化");
      signatures[candidate.relativePath] = before;
      const hash = createHash("sha256").update(buffer).digest("hex");
      if (hashes.has(hash)) continue;
      hashes.add(hash);
      records.push({
        fileId: `intake-${hash}`,
        contentHash: hash,
        assetPath: candidate.relativePath,
        sourceFileName: path.basename(candidate.relativePath),
        mimeType: candidate.mimeType,
        sourceType: "imported",
        ...dimensions,
        createdAt: new Date(
          stat.birthtimeMs > 0 ? stat.birthtimeMs : Date.now(),
        ).toISOString(),
      });
    } catch (error) {
      issues.push(
        `${candidate.relativePath}：${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  records.sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) ||
      a.assetPath.localeCompare(b.assetPath),
  );
  return {
    root,
    projectText,
    sceneText,
    pendingText,
    records,
    signatures,
    issues,
  };
};
export const commitProjectReconstruction = (preview: ReconstructionPreview) =>
  withProjectDocumentLock(preview.root, async () => {
    if (!preview.records.length) throw Error("没有可恢复的图片，未写入项目。");
    const { root } = preview;
    const check = async () => {
      if (
        (await readOptionalText(path.join(root, "project.json"))) !==
          preview.projectText ||
        (await readOptionalText(path.join(root, "scene.excalidraw.json"))) !==
          preview.sceneText ||
        (await readOptionalText(path.join(root, "cache/scene-commit.json"))) !==
          preview.pendingText
      )
        throw Error("预览后项目文件发生变化，请重新扫描。");
      for (const [relative, expected] of Object.entries(preview.signatures))
        if (
          (await signature(await resolveExternalImagePath(root, relative))) !==
          expected
        )
          throw Error("预览后图片发生变化，请重新扫描。");
    };
    await check();
    const backupPath = await createMaintenanceBackup({
      projectPath: root,
      reason: "reconstruct-from-originals",
    });
    if (preview.pendingText !== null)
      await writeTextAtomic(
        path.join(backupPath, "scene-commit.json"),
        preview.pendingText,
      );
    await check();
    if (preview.pendingText !== null)
      await fs.unlink(path.join(root, "cache/scene-commit.json"));
    const project = buildProjectManifest(path.basename(root));
    let x = 0,
      y = 0,
      bottom = 0;
    const elements = preview.records.map((record) => {
      const scale = Math.min(1, 640 / Math.max(record.width, record.height)),
        width = record.width * scale,
        height = record.height * scale;
      if (x + width > INTAKE_LAYOUT_MAX_WIDTH) {
        x = 0;
        y = bottom + INTAKE_IMAGE_GAP;
        bottom = y;
      }
      const element = {
        id: `intake-${record.contentHash!.slice(0, 32)}`,
        type: "image",
        fileId: record.fileId,
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: "transparent",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        status: "saved",
        scale: [1, 1],
      };
      x += width + INTAKE_IMAGE_GAP;
      bottom = Math.max(bottom, y + height);
      return element;
    });
    const records = Object.fromEntries(
      preview.records.map((r) => [r.fileId, r]),
    );
    const scene = addNativeRecoveryLinks(
      {
        type: "excalidraw",
        version: 2,
        source: "CoreStudio",
        elements,
        appState: {},
        files: {},
      },
      project,
      records,
    );
    await writeJsonAtomic(path.join(root, "scene.excalidraw.json"), scene);
    await writeJsonAtomic(path.join(root, "project.json"), {
      ...project,
      imageRecords: records,
      layout: {
        ...captureLayout(elements),
        sceneHash: getSceneContentHash(JSON.stringify(scene, null, 2)),
      },
    });
    return { backupPath, projectId: project.projectId };
  });
