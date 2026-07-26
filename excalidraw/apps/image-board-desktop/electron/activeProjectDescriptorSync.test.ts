import { describe, expect, it, vi } from "vitest";

import { createActiveProjectDescriptorSync } from "./activeProjectDescriptorSync";

describe("active project descriptor sync", () => {
  it("does not let a slower previous tab overwrite the latest active project", async () => {
    let activeProjectPath: string | null = "/projects/a";
    let resolveProjectA!: (value: {
      name: string;
      agentAccess: { enabled: boolean; token: string };
    }) => void;
    const readProjectDescriptor = vi.fn((projectPath: string) =>
      projectPath === "/projects/a"
        ? new Promise<{
            name: string;
            agentAccess: { enabled: boolean; token: string };
          }>((resolve) => {
            resolveProjectA = resolve;
          })
        : Promise.resolve({
            name: "项目 B",
            agentAccess: { enabled: true, token: "token-b" },
          }),
    );
    const setCurrentProject = vi.fn(async () => undefined);
    const sync = createActiveProjectDescriptorSync({
      getActiveProjectPath: () => activeProjectPath,
      readProjectDescriptor,
      setCurrentProject,
    });

    const syncingA = sync("/projects/a");
    activeProjectPath = "/projects/b";
    await sync("/projects/b");
    resolveProjectA({
      name: "项目 A",
      agentAccess: { enabled: true, token: "token-a" },
    });
    await syncingA;

    expect(setCurrentProject).toHaveBeenCalledTimes(1);
    expect(setCurrentProject).toHaveBeenCalledWith({
      projectPath: "/projects/b",
      name: "项目 B",
      agentAccess: { enabled: true, token: "token-b" },
    });
  });

  it("keeps Home authoritative while an earlier project read is in flight", async () => {
    let activeProjectPath: string | null = "/projects/a";
    let resolveProjectA!: (value: {
      name: string;
      agentAccess: { enabled: boolean; token: string };
    }) => void;
    const setCurrentProject = vi.fn(async () => undefined);
    const sync = createActiveProjectDescriptorSync({
      getActiveProjectPath: () => activeProjectPath,
      readProjectDescriptor: () =>
        new Promise((resolve) => {
          resolveProjectA = resolve;
        }),
      setCurrentProject,
    });

    const syncingA = sync("/projects/a");
    activeProjectPath = null;
    await sync(null);
    resolveProjectA({
      name: "项目 A",
      agentAccess: { enabled: true, token: "token-a" },
    });
    await syncingA;

    expect(setCurrentProject).toHaveBeenCalledTimes(1);
    expect(setCurrentProject).toHaveBeenCalledWith(null);
  });
});
