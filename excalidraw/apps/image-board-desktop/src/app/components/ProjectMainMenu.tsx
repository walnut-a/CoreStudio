import { MainMenu } from "@excalidraw/excalidraw/index";

import { copy } from "../copy";
import { projectFolderIcon } from "./CoreStudioIcons";

import "./ProjectMainMenu.css";

interface ProjectMainMenuProps {
  currentProjectName: string;
  onSwitchProject: () => void;
}

export const ProjectMainMenu = ({
  currentProjectName,
  onSwitchProject,
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
    </MainMenu.Group>

    <MainMenu.Separator />
    <MainMenu.DefaultItems.SaveAsImage />
    <MainMenu.DefaultItems.SearchMenu />
    <MainMenu.DefaultItems.Help />
    <MainMenu.DefaultItems.ClearCanvas />
    <MainMenu.Separator />
    <MainMenu.DefaultItems.ToggleTheme />
  </MainMenu>
);
