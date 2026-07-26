import type { LocalBridgeCurrentProject } from "./agent/localBridgeServer";

interface ProjectDescriptor {
  name: string;
  agentAccess: LocalBridgeCurrentProject["agentAccess"];
}

interface CreateActiveProjectDescriptorSyncInput {
  getActiveProjectPath: () => string | null;
  readProjectDescriptor: (projectPath: string) => Promise<ProjectDescriptor>;
  setCurrentProject: (
    project: LocalBridgeCurrentProject | null,
  ) => Promise<void>;
}

export const createActiveProjectDescriptorSync = ({
  getActiveProjectPath,
  readProjectDescriptor,
  setCurrentProject,
}: CreateActiveProjectDescriptorSyncInput) => {
  return async (projectPath: string | null) => {
    if (projectPath === null) {
      if (getActiveProjectPath() !== null) {
        return false;
      }
      await setCurrentProject(null);
      return true;
    }

    const project = await readProjectDescriptor(projectPath);
    if (getActiveProjectPath() !== projectPath) {
      return false;
    }
    await setCurrentProject({
      projectPath,
      name: project.name,
      agentAccess: project.agentAccess,
    });
    return true;
  };
};
