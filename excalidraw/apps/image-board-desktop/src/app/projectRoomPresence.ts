import type { ProjectRoomParticipant } from "../shared/projectRoomProtocol";
import type {
  Collaborator,
  SocketId,
} from "@excalidraw/excalidraw/types";

const CODEX_COLLABORATOR_AVATAR_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="12" fill="#6965db"/><g fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.217 19.384a3.501 3.501 0 0 0 6.783-1.217V13l-6-3.35"/><path d="M5.214 15.014A3.501 3.501 0 0 0 9.66 20.28L14 17.746V10.8"/><path d="M6 7.63c-1.391-.236-2.787.395-3.534 1.689a3.474 3.474 0 0 0 1.271 4.745L8 16.578l6-3.348"/><path d="M12.783 4.616A3.501 3.501 0 0 0 6 5.833V10.9l6 3.45"/><path d="M18.786 8.986A3.501 3.501 0 0 0 14.34 3.72L10 6.254V13.2"/><path d="M18 16.302c1.391.236 2.787-.395 3.534-1.689a3.474 3.474 0 0 0-1.271-4.745l-4.308-2.514L10 10.774"/></g></svg>`,
)}`;

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

export const createProjectRoomCollaborators = (
  participants: ProjectRoomParticipant[],
) => {
  const collaborators = new Map<SocketId, Collaborator>();
  for (const participant of selectProjectRoomAgentPresence(participants)) {
    const socketId = participant.sessionId as SocketId;
    collaborators.set(socketId, {
      id: participant.actorId,
      socketId,
      username: participant.displayLabel,
      avatarUrl: CODEX_COLLABORATOR_AVATAR_URL,
    });
  }
  return collaborators;
};
