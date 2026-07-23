import type { ProjectRoomParticipant } from "../shared/projectRoomProtocol";

export const selectProjectRoomAgentPresence = (
  participants: ProjectRoomParticipant[],
) => {
  const byActorId = new Map<string, ProjectRoomParticipant>();
  for (const participant of participants) {
    if (
      participant.role === "board-editor" &&
      !byActorId.has(participant.actorId)
    ) {
      byActorId.set(participant.actorId, participant);
    }
  }
  return [...byActorId.values()];
};
