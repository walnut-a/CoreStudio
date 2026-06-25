import { useEffect, useRef, useState } from "react";

import { agentBridgeIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";
import type { GenerationSource } from "../../shared/providerTypes";

interface AgentStatusDockProps {
  status?: DesktopAgentBridgeStatus | null;
  onCopyAgentBoardUrl: () => void | Promise<void>;
  onRefreshStatus: () => void | Promise<unknown>;
  onSetAgentBridgeEnabled?: (enabled: boolean) => void | Promise<void>;
  connectionToggleDisabled?: boolean;
  generationSource?: GenerationSource;
}

const getStatusText = (status?: DesktopAgentBridgeStatus | null) => {
  if (!status?.enabled) {
    return "Agent 未连接";
  }

  if (status?.ready && status.currentProject) {
    return "Agent 已连接";
  }

  if (status?.ready) {
    return "Bridge 已连接，等待项目";
  }

  return "Agent 未就绪";
};

const getBadgeText = (status?: DesktopAgentBridgeStatus | null) => {
  if (!status?.enabled) {
    return "关闭";
  }

  if (status?.ready && status.currentProject) {
    return "在线";
  }

  if (status?.ready) {
    return "等待项目";
  }

  return "未连接";
};

const getBridgeEndpoint = (status?: DesktopAgentBridgeStatus | null) => {
  if (!status?.enabled) {
    return "未启动";
  }

  if (!status?.boardUrl) {
    return status?.ready ? "本地桥已启动" : "未启动";
  }

  try {
    const boardUrl = new URL(status.boardUrl);
    return boardUrl.searchParams.get("bridge") || "本地桥已启动";
  } catch {
    return "本地桥已启动";
  }
};

export const AgentStatusDock = ({
  status,
  onCopyAgentBoardUrl,
  onRefreshStatus,
  onSetAgentBridgeEnabled,
  connectionToggleDisabled = false,
  generationSource = "builtin",
}: AgentStatusDockProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const enabled = Boolean(status?.enabled);
  const connected = Boolean(enabled && status?.ready && status.currentProject);
  const boardUrlReady = Boolean(status?.boardUrl);
  const statusText = getStatusText(status);
  const badgeText = getBadgeText(status);
  const bridgeEndpoint = getBridgeEndpoint(status);
  const canToggleConnection = Boolean(onSetAgentBridgeEnabled);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="agent-status-dock" ref={rootRef}>
      {open && (
        <section
          className="agent-status-popover"
          aria-label="Agent 连接设置"
        >
          <header className="agent-status-popover__header">
            <div>
              <span className="agent-status-popover__eyebrow">
                Agent Bridge
              </span>
              <strong>{statusText}</strong>
            </div>
            <span
              className={[
                "agent-status-popover__badge",
                connected ? "agent-status-popover__badge--connected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {badgeText}
            </span>
          </header>

          <div className="agent-status-popover__toggle">
            <span className="agent-status-popover__toggle-copy">
              <strong>允许 Agent 连接</strong>
              <em>
                {connectionToggleDisabled
                  ? "请回到 CoreStudio 桌面端切换"
                  : "开启后 CLI 和内置浏览器才能发现当前会话"}
              </em>
            </span>
            <button
              type="button"
              role="switch"
              aria-label="允许 Agent 连接"
              aria-checked={enabled}
              disabled={!canToggleConnection || connectionToggleDisabled}
              className="agent-status-popover__switch"
              onClick={() => {
                void onSetAgentBridgeEnabled?.(!enabled);
              }}
            />
          </div>

          <div
            className="agent-status-popover__source"
            role="status"
            aria-label="默认生成来源"
          >
            <span className="agent-status-popover__source-copy">
              <strong>默认生成来源</strong>
              <em>在生成输入区调整本次任务</em>
            </span>
            <span className="agent-status-popover__source-value">
              {generationSource === "agent" ? "Agent" : "内置"}
            </span>
          </div>

          <div className="agent-status-popover__body">
            <div className="agent-status-popover__item">
              <span>当前项目</span>
              <strong>{status?.currentProject?.name ?? "未打开项目"}</strong>
              {status?.currentProject?.projectPath && (
                <p className="agent-status-popover__path">
                  {status.currentProject.projectPath}
                </p>
              )}
            </div>
            <div className="agent-status-popover__item">
              <span>本地桥</span>
              <strong>{bridgeEndpoint}</strong>
            </div>
          </div>

          <div className="agent-status-popover__body agent-status-popover__body--routes">
            <div className="agent-status-popover__item">
              <span>CLI</span>
              <strong>
                {enabled ? "可自动发现当前会话" : "开启连接后可发现"}
              </strong>
            </div>
            <div className="agent-status-popover__item">
              <span>内置浏览器</span>
              <strong>
                {boardUrlReady ? "可复制 Board 链接" : "等待 Board 链接"}
              </strong>
            </div>
          </div>

          <div className="agent-status-popover__actions">
            <DesktopButton
              type="button"
              onClick={onCopyAgentBoardUrl}
              disabled={!boardUrlReady}
            >
              复制 Board 链接
            </DesktopButton>
            <DesktopButton type="button" onClick={onRefreshStatus}>
              刷新状态
            </DesktopButton>
          </div>
        </section>
      )}

      <button
        type="button"
        className={[
          "agent-status-dock__button",
          connected ? "agent-status-dock__button--connected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Agent 连接状态"
        aria-expanded={open}
        title={statusText}
        onClick={() => setOpen((current) => !current)}
      >
        {agentBridgeIcon}
        <span className="agent-status-dock__indicator" aria-hidden="true" />
      </button>
    </div>
  );
};
