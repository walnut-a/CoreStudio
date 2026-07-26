import { createHash } from "node:crypto";

import type { DesktopProjectTheme } from "../src/shared/desktopBridgeTypes";

export type ProjectViewStatus = "ready" | "crashed";

export interface ProjectViewDescriptor {
  projectPath: string;
  projectId: string;
  name: string;
  safeMode?: boolean;
}

export interface ProjectViewHandle {
  projectPath: string;
  webContentsId: number;
  attach(): void;
  detach(): void;
  focus(): void;
  setBounds(bounds: ProjectViewBounds): void;
  destroy(): void;
}

export interface ProjectViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProjectViewSnapshotEntry extends ProjectViewDescriptor {
  status: ProjectViewStatus;
  webContentsId: number;
  theme?: DesktopProjectTheme;
}

export interface ProjectViewRegistrySnapshot {
  activeProjectPath: string | null;
  projects: ProjectViewSnapshotEntry[];
}

interface ProjectViewEntry {
  descriptor: ProjectViewDescriptor;
  handle: ProjectViewHandle;
  status: ProjectViewStatus;
  theme?: DesktopProjectTheme;
}

interface CreateProjectViewRegistryInput {
  createView(descriptor: ProjectViewDescriptor): ProjectViewHandle;
  onChange?(snapshot: ProjectViewRegistrySnapshot): void;
}

const createProjectViewError = (
  code: "PROJECT_MISMATCH" | "PROJECT_SESSION_REQUIRED",
  message: string,
) => Object.assign(new Error(message), { code });

export const createProjectRendererPartition = (projectId: string) =>
  `corestudio-project-${createHash("sha256")
    .update(projectId)
    .digest("hex")
    .slice(0, 24)}`;

export const createProjectViewRegistry = ({
  createView,
  onChange,
}: CreateProjectViewRegistryInput) => {
  const entries: ProjectViewEntry[] = [];
  let activeProjectPath: string | null = null;

  const snapshot = (): ProjectViewRegistrySnapshot => ({
    activeProjectPath,
    projects: entries.map(({ descriptor, handle, status, theme }) => ({
      ...descriptor,
      status,
      webContentsId: handle.webContentsId,
      ...(theme ? { theme } : {}),
    })),
  });

  const publish = () => {
    onChange?.(snapshot());
  };

  const findEntry = (projectPath: string) =>
    entries.find((entry) => entry.descriptor.projectPath === projectPath) ??
    null;

  const activate = (projectPath: string) => {
    const nextEntry = findEntry(projectPath);
    if (!nextEntry) {
      throw createProjectViewError(
        "PROJECT_SESSION_REQUIRED",
        `Project renderer is not open: ${projectPath}`,
      );
    }
    if (activeProjectPath === projectPath) {
      if (nextEntry.status === "ready") {
        nextEntry.handle.focus();
      }
      return nextEntry.handle;
    }
    const currentEntry = activeProjectPath
      ? findEntry(activeProjectPath)
      : null;
    currentEntry?.handle.detach();
    activeProjectPath = projectPath;
    if (nextEntry.status === "ready") {
      nextEntry.handle.attach();
      nextEntry.handle.focus();
    }
    publish();
    return nextEntry.handle;
  };

  const open = (descriptor: ProjectViewDescriptor) => {
    const existing = findEntry(descriptor.projectPath);
    if (existing) {
      const updatedDescriptor = { ...descriptor };
      delete updatedDescriptor.safeMode;
      existing.descriptor = {
        ...updatedDescriptor,
        ...(existing.descriptor.safeMode ? { safeMode: true } : {}),
      };
      const handle = activate(descriptor.projectPath);
      publish();
      return handle;
    }
    const handle = createView(descriptor);
    if (
      handle.projectPath !== descriptor.projectPath ||
      entries.some(
        (entry) => entry.handle.webContentsId === handle.webContentsId,
      )
    ) {
      handle.destroy();
      throw new Error("Project renderer identity is not unique.");
    }
    entries.push({
      descriptor,
      handle,
      status: "ready",
    });
    return activate(descriptor.projectPath);
  };

  const showHome = () => {
    if (activeProjectPath) {
      findEntry(activeProjectPath)?.handle.detach();
    }
    activeProjectPath = null;
    publish();
  };

  const close = (projectPath: string) => {
    const index = entries.findIndex(
      (entry) => entry.descriptor.projectPath === projectPath,
    );
    if (index < 0) {
      return false;
    }
    const [entry] = entries.splice(index, 1);
    const wasActive = activeProjectPath === projectPath;
    if (wasActive) {
      entry.handle.detach();
      activeProjectPath = null;
    }
    entry.handle.destroy();
    if (wasActive) {
      const neighbor = entries[index] ?? entries[index - 1] ?? null;
      if (neighbor) {
        activate(neighbor.descriptor.projectPath);
        return true;
      }
    }
    publish();
    return true;
  };

  const requireSenderProject = (
    webContentsId: number,
    projectPath: string,
  ) => {
    const senderEntry =
      entries.find((entry) => entry.handle.webContentsId === webContentsId) ??
      null;
    if (!senderEntry) {
      throw createProjectViewError(
        "PROJECT_SESSION_REQUIRED",
        "The IPC sender is not a registered project renderer.",
      );
    }
    if (senderEntry.descriptor.projectPath !== projectPath) {
      throw createProjectViewError(
        "PROJECT_MISMATCH",
        "The IPC sender is not bound to the requested project.",
      );
    }
    return senderEntry.descriptor;
  };

  const setTheme = (
    webContentsId: number,
    theme: DesktopProjectTheme,
  ) => {
    const senderEntry =
      entries.find((entry) => entry.handle.webContentsId === webContentsId) ??
      null;
    if (!senderEntry) {
      throw createProjectViewError(
        "PROJECT_SESSION_REQUIRED",
        "The IPC sender is not a registered project renderer.",
      );
    }
    if (senderEntry.theme === theme) {
      return false;
    }
    senderEntry.theme = theme;
    publish();
    return true;
  };

  const resolveCommandProject = (projectPath?: string | null) => {
    const targetProjectPath = projectPath ?? activeProjectPath;
    const entry = targetProjectPath ? findEntry(targetProjectPath) : null;
    if (!entry || entry.status !== "ready") {
      throw createProjectViewError(
        "PROJECT_SESSION_REQUIRED",
        targetProjectPath
          ? `Project renderer is not available: ${targetProjectPath}`
          : "No active project renderer is available.",
      );
    }
    return snapshot().projects.find(
      (project) => project.projectPath === targetProjectPath,
    )!;
  };

  const markCrashed = (webContentsId: number) => {
    const entry =
      entries.find((candidate) => candidate.handle.webContentsId === webContentsId) ??
      null;
    if (!entry) {
      return false;
    }
    entry.status = "crashed";
    if (activeProjectPath === entry.descriptor.projectPath) {
      entry.handle.detach();
    }
    publish();
    return true;
  };

  const recover = (projectPath: string) => {
    const entry = findEntry(projectPath);
    if (!entry) {
      throw createProjectViewError(
        "PROJECT_SESSION_REQUIRED",
        `Project renderer is not open: ${projectPath}`,
      );
    }
    const wasActive = activeProjectPath === projectPath;
    entry.handle.destroy();
    entry.handle = createView(entry.descriptor);
    entry.status = "ready";
    if (wasActive) {
      entry.handle.attach();
      entry.handle.focus();
    }
    publish();
    return entry.handle;
  };

  const closeAll = () => {
    for (const entry of entries.splice(0)) {
      entry.handle.destroy();
    }
    activeProjectPath = null;
    publish();
  };

  const setBounds = (bounds: ProjectViewBounds) => {
    for (const entry of entries) {
      entry.handle.setBounds(bounds);
    }
  };

  return {
    open,
    activate,
    showHome,
    close,
    closeAll,
    markCrashed,
    recover,
    resolveCommandProject,
    requireSenderProject,
    setTheme,
    setBounds,
    snapshot,
  };
};

export type ProjectViewRegistry = ReturnType<
  typeof createProjectViewRegistry
>;
