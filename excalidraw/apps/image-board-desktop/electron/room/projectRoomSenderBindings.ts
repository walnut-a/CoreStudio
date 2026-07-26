export interface ProjectRoomSenderBinding {
  sessionId: string;
  senderId: number;
  projectPath: string;
}

interface CreateProjectRoomSenderBindingsInput {
  requireProjectSender(senderId: number, projectPath: string): unknown;
}

const createBindingError = (
  code: "PROJECT_MISMATCH" | "PROJECT_SESSION_REQUIRED",
  message: string,
) => Object.assign(new Error(message), { code });

export const createProjectRoomSenderBindings = ({
  requireProjectSender,
}: CreateProjectRoomSenderBindingsInput) => {
  const bySessionId = new Map<string, ProjectRoomSenderBinding>();

  const bind = (binding: ProjectRoomSenderBinding) => {
    requireProjectSender(binding.senderId, binding.projectPath);
    const existing = bySessionId.get(binding.sessionId);
    if (
      existing &&
      (existing.senderId !== binding.senderId ||
        existing.projectPath !== binding.projectPath)
    ) {
      throw createBindingError(
        "PROJECT_MISMATCH",
        "The room session is already bound to another project renderer.",
      );
    }
    bySessionId.set(binding.sessionId, binding);
    return binding;
  };

  const requireSession = (senderId: number, sessionId: string) => {
    const binding = bySessionId.get(sessionId);
    if (!binding) {
      throw createBindingError(
        "PROJECT_SESSION_REQUIRED",
        "The project room session is not registered.",
      );
    }
    if (binding.senderId !== senderId) {
      throw createBindingError(
        "PROJECT_MISMATCH",
        "The room session belongs to another project renderer.",
      );
    }
    return binding;
  };

  const removeSession = (senderId: number, sessionId: string) => {
    requireSession(senderId, sessionId);
    return bySessionId.delete(sessionId);
  };

  const removeSender = (senderId: number) => {
    const removed: string[] = [];
    for (const [sessionId, binding] of bySessionId) {
      if (binding.senderId !== senderId) {
        continue;
      }
      bySessionId.delete(sessionId);
      removed.push(sessionId);
    }
    return removed;
  };

  return {
    bind,
    requireSession,
    removeSession,
    removeSender,
  };
};

export type ProjectRoomSenderBindings = ReturnType<
  typeof createProjectRoomSenderBindings
>;
