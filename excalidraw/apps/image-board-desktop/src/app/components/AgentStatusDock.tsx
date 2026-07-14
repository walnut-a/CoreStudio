import { useEffect, useRef, useState } from "react";

import "./AgentStatusDock.css";

import { agentBridgeIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";

interface AgentStatusDockProps {
  integration: AgentIntegrationViewModel;
  onOpenAgentSettings?: () => void;
}

export const AgentStatusDock = ({
  integration,
  onOpenAgentSettings,
}: AgentStatusDockProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const collaboration = integration.collaboration;
  const ready = collaboration.status === "ready";

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
      {open ? (
        <section className="agent-status-popover" aria-label="Codex 协作状态">
          <header className="agent-status-popover__header">
            <strong>Codex 协作</strong>
            <span
              className={[
                "agent-status-popover__badge",
                ready ? "agent-status-popover__badge--connected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {collaboration.statusText}
            </span>
          </header>
          <p className="agent-status-popover__description">
            {collaboration.description}
          </p>
          {collaboration.projectName ? (
            <p className="agent-status-popover__project">
              当前项目：{collaboration.projectName}
            </p>
          ) : null}
          {onOpenAgentSettings ? (
            <div className="agent-status-popover__actions">
              <DesktopButton type="button" onClick={onOpenAgentSettings}>
                打开设置
              </DesktopButton>
            </div>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        className={[
          "agent-status-dock__button",
          ready ? "agent-status-dock__button--connected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Codex 协作状态"
        aria-expanded={open}
        title={`Codex 协作：${collaboration.statusText}`}
        onClick={() => setOpen((current) => !current)}
      >
        {agentBridgeIcon}
        <span className="agent-status-dock__indicator" aria-hidden="true" />
      </button>
    </div>
  );
};
