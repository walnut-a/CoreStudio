import { MainMenu } from "@excalidraw/excalidraw/index";

import { copy } from "../copy";
import { copyIcon, projectFolderIcon } from "./CoreStudioIcons";

import "./ProjectMainMenu.css";

interface ProjectMainMenuProps {
  currentProjectName: string;
  onSwitchProject: () => void;
  onCopyBoardAddress?: () => void;
  onCopyBoardLinkInstruction?: () => void;
  canvasUtilityActionsVisible?: boolean;
}

export const ProjectMainMenu = ({
  currentProjectName,
  onSwitchProject,
  onCopyBoardAddress,
  onCopyBoardLinkInstruction,
  canvasUtilityActionsVisible = true,
}: ProjectMainMenuProps) => (
  <MainMenu>
    <MainMenu.Group>
      <MainMenu.ItemCustom
        className="project-main-menu__current"
        aria-label={copy.menu.currentProject(currentProjectName)}
      >
        <strong>{currentProjectName}</strong>
      </MainMenu.ItemCustom>

      <MainMenu.Item
        icon={projectFolderIcon}
        onSelect={onSwitchProject}
        aria-label={copy.menu.switchProject}
      >
        {copy.menu.switchProject}
      </MainMenu.Item>
      {canvasUtilityActionsVisible && onCopyBoardAddress ? (
        <MainMenu.Item
          icon={copyIcon}
          onSelect={onCopyBoardAddress}
          aria-label={copy.menu.copyBoardAddress}
        >
          {copy.menu.copyBoardAddress}
        </MainMenu.Item>
      ) : null}
      {canvasUtilityActionsVisible && onCopyBoardLinkInstruction ? (
        <MainMenu.Item
          icon={copyIcon}
          onSelect={onCopyBoardLinkInstruction}
          aria-label={copy.menu.copyBoardLinkInstruction}
        >
          {copy.menu.copyBoardLinkInstruction}
        </MainMenu.Item>
      ) : null}
    </MainMenu.Group>

    <MainMenu.Separator />
    {canvasUtilityActionsVisible ? <MainMenu.DefaultItems.Help /> : null}
    <MainMenu.DefaultItems.ToggleTheme allowSystemTheme={false} />
  </MainMenu>
);
