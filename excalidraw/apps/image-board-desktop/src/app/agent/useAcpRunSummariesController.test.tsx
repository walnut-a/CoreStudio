import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AcpRunSummary } from "../../shared/acpTypes";
import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";
import {
  useAcpRunSummariesAutoLoadEffect,
  useAcpRunSummariesController,
} from "./useAcpRunSummariesController";

let controller:
  | ReturnType<typeof useAcpRunSummariesController>
  | null = null;

const createRunSummary = (
  patch: Partial<AcpRunSummary> = {},
): AcpRunSummary => ({
  mode: "acp-agent",
  taskId: "task-1",
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  userPrompt: "优化桌面 CNC",
  status: "completed",
  startedAt: "2026-07-04T08:00:00.000Z",
  logFile: "/tmp/corestudio-agent-runs/task-1.ndjson",
  ...patch,
});

const ControllerProbe = ({
  bridge,
  formatReadError = (error) =>
    error instanceof Error ? `格式化：${error.message}` : "格式化：未知错误",
}: {
  bridge: DesktopBridgeApi | null;
  formatReadError?: (error: unknown) => string;
}) => {
  controller = useAcpRunSummariesController({
    bridge,
    formatReadError,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        canRead: controller.canRead,
        summaries: controller.summaries.map((summary) => summary.taskId),
        loading: controller.loading,
        error: controller.error,
      })}
    </output>
  );
};

const ControllerProbeWithoutFormatter = ({
  bridge,
}: {
  bridge: DesktopBridgeApi | null;
}) => {
  controller = useAcpRunSummariesController({
    bridge,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        canRead: controller.canRead,
        summaries: controller.summaries.map((summary) => summary.taskId),
        loading: controller.loading,
        error: controller.error,
      })}
    </output>
  );
};

const AutoLoadProbe = ({
  settingsOpen,
  debugOpen,
  load,
}: {
  settingsOpen: boolean;
  debugOpen: boolean;
  load: () => Promise<unknown>;
}) => {
  useAcpRunSummariesAutoLoadEffect({
    settingsOpen,
    debugOpen,
    load,
  });

  return null;
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    canRead: boolean;
    summaries: string[];
    loading: boolean;
    error: string | null;
  };

describe("useAcpRunSummariesController", () => {
  it("clears summaries when the bridge cannot read ACP run logs", async () => {
    render(<ControllerProbe bridge={{} as DesktopBridgeApi} />);

    await act(async () => {
      await controller?.load();
    });

    expect(getState()).toEqual({
      canRead: false,
      summaries: [],
      loading: false,
      error: null,
    });
  });

  it("loads summaries through the bridge and exposes them as state", async () => {
    const summaries = [
      createRunSummary(),
      createRunSummary({ taskId: "task-2" }),
    ];
    const listAcpAgentRunLogs = vi.fn(async () => summaries);
    const bridge = {
      listAcpAgentRunLogs,
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load();
    });

    expect(listAcpAgentRunLogs).toHaveBeenCalledWith({ limit: 8 });
    expect(getState()).toEqual({
      canRead: true,
      summaries: ["task-1", "task-2"],
      loading: false,
      error: null,
    });
  });

  it("formats read failures and clears stale summaries", async () => {
    const bridge = {
      listAcpAgentRunLogs: vi.fn(async () => {
        throw new Error("run log index failed");
      }),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load();
    });

    expect(getState()).toEqual({
      canRead: true,
      summaries: [],
      loading: false,
      error: "格式化：run log index failed",
    });
  });

  it("uses the Agent owner fallback message when no formatter is injected", async () => {
    const bridge = {
      listAcpAgentRunLogs: vi.fn(async () => {
        throw "run log index failed";
      }),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbeWithoutFormatter bridge={bridge} />);

    await act(async () => {
      await controller?.load();
    });

    expect(getState()).toEqual({
      canRead: true,
      summaries: [],
      loading: false,
      error: "run log index failed",
    });
  });
});

describe("useAcpRunSummariesAutoLoadEffect", () => {
  it("loads run summaries only after both the settings panel and debug section are open", async () => {
    const load = vi.fn(async () => []);
    const { rerender } = render(
      <AutoLoadProbe settingsOpen={false} debugOpen={false} load={load} />,
    );

    rerender(
      <AutoLoadProbe settingsOpen={true} debugOpen={false} load={load} />,
    );
    rerender(
      <AutoLoadProbe settingsOpen={false} debugOpen={true} load={load} />,
    );
    expect(load).not.toHaveBeenCalled();

    rerender(
      <AutoLoadProbe settingsOpen={true} debugOpen={true} load={load} />,
    );

    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(1);
    });
  });
});
