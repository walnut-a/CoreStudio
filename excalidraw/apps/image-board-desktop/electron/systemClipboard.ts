import { randomUUID } from "node:crypto";

import type { Clipboard, ClipboardItem, NativeImage } from "electron";

/** Electron-specific clipboard adaptation stays outside the upstream canvas. */
export const createSystemClipboard = (input: {
  clipboard: Pick<Clipboard, "read" | "write" | "writeText">;
  createItem: (data: Record<string, string | Blob>) => ClipboardItem;
  decodeDataUrl: (dataUrl: string) => NativeImage;
  decodeBuffer: (buffer: Buffer) => NativeImage;
}) => ({
  async writeProject({
    text,
    previewImageDataUrl,
  }: {
    text: string;
    previewImageDataUrl?: string;
  }) {
    const image = previewImageDataUrl
      ? input.decodeDataUrl(previewImageDataUrl)
      : null;
    if (!image || image.isEmpty()) {
      await input.clipboard.writeText(text);
      return;
    }
    await input.clipboard.write([
      input.createItem({
        "text/plain": text,
        "image/png": new Blob([new Uint8Array(image.toPNG())], {
          type: "image/png",
        }),
      }),
    ]);
  },

  async readImage() {
    const items = await input.clipboard.read();
    for (const mimeType of ["image/png", "image/jpeg", "image/webp"]) {
      const item = items.find((candidate) =>
        candidate.types.includes(mimeType),
      );
      if (!item) continue;
      const blob = await item.getType(mimeType);
      // Electron's bookmark payload is the only non-Blob variant of getType.
      if (!("arrayBuffer" in blob)) continue;
      const image = input.decodeBuffer(Buffer.from(await blob.arrayBuffer()));
      if (image.isEmpty()) continue;
      const imageBuffer = image.toPNG();
      const size = image.getSize();
      if (!imageBuffer.length || !size.width || !size.height) continue;
      return {
        fileName: "clipboard.png",
        fileId: randomUUID(),
        mimeType: "image/png",
        dataBase64: imageBuffer.toString("base64"),
        width: size.width,
        height: size.height,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  },
});
