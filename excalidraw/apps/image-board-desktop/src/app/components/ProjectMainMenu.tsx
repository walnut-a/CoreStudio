import { MainMenu } from "@excalidraw/excalidraw/index";

import { copy } from "../copy";
import { copyIcon, projectFolderIcon } from "./CoreStudioIcons";

import "./ProjectMainMenu.css";

interface ProjectMainMenuProps {
  currentProjectName: string;
  onSwitchProject: () => void;
  onCopyBoardAddress?: () => void;
  canvasUtilityActionsVisible?: boolean;
}

export const ProjectMainMenu = ({
  currentProjectName,
  onSwitchProject,
  onCopyBoardAddress,
  canvasUtilityActionsVisible = true,
}: ProjectMainMenuProps) => (
  <MainMenu>
    <MainMenu.Group title={copy.menu.projectGroup}>
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
    </MainMenu.Group>

    {canvasUtilityActionsVisible ? (
      <>
        <MainMenu.Separator />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
      </>
    ) : null}
    <MainMenu.Separator />
    <MainMenu.DefaultItems.ToggleTheme allowSystemTheme={false} />
  </MainMenu>
);
