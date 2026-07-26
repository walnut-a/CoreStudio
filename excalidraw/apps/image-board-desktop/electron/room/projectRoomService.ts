import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";
import {
  isProjectRoomSceneElement,
  type ProjectRoomClosed,
} from "../../src/shared/projectRoomProtocol";

import {
  createProjectRoomManager,
  type ProjectRoomManager,
} from "./roomManager";
import { ProjectRoomError, type ProjectRoom } from "./projectRoom";
import { createProjectRoomPersistence } from "./projectRoomPersistence";

interface ProjectSceneWriteInput {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}

const parseProjectSceneDocument = (
  sceneJson: string,
): Record<string, unknown> => {
  const parsed = JSON.parse(sceneJson) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProjectRoomError(
      "PERSISTENCE_FAILED",
      "Maintenance produced an invalid project scene.",
    );
  }
  return parsed as Record<string, unknown>;
};

const omitSceneElements = ({
  elements: _elements,
  ...document
}: Record<string, unknown>) => document;

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
    options: {
      force?: boolean;
      reason?: ProjectRoomClosed["reason"];
    } = {},
  ) {
    const room = this.manager.get(projectId);
    if (!room) {
      return false;
    }
    room.beginClosing();
    if (!options.force) {
      try {
        await room.flushPersistence();
      } catch (error) {
        room.cancelClosing();
        throw error;
      }
    }
    const canonicalProjectPath = room.identity.canonicalProjectPath;
    const closed = this.manager.close(projectId, options.reason);
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
      reason?: ProjectRoomClosed["reason"];
      expectedRoomId?: string;
      requestingSessionId?: string;
      acknowledgedParticipantSessionIds?: string[];
    } = {},
  ) {
    const room = await this.findOpenRoom(projectPath);
    if (!room) {
      return false;
    }
    if (!options.force) {
      this.assertRoomCloseState(room, options);
    }
    return this.closeProject(room.identity.projectId, options);
  }

  public async closeProjectPaths(
    requests: Array<{
      projectPath: string;
      expectedRoomId?: string;
      requestingSessionId?: string;
      acknowledgedParticipantSessionIds?: string[];
    }>,
    options: {
      reason?: ProjectRoomClosed["reason"];
      requireExactRoomSet?: boolean;
    } = {},
  ) {
    const rooms = (
      await Promise.all(
        requests.map(async (request) => ({
          request,
          room: await this.findOpenRoom(request.projectPath),
        })),
      )
    ).filter(
      (
        entry,
      ): entry is {
        request: (typeof requests)[number];
        room: ProjectRoom;
      } => Boolean(entry.room),
    );
    const uniqueRooms = rooms.filter(
      ({ room }, index) =>
        rooms.findIndex(
          (candidate) =>
            candidate.room.identity.projectId === room.identity.projectId,
        ) === index,
    );

    if (options.requireExactRoomSet) {
      this.assertExactRoomSet(uniqueRooms.map(({ room }) => room));
    }
    for (const { request, room } of uniqueRooms) {
      this.assertRoomCloseState(room, request);
    }
    for (const { room } of uniqueRooms) {
      room.beginClosing();
    }
    try {
      await Promise.all(
        uniqueRooms.map(({ room }) => room.flushPersistence()),
      );
      if (options.requireExactRoomSet) {
        this.assertExactRoomSet(uniqueRooms.map(({ room }) => room));
      }
    } catch (error) {
      for (const { room } of uniqueRooms) {
        room.cancelClosing();
      }
      throw error;
    }

    let closedRoomCount = 0;
    for (const { room } of uniqueRooms) {
      if (
        this.manager.close(
          room.identity.projectId,
          options.reason ?? "app-closed",
        )
      ) {
        this.projectIdByPath.delete(room.identity.canonicalProjectPath);
        closedRoomCount += 1;
      }
    }
    return closedRoomCount;
  }

  public async findOpenRoom(projectPath: string) {
    const canonicalProjectPath = await (
      this.input.canonicalizeProjectPath ?? fs.realpath
    )(projectPath);
    const projectId = this.projectIdByPath.get(canonicalProjectPath);
    return projectId ? this.manager.get(projectId) : null;
  }

  public async writeMaintenanceScene(
    input: ProjectSceneWriteInput,
  ): Promise<void> {
    const room = await this.findOpenRoom(input.projectPath);
    if (!room) {
      await this.input.writeProjectScene(input);
      return;
    }
    const parsed = parseProjectSceneDocument(input.sceneJson);
    if (
      !Array.isArray(parsed.elements) ||
      !parsed.elements.every(isProjectRoomSceneElement)
    ) {
      throw new ProjectRoomError(
        "PERSISTENCE_FAILED",
        "Maintenance produced an invalid project scene.",
      );
    }
    const currentBundle = await this.input.readProjectBundle(
      room.identity.canonicalProjectPath,
    );
    const currentDocument = parseProjectSceneDocument(currentBundle.sceneJson);
    if (
      !isDeepStrictEqual(
        omitSceneElements(parsed),
        omitSceneElements(currentDocument),
      )
    ) {
      throw new ProjectRoomError(
        "PERSISTENCE_FAILED",
        "Maintenance can only change scene elements while a project room is active.",
        {
          reason: "UNSUPPORTED_MAINTENANCE_SCENE_FIELDS",
        },
      );
    }
    room.applyMaintenanceOperation({
      ...room.identity,
      operationId: (this.input.randomId ?? randomUUID)(),
      baseSequence: room.sequence,
      elements: parsed.elements,
    });
    await room.flushPersistence();
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

  private assertRoomCloseState(
    room: ProjectRoom,
    options: {
      expectedRoomId?: string;
      requestingSessionId?: string;
      acknowledgedParticipantSessionIds?: string[];
    },
  ) {
    if (!options.expectedRoomId) {
      return;
    }
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

  private assertExactRoomSet(expectedRooms: ProjectRoom[]) {
    const expectedProjectIds = expectedRooms
      .map((room) => room.identity.projectId)
      .sort();
    const currentProjectIds = this.manager
      .list()
      .map((room) => room.identity.projectId)
      .sort();
    if (
      JSON.stringify(expectedProjectIds) !== JSON.stringify(currentProjectIds)
    ) {
      throw new ProjectRoomError(
        "PARTICIPANTS_CHANGED",
        "The open project room set changed while the app was closing.",
        {
          expectedProjectIds,
          currentProjectIds,
        },
      );
    }
  }
}

export const createProjectRoomService = (
  input: CreateProjectRoomServiceInput,
) => new ProjectRoomService(input);
