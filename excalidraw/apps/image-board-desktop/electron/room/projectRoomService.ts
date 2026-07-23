import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";

import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";

import {
  createProjectRoomManager,
  type ProjectRoomManager,
} from "./roomManager";
import { ProjectRoomError } from "./projectRoom";
import { createProjectRoomPersistence } from "./projectRoomPersistence";

interface ProjectSceneWriteInput {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}

export interface CreateProjectRoomServiceInput {
  readProjectBundle: (
    projectPath: string,
  ) => Promise<
    Pick<DesktopProjectBundle, "project" | "sceneJson" | "imageRecords">
  >;
  writeProjectScene: (input: ProjectSceneWriteInput) => Promise<unknown>;
  canonicalizeProjectPath?: (projectPath: string) => Promise<string>;
  randomId?: () => string;
  persistenceDebounceMs?: number;
}

export class ProjectRoomService {
  public readonly manager: ProjectRoomManager;

  private readonly projectIdByPath = new Map<string, string>();
  private readonly lastEpochByProjectId = new Map<string, number>();
  private readonly openingByPath = new Map<
    string,
    Promise<ReturnType<ProjectRoomManager["open"]>>
  >();

  constructor(private readonly input: CreateProjectRoomServiceInput) {
    this.manager = createProjectRoomManager();
  }

  public async openProject(projectPath: string) {
    const canonicalProjectPath = await (
      this.input.canonicalizeProjectPath ?? fs.realpath
    )(projectPath);
    const existingProjectId = this.projectIdByPath.get(canonicalProjectPath);
    if (existingProjectId) {
      const existing = this.manager.get(existingProjectId);
      if (existing) {
        return existing;
      }
      this.projectIdByPath.delete(canonicalProjectPath);
    }

    const pending = this.openingByPath.get(canonicalProjectPath);
    if (pending) {
      return pending;
    }

    const opening = this.openCanonicalProject(canonicalProjectPath).finally(
      () => {
        if (this.openingByPath.get(canonicalProjectPath) === opening) {
          this.openingByPath.delete(canonicalProjectPath);
        }
      },
    );
    this.openingByPath.set(canonicalProjectPath, opening);
    return opening;
  }

  public async closeProject(
    projectId: string,
    options: { force?: boolean } = {},
  ) {
    const room = this.manager.get(projectId);
    if (!room) {
      return false;
    }
    room.beginClosing();
    if (!options.force) {
      await room.flushPersistence();
    }
    const canonicalProjectPath = room.identity.canonicalProjectPath;
    const closed = this.manager.close(projectId);
    if (closed) {
      this.projectIdByPath.delete(canonicalProjectPath);
    }
    return closed;
  }

  public async getCloseState(
    projectPath: string,
    requestingSessionId?: string,
  ) {
    const room = await this.findOpenRoom(projectPath);
    if (!room) {
      return null;
    }
    return {
      roomId: room.identity.roomId,
      projectId: room.identity.projectId,
      otherParticipants: room
        .getSnapshot()
        .participants.filter(
          (participant) => participant.sessionId !== requestingSessionId,
        ),
      lastPersistenceError: room.lastPersistenceError,
    };
  }

  public async closeProjectPath(
    projectPath: string,
    options: {
      force?: boolean;
      expectedRoomId?: string;
      requestingSessionId?: string;
      acknowledgedParticipantSessionIds?: string[];
    } = {},
  ) {
    const room = await this.findOpenRoom(projectPath);
    if (!room) {
      return false;
    }
    if (!options.force && options.expectedRoomId) {
      const currentParticipantSessionIds = room
        .getSnapshot()
        .participants.filter(
          (participant) =>
            participant.sessionId !== options.requestingSessionId,
        )
        .map((participant) => participant.sessionId)
        .sort();
      const acknowledgedParticipantSessionIds = [
        ...(options.acknowledgedParticipantSessionIds ?? []),
      ].sort();
      if (
        room.identity.roomId !== options.expectedRoomId ||
        JSON.stringify(currentParticipantSessionIds) !==
          JSON.stringify(acknowledgedParticipantSessionIds)
      ) {
        throw new ProjectRoomError(
          "PARTICIPANTS_CHANGED",
          "Project room participants changed while close confirmation was open.",
          {
            expectedRoomId: options.expectedRoomId,
            currentRoomId: room.identity.roomId,
            acknowledgedParticipantSessionIds,
            currentParticipantSessionIds,
          },
        );
      }
    }
    return this.closeProject(room.identity.projectId, options);
  }

  public async findOpenRoom(projectPath: string) {
    const canonicalProjectPath = await (
      this.input.canonicalizeProjectPath ?? fs.realpath
    )(projectPath);
    const projectId = this.projectIdByPath.get(canonicalProjectPath);
    return projectId ? this.manager.get(projectId) : null;
  }

  private async openCanonicalProject(canonicalProjectPath: string) {
    const bundle = await this.input.readProjectBundle(canonicalProjectPath);
    const projectId = bundle.project.projectId ?? canonicalProjectPath;
    const persistence = createProjectRoomPersistence({
      projectPath: canonicalProjectPath,
      initialSceneJson: bundle.sceneJson,
      writeProjectScene: this.input.writeProjectScene,
    });
    const sessionEpoch = (this.lastEpochByProjectId.get(projectId) ?? 0) + 1;
    const room = this.manager.open({
      identity: {
        projectId,
        canonicalProjectPath,
        roomId: (this.input.randomId ?? randomUUID)(),
        sessionEpoch,
      },
      initialScene: persistence.initialScene,
      persistedSequence: 0,
      projectRevision: persistence.initialProjectRevision,
      persistence: {
        debounceMs: this.input.persistenceDebounceMs ?? 750,
        persist: persistence.persist,
      },
    });
    this.lastEpochByProjectId.set(projectId, sessionEpoch);
    this.projectIdByPath.set(canonicalProjectPath, projectId);
    return room;
  }
}

export const createProjectRoomService = (
  input: CreateProjectRoomServiceInput,
) => new ProjectRoomService(input);
