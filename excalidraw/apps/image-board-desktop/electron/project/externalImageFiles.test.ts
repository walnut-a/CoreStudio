import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  classifyExternalImagePath,
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
  it("registers ordinary project originals in place and copies only the root inbox tree", () => {
    for (const relativePath of [
      "image.png",
      "参考/中文 图.jpg",
      "collection/inbox/photo.webp",
      "assets/new.png",
    ]) {
      expect(classifyExternalImagePath(relativePath)).toMatchObject({
        relativePath,
        storageMode: "in-place",
      });
    }
    for (const relativePath of ["inbox/new.png", "inbox/参考/photo.svg"]) {
      expect(classifyExternalImagePath(relativePath)).toMatchObject({
        relativePath,
        storageMode: "copy-to-assets",
      });
    }
  });

  it("treats root and optional inbox equally and sorts recursive candidates", async () => {
    const root = await createRoot();
    await put(root, "root.PNG");
    expect(
      (await discoverExternalImageFiles(root, { recursive: true })).files.map(
        (file) => file.relativePath,
      ),
    ).toEqual(["root.PNG"]);
    await put(root, "inbox/photo.webp");
    await put(root, "参考/中文 图.jpg");
    await put(root, "notes.txt");
    const result = await discoverExternalImageFiles(root, { recursive: true });
    expect(result.files.map((file) => file.relativePath)).toEqual([
      "inbox/photo.webp",
      "root.PNG",
      "参考/中文 图.jpg",
    ]);
    expect(result.issues).toEqual([]);
  });

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

  it("can limit discovery to root and inbox without changing their rules", async () => {
    const root = await createRoot();
    for (const file of [
      "root.svg",
      "inbox/photo.png",
      "inbox/sub/deep.png",
      "ordinary/photo.png",
    ])
      await put(root, file);
    expect(
      (await discoverExternalImageFiles(root, { recursive: false })).files.map(
        (file) => file.relativePath,
      ),
    ).toEqual(["inbox/photo.png", "root.svg"]);
  });
});

describe("stable external image reading", () => {
  it("waits for an unchanged observation before returning content identity", async () => {
    const root = await createRoot();
    await put(root, "test.png", "complete-image");
    const first = await readStableExternalImage({
      projectPath: root,
      relativePath: "test.png",
      now: 1000,
      stableMs: 500,
    });
    expect(first.status).toBe("waiting");
    const second = await readStableExternalImage({
      projectPath: root,
      relativePath: "test.png",
      previous: first.observation,
      now: 1500,
      stableMs: 500,
    });
    expect(second.status).toBe("ready");
    if (second.status === "ready") {
      expect(second.buffer.toString()).toBe("complete-image");
      expect(second.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("resets stability after a later chunk and rejects a read that changes the file", async () => {
    const root = await createRoot();
    const file = await put(root, "test.png", "first");
    const first = await readStableExternalImage({
      projectPath: root,
      relativePath: "test.png",
      now: 1000,
      stableMs: 500,
    });
    await fs.appendFile(file, "second");
    const changed = await readStableExternalImage({
      projectPath: root,
      relativePath: "test.png",
      previous: first.observation,
      now: 2000,
      stableMs: 500,
    });
    expect(changed.status).toBe("waiting");
    const duringRead = await readStableExternalImage({
      projectPath: root,
      relativePath: "test.png",
      previous: changed.observation,
      now: 2500,
      stableMs: 500,
      readFile: async (handle) => {
        const buffer = await handle.readFile();
        await fs.appendFile(file, "third");
        return buffer;
      },
    });
    expect(duringRead.status).toBe("waiting");
  });

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
