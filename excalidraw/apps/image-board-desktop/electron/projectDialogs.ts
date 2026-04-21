import { dialog, type BrowserWindow, type OpenDialogOptions } from "electron";

import {
  ensureDefaultProjectsRoot,
  loadRecentProjects,
} from "./recentProjectsStore";

const chooseProjectDirectory = async (
  defaultPath: string,
  ownerWindow?: BrowserWindow | null,
) => {
  const options: OpenDialogOptions = {
    defaultPath,
    properties: ["openDirectory", "createDirectory"],
  };
  const result =
    ownerWindow && !ownerWindow.isDestroyed()
      ? await dialog.showOpenDialog(ownerWindow, options)
      : await dialog.showOpenDialog(options);
  return result.canceled ? null : result.filePaths[0];
};

export const chooseCreateProjectDirectory = async (
  ownerWindow?: BrowserWindow | null,
) => chooseProjectDirectory(await ensureDefaultProjectsRoot(), ownerWindow);

export const chooseOpenProjectDirectory = async (
  ownerWindow?: BrowserWindow | null,
) => {
  const recentProjects = await loadRecentProjects();
  return chooseProjectDirectory(
    recentProjects[0]?.projectPath ?? (await ensureDefaultProjectsRoot()),
    ownerWindow,
  );
};
