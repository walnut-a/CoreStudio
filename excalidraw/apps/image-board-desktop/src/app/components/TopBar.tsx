import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

interface TopBarProps {
  projectName: string;
  onOpenProject: () => void;
  onImportImages: () => void;
  onRevealProject: () => void;
  agentBridgeStatus?: DesktopAgentBridgeStatus | null;
  onCopyAgentBoardUrl?: () => void;
}

export const TopBar = ({
  projectName,
  onOpenProject,
  onImportImages,
  onRevealProject,
  agentBridgeStatus,
  onCopyAgentBoardUrl,
}: TopBarProps) => {
  const agentReady = Boolean(agentBridgeStatus?.ready);
  const hasBoardUrl = Boolean(agentBridgeStatus?.boardUrl);

  return (
    <div className="image-board-toolbar">
      <div className="image-board-toolbar__group">
        <span className="image-board-toolbar__title">{projectName}</span>
        <DesktopButton type="button" onClick={onOpenProject}>
          {copy.toolbar.openProject}
        </DesktopButton>
        <DesktopButton type="button" onClick={onImportImages}>
          {copy.toolbar.importImages}
        </DesktopButton>
        <DesktopButton type="button" onClick={onRevealProject}>
          {copy.toolbar.revealProject}
        </DesktopButton>
      </div>
      <div className="image-board-toolbar__group image-board-toolbar__group--agent">
        <span
          className={[
            "agent-bridge-status",
            agentReady ? "agent-bridge-status--ready" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="agent-bridge-status__dot" aria-hidden="true" />
          {agentReady ? "Agent Bridge 已连接" : "Agent Bridge 未就绪"}
        </span>
        <DesktopButton
          type="button"
          onClick={onCopyAgentBoardUrl}
          disabled={!hasBoardUrl || !onCopyAgentBoardUrl}
        >
          复制 Agent Board 链接
        </DesktopButton>
      </div>
    </div>
  );
};
