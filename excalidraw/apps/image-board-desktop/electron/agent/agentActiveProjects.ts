import type {
  DesktopAgentActiveProject,
  DesktopAgentActivityStatus,
} from "../../src/shared/desktopBridgeTypes";
import type { ProjectRoomParticipant } from "../../src/shared/projectRoomProtocol";

import type { AgentProjectBinding } from "./agentProjectBindingStore";

const getAgentStatus = (
  actorId: string,
  participants: readonly ProjectRoomParticipant[] | null,
): DesktopAgentActivityStatus => {
  if (participants === null) {
    return "reconnecting";
  }
  const roles = participants
    .filter((participant) => participant.actorId === actorId)
    .map((participant) => participant.role);
  if (roles.includes("agent-writer")) {
    return "working";
  }
  if (roles.includes("board-editor")) {
    return "connected";
  }
  return "connected";
};

const selectProjectStatus = (
  statuses: readonly DesktopAgentActivityStatus[],
): DesktopAgentActivityStatus =>
  statuses.includes("working")
    ? "working"
    : statuses.includes("connected")
    ? "connected"
    : "reconnecting";

export const buildDesktopAgentActiveProjects = ({
  bindings,
  getParticipants,
}: {
  bindings: readonly AgentProjectBinding[];
  getParticipants: (
    projectId: string,
  ) => readonly ProjectRoomParticipant[] | null;
}): DesktopAgentActiveProject[] => {
  const byProjectId = new Map<string, DesktopAgentActiveProject>();
  for (const binding of bindings) {
    const participants = getParticipants(binding.project.projectId);
    const status = getAgentStatus(binding.actorId, participants);
    const current = byProjectId.get(binding.project.projectId);
    const agent = {
      actorId: binding.actorId,
      displayLabel: binding.displayLabel,
      ...(binding.host ? { host: binding.host } : {}),
      status,
    };
    if (current) {
      current.agents.push(agent);
      current.agentCount = current.agents.length;
      current.status = selectProjectStatus(
        current.agents.map((candidate) => candidate.status),
      );
      continue;
    }
    byProjectId.set(binding.project.projectId, {
      projectId: binding.project.projectId,
      projectPath: binding.project.projectPath,
      name: binding.project.name,
      status,
      agentCount: 1,
      agents: [agent],
    });
  }
  return [...byProjectId.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};
