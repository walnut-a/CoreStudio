import fs from "fs/promises";
import { randomUUID } from "node:crypto";
import path from "path";

const writeAtomic = async (filePath: string, value: string | Buffer) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(
    path.dirname(filePath),
    `${path.basename(filePath)}.${randomUUID()}.tmp`,
  );

  try {
    await fs.writeFile(tempPath, value);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
};

export const writeTextAtomic = (filePath: string, value: string) =>
  writeAtomic(filePath, value);

export const writeJsonAtomic = (filePath: string, value: unknown) =>
  writeTextAtomic(filePath, JSON.stringify(value, null, 2));

export const writeBufferAtomic = (filePath: string, value: Buffer) =>
  writeAtomic(filePath, value);
