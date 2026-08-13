import type { RecentProjectEntry } from "../../src/shared/desktopBridgeTypes";

export const buildBoardProjectCandidates = async ({
  projects,
  currentProjectPath,
  readProject,
  canOpenProject = async () => true,
}: {
  projects: RecentProjectEntry[];
  currentProjectPath?: string;
  readProject: (projectPath: string) => Promise<unknown>;
  canOpenProject?: (projectPath: string) => Promise<boolean>;
}): Promise<RecentProjectEntry[]> =>
  Promise.all(
    projects.map(async (project) => {
      if (project.projectPath === currentProjectPath) {
        return { ...project, selectionAvailability: "current" as const };
      }
      try {
        await readProject(project.projectPath);
        return {
          ...project,
          selectionAvailability: (await canOpenProject(project.projectPath))
            ? ("available" as const)
            : ("unavailable" as const),
        };
      } catch {
        return { ...project, selectionAvailability: "unavailable" as const };
      }
    }),
  );
