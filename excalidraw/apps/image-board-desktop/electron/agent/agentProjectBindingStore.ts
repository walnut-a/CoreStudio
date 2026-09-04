import type { AgentHost } from "../../src/shared/agentBridgeTypes";

export interface AgentBoundProject {
  projectId: string;
  projectPath: string;
  name: string;
  agentAccess: {
    token: string;
    enabled: boolean;
  };
}

export interface AgentProjectBinding {
  actorId: string;
  sessionRef: string;
  host?: AgentHost;
  displayLabel: string;
  stableBoardId: string;
  project: AgentBoundProject;
  roomId: string;
  sessionEpoch: number;
}

const cloneBinding = (binding: AgentProjectBinding): AgentProjectBinding => ({
  ...binding,
  project: {
    ...binding.project,
    agentAccess: { ...binding.project.agentAccess },
  },
});

export const createAgentProjectBindingStore = () => {
  const bindingsByActorId = new Map<string, AgentProjectBinding>();
  const actorIdBySessionRef = new Map<string, string>();

  return {
    bind(binding: AgentProjectBinding) {
      const normalized = cloneBinding(binding);
      const previous = bindingsByActorId.get(normalized.actorId);
      if (previous) {
        actorIdBySessionRef.delete(previous.sessionRef);
      }
      const existingActorId = actorIdBySessionRef.get(normalized.sessionRef);
      if (existingActorId && existingActorId !== normalized.actorId) {
        bindingsByActorId.delete(existingActorId);
      }
      bindingsByActorId.set(normalized.actorId, normalized);
      actorIdBySessionRef.set(normalized.sessionRef, normalized.actorId);
      return cloneBinding(normalized);
    },
    resolveByActorId(actorId: string) {
      const binding = bindingsByActorId.get(actorId.trim());
      return binding ? cloneBinding(binding) : null;
    },
    resolveBySessionRef(sessionRef: string) {
      const actorId = actorIdBySessionRef.get(sessionRef.trim());
      const binding = actorId ? bindingsByActorId.get(actorId) : null;
      return binding ? cloneBinding(binding) : null;
    },
    list() {
      return Array.from(bindingsByActorId.values(), cloneBinding);
    },
    releaseByActorId(actorId: string) {
      const normalizedActorId = actorId.trim();
      const binding = bindingsByActorId.get(normalizedActorId);
      if (!binding) {
        return false;
      }
      bindingsByActorId.delete(normalizedActorId);
      actorIdBySessionRef.delete(binding.sessionRef);
      return true;
    },
    clear() {
      bindingsByActorId.clear();
      actorIdBySessionRef.clear();
    },
  };
};

export type AgentProjectBindingStore = ReturnType<
  typeof createAgentProjectBindingStore
>;
