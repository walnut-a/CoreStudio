import { readFile, access } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { createAgentReferenceImages } from "./agentReferenceImages";

const image = (id: string, x = 0) => ({
  id,
  type: "image",
  fileId: "source",
  isDeleted: false,
  version: 1,
  versionNonce: 1,
  width: 100,
  height: 100,
  angle: 0,
  scale: [1, 1],
  crop: {
    x,
    y: 0,
    width: 50,
    height: 50,
    naturalWidth: 100,
    naturalHeight: 100,
  },
});
const setup = (elements = [image("left"), image("right", 50)]) => {
  const render = vi.fn(async (..._args: unknown[]) => ({
    width: 100,
    height: 100,
    dataBase64: "cropped",
  }));
  const readAssets = vi.fn(async () => [
    {
      fileId: "source",
      width: 200,
      height: 200,
      mimeType: "image/png",
      dataBase64: "original",
      createdAt: "now",
    },
  ]);
  const service = createAgentReferenceImages({
    getRoomScene: async () => ({ elements, sharedSceneConfig: {} }),
    readProjectAssetPayloads: readAssets,
    render,
  });
  return { service, render, readAssets };
};

describe("Agent visible references", () => {
  it("rejects an image element with a missing asset id instead of generating without a reference", async () => {
    const element = image("broken");
    const { service } = setup([
      { ...element, fileId: undefined as unknown as string },
    ]);
    await expect(
      service.read({
        projectPath: "/project",
        fileIds: [],
        elementIds: ["broken"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("publishes complete concurrent files outside the project and removes them on disposal", async () => {
    const { service } = setup();
    const input = {
      projectPath: "/project",
      fileIds: [],
      elementIds: ["left"],
    };
    const [a, b] = await Promise.all([
      service.paths(input),
      service.paths(input),
    ]);
    expect(a[0].path).toBe(b[0].path);
    expect(a[0].path).not.toContain("/project/");
    expect(await readFile(a[0].path)).toEqual(Buffer.from("cropped", "base64"));
    await service.dispose();
    await expect(access(a[0].path)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(service.paths(input)).rejects.toThrow("已关闭");
  });
  it("preserves distinct crops of one file in explicit element order", async () => {
    const { service, render } = setup();
    const result = await service.read({
      projectPath: "/project",
      fileIds: ["source"],
      elementIds: ["right", "left"],
    });
    expect(result.map((item) => item.elementId)).toEqual(["right", "left"]);
    expect(result.map((item) => item.dataBase64)).toEqual([
      "cropped",
      "cropped",
    ]);
    expect(render.mock.calls[0][1]).toMatchObject({ crop: { x: 50 } });
  });
  it("rejects ambiguous file-only references instead of exposing the original", async () => {
    const { service, render } = setup();
    await expect(
      service.read({
        projectPath: "/project",
        fileIds: ["source"],
        elementIds: [],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(render).not.toHaveBeenCalled();
  });
  it("resolves a unique cropped element even with only a file id", async () => {
    const { service, render } = setup([image("left")]);
    expect(
      (
        await service.read({
          projectPath: "/project",
          fileIds: ["source"],
          elementIds: [],
        })
      )[0].dataBase64,
    ).toBe("cropped");
    expect(render).toHaveBeenCalledOnce();
  });
  it("rejects stale elements and mismatched file references", async () => {
    const { service } = setup();
    for (const input of [
      { fileIds: [], elementIds: ["deleted"] },
      { fileIds: ["other"], elementIds: ["left"] },
    ]) {
      await expect(
        service.read({ projectPath: "/project", ...input }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });
  it("never falls back to the original if rendering fails", async () => {
    const { service, render } = setup();
    render.mockRejectedValueOnce(new Error("decode failed"));
    await expect(
      service.read({
        projectPath: "/project",
        fileIds: [],
        elementIds: ["left"],
      }),
    ).rejects.toThrow("decode failed");
  });
});
