import { expect, it } from "vitest";
import { captureLayout, mergeExternalLayout } from "./projectLayout";
it.each([1000, 5000, 10000])(
  "keeps %i placements in one document and updates only the changed element",
  (count) => {
    const elements = Array.from({ length: count }, (_, i) => ({
      id: `image-${i}`,
      fileId: `file-${i}`,
      type: "image",
      x: (i % 10) * 700,
      y: Math.floor(i / 10) * 500,
      width: 640,
      height: 400,
      angle: 0,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
    }));
    const start = performance.now();
    const layout = captureLayout(elements);
    layout.elements["image-0"].x = 20;
    const { elements: next } = mergeExternalLayout(elements, elements, layout);
    expect(next[0].x).toBe(20);
    expect(next.slice(1).every((e, i) => e === elements[i + 1])).toBe(true);
    const json = JSON.stringify(layout, null, 2);
    expect(JSON.parse(json).order).toHaveLength(count);
    console.info(
      `[layout-scale] elements=${count} metadataMiB=${(
        Buffer.byteLength(json) / 1048576
      ).toFixed(2)} elapsedMs=${(performance.now() - start).toFixed(1)}`,
    );
  },
);
