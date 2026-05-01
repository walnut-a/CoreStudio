import type { BaseWindow, MenuItemConstructorOptions } from "electron";

import type {
  DesktopMenuEvent,
  RecentProjectEntry,
} from "../src/shared/desktopBridgeTypes";
import { copy } from "../src/app/copy";

export const createAppMenuTemplate = (
  sendMenuAction: (
    event: DesktopMenuEvent,
    ownerWindow?: BaseWindow | null,
  ) => void,
  recentProjects: RecentProjectEntry[] = [],
): MenuItemConstructorOptions[] => [
  {
    label: copy.menu.file,
    submenu: [
      {
        label: copy.menu.newProject,
        click: (_item, ownerWindow) =>
          sendMenuAction({ action: "new-project" }, ownerWindow),
      },
      {
        label: copy.menu.openProject,
        click: (_item, ownerWindow) =>
          sendMenuAction({ action: "open-project" }, ownerWindow),
      },
      {
        label: copy.menu.recentProjects,
        submenu: recentProjects.length
          ? recentProjects.map((project) => ({
              label: project.name,
              click: (_item, ownerWindow) =>
                sendMenuAction(
                  {
                    action: "open-recent-project",
                    projectPath: project.projectPath,
                  },
                  ownerWindow,
                ),
            }))
          : [{ label: copy.welcome.recentEmpty, enabled: false }],
      },
      { type: "separator" },
      {
        label: copy.menu.importImages,
        click: (_item, ownerWindow) =>
          sendMenuAction({ action: "import-images" }, ownerWindow),
      },
      {
        label: copy.menu.revealProject,
        click: (_item, ownerWindow) =>
          sendMenuAction({ action: "reveal-project" }, ownerWindow),
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
  {
    label: copy.menu.help,
    submenu: [
      {
        label: copy.menu.about,
        click: (_item, ownerWindow) =>
          sendMenuAction({ action: "show-about" }, ownerWindow),
      },
    ],
  },
];
