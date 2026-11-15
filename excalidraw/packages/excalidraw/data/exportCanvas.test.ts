import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultAppState } from "../appState";

import { exportCanvas } from "./index";

import type { ExportedElements } from "./index";

const {
  canvasToBlob,
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
  exportScene,
} = vi.hoisted(() => ({
  canvasToBlob: vi.fn(),
  copyBlobToClipboardAsPng: vi.fn(),
  copyTextToSystemClipboard: vi.fn(),
  exportScene: vi.fn(),
}));

vi.mock("../clipboard", () => ({
  copyBlobToClipboardAsPng,
  copyTextToSystemClipboard,
}));

vi.mock("../scene/export", async (importOriginal) => ({
  ...await importOriginal<typeof import("../scene/export")>(),
  exportScene,
}));

vi.mock("./blob", () => ({
  canvasToBlob,
  loadFromBlob: vi.fn(),
}));

vi.mock("./filesystem", () => ({
  fileSave: vi.fn(),
}));

vi.mock("./json", () => ({
  loadFromJSON: vi.fn(),
  saveAsJSON: vi.fn(),
  serializeAsJSON: vi.fn(),
}));

const elements = [{ id: "element" }] as unknown as ExportedElements;
const exportOptions = {
  exportBackground: false,
  viewBackgroundColor: "#ffffff",
  exportingFrame: null,
};
const appState = {
  ...getDefaultAppState(),
  width: 100,
  height: 100,
  offsetTop: 0,
  offsetLeft: 0,
};

describe("exportCanvas frame rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides frame names and outlines in SVG clipboard exports", async () => {
    exportScene.mockResolvedValue(
      document.createElementNS("http://www.w3.org/2000/svg", "svg"),
    );

    await exportCanvas(
      "clipboard-svg",
      elements,
      appState,
      {},
      exportOptions,
    );

    expect(exportScene).toHaveBeenCalledWith(expect.objectContaining({
      type: "svg",
      config: expect.objectContaining({ frames: { enabled: true, clip: true, name: false, outline: false } }),
    }));
  });

  it("hides frame names and outlines in PNG clipboard exports", async () => {
    const canvas = document.createElement("canvas");
    const blob = new Blob();
    exportScene.mockResolvedValue(canvas);
    canvasToBlob.mockResolvedValue(blob);

    await exportCanvas(
      "clipboard",
      elements,
      appState,
      {},
      exportOptions,
    );

    expect(exportScene).toHaveBeenCalledWith(expect.objectContaining({
      type: "canvas",
      config: expect.objectContaining({ frames: { enabled: true, clip: true, name: false, outline: false } }),
    }));
    const [blobPromise] = copyBlobToClipboardAsPng.mock.calls[0];
    await expect(blobPromise).resolves.toBe(blob);
  });
});
