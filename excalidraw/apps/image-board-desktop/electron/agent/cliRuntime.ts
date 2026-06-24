import { readFile as fsReadFile } from "node:fs/promises";

import {
  AGENT_HTTP_ROUTES,
  createAgentError,
  isAgentErrorCode,
  normalizeAgentPermissions,
} from "../../src/shared/agentBridgeTypes";
import { readLocalImagePayload } from "./localImagePayload";
import { getAgentSessionPath } from "./sessionPaths";

import type {
  AgentEnvelope,
  AgentPermission,
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

type CliFetch = (
  url: string,
  init?: CliFetchInit,
) => Promise<CliFetchResponse>;

export interface CliRuntimeOptions {
  stdout: CliWritable;
  stderr: CliWritable;
  env?: NodeJS.ProcessEnv;
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
  readToken: string;
}

interface CliCommand {
  route: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  requiresWriteGrant?: boolean;
  imagePath?: string;
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

const hasFlag = (argv: readonly string[], flag: string) =>
  argv.includes(flag);

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

const parsePermissions = (
  value: string | undefined,
): AgentPermission[] | AgentEnvelope<never> => {
  try {
    return normalizeAgentPermissions(
      (value ?? "")
        .split(",")
        .map((permission) => permission.trim())
        .filter(Boolean) as AgentPermission[],
    );
  } catch (error) {
    return badRequestEnvelope(
      error instanceof Error ? error.message : String(error),
    );
  }
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

const parseCommand = (argv: readonly string[]): CliCommand | AgentEnvelope<never> => {
  const [scope, command] = argv;

  if (scope === "agent" && command === "status") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("agent status", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.status,
      method: "GET",
    };
  }

  if (scope === "agent" && command === "capabilities") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals(
      "agent capabilities",
      parsed,
    );
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.capabilities,
      method: "GET",
    };
  }

  if (scope === "agent" && command === "authorize") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--permissions", "--reason"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("agent authorize", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    const permissions = parsePermissions(parsed.flags["--permissions"]);
    if (!Array.isArray(permissions)) {
      return permissions;
    }
    const reason = parsed.flags["--reason"];
    return {
      route: AGENT_HTTP_ROUTES.authorize,
      method: "POST",
      body: {
        permissions,
        ...(reason ? { reason } : {}),
      },
    };
  }

  if (scope === "agent" && command === "context") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("agent context", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.context,
      method: "GET",
    };
  }

  if (scope === "project" && command === "current") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("project current", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.projectCurrent,
      method: "GET",
    };
  }

  if (scope === "scene" && command === "snapshot") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("scene snapshot", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneSnapshot,
      method: "GET",
    };
  }

  if (scope === "scene" && command === "selection") {
    const parsed = parseArgs(argv.slice(2));
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("scene selection", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneSelection,
      method: "GET",
    };
  }

  if (scope === "scene" && command === "add-image") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--task-id", "--write-token"],
      boolFlags: ["--dry-run"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    if (parsed.positionals.length !== 1) {
      return badRequestEnvelope(
        "scene add-image accepts exactly one image path.",
      );
    }
    const imagePath = requiredString(
      parsed.positionals[0],
      "scene add-image requires an image path.",
    );
    if (typeof imagePath !== "string") {
      return imagePath;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneAddImage,
      method: "POST",
      requiresWriteGrant: true,
      imagePath,
      body: {
        taskId: parsed.flags["--task-id"],
        writeToken: parsed.flags["--write-token"],
        ...(parsed.boolFlags.has("--dry-run") ? { dryRun: true } : {}),
      },
    };
  }

  if (scope === "scene" && command === "add-prompt") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--text", "--task-id", "--write-token"],
      boolFlags: ["--dry-run"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("scene add-prompt", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    const text = requiredString(
      parsed.flags["--text"],
      "scene add-prompt requires --text.",
    );
    if (typeof text !== "string") {
      return text;
    }
    return {
      route: AGENT_HTTP_ROUTES.sceneAddPrompt,
      method: "POST",
      requiresWriteGrant: true,
      body: {
        text,
        taskId: parsed.flags["--task-id"],
        writeToken: parsed.flags["--write-token"],
        ...(parsed.boolFlags.has("--dry-run") ? { dryRun: true } : {}),
      },
    };
  }

  if (scope === "generate") {
    const parsed = parseArgs(argv.slice(1), {
      valueFlags: ["--prompt", "--task-id", "--write-token"],
      boolFlags: ["--use-selection"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("generate", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    const prompt = requiredString(
      parsed.flags["--prompt"],
      "generate requires --prompt.",
    );
    if (typeof prompt !== "string") {
      return prompt;
    }
    return {
      route: AGENT_HTTP_ROUTES.generate,
      method: "POST",
      requiresWriteGrant: true,
      body: {
        prompt,
        useSelection: parsed.boolFlags.has("--use-selection"),
        taskId: parsed.flags["--task-id"],
        writeToken: parsed.flags["--write-token"],
      },
    };
  }

  if (scope === "task" && command === "complete") {
    const parsed = parseArgs(argv.slice(2), {
      valueFlags: ["--task-id", "--write-token"],
    });
    if (isEnvelope(parsed)) {
      return parsed;
    }
    const positionalsError = expectNoPositionals("task complete", parsed);
    if (positionalsError) {
      return positionalsError;
    }
    return {
      route: AGENT_HTTP_ROUTES.taskComplete,
      method: "POST",
      requiresWriteGrant: true,
      body: {
        taskId: parsed.flags["--task-id"],
        writeToken: parsed.flags["--write-token"],
      },
    };
  }

  return badRequestEnvelope(`Unsupported command: ${argv.join(" ")}`);
};

const assertDimensions = (
  width: number,
  height: number,
  format: string,
) => {
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

const prepareRequestBody = async (
  command: CliCommand,
  options: CliRuntimeOptions,
): Promise<Record<string, unknown> | undefined | AgentEnvelope<never>> => {
  if (!command.imagePath) {
    return command.body;
  }

  const readImagePayload =
    options.readImagePayload ??
    ((filePath: string) => defaultReadImagePayload(filePath, options));
  try {
    return {
      ...(await readImagePayload(command.imagePath)),
      ...(command.body ?? {}),
    };
  } catch (error) {
    return commandFailedEnvelope(
      `Failed to read image payload: ${getErrorMessage(error)}`,
    );
  }
};

const assertWriteGrantFields = (
  command: CliCommand,
): AgentEnvelope<never> | null => {
  if (!command.requiresWriteGrant) {
    return null;
  }
  if (
    typeof command.body?.taskId !== "string" ||
    !command.body.taskId.trim() ||
    typeof command.body.writeToken !== "string" ||
    !command.body.writeToken.trim()
  ) {
    return badRequestEnvelope(
      "Write commands require --task-id and --write-token.",
    );
  }
  return null;
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
      readToken?: unknown;
    };
    if (
      typeof descriptor.bridge?.baseUrl !== "string" ||
      typeof descriptor.readToken !== "string"
    ) {
      return null;
    }
    return {
      baseUrl: normalizeBaseUrl(descriptor.bridge.baseUrl),
      readToken: descriptor.readToken,
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
  const envReadToken = env.CORESTUDIO_AGENT_READ_TOKEN;
  if (envBaseUrl && envReadToken) {
    return {
      baseUrl: normalizeBaseUrl(envBaseUrl),
      readToken: envReadToken,
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
      Authorization: `Bearer ${bridge.readToken}`,
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
) => {
  if (mode === "json" || mode === "jsonl") {
    stdout.write(`${JSON.stringify(envelope)}\n`);
    return;
  }

  if (envelope.ok) {
    stdout.write("OK\n");
    return;
  }

  stderr.write(`${envelope.error.code}: ${envelope.error.message}\n`);
};

const finishWithEnvelope = (
  envelope: AgentEnvelope<unknown>,
  mode: OutputMode,
  stdout: CliWritable,
  stderr: CliWritable,
) => {
  writeEnvelope(envelope, mode, stdout, stderr);
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

  const writeGrantError = assertWriteGrantFields(command);
  if (writeGrantError) {
    return finishWithEnvelope(
      writeGrantError,
      mode,
      options.stdout,
      options.stderr,
    );
  }

  const bridge = await discoverBridge(options);
  const globalFetch = (globalThis as typeof globalThis & { fetch?: CliFetch })
    .fetch;
  const fetchImpl = options.fetch ?? globalFetch?.bind(globalThis);
  if (!bridge || !fetchImpl) {
    return finishWithEnvelope(
      bridgeUnavailableEnvelope(),
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
    return finishWithEnvelope(envelope, mode, options.stdout, options.stderr);
  } catch {
    return finishWithEnvelope(
      bridgeUnavailableEnvelope(),
      mode,
      options.stdout,
      options.stderr,
    );
  }
};
