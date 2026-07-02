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
  AcpThreadDetail,
  AcpThreadIndex,
  AcpThreadSummary,
} from "../../src/shared/acpTypes";

export type {
  AcpRunLogDetail,
  AcpRunLogEntry,
  AcpRunLogKind,
  AcpRunSummary,
  AcpThreadDetail,
  AcpThreadSummary,
} from "../../src/shared/acpTypes";

export interface AcpRunLogWriter {
  readonly taskId: string;
  readonly threadId: string;
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

interface CreateAcpRunLogMirrorWriterOptions {
  baseDirs: string[];
  now?: () => Date;
  maxRuns?: number;
}

interface AcpRunLogReaderOptions {
  baseDir: string;
}

interface ListAcpRunLogSummariesOptions extends AcpRunLogReaderOptions {
  limit?: number;
}

interface ListAcpThreadSummariesOptions extends AcpRunLogReaderOptions {
  projectToken?: string | null;
  limit?: number;
}

const DEFAULT_MAX_RUNS = 100;
const DEFAULT_MAX_THREADS = 100;

const sanitizeLogFileName = (taskId: string) =>
  `${taskId.replace(/[^a-zA-Z0-9._-]/g, "_")}.jsonl`;
const getRunIndexPath = (baseDir: string) => path.join(baseDir, "index.json");
const getThreadIndexPath = (baseDir: string) =>
  path.join(baseDir, "threads", "index.json");

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

const readThreadIndex = async (
  indexPath: string,
): Promise<AcpThreadIndex> => {
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.threads)) {
      return parsed as AcpThreadIndex;
    }
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
  return { version: 1, threads: [] };
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

const getThreadSummaryFromRun = (
  existing: AcpThreadSummary | undefined,
  run: AcpRunSummary,
): AcpThreadSummary => {
  const existingTaskIds = existing?.taskIds.filter(
    (taskId) => taskId !== run.taskId,
  ) ?? [];
  const updatedAt = run.endedAt ?? run.startedAt;
  return {
    threadId: run.threadId,
    projectToken: run.projectToken,
    projectName: run.projectName,
    agentName: run.agentName,
    title: existing?.title || run.userPrompt,
    status: run.status,
    createdAt: existing?.createdAt ?? run.startedAt,
    updatedAt,
    taskIds: [...existingTaskIds, run.taskId],
    lastTaskId: run.taskId,
    ...(run.lastMessage ? { lastMessage: run.lastMessage } : {}),
    ...(run.errorMessage ? { errorMessage: run.errorMessage } : {}),
  };
};

const writeThreadIndex = async (
  indexPath: string,
  run: AcpRunSummary,
  maxThreads: number,
) => {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  const index = await readThreadIndex(indexPath);
  const existing = index.threads.find(
    (thread) => thread.threadId === run.threadId,
  );
  const nextThread = getThreadSummaryFromRun(existing, run);
  const threads = [
    nextThread,
    ...index.threads.filter((thread) => thread.threadId !== run.threadId),
  ].slice(0, maxThreads);
  await fs.writeFile(
    indexPath,
    JSON.stringify({ version: 1, threads }, null, 2),
    "utf8",
  );
};

export const listAcpRunLogSummaries = async ({
  baseDir,
  limit = DEFAULT_MAX_RUNS,
}: ListAcpRunLogSummariesOptions): Promise<AcpRunSummary[]> => {
  const index = await readIndex(getRunIndexPath(baseDir));
  return index.runs.slice(0, Math.max(0, limit));
};

export const listAcpThreadSummaries = async ({
  baseDir,
  projectToken,
  limit = DEFAULT_MAX_THREADS,
}: ListAcpThreadSummariesOptions): Promise<AcpThreadSummary[]> => {
  const index = await readThreadIndex(getThreadIndexPath(baseDir));
  const threads = projectToken
    ? index.threads.filter((thread) => thread.projectToken === projectToken)
    : index.threads;
  return threads.slice(0, Math.max(0, limit));
};

export const readAcpRunLog = async (
  taskId: string,
  { baseDir }: AcpRunLogReaderOptions,
): Promise<AcpRunLogDetail> => {
  const index = await readIndex(getRunIndexPath(baseDir));
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

export const readAcpThread = async (
  threadId: string,
  { baseDir }: AcpRunLogReaderOptions,
): Promise<AcpThreadDetail> => {
  const index = await readThreadIndex(getThreadIndexPath(baseDir));
  const summary = index.threads.find((thread) => thread.threadId === threadId);
  if (!summary) {
    throw new Error(`ACP thread not found: ${threadId}`);
  }

  const runs = await Promise.all(
    summary.taskIds.map((taskId) => readAcpRunLog(taskId, { baseDir })),
  );
  return {
    summary,
    runs,
    entries: runs.flatMap((run) => run.entries),
  };
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
  const threadId = metadata.threadId || metadata.taskId;
  const logFile = sanitizeLogFileName(metadata.taskId);
  const logPath = path.join(baseDir, logFile);
  const indexPath = getRunIndexPath(baseDir);
  const threadIndexPath = getThreadIndexPath(baseDir);
  let seq = 0;
  let summary: AcpRunSummary = {
    ...metadata,
    threadId,
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
  await writeThreadIndex(threadIndexPath, summary, DEFAULT_MAX_THREADS);

  return {
    taskId: metadata.taskId,
    threadId,
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
      await enqueue(() =>
        writeThreadIndex(threadIndexPath, summary, DEFAULT_MAX_THREADS),
      );
    },
  };
};

const getSuccessfulWriterResults = (
  results: PromiseSettledResult<AcpRunLogWriter>[],
) =>
  results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );

const runPrimaryAndMirrors = async (
  writers: AcpRunLogWriter[],
  operation: (writer: AcpRunLogWriter) => Promise<void>,
) => {
  const results = await Promise.allSettled(writers.map(operation));
  if (results[0]?.status === "rejected") {
    throw results[0].reason;
  }
};

export const createAcpRunLogMirrorWriter = async (
  metadata: AcpRunMetadata,
  { baseDirs, now, maxRuns }: CreateAcpRunLogMirrorWriterOptions,
): Promise<AcpRunLogWriter> => {
  const uniqueBaseDirs = Array.from(
    new Set(baseDirs.map((baseDir) => path.resolve(baseDir))),
  );
  const writers = getSuccessfulWriterResults(
    await Promise.allSettled(
      uniqueBaseDirs.map((baseDir) =>
        createAcpRunLogWriter(metadata, {
          baseDir,
          ...(now ? { now } : {}),
          ...(maxRuns ? { maxRuns } : {}),
        }),
      ),
    ),
  );

  if (!writers.length) {
    throw new Error("Unable to create any ACP run log writer.");
  }

  const primaryWriter = writers[0];
  return {
    taskId: primaryWriter.taskId,
    threadId: primaryWriter.threadId,
    logPath: primaryWriter.logPath,
    append: (kind, payload) =>
      runPrimaryAndMirrors(writers, (writer) => writer.append(kind, payload)),
    finish: (status, details) =>
      runPrimaryAndMirrors(writers, (writer) =>
        writer.finish(status, details),
      ),
  };
};
