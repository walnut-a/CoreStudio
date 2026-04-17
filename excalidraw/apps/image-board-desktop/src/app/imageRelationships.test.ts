import { describe, expect, it } from "vitest";

import type { ImageRecordMap } from "../shared/projectTypes";
import {
  getImageAncestors,
  getImageDescendants,
} from "./imageRelationships";

const imageRecords: ImageRecordMap = {
  root: {
    fileId: "root",
    assetPath: "assets/root.png",
    sourceType: "imported",
    width: 1024,
    height: 1024,
    createdAt: "2026-04-15T08:00:00.000Z",
    mimeType: "image/png",
    prompt: "初始草图",
  },
  child: {
    fileId: "child",
    assetPath: "assets/child.png",
    sourceType: "generated",
    width: 1024,
    height: 1024,
    createdAt: "2026-04-15T08:10:00.000Z",
    mimeType: "image/png",
    prompt: "第一轮细化",
    parentFileId: "root",
  },
  grandchild: {
    fileId: "grandchild",
    assetPath: "assets/grandchild.png",
    sourceType: "generated",
    width: 1024,
    height: 1024,
    createdAt: "2026-04-15T08:20:00.000Z",
    mimeType: "image/png",
    prompt: "第二轮细化",
    parentFileId: "child",
  },
  sibling: {
    fileId: "sibling",
    assetPath: "assets/sibling.png",
    sourceType: "generated",
    width: 1024,
    height: 1024,
    createdAt: "2026-04-15T08:30:00.000Z",
    mimeType: "image/png",
    prompt: "另一个方向",
    parentFileId: "root",
  },
};

describe("imageRelationships", () => {
  it("returns ancestors from the earliest source to the direct parent", () => {
    expect(getImageAncestors(imageRecords, imageRecords.grandchild)).toEqual([
      imageRecords.root,
      imageRecords.child,
    ]);
  });

  it("returns descendants as a flattened depth-first list with depth info", () => {
    expect(getImageDescendants(imageRecords, imageRecords.root)).toEqual([
      {
        record: imageRecords.child,
        depth: 0,
      },
      {
        record: imageRecords.grandchild,
        depth: 1,
      },
      {
        record: imageRecords.sibling,
        depth: 0,
      },
    ]);
  });
});
