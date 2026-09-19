import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  discoverExternalImageFiles,
  resolveExternalImagePath,
} from "./externalImageFiles";
import { validateExternalImageHeader } from "./externalImageHeader";
import { parseProjectImageRecords } from "./projectImageRecords";
import type { ImageRecordMap } from "../../src/shared/projectTypes";

export const addNativeRecoveryLinks = (
  scene: Record<string, any>,
  project: { projectId?: string; name: string },
  records: ImageRecordMap,
) => ({
  ...scene,
  corestudioProject: {
    ...scene.corestudioProject,
    projectId: project.projectId,
    name: project.name,
  },
  elements: scene.elements.map((element: Record<string, any>) => {
    const record =
      typeof element.fileId === "string" ? records[element.fileId] : undefined;
    return record
      ? {
          ...element,
          customData: {
            ...element.customData,
            corestudioAssetPath: record.assetPath,
          },
        }
      : element;
  }),
});

// Rebuild only facts available in original files. Never invent generation provenance.
export const recoverImageRecords = async (
  root: string,
  scene: Record<string, any>,
  raw: unknown = {},
) => {
  const records: ImageRecordMap = {
    ...parseProjectImageRecords(raw).imageRecords,
  };
  const elements = Array.isArray(scene.elements) ? scene.elements : [];
  const referenced = new Set<string>(
    elements.filter((e) => e.type === "image").map((e) => e.fileId),
  );
  const hints = new Map<string, string>(
    elements.flatMap((e) =>
      typeof e.customData?.corestudioAssetPath === "string"
        ? [[e.customData.corestudioAssetPath, e.fileId]]
        : [],
    ),
  );
  const byPath = new Map(
    Object.values(records).map((r) => [r.assetPath, r.fileId]),
  );
  const discovery = await discoverExternalImageFiles(root, { recursive: true });
  const issues: string[] = [];
  for (const file of discovery.files) {
    if (byPath.has(file.relativePath)) continue;
    try {
      const absolute = await resolveExternalImagePath(root, file.relativePath),
        stat = await fs.stat(absolute);
      if (stat.size > 64 * 1024 * 1024) continue;
      const bytes = await fs.readFile(absolute),
        hash = createHash("sha256").update(bytes).digest("hex");
      const existing = [...referenced].filter(
        (id) =>
          id === `intake-${hash}` ||
          path.basename(file.relativePath).includes(`_${id}_`),
      );
      const fileId =
        hints.get(file.relativePath) ??
        (existing.length === 1 ? existing[0] : undefined);
      if (!fileId || records[fileId]) continue;
      let dimensions = validateExternalImageHeader(bytes, file.mimeType);
      if (!dimensions && file.mimeType === "image/svg+xml") {
        const text = bytes.toString("utf8");
        const box = text.match(
          /viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i,
        );
        if (box && Number(box[1]) > 0 && Number(box[2]) > 0)
          dimensions = { width: Number(box[1]), height: Number(box[2]) };
      }
      if (!dimensions) {
        issues.push(file.relativePath);
        continue;
      }
      records[fileId] = {
        fileId,
        assetPath: file.relativePath,
        sourceFileName: path.basename(file.relativePath),
        contentHash: hash,
        sourceType: "imported",
        mimeType: file.mimeType,
        ...dimensions,
        createdAt: new Date(
          stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs,
        ).toISOString(),
      };
    } catch {
      issues.push(file.relativePath);
    }
  }
  return { records, issues };
};
