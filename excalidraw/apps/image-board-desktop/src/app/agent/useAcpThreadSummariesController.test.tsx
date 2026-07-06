import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AcpThreadSummary } from "../../shared/acpTypes";
import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";
import { useAcpThreadSummariesController } from "./useAcpThreadSummariesController";

let controller:
  | ReturnType<typeof useAcpThreadSummariesController>
  | null = null;

const createThreadSummary = (
  patch: Partial<AcpThreadSummary> = {},
): AcpThreadSummary => ({
  threadId: "thread-1",
  projectToken: "project-token",
  projectName: "工业设计助手",
  agentName: "Codex ACP",
  title: "优化桌面 CNC",
  status: "completed",
  createdAt: "2026-07-04T08:00:00.000Z",
  updatedAt: "2026-07-04T08:01:00.000Z",
  taskIds: ["task-1"],
  lastTaskId: "task-1",
  ...patch,
});

const ControllerProbe = ({
  bridge,
  getProjectToken = () => "project-token",
  formatReadError = (error) =>
    error instanceof Error ? `格式化：${error.message}` : "格式化：未知错误",
}: {
  bridge: DesktopBridgeApi | null;
  getProjectToken?: () => string | null;
  formatReadError?: (error: unknown) => string;
}) => {
  controller = useAcpThreadSummariesController({
    bridge,
    getProjectToken,
    formatReadError,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        canRead: controller.canRead,
        summaries: controller.summaries.map((summary) => summary.threadId),
        loading: controller.loading,
        error: controller.error,
      })}
    </output>
  );
};

const ControllerProbeWithoutFormatter = ({
  bridge,
  getProjectToken = () => "project-token",
}: {
  bridge: DesktopBridgeApi | null;
  getProjectToken?: () => string | null;
}) => {
  controller = useAcpThreadSummariesController({
    bridge,
    getProjectToken,
  });

  return (
    <output data-testid="state">
      {JSON.stringify({
        canRead: controller.canRead,
        summaries: controller.summaries.map((summary) => summary.threadId),
        loading: controller.loading,
        error: controller.error,
      })}
    </output>
  );
};

const getState = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as {
    canRead: boolean;
    summaries: string[];
    loading: boolean;
    error: string | null;
  };

describe("useAcpThreadSummariesController", () => {
  it("clears summaries when the bridge cannot read ACP thread summaries", async () => {
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

  it("loads project scoped summaries through the bridge", async () => {
    const summaries = [
      createThreadSummary(),
      createThreadSummary({ threadId: "thread-2" }),
    ];
    const listAcpAgentThreads = vi.fn(async () => summaries);
    const bridge = {
      listAcpAgentThreads,
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load(undefined, { showLoading: true });
    });

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "project-token",
      limit: 20,
    });
    expect(getState()).toEqual({
      canRead: true,
      summaries: ["thread-1", "thread-2"],
      loading: false,
      error: null,
    });
  });

  it("reads the default project token from the getter when load starts", async () => {
    const listAcpAgentThreads = vi.fn(async () => [createThreadSummary()]);
    const bridge = {
      listAcpAgentThreads,
    } as unknown as DesktopBridgeApi;
    let projectToken = "initial-token";

    render(
      <ControllerProbe
        bridge={bridge}
        getProjectToken={() => projectToken}
      />,
    );

    projectToken = "latest-token";
    await act(async () => {
      await controller?.load();
    });

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "latest-token",
      limit: 20,
    });
  });

  it("allows callers to refresh a specific project token", async () => {
    const listAcpAgentThreads = vi.fn(async () => [createThreadSummary()]);
    const bridge = {
      listAcpAgentThreads,
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load("other-token");
    });

    expect(listAcpAgentThreads).toHaveBeenCalledWith({
      projectToken: "other-token",
      limit: 20,
    });
  });

  it("formats read failures and clears stale summaries", async () => {
    const bridge = {
      listAcpAgentThreads: vi.fn(async () => {
        throw new Error("thread index failed");
      }),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbe bridge={bridge} />);

    await act(async () => {
      await controller?.load(undefined, { showLoading: true });
    });

    expect(getState()).toEqual({
      canRead: true,
      summaries: [],
      loading: false,
      error: "格式化：thread index failed",
    });
  });

  it("uses the Agent owner fallback message when no formatter is injected", async () => {
    const bridge = {
      listAcpAgentThreads: vi.fn(async () => {
        throw "thread index failed";
      }),
    } as unknown as DesktopBridgeApi;

    render(<ControllerProbeWithoutFormatter bridge={bridge} />);

    await act(async () => {
      await controller?.load(undefined, { showLoading: true });
    });

    expect(getState()).toEqual({
      canRead: true,
      summaries: [],
      loading: false,
      error: "thread index failed",
    });
  });

  it("applies external thread summary state updates from initial thread loading and selection", async () => {
    render(<ControllerProbe bridge={{} as DesktopBridgeApi} />);

    await act(async () => {
      controller?.applyState({
        summaries: [createThreadSummary({ threadId: "thread-applied" })],
        error: null,
        loading: true,
      });
    });
    expect(getState()).toEqual({
      canRead: false,
      summaries: ["thread-applied"],
      loading: true,
      error: null,
    });

    await act(async () => {
      controller?.applyState({
        summaries: null,
        error: "读取失败",
        loading: false,
      });
    });
    expect(getState()).toEqual({
      canRead: false,
      summaries: ["thread-applied"],
      loading: false,
      error: "读取失败",
    });
  });
});
