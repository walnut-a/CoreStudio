import type { ProjectRoomClosed } from "../../src/shared/projectRoomProtocol";

import {
  createProjectRoom,
  isSameProjectRoomIdentity,
  ProjectRoomError,
  type CreateProjectRoomInput,
  type ProjectRoom,
} from "./projectRoom";

export class ProjectRoomManager {
  private readonly rooms = new Map<string, ProjectRoom>();

  public get size() {
    return this.rooms.size;
  }

  public open(input: CreateProjectRoomInput) {
    const existing = this.rooms.get(input.identity.projectId);
    if (existing) {
      if (isSameProjectRoomIdentity(existing.identity, input.identity)) {
        return existing;
      }
      throw new ProjectRoomError(
        "PROJECT_ROOM_ALREADY_OPEN",
        "The project already has a different active room.",
        {
          projectId: input.identity.projectId,
          existingIdentity: existing.identity,
          requestedIdentity: input.identity,
        },
      );
    }
    const existingForPath = [...this.rooms.values()].find(
      (room) =>
        room.identity.canonicalProjectPath ===
        input.identity.canonicalProjectPath,
    );
    if (existingForPath) {
      throw new ProjectRoomError(
        "PROJECT_ROOM_ALREADY_OPEN",
        "The canonical project path already has an active room.",
        {
          existingIdentity: existingForPath.identity,
          requestedIdentity: input.identity,
        },
      );
    }

    const room = createProjectRoom(input);
    this.rooms.set(input.identity.projectId, room);
    return room;
  }

  public get(projectId: string) {
    return this.rooms.get(projectId) ?? null;
  }

  public list() {
    return [...this.rooms.values()];
  }

  public close(
    projectId: string,
    reason: ProjectRoomClosed["reason"] = "project-closed",
  ) {
    const room = this.rooms.get(projectId);
    if (!room) {
      return false;
    }
    room.close(reason);
    this.rooms.delete(projectId);
    return true;
  }
}

export const createProjectRoomManager = () => new ProjectRoomManager();
