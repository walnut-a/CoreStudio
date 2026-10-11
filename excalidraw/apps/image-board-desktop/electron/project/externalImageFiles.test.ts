import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverExternalImageFiles,
  readStableExternalImage,
} from "./externalImageFiles";

const roots: string[] = [];
const createRoot = async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-intake-files-"),
  );
  roots.push(root);
  return root;
};
const put = async (root: string, relativePath: string, data = "image") => {
  const file = path.join(root, relativePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  return file;
};
afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe("external image discovery", () => {
  it("excludes internal trees, temporary files, nested projects and symbolic links", async () => {
    const root = await createRoot();
    for (const file of [
      "cache/a.png",
      "exports/a.png",
      ".hidden/a.png",
      "image.png.part",
      ".draft.png",
      "child/project.json",
      "child/photo.png",
    ])
      await put(root, file);
    await put(root, "assets/unregistered.png");
    const outside = await createRoot();
    await put(outside, "outside.png");
    await fs.symlink(outside, path.join(root, "linked-directory"));
    await fs.symlink(
      path.join(outside, "outside.png"),
      path.join(root, "linked.png"),
    );
    const result = await discoverExternalImageFiles(root, { recursive: true });
    expect(
      result.files.map((file) => [file.relativePath, file.location]),
    ).toEqual([["assets/unregistered.png", "managed"]]);
  });
});

describe("stable external image reading", () => {
  it("rejects escapes, internal paths and links even when passed directly", async () => {
    const root = await createRoot();
    const outside = await createRoot();
    const file = await put(outside, "outside.png");
    await fs.symlink(file, path.join(root, "link.png"));
    await put(root, "cache/cached.png");
    for (const relativePath of [
      "../outside.png",
      "link.png",
      "cache/cached.png",
    ]) {
      await expect(
        readStableExternalImage({
          projectPath: root,
          relativePath,
          now: 1000,
          stableMs: 0,
        }),
      ).rejects.toThrow();
    }
  });

  it("bounds memory before reading an oversized file", async () => {
    const root = await createRoot();
    await put(root, "large.png", "12345");
    await expect(
      readStableExternalImage({
        projectPath: root,
        relativePath: "large.png",
        now: 1000,
        stableMs: 0,
        maxBytes: 4,
      }),
    ).rejects.toThrow("大小");
  });
});
