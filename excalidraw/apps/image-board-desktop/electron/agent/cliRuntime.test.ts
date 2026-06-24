import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";

import { runCli } from "./cliRuntime";

import type { ImportedImagePayload } from "../../src/shared/desktopBridgeTypes";

const baseUrl = "http://127.0.0.1:49152";
const readToken = "read-token-1";
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
      CORESTUDIO_AGENT_READ_TOKEN: readToken,
    },
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
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    0x00, 0x00,
    0x00, 0x00,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
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
  it.each([
    {
      name: "agent status",
      argv: ["agent", "status", "--json"],
      route: AGENT_HTTP_ROUTES.status,
      method: "GET",
    },
    {
      name: "agent capabilities",
      argv: ["agent", "capabilities", "--json"],
      route: AGENT_HTTP_ROUTES.capabilities,
      method: "GET",
    },
    {
      name: "agent authorize",
      argv: [
        "agent",
        "authorize",
        "--permissions",
        "write-board,generate-image",
        "--reason",
        "生成参考图",
        "--ttl-seconds",
        "604800",
        "--json",
      ],
      route: AGENT_HTTP_ROUTES.authorize,
      method: "POST",
      body: {
        permissions: ["write-board", "generate-image"],
        reason: "生成参考图",
        ttlSeconds: 604800,
      },
    },
    {
      name: "agent context",
      argv: ["agent", "context", "--json"],
      route: AGENT_HTTP_ROUTES.context,
      method: "GET",
    },
    {
      name: "project current",
      argv: ["project", "current", "--json"],
      route: AGENT_HTTP_ROUTES.projectCurrent,
      method: "GET",
    },
    {
      name: "scene snapshot",
      argv: ["scene", "snapshot", "--json"],
      route: AGENT_HTTP_ROUTES.sceneSnapshot,
      method: "GET",
    },
    {
      name: "scene selection",
      argv: ["scene", "selection", "--json"],
      route: AGENT_HTTP_ROUTES.sceneSelection,
      method: "GET",
    },
    {
      name: "scene add-image",
      argv: [
        "scene",
        "add-image",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "/tmp/a.png",
        "--json",
      ],
      route: AGENT_HTTP_ROUTES.sceneAddImage,
      method: "POST",
      body: {
        ...imagePayload,
        taskId: "task-1",
        writeToken: "write-1",
      },
    },
    {
      name: "scene add-prompt dry-run",
      argv: [
        "scene",
        "add-prompt",
        "--text",
        "prompt",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--dry-run",
        "--json",
      ],
      route: AGENT_HTTP_ROUTES.sceneAddPrompt,
      method: "POST",
      body: {
        text: "prompt",
        taskId: "task-1",
        writeToken: "write-1",
        dryRun: true,
      },
    },
    {
      name: "generate jsonl",
      argv: [
        "generate",
        "--prompt",
        "prompt",
        "--use-selection",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--jsonl",
      ],
      route: AGENT_HTTP_ROUTES.generate,
      method: "POST",
      body: {
        prompt: "prompt",
        useSelection: true,
        taskId: "task-1",
        writeToken: "write-1",
      },
      jsonl: true,
    },
    {
      name: "task complete",
      argv: [
        "task",
        "complete",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
      route: AGENT_HTTP_ROUTES.taskComplete,
      method: "POST",
      body: {
        taskId: "task-1",
        writeToken: "write-1",
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
          Authorization: `Bearer ${readToken}`,
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
        readToken: "session-token",
        currentProject: null,
        updatedAt: "2026-06-24T08:00:00.000Z",
      });
    });

    const result = await runCommand(["agent", "status", "--json"], {
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
        Authorization: "Bearer session-token",
      },
    });
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
  ])("builds the default add-image payload for $name files", async ({
    filePath,
    buffer,
    mimeType,
    width,
    height,
  }) => {
    const records: RequestRecord[] = [];
    const fetch = createFetch(okEnvelope, records);
    const readImageFile = vi.fn(async () => buffer);

    const result = await runCommand(
      [
        "scene",
        "add-image",
        filePath,
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
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
      taskId: "task-1",
      writeToken: "write-1",
    });
  });

  it("returns command failed when the default svg inspector cannot find dimensions", async () => {
    const fetch = createFetch();
    const readImageFile = vi.fn(async () =>
      Buffer.from("<svg><rect width=\"10\" height=\"10\" /></svg>"),
    );

    const result = await runCommand(
      [
        "scene",
        "add-image",
        "/tmp/source.svg",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
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
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["agent status", ["agent", "status", "--json"]],
    ["agent capabilities", ["agent", "capabilities", "--json"]],
    [
      "agent authorize",
      [
        "agent",
        "authorize",
        "--permissions",
        "write-board,generate-image",
        "--reason",
        "生成参考图",
        "--json",
      ],
    ],
    ["agent context", ["agent", "context", "--json"]],
    ["project current", ["project", "current", "--json"]],
    ["scene snapshot", ["scene", "snapshot", "--json"]],
    ["scene selection", ["scene", "selection", "--json"]],
    [
      "scene add-image",
      [
        "scene",
        "add-image",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "/tmp/a.png",
        "--json",
      ],
    ],
    [
      "scene add-prompt",
      [
        "scene",
        "add-prompt",
        "--text",
        "prompt",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
    ],
    [
      "generate",
      [
        "generate",
        "--prompt",
        "prompt",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--jsonl",
      ],
    ],
    [
      "task complete",
      [
        "task",
        "complete",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
    ],
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

    const result = await runCommand(["agent", "context", "--json"], {
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

    const result = await runCommand(["agent", "context", "--json"], {
      fetch: fetch as ReturnType<typeof createFetch>,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(invalidJsonEnvelope)}\n`);
  });

  it("returns command failed when the bridge returns a non-envelope object", async () => {
    const fetch = createFetch({ ready: true });

    const result = await runCommand(["agent", "context", "--json"], {
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

    const result = await runCommand(["agent", "status", "--json"], {
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

    const result = await runCommand(["agent", "status", "--json"], {
      fetch: fetch as ReturnType<typeof createFetch>,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(`${JSON.stringify(unavailableEnvelope)}\n`);
  });

  it.each([
    {
      name: "scene add-image",
      argv: ["scene", "add-image", "/tmp/a.png", "--task-id", "task-1", "--json"],
    },
    {
      name: "scene add-prompt",
      argv: [
        "scene",
        "add-prompt",
        "--text",
        "prompt",
        "--write-token",
        "write-1",
        "--json",
      ],
    },
    {
      name: "generate",
      argv: [
        "generate",
        "--prompt",
        "prompt",
        "--task-id",
        "task-1",
        "--jsonl",
      ],
    },
    {
      name: "task complete",
      argv: ["task", "complete", "--write-token", "write-1", "--json"],
    },
  ])("fails $name locally when task/write token fields are missing", async ({ argv }) => {
    const fetch = createFetch();
    const readFile = vi.fn(async () => {
      throw new Error("session descriptor should not be read");
    });
    const readImagePayload = vi.fn(async () => imagePayload);

    const result = await runCommand(argv, {
      fetch,
      readFile,
      readImagePayload,
    });

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "Write commands require --task-id and --write-token.",
      },
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
    expect(readImagePayload).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "unknown flag",
      argv: ["agent", "status", "--bogus", "--json"],
      message: "Unknown flag: --bogus",
    },
    {
      name: "multiple add-image positionals",
      argv: [
        "scene",
        "add-image",
        "/tmp/a.png",
        "/tmp/b.png",
        "--task-id",
        "task-1",
        "--write-token",
        "write-1",
        "--json",
      ],
      message: "scene add-image accepts exactly one image path.",
    },
    {
      name: "extra read positional",
      argv: ["scene", "selection", "extra", "--json"],
      message: "scene selection does not accept positional arguments.",
    },
    {
      name: "invalid authorize ttl",
      argv: ["agent", "authorize", "--ttl-seconds", "0", "--json"],
      message: "--ttl-seconds must be a positive number.",
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
