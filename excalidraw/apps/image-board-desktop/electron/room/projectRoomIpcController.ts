import type {
  DesktopProjectRoomJoinInput,
  ProjectRoomEvent,
  ProjectRoomSceneOperation,
  ProjectRoomSnapshot,
} from "../../src/shared/projectRoomProtocol";

import { ProjectRoomError, type ProjectRoom } from "./projectRoom";

export interface ProjectRoomIpcControllerInput {
  openProject: (projectPath: string) => Promise<ProjectRoom>;
  validateOperationAssets?: (
    room: ProjectRoom,
    operation: ProjectRoomSceneOperation,
  ) => Promise<void>;
}

type ProjectRoomEventListener = (event: ProjectRoomEvent) => void;

export class ProjectRoomIpcController {
  private readonly roomsBySessionId = new Map<string, ProjectRoom>();

  constructor(private readonly input: ProjectRoomIpcControllerInput) {}

  public async join(
    request: DesktopProjectRoomJoinInput,
    listener: ProjectRoomEventListener,
  ): Promise<ProjectRoomSnapshot> {
    const existing = this.roomsBySessionId.get(request.sessionId);
    if (existing) {
      existing.leave(request.sessionId);
      this.roomsBySessionId.delete(request.sessionId);
    }
    const room = await this.input.openProject(request.projectPath);
    const snapshot = room.join(
      {
        actorId: "corestudio:desktop",
        sessionId: request.sessionId,
        transport: "ipc",
        role: "desktop-editor",
        displayLabel: "CoreStudio",
      },
      listener,
    );
    this.roomsBySessionId.set(request.sessionId, room);
    return snapshot;
  }

  public async applySceneOperation(
    sessionId: string,
    operation: ProjectRoomSceneOperation,
  ) {
    const room = this.requireRoom(sessionId);
    await this.input.validateOperationAssets?.(room, operation);
    return room.applySceneOperation(sessionId, operation);
  }

  public leave(sessionId: string) {
    const room = this.roomsBySessionId.get(sessionId);
    if (!room) {
      return false;
    }
    this.roomsBySessionId.delete(sessionId);
    return room.leave(sessionId);
  }

  public flushPersistence(sessionId: string) {
    return this.requireRoom(sessionId).flushPersistence();
  }

  private requireRoom(sessionId: string) {
    const room = this.roomsBySessionId.get(sessionId);
    if (!room) {
      throw new ProjectRoomError(
        "SESSION_NOT_FOUND",
        "The desktop session has not joined a project room.",
        { sessionId },
      );
    }
    return room;
  }
}

export const createProjectRoomIpcController = (
  input: ProjectRoomIpcControllerInput,
) => new ProjectRoomIpcController(input);
