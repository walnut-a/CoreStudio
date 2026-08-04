import type { BaseWindow, MenuItemConstructorOptions } from "electron";

import type {
  DesktopMenuEvent,
  RecentProjectEntry,
} from "../src/shared/desktopBridgeTypes";
import type { DesktopLocale } from "../src/shared/desktopLocale";
import { getDesktopCopy } from "../src/app/copy";

export const CORESTUDIO_RELEASES_URL =
  "https://github.com/walnut-a/CoreStudio/releases";

interface AppMenuOptions {
  platform?: NodeJS.Platform;
  locale?: DesktopLocale;
  projectActionsEnabled?: boolean;
}

export const createAppMenuTemplate = (
  sendMenuAction: (
    event: DesktopMenuEvent,
    ownerWindow?: BaseWindow | null,
  ) => void,
  recentProjects: RecentProjectEntry[] = [],
  appVersion?: string | null,
  openExternal: (url: string) => void = () => undefined,
  options: AppMenuOptions = {},
): MenuItemConstructorOptions[] => {
  const isMac = options.platform === "darwin";
  const copy = getDesktopCopy(options.locale ?? "zh-CN");
  const settingsItems: MenuItemConstructorOptions[] = [
    {
      label: copy.menu.appSettings,
      click: (_item, ownerWindow) =>
        sendMenuAction({ action: "app-settings" }, ownerWindow),
    },
  ];

  const template: MenuItemConstructorOptions[] = [
    {
      label: copy.menu.file,
      submenu: [
        ...(appVersion
          ? [
              {
                label: `${copy.menu.version} ${appVersion}`,
                enabled: false,
              },
              { type: "separator" as const },
            ]
          : []),
        ...(isMac ? [...settingsItems, { type: "separator" as const }] : []),
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
        {
          label: copy.menu.projectMaintenance,
          submenu: [
            {
              label: copy.menu.openProjectSafe,
              click: (_item, ownerWindow) =>
                sendMenuAction({ action: "open-project-safe" }, ownerWindow),
            },
            { type: "separator" },
            {
              label: copy.menu.inspectProjectHealth,
              enabled: options.projectActionsEnabled ?? true,
              click: (_item, ownerWindow) =>
                sendMenuAction(
                  { action: "inspect-project-health" },
                  ownerWindow,
                ),
            },
            {
              label: copy.menu.repairProjectThumbnails,
              enabled: options.projectActionsEnabled ?? true,
              click: (_item, ownerWindow) =>
                sendMenuAction(
                  { action: "repair-project-thumbnails" },
                  ownerWindow,
                ),
            },
            {
              label: copy.menu.cleanProjectCache,
              enabled: options.projectActionsEnabled ?? true,
              click: (_item, ownerWindow) =>
                sendMenuAction({ action: "clean-project-cache" }, ownerWindow),
            },
          ],
        },
        { type: "separator" },
        {
          label: copy.menu.importImages,
          enabled: options.projectActionsEnabled ?? true,
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "import-images" }, ownerWindow),
        },
        {
          label: copy.menu.revealProject,
          enabled: options.projectActionsEnabled ?? true,
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "reveal-project" }, ownerWindow),
        },
        { type: "separator" },
        { label: copy.menu.quit, role: "quit" },
      ],
    },
    {
      label: copy.menu.edit,
      submenu: [
        {
          label: copy.menu.undo,
          accelerator: "CmdOrCtrl+Z",
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "edit-undo" }, ownerWindow),
        },
        {
          label: copy.menu.redo,
          accelerator: "CmdOrCtrl+Shift+Z",
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "edit-redo" }, ownerWindow),
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        {
          label: copy.menu.selectAll,
          accelerator: "CmdOrCtrl+A",
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "edit-select-all" }, ownerWindow),
        },
      ],
    },
    ...(!isMac
      ? [
          {
            label: copy.menu.settings,
            submenu: settingsItems,
          },
        ]
      : []),
    {
      label: copy.menu.help,
      submenu: [
        {
          label: copy.menu.viewUpdates,
          click: () => openExternal(CORESTUDIO_RELEASES_URL),
        },
        {
          label: copy.menu.about,
          click: (_item, ownerWindow) =>
            sendMenuAction({ action: "show-about" }, ownerWindow),
        },
      ],
    },
  ];

  return template;
};
