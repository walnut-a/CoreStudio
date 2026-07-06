import type {
  AgentDesktopBridgeMethod,
  AgentRendererCommandName,
} from "../../shared/agentBridgeTypes";

export const createAgentBadRequestError = (message: string) =>
  Object.assign(new Error(message), {
    code: "BAD_REQUEST" as const,
  });

export const createAgentCapabilityUnavailableError = ({
  message,
  command,
  capability,
}: {
  message: string;
  command: AgentRendererCommandName;
  capability: AgentDesktopBridgeMethod;
}) =>
  Object.assign(new Error(message), {
    code: "CAPABILITY_UNAVAILABLE" as const,
    details: {
      command,
      capability,
    },
  });

export const createAgentProjectMismatchError = () =>
  Object.assign(new Error("Agent command projectPath 与当前项目不一致。"), {
    code: "PROJECT_MISMATCH" as const,
  });

export const assertActiveAgentProjectPath = ({
  expectedProjectPath,
  activeProjectPath,
}: {
  expectedProjectPath?: string;
  activeProjectPath?: string | null;
}) => {
  if (expectedProjectPath && activeProjectPath !== expectedProjectPath) {
    throw createAgentProjectMismatchError();
  }
};

export const createActiveAgentProjectPathRendererActions = ({
  getActiveProjectPath,
}: {
  getActiveProjectPath: () => string | null | undefined;
}) => ({
  assertActiveProject: (expectedProjectPath?: string) =>
    assertActiveAgentProjectPath({
      expectedProjectPath,
      activeProjectPath: getActiveProjectPath(),
    }),
});

export const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const isObjectPayload = (
  payload: unknown,
): payload is Record<string, unknown> =>
  Boolean(payload && typeof payload === "object" && !Array.isArray(payload));

export const parseStringList = (value: unknown) => {
  if (value === undefined || value === null) {
    return [];
  }
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      values
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
};

export const assertAgentProjectPath = (
  payload: unknown,
  projectPath: string,
) => {
  if (!isObjectPayload(payload) || payload.projectPath !== projectPath) {
    throw createAgentProjectMismatchError();
  }
};
