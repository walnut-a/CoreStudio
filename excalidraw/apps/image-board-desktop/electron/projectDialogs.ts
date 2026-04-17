import { dialog } from "electron";

import {
  ensureDefaultProjectsRoot,
  loadRecentProjects,
} from "./recentProjectsStore";

const chooseProjectDirectory = async (defaultPath: string) => {
  const result = await dialog.showOpenDialog({
    defaultPath,
    properties: ["openDirectory", "createDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
};

export const chooseCreateProjectDirectory = async () =>
  chooseProjectDirectory(await ensureDefaultProjectsRoot());

export const chooseOpenProjectDirectory = async () => {
  const recentProjects = await loadRecentProjects();
  return chooseProjectDirectory(
    recentProjects[0]?.projectPath ?? (await ensureDefaultProjectsRoot()),
  );
};
