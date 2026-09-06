import { describe, expect, it } from "vitest";
import {
  getVisibleImageTransform,
  visibleImageDrawExpression,
} from "./visibleImageTransform";
const base = {
  id: "image",
  version: 1,
  versionNonce: 1,
  isDeleted: false,
  width: 50,
  height: 25,
  angle: 0,
  scale: [1, 1],
};
describe("visible image transforms", () => {
  it("leaves unchanged originals untouched and retains rotation/flip", () => {
    expect(getVisibleImageTransform(base)).toBeNull();
    expect(
      getVisibleImageTransform({ ...base, angle: Math.PI / 2, scale: [-1, 1] }),
    ).toMatchObject({ angle: Math.PI / 2, scale: [-1, 1], crop: null });
  });
  it.each([
    {
      x: -1,
      y: 0,
      width: 10,
      height: 10,
      naturalWidth: 100,
      naturalHeight: 100,
    },
    {
      x: 95,
      y: 0,
      width: 10,
      height: 10,
      naturalWidth: 100,
      naturalHeight: 100,
    },
    { x: 0, y: 0, width: 10, height: 10, naturalWidth: 0, naturalHeight: 100 },
    {
      x: NaN,
      y: 0,
      width: 10,
      height: 10,
      naturalWidth: 100,
      naturalHeight: 100,
    },
  ])("rejects invalid crops without returning an original", (crop) => {
    expect(() => getVisibleImageTransform({ ...base, crop })).toThrow(
      "裁切或变换数据无效",
    );
  });
  it("builds syntactically valid isolated drawing code", () => {
    const transform = getVisibleImageTransform({ ...base, scale: [-1, 1] })!;
    expect(
      () => new Function(visibleImageDrawExpression(transform)),
    ).not.toThrow();
  });
});
