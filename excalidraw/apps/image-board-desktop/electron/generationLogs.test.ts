import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import type { GenerationRequest, GenerationResponse } from "../src/shared/providerTypes";

import { getGenerationLogsDirectory, writeGenerationLog } from "./generationLogs";

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

const request: GenerationRequest = {
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "工业设计渲染图",
  width: 1024,
  height: 1024,
  imageCount: 1,
};

const response: GenerationResponse = {
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  seed: null,
  createdAt: "2026-04-16T01:50:00.000Z",
  images: [
    {
      fileName: "zenmux-1.png",
      mimeType: "image/png",
      dataBase64: Buffer.from("image-bytes").toString("base64"),
      width: 1024,
      height: 1024,
    },
  ],
};

describe("generationLogs", () => {
  it("writes a success log under exports/generation-logs", async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-log-"));
    tempDirectories.push(projectPath);

    const filePath = await writeGenerationLog({
      projectPath,
      request,
      requestSummary: "provider=zenmux model=google/gemini-3-pro-image-preview",
      requestPayload: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
      }),
      response,
    });

    expect(filePath).toContain(getGenerationLogsDirectory(projectPath));
    const content = JSON.parse(await fs.readFile(filePath!, "utf8"));
    expect(content.status).toBe("success");
    expect(content.request.payload.model).toBe("google/gemini-3-pro-image-preview");
    expect(content.response.images[0].byteLength).toBeGreaterThan(0);
  });

  it("writes an error log with the request payload and error message", async () => {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-log-"));
    tempDirectories.push(projectPath);

    const filePath = await writeGenerationLog({
      projectPath,
      request,
      requestSummary: "provider=zenmux model=google/gemini-3-pro-image-preview",
      requestPayload: JSON.stringify({
        contents: [
          {
            kind: "text",
            text: "工业设计渲染图",
          },
        ],
      }),
      error: new Error("模型没有返回图片。"),
    });

    const content = JSON.parse(await fs.readFile(filePath!, "utf8"));
    expect(content.status).toBe("error");
    expect(content.error.message).toContain("模型没有返回图片");
    expect(content.request.payload.contents[0].text).toBe("工业设计渲染图");
  });
});
