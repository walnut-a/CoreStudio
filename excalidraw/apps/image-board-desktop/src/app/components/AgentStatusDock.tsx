import { useEffect, useRef, useState } from "react";

import { agentBridgeIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

interface AgentStatusDockProps {
  status?: DesktopAgentBridgeStatus | null;
  onCopyAgentBoardUrl: () => void | Promise<void>;
  onRefreshStatus: () => void | Promise<unknown>;
}

const getStatusText = (status?: DesktopAgentBridgeStatus | null) => {
  if (status?.ready && status.currentProject) {
    return "Agent 已连接";
  }

  if (status?.ready) {
    return "等待项目";
  }

  return "Agent 未就绪";
};

const getBridgeEndpoint = (status?: DesktopAgentBridgeStatus | null) => {
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
}: AgentStatusDockProps) => {
  const [open, setOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const connected = Boolean(status?.ready && status.currentProject);
  const boardUrlReady = Boolean(status?.boardUrl);
  const statusText = getStatusText(status);
  const bridgeEndpoint = getBridgeEndpoint(status);

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

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = window.setInterval(() => {
      void onRefreshStatus();
    }, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoRefresh, onRefreshStatus]);

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
              {connected ? "在线" : "未连接"}
            </span>
          </header>

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

          <label className="agent-status-popover__setting">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.currentTarget.checked)}
            />
            <span>自动刷新连接状态</span>
          </label>

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
