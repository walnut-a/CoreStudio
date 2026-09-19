import { expect, it } from "vitest";
import { captureLayout, mergeExternalLayout } from "./projectLayout";
const image = {
  id: "a",
  type: "image",
  fileId: "f",
  x: 10,
  y: 20,
  width: 100,
  height: 80,
  angle: 0,
  version: 1,
  versionNonce: 1,
  isDeleted: false,
};
it("applies externally edited positions without changing unrelated elements or order", () => {
  const other = { ...image, id: "b" };
  const base = [image, other];
  const layout = captureLayout(base);
  layout.elements.a.x = 120;
  const result = mergeExternalLayout(base, base, layout);
  expect(result.elements[0]).toMatchObject({ x: 120, version: 2 });
  expect(result.elements[1]).toEqual(other);
});
it("merges independent edits and rejects a conflict on the same field", () => {
  const layout = captureLayout([image]);
  layout.elements.a.x = 120;
  expect(
    mergeExternalLayout([image], [{ ...image, y: 300 }], layout).elements[0],
  ).toMatchObject({ x: 120, y: 300 });
  expect(() =>
    mergeExternalLayout([image], [{ ...image, x: 200 }], layout),
  ).toThrow(/冲突/);
});
it("isolates invalid and missing records without deleting or resurrecting elements", () => {
  const deleted = { ...image, id: "removed", isDeleted: true };
  const layout = captureLayout([image, deleted]);
  layout.elements.a.width = -1;
  delete layout.elements.removed;
  const result = mergeExternalLayout(
    [image, deleted],
    [image, deleted],
    layout,
  );
  expect(result.elements).toEqual([image, deleted]);
  expect(result.issues).toEqual(["a"]);
});
it("preserves unknown layout fields and explicit order when capturing the next result", () => {
  const old = { ...captureLayout([image]), order: ["a"], custom: "keep" };
  const next = captureLayout([{ ...image, x: 90 }], old);
  expect(next.custom).toBe("keep");
  expect(next.order).toEqual(["a"]);
});
