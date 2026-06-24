import { randomUUID } from "node:crypto";

import { readFile as fsReadFile } from "node:fs/promises";

import path from "node:path";

import type { Buffer } from "node:buffer";

import type { ImportedImagePayload } from "../../src/shared/desktopBridgeTypes";

export interface LocalImagePayloadOptions {
  readFile?: (filePath: string) => Promise<Buffer>;
  inspectImage?: (input: {
    filePath: string;
    buffer: Buffer;
    mimeType: string;
  }) => { width: number; height: number; mimeType?: string };
  now?: () => Date;
  randomId?: () => string;
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const inferMimeType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES_BY_EXTENSION[extension];
  if (!mimeType) {
    throw new Error(`Unsupported image file type: ${extension}`);
  }
  return mimeType;
};

export const readLocalImagePayload = async (
  filePath: string,
  options: LocalImagePayloadOptions = {},
): Promise<ImportedImagePayload> => {
  const inferredMimeType = inferMimeType(filePath);
  const readFile = options.readFile ?? fsReadFile;
  const inspectImage = options.inspectImage;
  if (!inspectImage) {
    throw new Error("inspectImage option is required");
  }

  const buffer = await readFile(filePath);
  const inspection = inspectImage({
    filePath,
    buffer,
    mimeType: inferredMimeType,
  });

  return {
    fileId: (options.randomId ?? randomUUID)(),
    fileName: path.basename(filePath),
    mimeType: inspection.mimeType ?? inferredMimeType,
    dataBase64: buffer.toString("base64"),
    width: inspection.width,
    height: inspection.height,
    createdAt: (options.now ?? (() => new Date()))().toISOString(),
  };
};
