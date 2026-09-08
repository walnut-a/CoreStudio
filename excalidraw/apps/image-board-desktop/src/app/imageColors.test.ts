import { describe, expect, it } from "vitest";
import { extractPalette } from "./imageColors";
const pixels = (...colors: number[][]) => new Uint8ClampedArray(colors.flat());
describe("图片配色", () => {
  it("保留真实主色并按频次排列，不把平均色当主色", () => {
    expect(
      extractPalette(
        pixels([255, 0, 0, 255], [255, 0, 0, 255], [0, 0, 255, 255]),
      ),
    ).toEqual(["#FF0000", "#0000FF"]);
  });
  it("忽略透明像素，保留白色，合并相近颜色且不补虚构色", () => {
    expect(
      extractPalette(
        pixels([0, 0, 0, 0], [255, 255, 255, 255], [254, 254, 254, 255]),
      ),
    ).toHaveLength(1);
    expect(extractPalette(pixels([255, 255, 255, 255]))).toEqual(["#FFFFFF"]);
    expect(extractPalette(pixels([255, 0, 0, 0]))).toEqual([]);
  });
  it("最多返回六个代表色", () => {
    const data = pixels(
      ...Array.from({ length: 64 }, (_, i) => [
        (i % 4) * 85,
        (Math.floor(i / 4) % 4) * 85,
        Math.floor(i / 16) * 85,
        255,
      ]),
    );
    expect(extractPalette(data)).toHaveLength(6);
  });
});
