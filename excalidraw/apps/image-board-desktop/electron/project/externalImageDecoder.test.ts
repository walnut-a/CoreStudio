import { afterEach, expect, it, vi } from "vitest";

import { decodeExpression } from "./externalImageDecoder";

// 执行实际解码脚本的输入校验；不启动 Electron 或加载不可信图片。
vi.mock("electron", () => ({ BrowserWindow: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

it.each([
  {
    name: "SVG 活动内容",
    content: "<script>alert(1)</script>",
    error: /活动内容/,
  },
  {
    name: "SVG 外部资源",
    content: '<image href="https://example.invalid/image.png"/>',
    error: /外部内容/,
  },
])("解码前拒绝 $name", async ({ content, error }) => {
  const createObjectURL = vi.fn(() => {
    throw new Error("不可信内容越过校验，进入图片解码");
  });
  vi.stubGlobal("URL", { createObjectURL });
  const source = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${content}</svg>`,
  );
  const decode = new Function(
    `return (${decodeExpression(
      source.toString("base64"),
      "image/svg+xml",
      0,
    )})`,
  );
  await expect(decode()).rejects.toThrow(error);
  expect(createObjectURL).not.toHaveBeenCalled();
});
