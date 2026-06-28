import fs from "fs/promises";
import path from "path";

import type {
  AcpRunIndex,
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunLogKind,
  AcpRunMetadata,
  AcpRunStatus,
  AcpRunSummary,
} from "../../src/shared/acpTypes";

export type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunLogKind,
  AcpRunSummary,
} from "../../src/shared/acpTypes";

export interface AcpRunLogWriter {
  readonly taskId: string;
  readonly logPath: string;
  append(kind: AcpRunLogKind, payload: unknown): Promise<void>;
  finish(
    status: Exclude<AcpRunStatus, "running">,
    details?: {
      errorMessage?: string;
      lastMessage?: string;
      payload?: unknown;
    },
  ): Promise<void>;
}

interface CreateAcpRunLogWriterOptions {
  baseDir: string;
  now?: () => Date;
  maxRuns?: number;
}

interface AcpRunLogReaderOptions {
  baseDir: string;
}

interface ListAcpRunLogSummariesOptions extends AcpRunLogReaderOptions {
  limit?: number;
}

const DEFAULT_MAX_RUNS = 100;

const sanitizeLogFileName = (taskId: string) =>
  `${taskId.replace(/[^a-zA-Z0-9._-]/g, "_")}.jsonl`;

const readIndex = async (indexPath: string): Promise<AcpRunIndex> => {
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      Array.isArray(parsed.runs)
    ) {
      return parsed as AcpRunIndex;
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  return { version: 1, runs: [] };
};

const writeIndex = async (
  indexPath: string,
  summary: AcpRunSummary,
  maxRuns: number,
) => {
  const index = await readIndex(indexPath);
  const runs = [
    summary,
    ...index.runs.filter((run) => run.taskId !== summary.taskId),
  ].slice(0, maxRuns);
  await fs.writeFile(
    indexPath,
    JSON.stringify({ version: 1, runs }, null, 2),
    "utf8",
  );
};

export const listAcpRunLogSummaries = async ({
  baseDir,
  limit = DEFAULT_MAX_RUNS,
}: ListAcpRunLogSummariesOptions): Promise<AcpRunSummary[]> => {
  const index = await readIndex(path.join(baseDir, "index.json"));
  return index.runs.slice(0, Math.max(0, limit));
};

export const readAcpRunLog = async (
  taskId: string,
  { baseDir }: AcpRunLogReaderOptions,
): Promise<AcpRunLogDetail> => {
  const index = await readIndex(path.join(baseDir, "index.json"));
  const summary = index.runs.find((run) => run.taskId === taskId);
  if (!summary) {
    throw new Error(`ACP run log not found: ${taskId}`);
  }

  const rawLog = await fs.readFile(path.join(baseDir, summary.logFile), "utf8");
  const entries = rawLog
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AcpRunLogEntry)
    .sort((a, b) => a.seq - b.seq);

  return { summary, entries };
};

export const createAcpRunLogWriter = async (
  metadata: AcpRunMetadata,
  {
    baseDir,
    now = () => new Date(),
    maxRuns = DEFAULT_MAX_RUNS,
  }: CreateAcpRunLogWriterOptions,
): Promise<AcpRunLogWriter> => {
  await fs.mkdir(baseDir, { recursive: true });

  const startedAt = now().toISOString();
  const logFile = sanitizeLogFileName(metadata.taskId);
  const logPath = path.join(baseDir, logFile);
  const indexPath = path.join(baseDir, "index.json");
  let seq = 0;
  let summary: AcpRunSummary = {
    ...metadata,
    mode: "acp-agent",
    status: "running",
    startedAt,
    logFile,
  };
  let writeChain = Promise.resolve();

  const enqueue = (operation: () => Promise<void>) => {
    writeChain = writeChain.catch(() => undefined).then(operation);
    return writeChain;
  };

  const append = (kind: AcpRunLogKind, payload: unknown) =>
    enqueue(async () => {
      const entry: AcpRunLogEntry = {
        version: 1,
        taskId: metadata.taskId,
        timestamp: now().toISOString(),
        seq: ++seq,
        kind,
        payload,
      };
      await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
    });

  await append("task.created", {
    projectToken: metadata.projectToken,
    projectName: metadata.projectName,
    agentName: metadata.agentName,
    userPrompt: metadata.userPrompt,
  });
  await writeIndex(indexPath, summary, maxRuns);

  return {
    taskId: metadata.taskId,
    logPath,
    append,
    async finish(status, details = {}) {
      summary = {
        ...summary,
        status,
        endedAt: now().toISOString(),
        ...(details.lastMessage ? { lastMessage: details.lastMessage } : {}),
        ...(details.errorMessage
          ? { errorMessage: details.errorMessage }
          : {}),
      };
      await append("task.finished", {
        status,
        ...(details.errorMessage
          ? { errorMessage: details.errorMessage }
          : {}),
        ...(details.lastMessage ? { lastMessage: details.lastMessage } : {}),
        ...(details.payload !== undefined ? { payload: details.payload } : {}),
      });
      await enqueue(() => writeIndex(indexPath, summary, maxRuns));
    },
  };
};
