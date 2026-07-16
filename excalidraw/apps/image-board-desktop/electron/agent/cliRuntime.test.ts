import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";

import { runCli } from "./cliRuntime";

import type { ImportedImagePayload } from "../../src/shared/desktopBridgeTypes";

const baseUrl = "http://127.0.0.1:49152";
const projectToken = "project-token-1";
const boardUrl =
  "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A49152";
const okEnvelope = {
  ok: true,
  data: {
    accepted: true,
  },
};
const unavailableEnvelope = {
  ok: false,
  error: {
    code: "BRIDGE_UNAVAILABLE",
    message: "CoreStudio is not running or Agent Bridge is not enabled.",
  },
};
const discoveredButUnreachableEnvelope = {
  ok: false,
  error: {
    code: "BRIDGE_UNAVAILABLE",
    message:
      "CoreStudio session was discovered, but the CLI could not connect to its local Agent Bridge. If this command is running in Codex, allow it to run outside the network sandbox so it can access localhost.",
    details: {
      baseUrl,
      sessionDiscovered: true,
      cause: "connect ECONNREFUSED",
    },
  },
};
const invalidJsonEnvelope = {
  ok: false,
  error: {
    code: "COMMAND_FAILED",
    message: "Agent Bridge returned a non-JSON response.",
  },
};
const invalidEnvelope = {
  ok: false,
  error: {
    code: "COMMAND_FAILED",
    message: "Agent Bridge returned an invalid response.",
  },
};
const imagePayload: ImportedImagePayload = {
  fileId: "file-1",
  fileName: "a.png",
  mimeType: "image/png",
  dataBase64: "ZmFrZQ==",
  width: 320,
  height: 240,
  createdAt: "2026-06-24T08:00:00.000Z",
};
const fixedUuid = "00000000-0000-4000-8000-000000000001";

interface RequestRecord {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

const normalizeHeaders = (
  headers: HeadersInit | undefined,
): Record<string, string> => {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
};

const createFetch = (
  responseBody: unknown = okEnvelope,
  records: RequestRecord[] = [],
) =>
  vi.fn(async (url: string, init: RequestInit = {}) => {
    records.push({
      url,
      method: init.method ?? "GET",
      headers: normalizeHeaders(init.headers),
      ...(typeof init.body === "string" ? { body: init.body } : {}),
    });

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  });

const runCommand = async (
  argv: string[],
  options: {
    env?: NodeJS.ProcessEnv;
    executablePath?: string;
    fetch?: ReturnType<typeof createFetch>;
    readFile?: (filePath: string, encoding: "utf8") => Promise<string>;
    readImageFile?: (filePath: string) => Promise<Buffer>;
    readImagePayload?: (filePath: string) => Promise<ImportedImagePayload>;
    now?: () => Date;
    randomId?: () => string;
  } = {},
) => {
  let stdout = "";
  let stderr = "";
  const exitCode = await runCli(argv, {
    stdout: {
      write: (chunk: string) => {
        stdout += chunk;
      },
    },
    stderr: {
      write: (chunk: string) => {
        stderr += chunk;
      },
    },
    env: options.env ?? {
      CORESTUDIO_AGENT_BRIDGE_URL: baseUrl,
      CORESTUDIO_AGENT_PROJECT_TOKEN: projectToken,
    },
    executablePath: options.executablePath,
    fetch: options.fetch,
    readFile: options.readFile,
    readImageFile: options.readImageFile,
    readImagePayload: options.readImagePayload,
    now: options.now,
    randomId: options.randomId,
  });

  return {
    exitCode,
    stdout,
    stderr,
  };
};

const createPngBuffer = (width: number, height: number) => {
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from("IHDR", "ascii"),
    Buffer.alloc(13),
  ]);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
};

const createJpegBuffer = (width: number, height: number) => {
  const buffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x00, 0x00, 0x00, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
  ]);
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
};

const createWebpVp8xBuffer = (width: number, height: number) => {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
};

const parseRequestBody = (records: RequestRecord[]) =>
  JSON.parse(records[0].body ?? "") as Record<string, unknown>;

describe("runCli", () => {
  it.each(["--version", "-v"])(
    "prints CLI and integration versions for %s without discovering the bridge",
    async (flag) => {
      const fetch = createFetch();
      const readFile = vi.fn(async () => {
        throw new Error("should not discover session");
      });

      const result = await runCommand([flag], {
        env: {},
        fetch,
        readFile,
      });

      expect(result).toEqual({
        exitCode: 0,
        stdout:
          "CoreStudio 1.1.19 (Codex integration 1.1.0, bridge protocol 1)\n",
        stderr: "",
      });
      expect(fetch).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it("prints machine-readable version information", async () => {
    const result = await runCommand(["--version", "--json"], {
      env: {},
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      data: {
        appVersion: "1.1.19",
        integrationVersion: "1.1.0",
        bridgeProtocolVersion: 1,
      },
    });
  });

  it("keeps read status compact and free of project records", async () => {
    const statusEnvelope = {
      ok: true as const,
      data: {
        ready: true,
        currentProject: {
          projectPath: "/tmp/project",
          name: "Current Project",
        },
        boardUrl: "http://127.0.0.1:49321/agent-board",
      },
    };
    const result = await runCommand(["read", "status", "--json"], {
      fetch: createFetch(statusEnvelope),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeLessThan(1024);
    expect(result.stdout).not.toContain("imageRecords");
    expect(result.stdout).not.toContain("providers");
    expect(JSON.parse(result.stdout)).toEqual(statusEnvelope);
  });

  it.each(["--help", "-h"])(
    "prints top-level help for %s without discovering the bridge",
    async (flag) => {
      const fetch = createFetch();
      const readFile = vi.fn(async () => {
        throw new Error("should not discover session");
      });

      const result = await runCommand([flag], {
        env: {},
        fetch,
        readFile,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Usage: corestudio <tool> <command>");
      expect(result.stdout).toContain("read    Read project and bridge state");
      expect(result.stdout).toContain("write   Write images and prompts");
      expect(result.stdout).toContain("edit    Locate or select scene content");
      expect(result.stdout).toContain("bash    Print shell integration helpers");
      expect(result.stdout).toContain("-v, --version");
      expect(result.stdout).toContain("-h, --help");
      expect(fetch).not.toHaveBeenCalled();
      expect(readFile).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: "read status",
      argv: ["read", "status", "--json"],
      route: AGENT_HTTP_ROUTES.status,
      method: "GET",
    },
    {
      name: "read capabilities",
      argv: ["read", "capabilities", "--json"],
      route: AGENT_HTTP_ROUTES.capabilities,
      method: "GET",
    },
    {
      name: "read context",
      argv: ["read", "context", "--json"],
      route: AGENT_HTTP_ROUTES.context,
      method: "GET",
    },
    {
      name: "read project",
      argv: ["read", "project", "--json"],
      route: AGENT_HTTP_ROUTES.projectCurrent,
      method: "GET",
    },
    {
      name: "read scene",
      argv: ["read", "scene", "--json"],
      route: AGENT_HTTP_ROUTES.sceneSnapshot,
      method: "GET",
    },
    {
      name: "read selection",
      argv: ["read", "selection", "--json"],
      route: AGENT_HTTP_ROUTES.sceneSelection,
      method: "GET",
    },
    {
      name: "read records",
      argv: ["read", "records", "--json"],
      route: "/v1/project/records",
      method: "GET",
    },
    {
      name: "read health",
      argv: ["read", "health", "--json"],
      route: "/v1/project/health",
      method: "GET",
    },
    {
      name: "read board",
      argv: ["read", "board", "--json"],
      route: AGENT_HTTP_ROUTES.sceneBoard,
      method: "GET",
    },
    {
      name: "read browser state",
      argv: ["read", "browser-state", "--json"],
      route: AGENT_HTTP_ROUTES.browserState,
      method: "GET",
    },
    {
      name: "read ACP runs",
      argv: ["read", "acp-runs", "--json"],
      route: "/v1/acp/runs",
      method: "GET",
    },
    {
      name: "read ACP threads",
      argv: ["read", "acp-threads", "--json"],
      route: "/v1/acp/threads",
      method: "GET",
    },
    {
      name: "read ACP run",
      argv: ["read", "acp-run", "--task-id", "task-1", "--json"],
      route: "/v1/acp/run",
      method: "POST",
      body: {
        taskId: "task-1",
      },
    },
    {
      name: "read ACP thread",
      argv: ["read", "acp-thread", "--thread-id", "thread-1", "--json"],
      route: "/v1/acp/thread",
      method: "POST",
      body: {
        threadId: "thread-1",
      },
    },
    {
      name: "read image-paths for selected images",
      argv: ["read", "image-paths", "--selection", "--json"],
      route: "/v1/scene/image-paths",
      method: "POST",
      body: {
        selectionOnly: true,
      },
    },
    {
      name: "read image-paths for specific file ids",
      argv: ["read", "image-paths", "--file-ids", "file-1,file-2", "--json"],
      route: "/v1/scene/image-paths",
      method: "POST",
      body: {
        fileIds: ["file-1", "file-2"],
      },
    },
    {
      name: "read image-paths for all images",
      argv: ["read", "image-paths", "--all", "--json"],
      route: "/v1/scene/image-paths",
      method: "POST",
      body: {
        all: true,
      },
    },
    {
      name: "write image",
      argv: ["write", "image", "/tmp/a.png", "--origin", "acp-agent", "--json"],
      route: AGENT_HTTP_ROUTES.sceneAddImage,
      method: "POST",
      body: {
        ...imagePayload,
        sourceType: "generated",
        generationOrigin: "acp-agent",
      },
    },
    {
      name: "write prompt dry-run",
      argv: ["write", "prompt", "--text", "prompt", "--dry-run", "--json"],
      route: AGENT_HTTP_ROUTES.sceneAddPrompt,
      method: "POST",
      body: {
        text: "prompt",
        dryRun: true,
      },
    },
    {
      name: "write generation jsonl",
      argv: ["write", "generation", "--prompt", "prompt", "--use-selection", "--jsonl"],
      route: AGENT_HTTP_ROUTES.generate,
      method: "POST",
      body: {
        prompt: "prompt",
        useSelection: true,
      },
      jsonl: true,
    },
    {
      name: "edit locate image",
      argv: ["edit", "locate", "--file-id", "file-1", "--json"],
      route: "/v1/scene/locate",
      method: "POST",
      body: {
        fileId: "file-1",
      },
    },
    {
      name: "edit select elements and images",
      argv: [
        "edit",
        "select",
        "--element-ids",
        "element-1,element-2",
        "--file-ids",
        "file-1",
        "--json",
      ],
      route: "/v1/scene/select",
      method: "POST",
      body: {
        elementIds: ["element-1", "element-2"],
        fileIds: ["file-1"],
      },
    },
  ])(
    "sends $name to the bridge with the expected HTTP request",
    async ({ argv, route, method, body, jsonl }) => {
      const records: RequestRecord[] = [];
      const fetch = createFetch(okEnvelope, records);
      const readFile = vi.fn(async () => {
        throw new Error("session descriptor should not be read");
      });
      const readImagePayload = vi.fn(async () => imagePayload);

      const result = await runCommand(argv, {
        fetch,
        readFile,
        readImagePayload,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        url: `${baseUrl}${route}`,
        method,
        headers: {
          Authorization: `Bearer ${projectToken}`,
          Accept: "application/json",
        },
      });
      expect(readFile).not.toHaveBeenCalled();
      if (route === AGENT_HTTP_ROUTES.sceneAddImage) {
        expect(readImagePayload).toHaveBeenCalledWith("/tmp/a.png");
      } else {
        expect(readImagePayload).not.toHaveBeenCalled();
      }
      if (body) {
        expect(records[0].headers["Content-Type"]).toBe("application/json");
        expect(JSON.parse(records[0].body ?? "")).toEqual(body);
      } else {
        expect(records[0].body).toBeUndefined();
      }
      if (jsonl) {
        expect(result.stdout.endsWith("\n")).toBe(true);
        const lines = result.stdout.trimEnd().split("\n");
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0])).toEqual(okEnvelope);
      } else {
        expect(result.stdout).toBe(`${JSON.stringify(okEnvelope)}\n`);
      }
    },
  );

  it("discovers the bridge from the session descriptor when env vars are absent", async () => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(okEnvelope, records);
    const sessionPath = path.resolve("/tmp/corestudio-agent-session.json");
    const readFile = vi.fn(async (filePath: string, encoding: "utf8") => {
      expect(filePath).toBe(sessionPath);
      expect(encoding).toBe("utf8");
      return JSON.stringify({
        protocolVersion: 1,
        appName: "CoreStudio",
        appVersion: "1.1.10",
        bridge: {
          host: "127.0.0.1",
          port: 49321,
          baseUrl: "http://127.0.0.1:49321",
        },
        projectToken: "session-project-token",
        currentProject: null,
        updatedAt: "2026-06-24T08:00:00.000Z",
      });
    });

    const result = await runCommand(["read", "status", "--json"], {
      env: {
        CORESTUDIO_AGENT_SESSION_FILE: sessionPath,
      },
      fetch,
      readFile,
    });

    expect(result.exitCode).toBe(0);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      url: "http://127.0.0.1:49321/v1/status",
      headers: {
        Authorization: "Bearer session-project-token",
      },
    });
  });

  it("prints the current Agent Board URL as JSON", async () => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(
      {
        ok: true,
        data: {
          ready: true,
          currentProject: null,
          boardUrl,
        },
      },
      records,
    );

    const result = await runCommand(["read", "board-url", "--json"], {
      fetch,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      `${JSON.stringify({
        ok: true,
        data: {
          boardUrl: `${boardUrl}&projectToken=${projectToken}`,
        },
      })}\n`,
    );
    expect(records[0]).toMatchObject({
      url: `${baseUrl}${AGENT_HTTP_ROUTES.status}`,
      method: "GET",
    });
  });

  it("prints the current Agent Board URL in human mode", async () => {
    const fetch = createFetch({
      ok: true,
      data: {
        ready: true,
        currentProject: null,
        boardUrl,
      },
    });

    const result = await runCommand(["read", "board-url"], {
      fetch,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(`${boardUrl}&projectToken=${projectToken}\n`);
  });

  it("returns a command failure when the bridge has no Agent Board URL", async () => {
    const fetch = createFetch({
      ok: true,
      data: {
        ready: true,
        currentProject: null,
        boardUrl: null,
      },
    });

    const result = await runCommand(["read", "board-url", "--json"], {
      fetch,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(
      `${JSON.stringify({
        ok: false,
        error: {
          code: "COMMAND_FAILED",
          message: "Agent Bridge did not return a Board URL.",
        },
      })}\n`,
    );
  });

  it("prints shell environment for bash mode without calling the bridge", async () => {
    const fetch = createFetch();

    const result = await runCommand(["bash", "env"], {
      fetch,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      `CORESTUDIO_AGENT_BRIDGE_URL='${baseUrl}' CORESTUDIO_AGENT_PROJECT_TOKEN='${projectToken}'\n`,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("prints command examples for bash mode as JSON", async () => {
    const fetch = createFetch();

    const result = await runCommand(["bash", "examples", "--json"], {
      fetch,
    });

    expect(result.exitCode).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: {
        environment: {
          CORESTUDIO_AGENT_BRIDGE_URL: baseUrl,
          CORESTUDIO_AGENT_PROJECT_TOKEN: projectToken,
        },
        examples: expect.arrayContaining([
          expect.stringContaining("read context --json"),
          expect.stringContaining("read board --json"),
          expect.stringContaining("read browser-state --json"),
          expect.stringContaining("write image /absolute/path/to/image.png"),
        ]),
      },
    });
  });

  it("uses the current CLI executable path in bash examples when available", async () => {
    const fetch = createFetch();

    const result = await runCommand(["bash", "examples", "--json"], {
      executablePath: "/Applications/CoreStudio/bin/corestudio.cjs",
      fetch,
    });

    expect(result.exitCode).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: {
        examples: expect.arrayContaining([
          expect.stringContaining(
            "node '/Applications/CoreStudio/bin/corestudio.cjs' read context --json",
          ),
        ]),
      },
    });
  });

  it.each([
    ["status", ["status", "--json"]],
    ["context", ["context", "--json"]],
    ["records", ["records", "--json"]],
    ["locate", ["locate", "--file-id", "file-1", "--json"]],
    ["image-paths", ["image-paths", "--selection", "--json"]],
    ["add-image", ["add-image", "/tmp/a.png", "--json"]],
  ])(
    "rejects the old top-level %s alias and keeps the four-tool surface",
    async (_name, argv) => {
      const fetch = createFetch();

      const result = await runCommand(argv, {
        fetch,
      });

      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout)).toMatchObject({
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: "CoreStudio CLI tools are: read, write, edit, bash.",
        },
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects session descriptors without a project token", async () => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(okEnvelope, records);
    const sessionPath = path.resolve("/tmp/corestudio-agent-session.json");
    const readFile = vi.fn(async () =>
      JSON.stringify({
        protocolVersion: 1,
        appName: "CoreStudio",
        appVersion: "1.1.10",
        bridge: {
          host: "127.0.0.1",
          port: 49321,
          baseUrl: "http://127.0.0.1:49321",
        },
        readToken: "legacy-session-token",
        currentProject: null,
        updatedAt: "2026-06-24T08:00:00.000Z",
      }),
    );

    const result = await runCommand(["read", "status", "--json"], {
      env: {
        CORESTUDIO_AGENT_SESSION_FILE: sessionPath,
      },
      fetch,
      readFile,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(unavailableEnvelope)}\n`);
    expect(records).toHaveLength(0);
  });

  it.each([
    {
      name: "png",
      filePath: "/tmp/source.png",
      buffer: createPngBuffer(320, 240),
      mimeType: "image/png",
      width: 320,
      height: 240,
    },
    {
      name: "jpeg",
      filePath: "/tmp/source.jpg",
      buffer: createJpegBuffer(640, 480),
      mimeType: "image/jpeg",
      width: 640,
      height: 480,
    },
    {
      name: "webp vp8x",
      filePath: "/tmp/source.webp",
      buffer: createWebpVp8xBuffer(800, 600),
      mimeType: "image/webp",
      width: 800,
      height: 600,
    },
    {
      name: "svg viewBox",
      filePath: "/tmp/source.svg",
      buffer: Buffer.from('<svg viewBox="0 0 1024 768"></svg>'),
      mimeType: "image/svg+xml",
      width: 1024,
      height: 768,
    },
  ])(
    "builds the default add-image payload for $name files",
    async ({ filePath, buffer, mimeType, width, height }) => {
      const records: RequestRecord[] = [];
      const fetch = createFetch(okEnvelope, records);
      const readImageFile = vi.fn(async () => buffer);

      const result = await runCommand(
        ["write", "image", filePath, "--origin", "acp-agent", "--json"],
        {
          fetch,
          readImageFile,
          randomId: () => fixedUuid,
          now: () => new Date("2026-06-24T08:00:00.000Z"),
        },
      );

      expect(result.exitCode).toBe(0);
      expect(readImageFile).toHaveBeenCalledWith(filePath);
      expect(parseRequestBody(records)).toMatchObject({
        fileId: fixedUuid,
        fileName: path.basename(filePath),
        mimeType,
        dataBase64: buffer.toString("base64"),
        width,
        height,
        createdAt: "2026-06-24T08:00:00.000Z",
        sourceType: "generated",
        generationOrigin: "acp-agent",
      });
    },
  );

  it("adds ACP provenance metadata to add-image payloads from CLI flags", async () => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(okEnvelope, records);
    const readImagePayload = vi.fn(async () => imagePayload);

    const result = await runCommand(
      [
        "write",
        "image",
        "/tmp/source.png",
        "--origin",
        "acp-agent",
        "--prompt",
        "优化这台 CNC",
        "--reference-file-ids",
        "file-source",
        "--reference-element-ids",
        "element-source",
        "--json",
      ],
      {
        fetch,
        readImagePayload,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(readImagePayload).toHaveBeenCalledWith("/tmp/source.png");
    expect(parseRequestBody(records)).toMatchObject({
      ...imagePayload,
      sourceType: "generated",
      generationOrigin: "acp-agent",
      prompt: "优化这台 CNC",
      referenceFileIds: ["file-source"],
      referenceElementIds: ["element-source"],
    });
  });

  it("adds ACP provenance metadata to add-image payloads from task environment", async () => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(okEnvelope, records);
    const readImagePayload = vi.fn(async () => imagePayload);

    const result = await runCommand(
      ["write", "image", "/tmp/source.png", "--json"],
      {
        env: {
          CORESTUDIO_AGENT_BRIDGE_URL: baseUrl,
          CORESTUDIO_AGENT_PROJECT_TOKEN: projectToken,
          CORESTUDIO_AGENT_TASK_ID: "task-1",
          CORESTUDIO_AGENT_THREAD_ID: "thread-1",
          CORESTUDIO_AGENT_USER_PROMPT: "优化这台 CNC",
          CORESTUDIO_AGENT_REFERENCE_FILE_IDS: "file-source",
          CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS: "element-source",
        },
        fetch,
        readImagePayload,
      },
    );

    expect(result.exitCode).toBe(0);
    expect(parseRequestBody(records)).toMatchObject({
      ...imagePayload,
      sourceType: "generated",
      generationOrigin: "acp-agent",
      generationTaskId: "task-1",
      generationThreadId: "thread-1",
      prompt: "优化这台 CNC",
      referenceFileIds: ["file-source"],
      referenceElementIds: ["element-source"],
    });
  });

  it("returns command failed when the default svg inspector cannot find dimensions", async () => {
    const fetch = createFetch();
    const readImageFile = vi.fn(async () =>
      Buffer.from('<svg><rect width="10" height="10" /></svg>'),
    );

    const result = await runCommand(
      ["write", "image", "/tmp/source.svg", "--origin", "acp-agent", "--json"],
      {
        fetch,
        readImageFile,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "COMMAND_FAILED",
        message:
          "Failed to read image payload: Unable to inspect SVG dimensions.",
        details: {
          stage: "read-image-payload",
          imagePath: "/tmp/source.svg",
          cause: "Unable to inspect SVG dimensions.",
        },
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["read status", ["read", "status", "--json"]],
    ["read capabilities", ["read", "capabilities", "--json"]],
    ["read context", ["read", "context", "--json"]],
    ["read project", ["read", "project", "--json"]],
    ["read board", ["read", "board", "--json"]],
    ["read browser-state", ["read", "browser-state", "--json"]],
    ["read scene", ["read", "scene", "--json"]],
    ["read selection", ["read", "selection", "--json"]],
    ["read records", ["read", "records", "--json"]],
    ["read health", ["read", "health", "--json"]],
    ["read acp-runs", ["read", "acp-runs", "--json"]],
    ["read acp-threads", ["read", "acp-threads", "--json"]],
    ["read acp-run", ["read", "acp-run", "--task-id", "task-1", "--json"]],
    ["read acp-thread", ["read", "acp-thread", "--thread-id", "thread-1", "--json"]],
    ["read image-paths", ["read", "image-paths", "--selection", "--json"]],
    ["write image", ["write", "image", "/tmp/a.png", "--origin", "acp-agent", "--json"]],
    ["write prompt", ["write", "prompt", "--text", "prompt", "--json"]],
    ["write generation", ["write", "generation", "--prompt", "prompt", "--jsonl"]],
    ["edit locate", ["edit", "locate", "--file-id", "file-1", "--json"]],
    ["edit select", ["edit", "select", "--element-ids", "element-1", "--json"]],
  ])("returns exit 1 when %s returns ok false", async (_name, argv) => {
    const errorEnvelope = {
      ok: false,
      error: {
        code: "PROJECT_REQUIRED",
        message: "A current CoreStudio project is required",
      },
    };
    const fetch = createFetch(errorEnvelope);

    const result = await runCommand(argv, {
      fetch,
      readImagePayload: vi.fn(async () => imagePayload),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(errorEnvelope)}\n`);
  });

  it("returns bridge ok false envelopes even when the HTTP status is 500", async () => {
    const errorEnvelope = {
      ok: false,
      error: {
        code: "COMMAND_FAILED",
        message: "Renderer command failed",
      },
    };
    const fetch = vi.fn(async () => {
      return new Response(JSON.stringify(errorEnvelope), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    const result = await runCommand(["read", "context", "--json"], {
      fetch: fetch as ReturnType<typeof createFetch>,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(errorEnvelope)}\n`);
  });

  it("returns command failed when the bridge returns non-JSON", async () => {
    const fetch = vi.fn(async () => {
      return new Response("<html>broken</html>", {
        status: 500,
        headers: {
          "Content-Type": "text/html",
        },
      });
    });

    const result = await runCommand(["read", "context", "--json"], {
      fetch: fetch as ReturnType<typeof createFetch>,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(invalidJsonEnvelope)}\n`);
  });

  it("returns command failed when the bridge returns a non-envelope object", async () => {
    const fetch = createFetch({ ready: true });

    const result = await runCommand(["read", "context", "--json"], {
      fetch,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(invalidEnvelope)}\n`);
  });

  it("prints the bridge unavailable JSON when discovery fails", async () => {
    const fetch = createFetch();
    const readFile = vi.fn(async () => {
      throw Object.assign(new Error("missing session"), {
        code: "ENOENT",
      });
    });

    const result = await runCommand(["read", "status", "--json"], {
      env: {},
      fetch,
      readFile,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(unavailableEnvelope)}\n`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps bridge fetch failures to bridge unavailable", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED");
    });

    const result = await runCommand(["read", "status", "--json"], {
      fetch: fetch as ReturnType<typeof createFetch>,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(
      `${JSON.stringify(discoveredButUnreachableEnvelope)}\n`,
    );
  });

  it.each([
    {
      name: "unknown flag",
      argv: ["read", "status", "--bogus", "--json"],
      message: "Unknown flag: --bogus",
    },
    {
      name: "multiple write image positionals",
      argv: ["write", "image", "/tmp/a.png", "/tmp/b.png", "--json"],
      message: "write image accepts exactly one image path.",
    },
    {
      name: "extra read positional",
      argv: ["read", "selection", "extra", "--json"],
      message: "read selection does not accept positional arguments.",
    },
    {
      name: "image paths without an explicit scope",
      argv: ["read", "image-paths", "--json"],
      message: "read image-paths requires --selection, --file-ids, or --all.",
    },
    {
      name: "ACP run without task id",
      argv: ["read", "acp-run", "--json"],
      message: "read acp-run requires --task-id.",
    },
    {
      name: "ACP thread without thread id",
      argv: ["read", "acp-thread", "--json"],
      message: "read acp-thread requires --thread-id.",
    },
    {
      name: "write image without generation origin",
      argv: ["write", "image", "/tmp/a.png", "--json"],
      message:
        "write image requires --origin unless an ACP task environment provides one.",
    },
    {
      name: "write image with empty reference file ids",
      argv: [
        "write",
        "image",
        "/tmp/a.png",
        "--origin",
        "acp-agent",
        "--reference-file-ids",
        " , ",
        "--json",
      ],
      message: "--reference-file-ids must include at least one value.",
    },
    {
      name: "edit locate without a target",
      argv: ["edit", "locate", "--json"],
      message: "edit locate requires --element-id or --file-id.",
    },
    {
      name: "edit select without a target",
      argv: ["edit", "select", "--json"],
      message: "edit select requires --element-ids or --file-ids.",
    },
  ])("fails locally for $name", async ({ argv, message }) => {
    const fetch = createFetch();
    const readImagePayload = vi.fn(async () => imagePayload);

    const result = await runCommand(argv, {
      fetch,
      readImagePayload,
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message,
      },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(readImagePayload).not.toHaveBeenCalled();
  });
});
