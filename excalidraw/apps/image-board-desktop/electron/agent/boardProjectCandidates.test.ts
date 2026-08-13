import { describe, expect, it, vi } from "vitest";

import { buildBoardProjectCandidates } from "./boardProjectCandidates";

const projects = [
  {
    projectPath: "/projects/current",
    name: "当前项目",
    lastOpenedAt: "2026-08-13T08:00:00.000Z",
  },
  {
    projectPath: "/projects/available",
    name: "可切换项目",
    lastOpenedAt: "2026-08-12T08:00:00.000Z",
  },
  {
    projectPath: "/projects/missing",
    name: "已移动项目",
    lastOpenedAt: "2026-08-11T08:00:00.000Z",
  },
];

describe("buildBoardProjectCandidates", () => {
  it("distinguishes the current, switchable, and unavailable projects", async () => {
    const readProject = vi.fn(async (projectPath: string) => {
      if (projectPath === "/projects/missing") {
        throw new Error("missing");
      }
      return { name: projectPath.split("/").at(-1) };
    });

    await expect(
      buildBoardProjectCandidates({
        projects,
        currentProjectPath: "/projects/current",
        readProject,
      }),
    ).resolves.toEqual([
      { ...projects[0], selectionAvailability: "current" },
      { ...projects[1], selectionAvailability: "available" },
      { ...projects[2], selectionAvailability: "unavailable" },
    ]);
    expect(readProject).not.toHaveBeenCalledWith("/projects/current");
  });

  it("marks a readable project unavailable when another app owns it", async () => {
    const readProject = vi.fn(async () => ({ name: "project" }));
    const canOpenProject = vi.fn(
      async (projectPath: string) => projectPath !== "/projects/available",
    );

    const result = await buildBoardProjectCandidates({
      projects: projects.slice(1, 2),
      readProject,
      canOpenProject,
    });

    expect(result).toEqual([
      { ...projects[1], selectionAvailability: "unavailable" },
    ]);
    expect(readProject).toHaveBeenCalledWith("/projects/available");
    expect(canOpenProject).toHaveBeenCalledWith("/projects/available");
  });
});
