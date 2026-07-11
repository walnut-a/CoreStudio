import { useEffect, useRef, useState } from "react";

import "./AgentStatusDock.css";

import { agentBridgeIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";

interface AgentStatusDockProps {
  integration: AgentIntegrationViewModel;
  onCopyAgentBoardUrl: () => void | Promise<void>;
  onCopyCliEnvironment?: () => void | Promise<void>;
  onRefreshStatus: () => void | Promise<unknown>;
  onOpenAgentSettings?: () => void;
  onOpenAgentConversation?: () => void;
}

export const AgentStatusDock = ({
  integration,
  onCopyAgentBoardUrl,
  onCopyCliEnvironment,
  onRefreshStatus,
  onOpenAgentSettings,
  onOpenAgentConversation,
}: AgentStatusDockProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const connected = integration.connected;

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
          aria-label="Agent 状态"
        >
          <header className="agent-status-popover__header">
            <div>
              <span className="agent-status-popover__eyebrow">
                Agent 状态
              </span>
              <strong>{integration.statusText}</strong>
            </div>
            <span
              className={[
                "agent-status-popover__badge",
                connected ? "agent-status-popover__badge--connected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {integration.badgeText}
            </span>
          </header>

          <div
            className="agent-status-popover__source"
            role="status"
            aria-label="ACP Agent"
          >
            <span className="agent-status-popover__source-copy">
              <strong>ACP Agent</strong>
              <em>用于从客户端发起 Agent 任务</em>
            </span>
            <span className="agent-status-popover__source-value">
              {integration.acp.statusText}
            </span>
          </div>

          <div className="agent-status-popover__body">
            <div className="agent-status-popover__item">
              <span>当前项目</span>
              <strong>{integration.project.name ?? "未打开项目"}</strong>
              {integration.project.path && (
                <p className="agent-status-popover__path">
                  {integration.project.path}
                </p>
              )}
            </div>
            <div className="agent-status-popover__item">
              <span>本地桥</span>
              <strong>{integration.bridge.endpointLabel}</strong>
            </div>
          </div>

          <div className="agent-status-popover__body agent-status-popover__body--routes">
            <div className="agent-status-popover__item">
              <span>CLI</span>
              <strong>{integration.cli.statusText}</strong>
            </div>
            <div className="agent-status-popover__item">
              <span>内置浏览器</span>
              <strong>{integration.board.statusText}</strong>
            </div>
          </div>

          <div className="agent-status-popover__actions">
            {onOpenAgentConversation ? (
              <DesktopButton type="button" onClick={onOpenAgentConversation}>
                打开 Agent 对话
              </DesktopButton>
            ) : null}
            {onOpenAgentSettings ? (
              <DesktopButton type="button" onClick={onOpenAgentSettings}>
                打开设置
              </DesktopButton>
            ) : null}
            {onCopyCliEnvironment ? (
              <DesktopButton
                type="button"
                onClick={onCopyCliEnvironment}
                disabled={!integration.cli.envCopyable}
              >
                复制 CLI 环境变量
              </DesktopButton>
            ) : null}
            <DesktopButton
              type="button"
              onClick={onCopyAgentBoardUrl}
              disabled={!integration.board.available}
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
        title={integration.statusText}
        onClick={() => setOpen((current) => !current)}
      >
        {agentBridgeIcon}
        <span className="agent-status-dock__indicator" aria-hidden="true" />
      </button>
    </div>
  );
};
