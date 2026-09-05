import { createHash } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PROJECT_FILENAMES,
  type ImageRecord,
} from "../../src/shared/projectTypes";
import { classifyExternalImagePath } from "./externalImageFiles";

export const resolveProjectAssetPath = (
  projectPath: string,
  assetPath: string,
) => {
  const root = path.resolve(projectPath);
  const resolved = path.resolve(root, assetPath);
  const relative = path.relative(root, resolved).split(path.sep).join("/");
  const managed = relative.startsWith(`${PROJECT_FILENAMES.assetsDir}/`);
  const candidate = classifyExternalImagePath(relative);
  if (
    path.isAbsolute(assetPath) ||
    assetPath.includes("\\") ||
    assetPath.split("/").some((part) => part === "..") ||
    !resolved.startsWith(`${root}${path.sep}`) ||
    (!managed && (!candidate || candidate.storageMode !== "in-place"))
  ) {
    throw new Error("图片资源路径不在项目允许的正式原图范围内。");
  }
  return resolved;
};

export const assertProjectAssetFile = async (
  projectPath: string,
  assetPath: string,
) => {
  const root = await fs.realpath(projectPath);
  const resolved = resolveProjectAssetPath(root, assetPath);
  let current = root;
  const parts = path.relative(root, resolved).split(path.sep);
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink())
      throw new Error("正式原图不能通过符号链接读取。");
    if (index < parts.length - 1) {
      if (!stats.isDirectory()) throw new Error("图片路径无效。");
      try {
        await fs.lstat(path.join(current, PROJECT_FILENAMES.project));
        throw new Error("图片位于嵌套项目内。");
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "ENOENT"
        )
          throw error;
      }
    } else if (!stats.isFile()) throw new Error("图片不是普通文件。");
  }
  if ((await fs.realpath(resolved)) !== resolved)
    throw new Error("图片路径已变化。");
  return resolved;
};

export const readRegisteredProjectAsset = async (
  projectPath: string,
  record: ImageRecord,
) => {
  const filePath = await assertProjectAssetFile(projectPath, record.assetPath);
  const handle = await fs.open(
    filePath,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const before = await handle.stat();
    if (record.contentHash && before.size > 64 * 1024 * 1024)
      throw new Error("正式原图大小已超出接纳限制。");
    const buffer = record.contentHash
      ? await (async () => {
          const data = Buffer.alloc(before.size);
          let offset = 0;
          while (offset < data.length) {
            const { bytesRead } = await handle.read(
              data,
              offset,
              data.length - offset,
              offset,
            );
            if (!bytesRead) break;
            offset += bytesRead;
          }
          return data.subarray(0, offset);
        })()
      : await handle.readFile();
    const after = await handle.stat();
    await assertProjectAssetFile(projectPath, record.assetPath);
    const current = await fs.stat(filePath);
    if (
      before.ino !== current.ino ||
      before.dev !== current.dev ||
      before.size !== current.size ||
      before.mtimeMs !== current.mtimeMs ||
      before.ctimeMs !== current.ctimeMs ||
      buffer.length !== before.size ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs ||
      (record.contentHash &&
        createHash("sha256").update(buffer).digest("hex") !==
          record.contentHash)
    ) {
      throw Object.assign(
        new Error("正式原图内容已被外部修改，请重新导入或恢复原文件。"),
        { code: "PROJECT_ASSET_CHANGED" },
      );
    }
    return buffer;
  } finally {
    await handle.close();
  }
};
