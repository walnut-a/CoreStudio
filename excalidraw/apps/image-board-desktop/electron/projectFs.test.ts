import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createProjectStructure,
  persistImageAssets,
  readProjectBundle,
} from "./projectFs";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("projectFs", () => {
  it("creates the expected project folder structure", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "My Prompt Board");

    await expect(fs.stat(path.join(project.projectPath, "assets"))).resolves
      .toBeTruthy();
    await expect(fs.stat(path.join(project.projectPath, "exports"))).resolves
      .toBeTruthy();

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.project.name).toBe("My Prompt Board");
    expect(bundle.imageRecords).toEqual({});
  });

  it("persists generated assets and records them by file id", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-"));
    tempDirectories.push(root);

    const project = await createProjectStructure(root, "Asset Test");

    const records = await persistImageAssets({
      projectPath: project.projectPath,
      files: [
        {
          fileId: "file-123",
          dataBase64: Buffer.from("hello world").toString("base64"),
          mimeType: "image/png",
          width: 512,
          height: 512,
          sourceType: "generated",
          prompt: "chair sketch",
          model: "fal-ai/flux/schnell",
          provider: "fal",
          createdAt: "2026-04-12T12:00:00.000Z",
        },
      ],
    });

    expect(records["file-123"].assetPath).toContain("assets/");

    const bundle = await readProjectBundle(project.projectPath);
    expect(bundle.imageRecords["file-123"].prompt).toBe("chair sketch");
  });
});
