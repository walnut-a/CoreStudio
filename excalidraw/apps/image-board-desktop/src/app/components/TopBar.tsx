import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

interface TopBarProps {
  projectName: string;
  onOpenProject: () => void;
  onImportImages: () => void;
  onRevealProject: () => void;
  onOpenProviders: () => void;
}

export const TopBar = ({
  projectName,
  onOpenProject,
  onImportImages,
  onRevealProject,
  onOpenProviders,
}: TopBarProps) => {
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

      <div className="image-board-toolbar__group">
        <DesktopButton type="button" onClick={onOpenProviders}>
          {copy.toolbar.providers}
        </DesktopButton>
      </div>
    </div>
  );
};
