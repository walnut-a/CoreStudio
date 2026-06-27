import type { BaseWindow, MenuItemConstructorOptions } from "electron";

import type {
  DesktopMenuEvent,
  RecentProjectEntry,
} from "../src/shared/desktopBridgeTypes";
import { copy } from "../src/app/copy";

export const CORESTUDIO_RELEASES_URL =
  "https://github.com/walnut-a/CoreStudio/releases";

interface AppMenuOptions {
  agentAccessEnabled?: boolean;
  platform?: NodeJS.Platform;
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
  const agentSettingsItems: MenuItemConstructorOptions[] = [
    {
      label: copy.menu.allowAgentAccess,
      type: "checkbox",
      checked: Boolean(options.agentAccessEnabled),
      click: (item, ownerWindow) =>
        sendMenuAction(
          {
            action: "set-agent-bridge-enabled",
            enabled: Boolean(item.checked),
          },
          ownerWindow,
        ),
    },
    { type: "separator" },
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
        ...(isMac ? [...agentSettingsItems, { type: "separator" as const }] : []),
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
              click: (_item, ownerWindow) =>
                sendMenuAction(
                  { action: "inspect-project-health" },
                  ownerWindow,
                ),
            },
            {
              label: copy.menu.repairProjectThumbnails,
              click: (_item, ownerWindow) =>
                sendMenuAction(
                  { action: "repair-project-thumbnails" },
                  ownerWindow,
                ),
            },
            {
              label: copy.menu.cleanProjectCache,
              click: (_item, ownerWindow) =>
                sendMenuAction({ action: "clean-project-cache" }, ownerWindow),
            },
          ],
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
        { label: copy.menu.quit, role: "quit" },
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
    ...(!isMac
      ? [
          {
            label: copy.menu.settings,
            submenu: agentSettingsItems,
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
