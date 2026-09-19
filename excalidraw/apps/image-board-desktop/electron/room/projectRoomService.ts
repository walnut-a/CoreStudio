import {
  readProjectLocationIdentity,
  resolveRenamedProject,
  type ProjectLocationIdentity,
} from "../project/projectLocation";
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
import type {
  ProjectProcessLease,
  ProjectProcessLeaseRegistry,
} from "./projectProcessLease";

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

const isMissingPathError = (error: unknown) =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

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
  projectProcessLeaseRegistry?: ProjectProcessLeaseRegistry;
  onRoomOpened?: (room: ProjectRoom) => void;
  prepareProject?: (projectPath: string) => Promise<void>;
  onProjectRelocated?: (room: ProjectRoom, previousPath: string) => void;
  beforeRoomClosed?: (room: ProjectRoom) => Promise<unknown>;
}

export class ProjectRoomService {
  public readonly manager: ProjectRoomManager;
  private readonly locations = new WeakMap<
    ProjectRoom,
    ProjectLocationIdentity
  >();
  private readonly relocations = new WeakMap<ProjectRoom, Promise<void>>();
  public async reconcileProjectPath(room: ProjectRoom): Promise<void> {
    const previous = this.relocations.get(room);
    if (previous) return previous;
    const task = (async () => {
      const identity = this.locations.get(room);
      if (!identity) return;
      const current = room.identity.canonicalProjectPath;
      try {
        const stat = await fs.lstat(current, { bigint: true });
        if (
          identity.directoryId &&
          `${stat.dev}:${stat.ino}` !== identity.directoryId
        )
          throw new Error("原项目路径已被另一文件夹替换，请重新定位。");
        return;
      } catch (error) {
        if (!isMissingPathError(error)) throw error;
      }
      const next = await resolveRenamedProject(current, identity);
      const lease = await this.input.projectProcessLeaseRegistry?.acquire(next);
      try {
        const confirmed = await readProjectLocationIdentity(next);
        if (
          confirmed.projectId !== identity.projectId ||
          confirmed.directoryId !== identity.directoryId
        )
          throw new Error("项目身份在重新定位期间改变。");
        const oldLease = this.processLeaseByProjectId.get(
          room.identity.projectId,
        );
        if (lease)
          this.processLeaseByProjectId.set(room.identity.projectId, lease);
        this.projectIdByPath.set(next, room.identity.projectId);
        room.relocateProjectPath(next);
        await oldLease?.release();
        this.input.onProjectRelocated?.(room, current);
      } catch (error) {
        await lease?.release();
        throw error;
      }
    })();
    this.relocations.set(room, task);
    try {
      await task;
    } finally {
      this.relocations.delete(room);
    }
  }

  private readonly projectIdByPath = new Map<string, string>();
  private readonly lastEpochByProjectId = new Map<string, number>();
  private readonly openingByPath = new Map<
    string,
    Promise<ReturnType<ProjectRoomManager["open"]>>
  >();
  private readonly processLeaseByProjectId = new Map<
    string,
    ProjectProcessLease
  >();
  private readonly initialBundleByRoom = new WeakMap<
    ProjectRoom,
    Pick<DesktopProjectBundle, "project" | "sceneJson" | "imageRecords">
  >();

  constructor(private readonly input: CreateProjectRoomServiceInput) {
    this.manager = createProjectRoomManager();
  }

  public async openProject(projectPath: string) {
    const aliasId = this.projectIdByPath.get(projectPath);
    const aliased = aliasId ? this.manager.get(aliasId) : null;
    if (aliased) {
      let reusedPath = false;
      if (projectPath !== aliased.identity.canonicalProjectPath) {
        try {
          await fs.lstat(projectPath);
          reusedPath = true;
        } catch (error) {
          if (!isMissingPathError(error)) throw error;
        }
      }
      if (!reusedPath) {
        await this.reconcileProjectPath(aliased);
        return aliased;
      }
      this.projectIdByPath.delete(projectPath);
    }

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

  public async openProjectWithBundle(projectPath: string) {
    const room = await this.openProject(projectPath);
    const initialBundle = this.initialBundleByRoom.get(room);
    if (initialBundle) {
      this.initialBundleByRoom.delete(room);
      return { room, bundle: initialBundle };
    }
    return {
      room,
      bundle: await this.input.readProjectBundle(
        room.identity.canonicalProjectPath,
      ),
    };
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
    await this.input.beforeRoomClosed?.(room);
    if (!options.force) {
      try {
        await room.flushPersistence();
      } catch (error) {
        room.cancelClosing();
        this.input.onRoomOpened?.(room);
        throw error;
      }
    }
    const canonicalProjectPath = room.identity.canonicalProjectPath;
    const closed = this.manager.close(projectId, options.reason);
    if (closed) {
      this.projectIdByPath.delete(canonicalProjectPath);
      await this.releaseProcessLease(projectId);
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
        request: typeof requests[number];
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
        uniqueRooms.map(({ room }) => this.input.beforeRoomClosed?.(room)),
      );
      await Promise.all(uniqueRooms.map(({ room }) => room.flushPersistence()));
      if (options.requireExactRoomSet) {
        this.assertExactRoomSet(uniqueRooms.map(({ room }) => room));
      }
    } catch (error) {
      for (const { room } of uniqueRooms) {
        room.cancelClosing();
        this.input.onRoomOpened?.(room);
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
        await this.releaseProcessLease(room.identity.projectId);
        closedRoomCount += 1;
      }
    }
    return closedRoomCount;
  }

  public async findOpenRoom(projectPath: string) {
    let canonicalProjectPath: string;
    try {
      canonicalProjectPath = await (
        this.input.canonicalizeProjectPath ?? fs.realpath
      )(projectPath);
    } catch (error) {
      if (isMissingPathError(error) && this.projectIdByPath.has(projectPath)) {
        canonicalProjectPath = projectPath;
      } else {
        throw error;
      }
    }
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
    const processLease = await this.input.projectProcessLeaseRegistry?.acquire(
      canonicalProjectPath,
    );
    try {
      await this.input.prepareProject?.(canonicalProjectPath);
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
          persist: async (input) => {
            await this.reconcileProjectPath(room);
            return persistence.persist({
              ...input,
              identity: { ...room.identity },
            });
          },
        },
      });
      if (processLease) {
        this.processLeaseByProjectId.set(projectId, processLease);
      }
      this.lastEpochByProjectId.set(projectId, sessionEpoch);
      this.projectIdByPath.set(canonicalProjectPath, projectId);
      this.initialBundleByRoom.set(room, bundle);
      try {
        this.locations.set(
          room,
          await readProjectLocationIdentity(canonicalProjectPath),
        );
      } catch {
        /* Legacy or mocked projects may lack stable directory identity. */
      }
      this.input.onRoomOpened?.(room);
      return room;
    } catch (error) {
      await processLease?.release().catch(() => undefined);
      throw error;
    }
  }

  private async releaseProcessLease(projectId: string) {
    const lease = this.processLeaseByProjectId.get(projectId);
    if (!lease) {
      return;
    }
    this.processLeaseByProjectId.delete(projectId);
    await lease.release();
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
        (participant) => participant.sessionId !== options.requestingSessionId,
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
