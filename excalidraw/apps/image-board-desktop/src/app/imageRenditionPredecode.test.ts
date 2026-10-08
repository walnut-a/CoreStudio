import { expect, it, vi } from "vitest";
import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";
import { predecodeImageRenditionAssets } from "./imageRenditionPredecode";

it("waits for host image decoding and drops broken payloads", async () => {
  let finish!: () => void;
  const good = {
    src: "",
    decode: vi.fn(() => new Promise<void>((r) => (finish = r))),
  };
  const broken = {
    src: "",
    decode: vi.fn(async () => {
      throw new Error("bad image");
    }),
  };
  const createImage = vi
    .fn()
    .mockReturnValueOnce(good)
    .mockReturnValueOnce(broken);
  const assets = ["good", "broken"].map(
    (fileId) =>
      ({
        fileId,
        mimeType: "image/png",
        dataBase64: fileId,
      } as ProjectAssetPayload),
  );
  let settled = false;
  const loading = predecodeImageRenditionAssets(assets, createImage).then(
    (result) => {
      settled = true;
      return result;
    },
  );
  await vi.waitFor(() => expect(broken.decode).toHaveBeenCalledOnce());
  expect(settled).toBe(false);
  expect(good.src).toBe("data:image/png;base64,good");
  finish();
  await expect(loading).resolves.toEqual([assets[0]]);
});
