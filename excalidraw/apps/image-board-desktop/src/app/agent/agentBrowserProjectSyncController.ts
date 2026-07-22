import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";

export interface AgentBrowserProjectVersion {
  projectPath: string;
  updatedAt: string;
}

export type AgentBrowserProjectSyncResult =
  | { status: "unchanged" }
  | { status: "project-changed" }
  | { status: "missing" }
  | { status: "metadata-applied" }
  | { status: "applied" };

export const runAgentBrowserProjectSyncAction = async ({
  currentProject,
  readProjectVersion,
  readProjectBundle,
  applyProjectBundle,
  applyProjectMetadata,
}: {
  currentProject: DesktopProjectBundle;
  readProjectVersion: () => Promise<AgentBrowserProjectVersion | null>;
  readProjectBundle: (
    projectPath: string,
  ) => Promise<DesktopProjectBundle | null>;
  applyProjectBundle: (project: DesktopProjectBundle) => Promise<void>;
  applyProjectMetadata: (project: DesktopProjectBundle) => void;
}): Promise<AgentBrowserProjectSyncResult> => {
  const version = await readProjectVersion();
  if (!version) {
    return { status: "missing" };
  }
  if (version.projectPath !== currentProject.projectPath) {
    return { status: "project-changed" };
  }
  if (version.updatedAt === currentProject.project.updatedAt) {
    return { status: "unchanged" };
  }

  const nextProject = await readProjectBundle(currentProject.projectPath);
  if (!nextProject || nextProject.projectPath !== currentProject.projectPath) {
    return { status: "missing" };
  }
  if (nextProject.sceneJson === currentProject.sceneJson) {
    applyProjectMetadata(nextProject);
    return { status: "metadata-applied" };
  }
  await applyProjectBundle(nextProject);
  return { status: "applied" };
};
