import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildAgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { AgentStatusDock } from "./AgentStatusDock";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

const createBridgeStatus = (
  patch: Partial<DesktopAgentBridgeStatus> = {},
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  currentProject: {
    projectPath: "/tmp/corestudio-project",
    name: "测试项目",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  boardUrl:
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
  ...patch,
});

describe("AgentStatusDock", () => {
  it("shows only the Codex collaboration summary and settings entry", () => {
    const onOpenAgentSettings = vi.fn();

    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus(),
        })}
        onOpenAgentSettings={onOpenAgentSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Codex 协作状态" }));

    expect(
      screen.getByRole("region", { name: "Codex 协作状态" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Codex 协作")).toBeInTheDocument();
    expect(screen.getByText("已可用")).toBeInTheDocument();
    expect(screen.getByText("Codex 可以访问当前项目。")).toBeInTheDocument();
    expect(screen.getByText("当前项目：测试项目")).toBeInTheDocument();
    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("CLI")).not.toBeInTheDocument();
    expect(screen.queryByText("本地桥")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /复制/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "刷新状态" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
    expect(onOpenAgentSettings).toHaveBeenCalledTimes(1);
  });

  it("explains the disabled collaboration state without exposing a switch", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus({
            enabled: false,
            ready: false,
            currentProject: null,
            boardUrl: null,
          }),
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Codex 协作状态" }));

    expect(screen.getByText("尚未开启")).toBeInTheDocument();
    expect(
      screen.getByText("开启后，可在 Codex 中查看当前画布并安全写回结果。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "打开设置" })).not.toBeInTheDocument();
  });

  it("closes the summary with Escape", () => {
    render(
      <AgentStatusDock
        integration={buildAgentIntegrationViewModel({
          bridgeStatus: createBridgeStatus(),
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Codex 协作状态" }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("region", { name: "Codex 协作状态" }),
    ).not.toBeInTheDocument();
  });
});
