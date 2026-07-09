import fs from "fs/promises";
import path from "path";

export type MainProcessErrorKind = "uncaughtException" | "unhandledRejection";

export interface MainProcessErrorReporter {
  report(kind: MainProcessErrorKind, error: unknown): Promise<void>;
}

interface MainProcessErrorReporterOptions {
  appName: string;
  getLogPath: () => string;
  mkdir?: typeof fs.mkdir;
  appendFile?: typeof fs.appendFile;
  showErrorBox?: (title: string, content: string) => void;
  now?: () => Date;
}

interface ProcessErrorSource {
  on(eventName: MainProcessErrorKind, listener: (error: unknown) => void): void;
}

const formatError = (error: unknown) => {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
};

export const createMainProcessErrorReporter = ({
  appName,
  getLogPath,
  mkdir = fs.mkdir,
  appendFile = fs.appendFile,
  showErrorBox,
  now = () => new Date(),
}: MainProcessErrorReporterOptions): MainProcessErrorReporter => ({
  async report(kind, error) {
    const logPath = getLogPath();
    const message = formatError(error);
    const entry = `[${now().toISOString()}] ${kind}\n${message}\n\n`;

    try {
      await mkdir(path.dirname(logPath), { recursive: true });
      await appendFile(logPath, entry, "utf8");
    } catch (writeError) {
      console.error("[main-process-error-log-failed]", writeError);
    }

    try {
      showErrorBox?.(
        `${appName} 发生错误`,
        `主进程发生未处理错误。\n\n${message}\n\n日志文件：${logPath}`,
      );
    } catch (dialogError) {
      console.error("[main-process-error-dialog-failed]", dialogError);
    }
  },
});

export const installMainProcessErrorHandlers = (
  processSource: ProcessErrorSource,
  reporter: MainProcessErrorReporter,
) => {
  processSource.on("uncaughtException", (error) => {
    void reporter.report("uncaughtException", error).catch((reportError) => {
      console.error("[main-process-error-report-failed]", reportError);
    });
  });
  processSource.on("unhandledRejection", (error) => {
    void reporter.report("unhandledRejection", error).catch((reportError) => {
      console.error("[main-process-error-report-failed]", reportError);
    });
  });
};
