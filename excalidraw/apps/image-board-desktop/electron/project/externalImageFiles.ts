import { createHash } from "node:crypto";
import { constants } from "node:fs";
import fs, { type FileHandle } from "node:fs/promises";
import path from "node:path";

import { PROJECT_FILENAMES } from "../../src/shared/projectTypes";

export const EXTERNAL_IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export type ExternalImageFile = {
  relativePath: string;
  location: "external" | "managed";
  storageMode: "in-place" | "copy-to-assets";
  mimeType: string;
};

export const classifyExternalImagePath = (
  relativePath: string,
): ExternalImageFile | null => {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\")) return null;
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part.startsWith(".") || part.endsWith("~")))
    return null;
  if (
    parts.some(
      (part) =>
        part === PROJECT_FILENAMES.cacheDir ||
        part === PROJECT_FILENAMES.exportsDir,
    )
  )
    return null;
  const mimeType =
    EXTERNAL_IMAGE_MIME_TYPES[path.extname(relativePath).toLowerCase()];
  if (!mimeType) return null;
  return {
    relativePath,
    location: parts[0] === PROJECT_FILENAMES.assetsDir ? "managed" : "external",
    storageMode: parts[0] === "inbox" ? "copy-to-assets" : "in-place",
    mimeType,
  };
};

export const discoverExternalImageFiles = async (
  projectPath: string,
  options: { recursive: boolean; maxFiles?: number },
) => {
  const files: ExternalImageFile[] = [];
  const issues: Array<{ path: string; message: string }> = [];
  const root = await fs.realpath(projectPath);
  const directories = [""];
  const maxFiles = options.maxFiles ?? 100_000;
  for (let cursor = 0; cursor < directories.length; cursor++) {
    if (cursor >= 100000) {
      issues.push({ path: ".", message: "目录数量超过单次扫描上限。" });
      break;
    }
    const relativeDirectory = directories[cursor];
    const directory = path.join(root, relativeDirectory);
    try {
      // Revalidate parents so a queued directory replaced by a symlink is not followed.
      if ((await fs.realpath(directory)) !== directory) continue;
      const entries = await fs.readdir(directory, { withFileTypes: true });
      if (
        relativeDirectory &&
        entries.some((entry) => entry.name === PROJECT_FILENAMES.project)
      )
        continue;
      for (const entry of entries.sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
      )) {
        if (
          entry.name.startsWith(".") ||
          entry.name.endsWith("~") ||
          entry.isSymbolicLink()
        )
          continue;
        const relativePath = relativeDirectory
          ? `${relativeDirectory}/${entry.name}`
          : entry.name;
        if (entry.isDirectory()) {
          if (
            entry.name === PROJECT_FILENAMES.cacheDir ||
            entry.name === PROJECT_FILENAMES.exportsDir
          )
            continue;
          if (
            options.recursive ||
            (!relativeDirectory &&
              (entry.name === "inbox" ||
                entry.name === PROJECT_FILENAMES.assetsDir))
          )
            directories.push(relativePath);
        } else if (entry.isFile()) {
          const candidate = classifyExternalImagePath(relativePath);
          if (candidate) files.push(candidate);
          if (files.length >= maxFiles) {
            issues.push({
              path: relativeDirectory || ".",
              message: `候选图片达到单次扫描上限 ${maxFiles}，请分批整理后重试。`,
            });
            return {
              files: files.sort((a, b) =>
                a.relativePath < b.relativePath ? -1 : 1,
              ),
              issues,
            };
          }
        }
      }
    } catch (error) {
      issues.push({
        path: relativeDirectory || ".",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    files: files.sort((a, b) => (a.relativePath < b.relativePath ? -1 : 1)),
    issues,
  };
};

export const resolveExternalImagePath = async (
  projectPath: string,
  relativePath: string,
) => {
  if (!classifyExternalImagePath(relativePath))
    throw new Error("图片路径不在允许接纳的项目范围内。");
  const root = await fs.realpath(projectPath);
  let current = root;
  const parts = relativePath.split("/");
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink()) throw new Error("不接纳符号链接中的图片。");
    if (index < parts.length - 1) {
      if (!stats.isDirectory()) throw new Error("图片父路径不是目录。");
      try {
        await fs.lstat(path.join(current, PROJECT_FILENAMES.project));
        throw new Error("图片位于另一个项目内。");
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "ENOENT"
        )
          throw error;
      }
    } else if (!stats.isFile()) throw new Error("图片路径不是普通文件。");
  }
  if ((await fs.realpath(current)) !== current)
    throw new Error("图片路径在读取期间发生变化。");
  return current;
};

export type ExternalImageObservation = {
  signature: string;
  stableSince: number;
};
type StableImageResult =
  | { status: "waiting"; observation: ExternalImageObservation }
  | {
      status: "ready";
      observation: ExternalImageObservation;
      buffer: Buffer;
      contentHash: string;
    };

export const readStableExternalImage = async (input: {
  projectPath: string;
  relativePath: string;
  previous?: ExternalImageObservation;
  now: number;
  stableMs: number;
  maxBytes?: number;
  readFile?: (handle: FileHandle) => Promise<Buffer>;
}): Promise<StableImageResult> => {
  const filePath = await resolveExternalImagePath(
    input.projectPath,
    input.relativePath,
  );
  const handle = await fs.open(
    filePath,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  const signature = (stats: Awaited<ReturnType<typeof handle.stat>>) =>
    `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`;
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error("图片不是普通文件。");
    if (before.size > (input.maxBytes ?? 64 * 1024 * 1024))
      throw new Error("图片大小超过自动接纳的单文件限制。");
    const beforeSignature = signature(before);
    const observation =
      input.previous?.signature === beforeSignature
        ? input.previous
        : { signature: beforeSignature, stableSince: input.now };
    if (!before.size || input.now - observation.stableSince < input.stableMs)
      return { status: "waiting", observation };
    const buffer = input.readFile
      ? await input.readFile(handle)
      : await (async () => {
          // Read only the observed length: a growing download cannot grow our allocation.
          const bytes = Buffer.alloc(before.size);
          let offset = 0;
          while (offset < bytes.length) {
            const { bytesRead } = await handle.read(
              bytes,
              offset,
              bytes.length - offset,
              offset,
            );
            if (!bytesRead) break;
            offset += bytesRead;
          }
          return bytes.subarray(0, offset);
        })();
    const after = await handle.stat();
    await resolveExternalImagePath(input.projectPath, input.relativePath);
    const current = await fs.stat(filePath);
    if (
      signature(after) !== beforeSignature ||
      signature(current) !== beforeSignature ||
      buffer.length !== before.size
    ) {
      return {
        status: "waiting",
        observation: { signature: signature(current), stableSince: input.now },
      };
    }
    return {
      status: "ready",
      observation,
      buffer,
      contentHash: createHash("sha256").update(buffer).digest("hex"),
    };
  } finally {
    await handle.close();
  }
};

export const readExternalImageSignature = async (
  projectPath: string,
  relativePath: string,
) => {
  const stats = await fs.stat(
    await resolveExternalImagePath(projectPath, relativePath),
  );
  return `${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`;
};
