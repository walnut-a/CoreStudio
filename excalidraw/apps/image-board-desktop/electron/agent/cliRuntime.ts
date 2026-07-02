import { readFile as fsReadFile } from "node:fs/promises";

import {
  AGENT_HTTP_ROUTES,
  createAgentError,
  isAgentErrorCode,
} from "../../src/shared/agentBridgeTypes";
import { readLocalImagePayload } from "./localImagePayload";
import { getAgentSessionPath } from "./sessionPaths";

import type {
  AgentEnvelope,
} from "../../src/shared/agentBridgeTypes";
import type { ImportedImagePayload } from "../../src/shared/desktopBridgeTypes";
import type { LocalImagePayloadOptions } from "./localImagePayload";

type OutputMode = "human" | "json" | "jsonl";

interface CliWritable {
  write: (chunk: string) => unknown;
}

interface CliFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

interface CliFetchResponse {
  json: () => Promise<unknown>;
}

type CliFetch = (url: string, init?: CliFetchInit) => Promise<CliFetchResponse>;

export interface CliRuntimeOptions {
  stdout: CliWritable;
  stderr: CliWritable;
  env?: NodeJS.ProcessEnv;
  executablePath?: string;
  fetch?: CliFetch;
  readFile?: (filePath: string, encoding: "utf8") => Promise<string>;
  readImageFile?: (filePath: string) => Promise<Buffer>;
  readImagePayload?: (filePath: string) => Promise<ImportedImagePayload>;
  now?: () => Date;
  randomId?: () => string;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

interface BridgeSession {
  baseUrl: string;
  projectToken: string;
}

interface CliCommand {
  route?: string;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  imagePath?: string;
  local?: (
    bridge: BridgeSession,
    options: CliRuntimeOptions,
  ) => AgentEnvelope<unknown>;
  transformEnvelope?: (
    envelope: AgentEnvelope<unknown>,
  ) => AgentEnvelope<unknown>;
  formatHuman?: (data: unknown) => string;
}

interface ParsedArgs {
  flags: Record<string, string>;
  boolFlags: Set<string>;
  positionals: string[];
}

const bridgeUnavailableEnvelope = () =>
  createAgentError(
    "BRIDGE_UNAVAILABLE",
    "CoreStudio is not running or Agent Bridge is not enabled.",
  );

const badRequestEnvelope = (message: string) =>
  createAgentError("BAD_REQUEST", message);

const commandFailedEnvelope = (message: string) =>
  createAgentError("COMMAND_FAILED", message);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEnvelope = (value: unknown): value is AgentEnvelope<never> =>
  isObject(value) && "ok" in value;

const isAgentEnvelope = (value: unknown): value is AgentEnvelope<unknown> => {
  if (!isObject(value)) {
    return false;
  }

  if (value.ok === true) {
    return "data" in value;
  }

  if (value.ok !== false || !isObject(value.error)) {
    return false;
  }

  return (
    isAgentErrorCode(value.error.code) &&
    typeof value.error.message === "string"
  );
};

const hasFlag = (argv: readonly string[], flag: string) => argv.includes(flag);

const getOutputMode = (argv: readonly string[]): OutputMode => {
  if (hasFlag(argv, "--jsonl")) {
    return "jsonl";
  }
  if (hasFlag(argv, "--json")) {
    return "json";
  }
  return "human";
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const parseArgs = (
  tokens: readonly string[],
  config: {
    valueFlags?: readonly string[];
    boolFlags?: readonly string[];
  } = {},
): ParsedArgs | AgentEnvelope<never> => {
  const valueFlags = new Set(config.valueFlags ?? []);
  const boolFlags = new Set(["--json", "--jsonl", ...(config.boolFlags ?? [])]);
  const parsed: ParsedArgs = {
    flags: {},
    boolFlags: new Set<string>(),
    positionals: [],
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      parsed.positionals.push(token);
      continue;
    }

    if (boolFlags.has(token)) {
      parsed.boolFlags.add(token);
      continue;
    }

    if (!valueFlags.has(token)) {
      return badRequestEnvelope(`Unknown flag: ${token}`);
    }

    const value = tokens[index + 1];
    if (!value || value.startsWith("--")) {
      return badRequestEnvelope(`${token} requires a value.`);
    }

    parsed.flags[token] = value;
    index++;
  }

  return parsed;
};

const expectNoPositionals = (
  commandName: string,
  parsed: ParsedArgs,
): AgentEnvelope<never> | null => {
  if (parsed.positionals.length > 0) {
    return badRequestEnvelope(
      `${commandName} does not accept positional arguments.`,
    );
  }
  return null;
};

const requiredString = (
  value: string | undefined,
  message: string,
): string | AgentEnvelope<never> => {
  if (!value || !value.trim()) {
    return badRequestEnvelope(message);
  }
  return value;
};

const parseCsvFlag = (
  value: string | undefined,
  flagName: string,
): string[] | undefined | AgentEnvelope<never> => {
  if (value === undefined) {
    return undefined;
  }

  const values = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  if (!values.length) {
    return badRequestEnvelope(`${flagName} must include at least one value.`);
  }
  return values;
};

const parseFileIdsFlag = (
  value: string | undefined,
): string[] | undefined | AgentEnvelope<never> =>
  parseCsvFlag(value, "--file-ids");

const parseCommand = (
  argv: readonly string[],
): CliCommand | AgentEnvelope<never> => {
  const [tool, target] = argv;

  if (tool === "read") {
    if (target === "acp-run" || target === "acp-thread") {
      const idFlag = target === "acp-run" ? "--task-id" : "--thread-id";
      const parsed = parseArgs(argv.slice(2), {
        valueFlags: [idFlag],
      });
      if (isEnvelope(parsed)) {
        return parsed;
      }
      const positionalsError = expectNoPositionals(`read ${target}`, parsed);
      if (positionalsError) {
        return positionalsError;
      }
      const id = requiredString(
        parsed.flags[idFlag],
        `read ${target} requires ${idFlag}.`,
      );
      if (typeof id !== "string") {
        return id;
      }
      return {
        route:
          target === "acp-run"
            ? AGENT_HTTP_ROUTES.acpRun
            : AGENT_HTTP_ROUTES.acpThread,
        method: "POST",
        body: target === "acp-run" ? { taskId: id } : { threadId: id },
      };
    }

    if (target === "image-paths") {
      const parsed = parseArgs(argv.slice(2), {
        valueFlags: ["--file-ids"],
        boolFlags: ["--selection", "--all"],
      });
      if (isEnvelope(parsed)) {
        return parsed;
      }
      const positionalsError = expectNoPositionals("read image-paths", parsed);
      if (positionalsError) {
        return positionalsError;
      }
      const fileIds = parseFileIdsFlag(parsed.flags["--file-ids"]);
      if (isEnvelope(fileIds)) {
        return fileIds;
      }
      if (
        !fileIds &&
        !parsed.boolFlags.has("--selection") &&
        !parsed.boolFlags.has("--all")
      ) {
        return badRequestEnvelope(
          "read image-paths requires --selection, --file-ids, or --all.",
        );
      }
      return {
        route: AGENT_HTTP_ROUTES.sceneImagePaths,
        method: "POST",
        body: {
          ...(fileIds ? { fileIds } : {}),
          ...(parsed.boolFlags.has("--selection") ? { selectionOnly: true } : {}),
          ...(parsed.boolFlags.has("--all") ? { all: true } : {}),
        },
      };
    }

    const readRoutes: Record<
      string,
      { route: string; method: "GET"; formatHuman?: CliCommand["formatHuman"] }
    > = {
      status: { route: AGENT_HTTP_ROUTES.status, method: "GET" },
      capabilities: { route: AGENT_HTTP_ROUTES.capabilities, method: "GET" },
      context: { route: AGENT_HTTP_ROUTES.context, method: "GET" },
      project: { route: AGENT_HTTP_ROUTES.projectCurrent, method: "GET" },
      records: { route: AGENT_HTTP_ROUTES.projectRecords, method: "GET" },
      health: { route: AGENT_HTTP_ROUTES.projectHealth, method: "GET" },
      "acp-runs": { route: AGENT_HTTP_ROUTES.acpRuns, method: "GET" },
      "acp-threads": { route: AGENT_HTTP_ROUTES.acpThreads, method: "GET" },
      scene: { route: AGENT_HTTP_ROUTES.sceneSnapshot, method: "GET" },
      selection: { route: AGENT_HTTP_ROUTES.sceneSelection, method: "GET" },
      "board-url": {
        route: AGENT_HTTP_ROUTES.status,
        method: "GET",
        formatHuman: (data) =>
          isObject(data) && typeof data.boardUrl === "string"
            ? data.boardUrl
            : "OK",
      },
    };
    const route = target ? readRoutes[target] : null;
    if (!route) {
      return badRequestEnvelope(
        "read requires one of: status, capabilities, context, project, records, health, scene, selection, image-paths, board-url, acp-runs, acp-run, acp-threads, acp-thread.",
      );
    }
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals(`read ${target}`, parsed);
    if (positionalsError) {
      return positionalsError;
    }
    if (target === "board-url") {
      return {
        ...route,
        transformEnvelope: (envelope) => {
          if (!envelope.ok) {
            return envelope;
          }
          const data = envelope.data;
          if (!isObject(data) || typeof data.boardUrl !== "string") {
            return commandFailedEnvelope(
              "Agent Bridge did not return a Board URL.",
            );
          }
          return {
            ok: true,
            data: {
              boardUrl: data.boardUrl,
            },
          };
        },
      };
    }
    return route;
  }

  if (tool === "write" && target === "image") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: [
        "--origin",
        "--prompt",
        "--parent-file-id",
        "--reference-file-ids",
        "--reference-element-ids",
      ],
      boolFlags: ["--dry-run"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    if (parsed.positionals.length !== 1) {
      return badRequestEnvelope("write image accepts exactly one image path.");
    }
    const imagePath = requiredString(
      parsed.positionals[0],
      "write image requires an image path.",
    );
    if (typeof imagePath !== "string") {
      return imagePath;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneAddImage,
      method: "POST",
      imagePath,
      body: {
        ...(parsed.flags["--origin"]
          ? { generationOrigin: parsed.flags["--origin"] }
          : {}),
        ...(parsed.flags["--prompt"]
          ? { prompt: parsed.flags["--prompt"] }
          : {}),
        ...(parsed.flags["--parent-file-id"]
          ? { parentFileId: parsed.flags["--parent-file-id"] }
          : {}),
        ...(parsed.flags["--reference-file-ids"]
          ? { referenceFileIds: parsed.flags["--reference-file-ids"] }
          : {}),
        ...(parsed.flags["--reference-element-ids"]
          ? { referenceElementIds: parsed.flags["--reference-element-ids"] }
          : {}),
        ...(parsed.boolFlags.has("--dry-run") ? { dryRun: true } : {}),
      },
    };
  }

  if (tool === "write" && target === "prompt") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--text"],
      boolFlags: ["--dry-run"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("write prompt", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    const text = requiredString(
      parsed.flags["--text"],
      "write prompt requires --text.",
    );
    if (typeof text !== "string") {
      return text;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneAddPrompt,
      method: "POST",
      body: {
        text,
        ...(parsed.boolFlags.has("--dry-run") ? { dryRun: true } : {}),
      },
    };
  }

  if (tool === "write" && target === "generation") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--prompt"],
      boolFlags: ["--use-selection"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("write generation", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    const prompt = requiredString(
      parsed.flags["--prompt"],
      "write generation requires --prompt.",
    );
    if (typeof prompt !== "string") {
      return prompt;
    }
    return {
      route: AGENT_HTTP_ROUTES.generate,
      method: "POST",
      body: {
        prompt,
        useSelection: parsed.boolFlags.has("--use-selection"),
      },
    };
  }

  if (tool === "write") {
    return badRequestEnvelope(
      "write requires one of: image, prompt, generation.",
    );
  }

  if (tool === "edit") {
    if (target === "locate") {
      const parsed = parseArgs(argv.slice(2), {
        valueFlags: ["--element-id", "--file-id"],
      });
      if (isEnvelope(parsed)) {
        return parsed;
      }
      const positionalsError = expectNoPositionals("edit locate", parsed);
      if (positionalsError) {
        return positionalsError;
      }
      const elementId = parsed.flags["--element-id"]?.trim();
      const fileId = parsed.flags["--file-id"]?.trim();
      if (!elementId && !fileId) {
        return badRequestEnvelope(
          "edit locate requires --element-id or --file-id.",
        );
      }
      return {
        route: AGENT_HTTP_ROUTES.sceneLocate,
        method: "POST",
        body: {
          ...(elementId ? { elementId } : {}),
          ...(fileId ? { fileId } : {}),
        },
      };
    }

    if (target === "select") {
      const parsed = parseArgs(argv.slice(2), {
        valueFlags: ["--element-ids", "--file-ids"],
      });
      if (isEnvelope(parsed)) {
        return parsed;
      }
      const positionalsError = expectNoPositionals("edit select", parsed);
      if (positionalsError) {
        return positionalsError;
      }
      const elementIds = parseCsvFlag(
        parsed.flags["--element-ids"],
        "--element-ids",
      );
      if (isEnvelope(elementIds)) {
        return elementIds;
      }
      const fileIds = parseFileIdsFlag(parsed.flags["--file-ids"]);
      if (isEnvelope(fileIds)) {
        return fileIds;
      }
      if (!elementIds && !fileIds) {
        return badRequestEnvelope(
          "edit select requires --element-ids or --file-ids.",
        );
      }
      return {
        route: AGENT_HTTP_ROUTES.sceneSelect,
        method: "POST",
        body: {
          ...(elementIds ? { elementIds } : {}),
          ...(fileIds ? { fileIds } : {}),
        },
      };
    }
    return badRequestEnvelope(
      "edit requires one of: locate, select.",
    );
  }

  if (tool === "bash") {
    if (target !== "env" && target !== "examples") {
      return badRequestEnvelope("bash requires one of: env, examples.");
    }
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals(`bash ${target}`, parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      local: (bridge, options) => {
        const environment = {
          CORESTUDIO_AGENT_BRIDGE_URL: bridge.baseUrl,
          CORESTUDIO_AGENT_PROJECT_TOKEN: bridge.projectToken,
        };
        const envPrefix = Object.entries(environment)
          .map(([key, value]) => `${key}=${shellQuote(value)}`)
          .join(" ");
        const executable = options.executablePath
          ? `node ${shellQuote(options.executablePath)}`
          : "corestudio";
        const examples = [
          `${envPrefix} ${executable} read context --json`,
          `${envPrefix} ${executable} read selection --json`,
          `${envPrefix} ${executable} read image-paths --selection --json`,
          `${envPrefix} ${executable} read records --json`,
          `${envPrefix} ${executable} read health --json`,
          `${envPrefix} ${executable} write image /absolute/path/to/image.png --origin acp-agent --json`,
          `${envPrefix} ${executable} edit locate --file-id <fileId> --json`,
          `${envPrefix} ${executable} write prompt --text "..." --json`,
        ];
        return {
          ok: true,
          data:
            target === "env"
              ? {
                  environment,
                  shell: envPrefix,
                }
              : {
                  environment,
                  examples,
                },
        };
      },
      formatHuman: (data) => {
        if (!isObject(data)) {
          return "OK";
        }
        if (typeof data.shell === "string") {
          return data.shell;
        }
        return Array.isArray(data.examples) ? data.examples.join("\n") : "OK";
      },
    };
  }

  return badRequestEnvelope(
    "CoreStudio CLI tools are: read, write, edit, bash.",
  );
};

const assertDimensions = (width: number, height: number, format: string) => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(`Unable to inspect ${format} dimensions.`);
  }

  return { width, height };
};

const inspectPngDimensions = (buffer: Buffer) => {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(signature) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new Error("Unable to inspect PNG dimensions.");
  }

  return assertDimensions(
    buffer.readUInt32BE(16),
    buffer.readUInt32BE(20),
    "PNG",
  );
};

const isJpegStartOfFrameMarker = (marker: number) =>
  (marker >= 0xc0 && marker <= 0xc3) ||
  (marker >= 0xc5 && marker <= 0xc7) ||
  (marker >= 0xc9 && marker <= 0xcb) ||
  (marker >= 0xcd && marker <= 0xcf);

const isJpegStandaloneMarker = (marker: number) =>
  marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);

const inspectJpegDimensions = (buffer: Buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Unable to inspect JPEG dimensions.");
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }

    if (offset >= buffer.length) {
      break;
    }

    const marker = buffer[offset++];
    if (isJpegStandaloneMarker(marker)) {
      continue;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    const payloadOffset = offset + 2;
    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 7 || payloadOffset + 5 > buffer.length) {
        break;
      }
      return assertDimensions(
        buffer.readUInt16BE(payloadOffset + 3),
        buffer.readUInt16BE(payloadOffset + 1),
        "JPEG",
      );
    }

    offset += segmentLength;
  }

  throw new Error("Unable to inspect JPEG dimensions.");
};

const inspectWebpDimensions = (buffer: Buffer) => {
  if (
    buffer.length < 20 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Unable to inspect WebP dimensions.");
  }

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return assertDimensions(
      buffer.readUIntLE(24, 3) + 1,
      buffer.readUIntLE(27, 3) + 1,
      "WebP",
    );
  }

  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return assertDimensions(
      (bits & 0x3fff) + 1,
      ((bits >>> 14) & 0x3fff) + 1,
      "WebP",
    );
  }

  if (
    chunkType === "VP8 " &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return assertDimensions(
      buffer.readUInt16LE(26) & 0x3fff,
      buffer.readUInt16LE(28) & 0x3fff,
      "WebP",
    );
  }

  throw new Error("Unable to inspect WebP dimensions.");
};

const getSvgAttribute = (source: string, attribute: string) => {
  const match = source.match(
    new RegExp(`${attribute}\\s*=\\s*(?:"([^"]+)"|'([^']+)'|([^\\s>]+))`, "i"),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
};

const parseSvgNumber = (value: string | null) => {
  if (!value || value.trim().endsWith("%")) {
    return null;
  }
  const match = value
    .trim()
    .match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)/i);
  if (!match) {
    return null;
  }
  const number = Number(match[1]);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const inspectSvgDimensions = (buffer: Buffer) => {
  const source = buffer.toString("utf8");
  const svgMatch = source.match(/<svg\b([^>]*)>/i);
  if (!svgMatch) {
    throw new Error("Unable to inspect SVG dimensions.");
  }

  const svgAttributes = svgMatch[1];
  const width = parseSvgNumber(getSvgAttribute(svgAttributes, "width"));
  const height = parseSvgNumber(getSvgAttribute(svgAttributes, "height"));
  if (width && height) {
    return assertDimensions(width, height, "SVG");
  }

  const viewBox = getSvgAttribute(svgAttributes, "viewBox");
  const viewBoxValues = viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map((value) => Number(value));
  if (
    viewBoxValues?.length === 4 &&
    viewBoxValues.every((value) => Number.isFinite(value))
  ) {
    return assertDimensions(viewBoxValues[2], viewBoxValues[3], "SVG");
  }

  throw new Error("Unable to inspect SVG dimensions.");
};

const inspectImageDimensions: NonNullable<
  LocalImagePayloadOptions["inspectImage"]
> = ({ buffer, mimeType }) => {
  switch (mimeType) {
    case "image/png":
      return inspectPngDimensions(buffer);
    case "image/jpeg":
      return inspectJpegDimensions(buffer);
    case "image/webp":
      return inspectWebpDimensions(buffer);
    case "image/svg+xml":
      return inspectSvgDimensions(buffer);
    default:
      throw new Error(`Unsupported image mime type: ${mimeType}`);
  }
};

const defaultReadImagePayload = async (
  filePath: string,
  options: CliRuntimeOptions,
) => {
  const imageOptions: LocalImagePayloadOptions = {
    inspectImage: inspectImageDimensions,
    ...(options.readImageFile ? { readFile: options.readImageFile } : {}),
    ...(options.now ? { now: options.now } : {}),
    ...(options.randomId ? { randomId: options.randomId } : {}),
  };
  return readLocalImagePayload(filePath, imageOptions);
};

const getAddImageMetadataDefaults = (
  command: CliCommand,
  options: CliRuntimeOptions,
) => {
  if (command.route !== AGENT_HTTP_ROUTES.sceneAddImage) {
    return {};
  }

  const env = options.env ?? process.env;
  return {
    ...(env.CORESTUDIO_AGENT_TASK_ID
      ? {
          generationOrigin: "acp-agent",
        }
      : {}),
    ...(env.CORESTUDIO_AGENT_USER_PROMPT
      ? { prompt: env.CORESTUDIO_AGENT_USER_PROMPT }
      : {}),
    ...(env.CORESTUDIO_AGENT_REFERENCE_FILE_IDS
      ? { referenceFileIds: env.CORESTUDIO_AGENT_REFERENCE_FILE_IDS }
      : {}),
    ...(env.CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS
      ? { referenceElementIds: env.CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS }
      : {}),
  };
};

const prepareRequestBody = async (
  command: CliCommand,
  options: CliRuntimeOptions,
): Promise<Record<string, unknown> | undefined | AgentEnvelope<never>> => {
  const metadataDefaults = getAddImageMetadataDefaults(command, options);
  const hasMetadataDefaults = Object.keys(metadataDefaults).length > 0;
  if (!command.imagePath) {
    if (command.body) {
      return { ...metadataDefaults, ...command.body };
    }
    return hasMetadataDefaults ? metadataDefaults : undefined;
  }

  const readImagePayload =
    options.readImagePayload ??
    ((filePath: string) => defaultReadImagePayload(filePath, options));
  try {
    return {
      ...(await readImagePayload(command.imagePath)),
      ...metadataDefaults,
      ...(command.body ?? {}),
    };
  } catch (error) {
    return commandFailedEnvelope(
      `Failed to read image payload: ${getErrorMessage(error)}`,
    );
  }
};

const readSessionDescriptor = async (
  options: CliRuntimeOptions,
): Promise<BridgeSession | null> => {
  const env = options.env ?? process.env;
  const sessionPath = getAgentSessionPath({
    env,
    platform: options.platform,
    homeDir: options.homeDir,
  });
  const readFile =
    options.readFile ??
    ((filePath: string, encoding: "utf8") =>
      fsReadFile(filePath, { encoding }));

  try {
    const contents = await readFile(sessionPath, "utf8");
    const descriptor = JSON.parse(contents) as {
      bridge?: { baseUrl?: unknown };
      projectToken?: unknown;
    };
    if (
      typeof descriptor.bridge?.baseUrl !== "string" ||
      typeof descriptor.projectToken !== "string"
    ) {
      return null;
    }
    return {
      baseUrl: normalizeBaseUrl(descriptor.bridge.baseUrl),
      projectToken: descriptor.projectToken,
    };
  } catch {
    return null;
  }
};

const discoverBridge = async (
  options: CliRuntimeOptions,
): Promise<BridgeSession | null> => {
  const env = options.env ?? process.env;
  const envBaseUrl = env.CORESTUDIO_AGENT_BRIDGE_URL;
  const envProjectToken = env.CORESTUDIO_AGENT_PROJECT_TOKEN;
  if (envBaseUrl && envProjectToken) {
    return {
      baseUrl: normalizeBaseUrl(envBaseUrl),
      projectToken: envProjectToken,
    };
  }

  return readSessionDescriptor(options);
};

const requestBridge = async (
  command: CliCommand,
  bridge: BridgeSession,
  fetchImpl: CliFetch,
  body: Record<string, unknown> | undefined,
): Promise<AgentEnvelope<unknown>> => {
  const init: CliFetchInit = {
    method: command.method,
    headers: {
      Authorization: `Bearer ${bridge.projectToken}`,
      Accept: "application/json",
    },
  };

  if (body) {
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(body);
  }

  const response = await fetchImpl(`${bridge.baseUrl}${command.route}`, init);
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return commandFailedEnvelope("Agent Bridge returned a non-JSON response.");
  }

  if (!isAgentEnvelope(json)) {
    return commandFailedEnvelope("Agent Bridge returned an invalid response.");
  }

  return json;
};

const writeEnvelope = (
  envelope: AgentEnvelope<unknown>,
  mode: OutputMode,
  stdout: CliWritable,
  stderr: CliWritable,
  formatHuman?: (data: unknown) => string,
) => {
  if (mode === "json" || mode === "jsonl") {
    stdout.write(`${JSON.stringify(envelope)}\n`);
    return;
  }

  if (envelope.ok) {
    stdout.write(`${formatHuman ? formatHuman(envelope.data) : "OK"}\n`);
    return;
  }

  stderr.write(`${envelope.error.code}: ${envelope.error.message}\n`);
};

const finishWithEnvelope = (
  envelope: AgentEnvelope<unknown>,
  mode: OutputMode,
  stdout: CliWritable,
  stderr: CliWritable,
  formatHuman?: (data: unknown) => string,
) => {
  writeEnvelope(envelope, mode, stdout, stderr, formatHuman);
  return envelope.ok ? 0 : 1;
};

export const runCli = async (
  argv: readonly string[],
  options: CliRuntimeOptions,
): Promise<number> => {
  const mode = getOutputMode(argv);
  const command = parseCommand(argv);
  if (isEnvelope(command)) {
    return finishWithEnvelope(command, mode, options.stdout, options.stderr);
  }

  const bridge = await discoverBridge(options);
  const globalFetch = (globalThis as typeof globalThis & { fetch?: CliFetch })
    .fetch;
  const fetchImpl = options.fetch ?? globalFetch?.bind(globalThis);
  if (!bridge) {
    return finishWithEnvelope(
      bridgeUnavailableEnvelope(),
      mode,
      options.stdout,
      options.stderr,
    );
  }

  if (command.local) {
    return finishWithEnvelope(
      command.local(bridge, options),
      mode,
      options.stdout,
      options.stderr,
      command.formatHuman,
    );
  }

  if (!fetchImpl) {
    return finishWithEnvelope(
      bridgeUnavailableEnvelope(),
      mode,
      options.stdout,
      options.stderr,
    );
  }

  if (!command.route || !command.method) {
    return finishWithEnvelope(
      commandFailedEnvelope("CoreStudio CLI command is not routable."),
      mode,
      options.stdout,
      options.stderr,
    );
  }

  const body = await prepareRequestBody(command, options);
  if (isAgentEnvelope(body)) {
    return finishWithEnvelope(body, mode, options.stdout, options.stderr);
  }

  try {
    const envelope = await requestBridge(command, bridge, fetchImpl, body);
    const nextEnvelope = command.transformEnvelope
      ? command.transformEnvelope(envelope)
      : envelope;
    return finishWithEnvelope(
      nextEnvelope,
      mode,
      options.stdout,
      options.stderr,
      command.formatHuman,
    );
  } catch {
    return finishWithEnvelope(
      bridgeUnavailableEnvelope(),
      mode,
      options.stdout,
      options.stderr,
    );
  }
};
