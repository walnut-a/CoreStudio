import { Blob as NodeBlob } from "node:buffer";

import type { ClipboardItem, NativeImage } from "electron";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSystemClipboard } from "./systemClipboard";

const makeImage = (empty = false) =>
  ({
    isEmpty: () => empty,
    toPNG: () => Buffer.from("png-pixels"),
    getSize: () => ({ width: 2400, height: 1600 }),
  } as NativeImage);

const makeItem = (values: Record<string, string | Blob>) =>
  ({
    types: Object.keys(values),
    getType: async (type: string) =>
      typeof values[type] === "string"
        ? new Blob([values[type]], { type })
        : values[type],
  } as ClipboardItem);

const setup = () => {
  vi.stubGlobal("Blob", NodeBlob);
  const clipboard = {
    read: vi.fn<() => Promise<ClipboardItem[]>>().mockResolvedValue([]),
    write: vi
      .fn<(items: ClipboardItem[]) => Promise<void>>()
      .mockResolvedValue(),
    writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(),
  };
  const decodeDataUrl = vi.fn(() => makeImage());
  const decodeBuffer = vi.fn(() => makeImage());
  const adapter = createSystemClipboard({
    clipboard,
    createItem: makeItem,
    decodeDataUrl,
    decodeBuffer,
  });
  return { clipboard, decodeDataUrl, decodeBuffer, adapter };
};

afterEach(() => vi.unstubAllGlobals());

describe("Electron system clipboard adapter", () => {
  it("writes editable text and the PNG preview atomically in one item", async () => {
    const { clipboard, adapter } = setup();
    await adapter.writeProject({
      text: "editable-original",
      previewImageDataUrl: "data:image/png;base64,eA==",
    });
    expect(clipboard.write).toHaveBeenCalledTimes(1);
    expect(clipboard.writeText).not.toHaveBeenCalled();
    const [item] = clipboard.write.mock.calls[0][0];
    expect(item.types).toEqual(["text/plain", "image/png"]);
    expect(await ((await item.getType("text/plain")) as Blob).text()).toBe(
      "editable-original",
    );
    expect(await ((await item.getType("image/png")) as Blob).text()).toBe(
      "png-pixels",
    );
  });

  it("writes text alone for an absent or invalid preview and propagates rejection", async () => {
    const { clipboard, adapter, decodeDataUrl } = setup();
    await adapter.writeProject({ text: "shapes" });
    decodeDataUrl.mockReturnValue(makeImage(true));
    await adapter.writeProject({
      text: "original",
      previewImageDataUrl: "bad",
    });
    expect(clipboard.writeText.mock.calls).toEqual([["shapes"], ["original"]]);
    clipboard.writeText.mockRejectedValue(new Error("denied"));
    await expect(adapter.writeProject({ text: "next" })).rejects.toThrow(
      "denied",
    );
  });

  it("prefers PNG across clipboard items and preserves decoded image dimensions", async () => {
    const { clipboard, adapter, decodeBuffer } = setup();
    clipboard.read.mockResolvedValue([
      makeItem({ "image/jpeg": "jpeg" }),
      makeItem({ "text/plain": "ignored", "image/png": "original-png" }),
    ]);
    const result = await adapter.readImage();
    expect(decodeBuffer).toHaveBeenCalledWith(Buffer.from("original-png"));
    expect(result).toMatchObject({
      mimeType: "image/png",
      width: 2400,
      height: 1600,
      dataBase64: Buffer.from("png-pixels").toString("base64"),
    });
  });

  it("converts JPEG input to the existing PNG bridge contract", async () => {
    const { clipboard, adapter, decodeBuffer } = setup();
    clipboard.read.mockResolvedValue([makeItem({ "image/jpeg": "jpeg" })]);
    expect(await adapter.readImage()).toMatchObject({ mimeType: "image/png" });
    expect(decodeBuffer).toHaveBeenCalledWith(Buffer.from("jpeg"));
  });

  it("returns null for text-only and undecodable images, but propagates access failure", async () => {
    const { clipboard, adapter, decodeBuffer } = setup();
    clipboard.read.mockResolvedValue([makeItem({ "text/plain": "text" })]);
    expect(await adapter.readImage()).toBeNull();
    clipboard.read.mockResolvedValue([makeItem({ "image/png": "bad" })]);
    decodeBuffer.mockReturnValue(makeImage(true));
    expect(await adapter.readImage()).toBeNull();
    clipboard.read.mockRejectedValue(new Error("denied"));
    await expect(adapter.readImage()).rejects.toThrow("denied");
  });
});
