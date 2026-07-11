import type {
  DesktopAgentBridgeStatus,
  DesktopCurrentProject,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";

export interface AgentBridgeStatusReader {
  getAgentBridgeStatus?(): Promise<DesktopAgentBridgeStatus>;
}

export interface AgentBridgeStatusWriter {
  setAgentBridgeEnabled?(enabled: boolean): Promise<DesktopAgentBridgeStatus>;
}

export interface AgentBridgeProjectStateNotifier {
  notifyProjectStateChanged?(currentProject: DesktopCurrentProject | null): void;
}

export type AgentBridgeEnabledToggleResult =
  | {
      status: "updated";
      nextStatus: DesktopAgentBridgeStatus;
      projectUpdate: DesktopProjectBundle | null;
    }
  | {
      status: "failed";
      errorMessage: string;
    };

export const createUnavailableAgentBridgeStatus = (
  boardUrl: string | null,
): DesktopAgentBridgeStatus => ({
  enabled: false,
  ready: false,
  currentProject: null,
  boardUrl,
});

export const readAgentBridgeStatus = async ({
  bridge,
  fallbackBoardUrl,
}: {
  bridge: AgentBridgeStatusReader | null | undefined;
  fallbackBoardUrl: string | null;
}): Promise<DesktopAgentBridgeStatus | null> => {
  if (!bridge?.getAgentBridgeStatus) {
    return null;
  }

  try {
    return await bridge.getAgentBridgeStatus();
  } catch {
    return createUnavailableAgentBridgeStatus(fallbackBoardUrl);
  }
};

export const canReadAgentBridgeStatus = (
  bridge: AgentBridgeStatusReader | null | undefined,
): boolean => Boolean(bridge?.getAgentBridgeStatus);

export const buildDesktopCurrentProject = (
  project: DesktopProjectBundle | null,
): DesktopCurrentProject | null =>
  project
    ? {
        projectPath: project.projectPath,
        name: project.project.name,
        agentAccess: project.project.agentAccess,
      }
    : null;

export const getProjectAgentAccessToken = (
  project: DesktopProjectBundle | null,
): string | null => project?.project.agentAccess?.token ?? null;

export const buildAgentBridgeStatusCurrentProjectUpdate = ({
  status,
  project,
}: {
  status: DesktopAgentBridgeStatus | null;
  project: DesktopProjectBundle | null;
}): DesktopAgentBridgeStatus | null =>
  status
    ? {
        ...status,
        currentProject: buildDesktopCurrentProject(project),
      }
    : null;

export const notifyAgentBridgeProjectState = ({
  bridge,
  currentProject,
}: {
  bridge: AgentBridgeProjectStateNotifier | null | undefined;
  currentProject: DesktopProjectBundle | null;
}): void => {
  bridge?.notifyProjectStateChanged?.(
    buildDesktopCurrentProject(currentProject),
  );
};

export const refreshAgentBridgeStatus = async ({
  bridge,
  currentProject,
  fallbackBoardUrl,
}: {
  bridge:
    | (AgentBridgeStatusReader & AgentBridgeProjectStateNotifier)
    | null
    | undefined;
  currentProject: DesktopProjectBundle | null;
  fallbackBoardUrl: string | null;
}): Promise<DesktopAgentBridgeStatus | null> => {
  if (!canReadAgentBridgeStatus(bridge)) {
    return null;
  }

  notifyAgentBridgeProjectState({ bridge, currentProject });

  return readAgentBridgeStatus({
    bridge,
    fallbackBoardUrl,
  });
};

export const canSetAgentBridgeEnabled = (
  bridge: AgentBridgeStatusWriter | null | undefined,
): boolean => Boolean(bridge?.setAgentBridgeEnabled);

export const setAgentBridgeEnabledState = async ({
  bridge,
  enabled,
}: {
  bridge: AgentBridgeStatusWriter | null | undefined;
  enabled: boolean;
}): Promise<DesktopAgentBridgeStatus> => {
  const setAgentBridgeEnabled = bridge?.setAgentBridgeEnabled;
  if (!setAgentBridgeEnabled) {
    throw new Error("请在 CoreStudio 桌面端开启或关闭 Agent 连接。");
  }

  return setAgentBridgeEnabled(enabled);
};

export const buildAgentBridgeProjectAccessUpdate = ({
  currentProject,
  nextStatus,
}: {
  currentProject: DesktopProjectBundle | null;
  nextStatus: DesktopAgentBridgeStatus;
}): DesktopProjectBundle | null => {
  if (!currentProject || !nextStatus.currentProject) {
    return null;
  }

  return {
    ...currentProject,
    project: {
      ...currentProject.project,
      agentAccess: nextStatus.currentProject.agentAccess,
    },
  };
};

export const runAgentBridgeEnabledToggle = async ({
  bridge,
  enabled,
  currentProject,
}: {
  bridge:
    | (AgentBridgeStatusWriter & AgentBridgeProjectStateNotifier)
    | null
    | undefined;
  enabled: boolean;
  currentProject: DesktopProjectBundle | null;
}): Promise<AgentBridgeEnabledToggleResult> => {
  if (!canSetAgentBridgeEnabled(bridge)) {
    return {
      status: "failed",
      errorMessage: "请在 CoreStudio 桌面端开启或关闭 Agent 连接。",
    };
  }

  notifyAgentBridgeProjectState({ bridge, currentProject });

  try {
    const nextStatus = await setAgentBridgeEnabledState({
      bridge,
      enabled,
    });

    return {
      status: "updated",
      nextStatus,
      projectUpdate: buildAgentBridgeProjectAccessUpdate({
        currentProject,
        nextStatus,
      }),
    };
  } catch (error) {
    return {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Agent 连接状态切换失败。",
    };
  }
};
