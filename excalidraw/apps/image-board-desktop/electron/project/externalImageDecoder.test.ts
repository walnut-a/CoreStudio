import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  execute: vi.fn(async (code: string) => {
    new Function(`return ${code}`);
    return { width: 10, height: 10 };
  }),
}));
vi.mock("electron", () => ({
  BrowserWindow: class {
    webContents = { executeJavaScript: mocks.execute };
    loadURL = async () => {};
    isDestroyed = () => false;
    destroy = mocks.destroy;
  },
}));
import { createExternalImageDecoder } from "./externalImageDecoder";
it("runs syntactically valid isolated decoder code and destroys the worker", async () => {
  const decoder = createExternalImageDecoder();
  await expect(
    decoder.decode(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      ),
      "image/svg+xml",
    ),
  ).resolves.toEqual({ width: 10, height: 10 });
  expect(mocks.destroy).toHaveBeenCalledTimes(1);
});
