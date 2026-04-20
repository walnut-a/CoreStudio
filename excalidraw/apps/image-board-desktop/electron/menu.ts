import type { MenuItemConstructorOptions } from "electron";

import type {
  DesktopMenuEvent,
  RecentProjectEntry,
} from "../src/shared/desktopBridgeTypes";
import { copy } from "../src/app/copy";

export const createAppMenuTemplate = (
  sendMenuAction: (event: DesktopMenuEvent) => void,
  recentProjects: RecentProjectEntry[] = [],
): MenuItemConstructorOptions[] => [
  {
    label: copy.menu.file,
    submenu: [
      {
        label: copy.menu.newProject,
        click: () => sendMenuAction({ action: "new-project" }),
      },
      {
        label: copy.menu.openProject,
        click: () => sendMenuAction({ action: "open-project" }),
      },
      {
        label: copy.menu.recentProjects,
        submenu: recentProjects.length
          ? recentProjects.map((project) => ({
              label: project.name,
              click: () =>
                sendMenuAction({
                  action: "open-recent-project",
                  projectPath: project.projectPath,
                }),
            }))
          : [{ label: copy.welcome.recentEmpty, enabled: false }],
      },
      { type: "separator" },
      {
        label: copy.menu.importImages,
        click: () => sendMenuAction({ action: "import-images" }),
      },
      {
        label: copy.menu.revealProject,
        click: () => sendMenuAction({ action: "reveal-project" }),
      },
      { type: "separator" },
      { role: "quit" },
    ],
  },
  {
    label: copy.menu.edit,
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
    ],
  },
];
