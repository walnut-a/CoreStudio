import {
  chooseAuthoritativeRoomElement,
  orderRoomSceneElements,
  type RoomSceneElement,
} from "./roomElementReconciliation";
import type {
  ProjectRoomClosed,
  ProjectRoomErrorCode,
  ProjectRoomEvent,
  ProjectRoomIdentity,
  ProjectRoomLifecycle,
  ProjectRoomOperationResult,
  ProjectRoomParticipant,
  ProjectRoomParticipantSelection,
  ProjectRoomPersisted,
  ProjectRoomParticipantsChanged,
  ProjectRoomScene,
  ProjectRoomSceneOperation,
  ProjectRoomSceneUpdate,
  ProjectRoomSnapshot,
} from "../../src/shared/projectRoomProtocol";
import type { ImageRecordMap } from "../../src/shared/projectTypes";
import { areJsonValuesEqual } from "../../src/shared/jsonValueEquality";

export type {
  ProjectRoomErrorCode,
  ProjectRoomEvent,
  ProjectRoomIdentity,
  ProjectRoomLifecycle,
  ProjectRoomOperationResult,
  ProjectRoomParticipant,
  ProjectRoomParticipantRole,
  ProjectRoomParticipantSelection,
  ProjectRoomParticipantTransport,
  ProjectRoomPersisted,
  ProjectRoomScene,
  ProjectRoomSceneOperation,
  ProjectRoomSnapshot,
} from "../../src/shared/projectRoomProtocol";

export interface CreateProjectRoomInput {
  identity: ProjectRoomIdentity;
  initialScene: ProjectRoomScene;
  persistedSequence: number;
  projectRevision: string;
  persistence?: ProjectRoomPersistenceOptions;
  operationHistoryLimit?: number;
}

export interface PersistProjectRoomInput {
  identity: ProjectRoomIdentity;
  sequence: number;
  previousProjectRevision: string;
  scene: ProjectRoomScene;
}

export interface PersistProjectRoomResult {
  projectRevision: string;
}

export interface ProjectRoomPersistenceOptions {
  debounceMs: number;
  persist: (
    input: PersistProjectRoomInput,
  ) => Promise<PersistProjectRoomResult>;
}

export class ProjectRoomError extends Error {
  constructor(
    public readonly code: ProjectRoomErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProjectRoomError";
  }
}

type ProjectRoomListener = (event: ProjectRoomEvent) => void;

interface StoredOperation {
  actorId: string;
  result: ProjectRoomOperationResult;
}

const clone = <T>(value: T): T => structuredClone(value);

const sameIdentity = (left: ProjectRoomIdentity, right: ProjectRoomIdentity) =>
  left.projectId === right.projectId &&
  left.canonicalProjectPath === right.canonicalProjectPath &&
  left.roomId === right.roomId &&
  left.sessionEpoch === right.sessionEpoch;

export class ProjectRoom {
  public readonly identity: ProjectRoomIdentity;
  public lifecycle: ProjectRoomLifecycle = "opening";
  public sequence = 0;
  public persistedSequence: number;
  public projectRevision: string;

  private elements: RoomSceneElement[];
  private sharedSceneConfig: Record<string, unknown>;
  private readonly participants = new Map<string, ProjectRoomParticipant>();
  private readonly participantListeners = new Map<
    string,
    ProjectRoomListener
  >();
  private readonly participantSelections = new Map<
    string,
    ProjectRoomParticipantSelection
  >();
  private readonly operations = new Map<string, StoredOperation>();
  private readonly latestClientOperationBySession = new Map<
    string,
    { clientSequence: number; operationId: string }
  >();
  private readonly listeners = new Set<ProjectRoomListener>();
  private readonly persistence?: ProjectRoomPersistenceOptions;
  private readonly operationHistoryLimit: number;
  private persistenceTimer: ReturnType<typeof setTimeout> | null = null;
  private persistenceQueue: Promise<void> = Promise.resolve();
  public lastPersistenceError: unknown = null;

  constructor(input: CreateProjectRoomInput) {
    this.identity = clone(input.identity);
    this.elements = orderRoomSceneElements(input.initialScene.elements);
    this.sharedSceneConfig = clone(input.initialScene.sharedSceneConfig);
    this.persistedSequence = input.persistedSequence;
    this.projectRevision = input.projectRevision;
    this.persistence = input.persistence;
    this.operationHistoryLimit = Math.max(
      1,
      input.operationHistoryLimit ?? 10_000,
    );
    this.lifecycle = "active";
  }

  public join(
    participant: ProjectRoomParticipant,
    listener?: ProjectRoomListener,
  ): ProjectRoomSnapshot {
    this.assertActive();
    this.participants.set(participant.sessionId, clone(participant));
    this.broadcastParticipants();
    if (listener) {
      this.participantListeners.set(participant.sessionId, listener);
    }
    return this.getSnapshot();
  }

  public leave(sessionId: string) {
    this.participantListeners.delete(sessionId);
    this.participantSelections.delete(sessionId);
    const removed = this.participants.delete(sessionId);
    if (removed) {
      this.broadcastParticipants();
    }
    return removed;
  }

  public updateParticipantSelection(
    sessionId: string,
    selection: ProjectRoomParticipantSelection,
  ) {
    this.assertActive();
    if (!this.participants.has(sessionId)) {
      throw new ProjectRoomError(
        "SESSION_NOT_FOUND",
        "The participant session is not joined to this project room.",
        { sessionId },
      );
    }
    if (selection.projectPath !== this.identity.canonicalProjectPath) {
      throw new ProjectRoomError(
        "PROJECT_MISMATCH",
        "The participant selection targets a different project.",
      );
    }
    this.participantSelections.set(sessionId, clone(selection));
  }

  public getParticipantSelectionByActor(actorId: string) {
    const sessions = [...this.participants.values()]
      .filter((participant) => participant.actorId === actorId)
      .sort((left, right) => {
        if (left.role === right.role) {
          return left.sessionId.localeCompare(right.sessionId);
        }
        return left.role === "board-editor" ? -1 : 1;
      });
    for (const session of sessions) {
      const selection = this.participantSelections.get(session.sessionId);
      if (selection) {
        return clone(selection);
      }
    }
    return null;
  }

  public subscribe(listener: ProjectRoomListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public publishAssetRecords(imageRecords: ImageRecordMap) {
    this.assertActive();
    if (Object.keys(imageRecords).length === 0) {
      return;
    }
    this.broadcast({
      type: "assets.updated",
      identity: clone(this.identity),
      imageRecords: clone(imageRecords),
    });
  }

  public getSnapshot(): ProjectRoomSnapshot {
    return {
      type: "room.snapshot",
      identity: clone(this.identity),
      sequence: this.sequence,
      persistedSequence: this.persistedSequence,
      projectRevision: this.projectRevision,
      scene: {
        elements: clone(this.elements),
        sharedSceneConfig: clone(this.sharedSceneConfig),
      },
      participants: [...this.participants.values()].map(clone),
    };
  }

  public applySceneOperation(
    sessionId: string,
    operation: ProjectRoomSceneOperation,
  ): ProjectRoomOperationResult {
    this.assertActive();
    const participant = this.participants.get(sessionId);
    if (!participant) {
      throw new ProjectRoomError(
        "SESSION_NOT_FOUND",
        "The participant session is not joined to this project room.",
        { sessionId },
      );
    }
    if (participant.role === "agent-writer") {
      throw new ProjectRoomError(
        "FORBIDDEN",
        "Agent commands cannot submit arbitrary scene operations.",
        { role: participant.role },
      );
    }
    if (
      operation.sharedSceneConfig !== undefined &&
      participant.role !== "desktop-editor"
    ) {
      throw new ProjectRoomError(
        "FORBIDDEN",
        "Only the desktop editor can update shared project scene config.",
        { role: participant.role },
      );
    }
    return this.applyAuthorizedOperation(participant, operation);
  }

  public applyAgentCommandOperation(
    sessionId: string,
    operation: ProjectRoomSceneOperation,
  ): ProjectRoomOperationResult {
    this.assertActive();
    const participant = this.participants.get(sessionId);
    if (!participant) {
      throw new ProjectRoomError(
        "SESSION_NOT_FOUND",
        "The participant session is not joined to this project room.",
        { sessionId },
      );
    }
    if (participant.role !== "agent-writer") {
      throw new ProjectRoomError(
        "FORBIDDEN",
        "Only an authenticated agent-writer command can use this operation path.",
        { role: participant.role },
      );
    }
    if (operation.sharedSceneConfig !== undefined) {
      throw new ProjectRoomError(
        "FORBIDDEN",
        "Agent commands cannot update shared project scene config.",
        { role: participant.role },
      );
    }
    return this.applyAuthorizedOperation(participant, operation);
  }

  public applyMaintenanceOperation(
    operation: ProjectRoomSceneOperation,
  ): ProjectRoomOperationResult {
    this.assertActive();
    return this.applyAuthorizedOperation(
      {
        actorId: "corestudio:maintenance",
        sessionId: "corestudio:maintenance",
        transport: "command",
        role: "agent-writer",
        displayLabel: "CoreStudio Maintenance",
      },
      operation,
    );
  }

  private applyAuthorizedOperation(
    participant: ProjectRoomParticipant,
    operation: ProjectRoomSceneOperation,
  ): ProjectRoomOperationResult {
    this.assertOperationIdentity(operation);

    const storedOperation = this.operations.get(operation.operationId);
    if (storedOperation) {
      if (storedOperation.actorId !== participant.actorId) {
        throw new ProjectRoomError(
          "OPERATION_ID_CONFLICT",
          "The operation id is already owned by another actor.",
          { operationId: operation.operationId },
        );
      }
      return clone(storedOperation.result);
    }
    const latestClientOperation = this.latestClientOperationBySession.get(
      participant.sessionId,
    );
    if (
      operation.clientSequence !== undefined &&
      latestClientOperation &&
      operation.clientSequence <= latestClientOperation.clientSequence
    ) {
      if (
        operation.clientSequence === latestClientOperation.clientSequence &&
        operation.operationId !== latestClientOperation.operationId
      ) {
        throw new ProjectRoomError(
          "OPERATION_ID_CONFLICT",
          "The client operation sequence is already owned by another operation.",
          {
            clientSequence: operation.clientSequence,
            operationId: operation.operationId,
            existingOperationId: latestClientOperation.operationId,
          },
        );
      }
      return {
        type: "operation.superseded",
        operationId: operation.operationId,
        sequence: this.sequence,
        acceptedElementIds: [],
        supersededElementIds: operation.elements.map((element) => element.id),
      };
    }

    const sharedSceneConfigChanged =
      operation.sharedSceneConfig !== undefined &&
      !areJsonValuesEqual(operation.sharedSceneConfig, this.sharedSceneConfig);
    if (operation.elements.length === 0 && !sharedSceneConfigChanged) {
      const result: ProjectRoomOperationResult = {
        type: "operation.superseded",
        operationId: operation.operationId,
        sequence: this.sequence,
        acceptedElementIds: [],
        supersededElementIds: [],
      };
      this.rememberOperation(participant, operation, result);
      return clone(result);
    }

    const elementsById = new Map(
      this.elements.map((element) => [element.id, element]),
    );
    const acceptedElementIds: string[] = [];
    const supersededElementIds: string[] = [];

    for (const incomingElement of operation.elements) {
      const currentElement = elementsById.get(incomingElement.id);
      const authoritativeElement = chooseAuthoritativeRoomElement(
        currentElement,
        incomingElement,
      );
      elementsById.set(authoritativeElement.id, authoritativeElement);
      if (authoritativeElement === incomingElement) {
        acceptedElementIds.push(incomingElement.id);
      } else {
        supersededElementIds.push(incomingElement.id);
      }
    }

    const elementIdentitiesBeforeOrdering = new Map(
      [...elementsById.values()].map((element) => [
        element.id,
        {
          index: element.index,
          version: element.version,
          versionNonce: element.versionNonce,
        },
      ]),
    );
    this.elements = orderRoomSceneElements([...elementsById.values()]);
    const broadcastElementIds = new Set(
      operation.elements.map((element) => element.id),
    );
    for (const element of this.elements) {
      const previous = elementIdentitiesBeforeOrdering.get(element.id);
      if (
        previous &&
        (previous.index !== element.index ||
          previous.version !== element.version ||
          previous.versionNonce !== element.versionNonce)
      ) {
        broadcastElementIds.add(element.id);
      }
    }
    const authoritativeOperationElements = this.elements.filter((element) =>
      broadcastElementIds.has(element.id),
    );
    if (sharedSceneConfigChanged && operation.sharedSceneConfig !== undefined) {
      this.sharedSceneConfig = clone(operation.sharedSceneConfig);
    }
    this.sequence += 1;
    const result: ProjectRoomOperationResult = {
      type:
        acceptedElementIds.length > 0 || sharedSceneConfigChanged
          ? "operation.accepted"
          : "operation.superseded",
      operationId: operation.operationId,
      sequence: this.sequence,
      acceptedElementIds,
      supersededElementIds,
    };
    this.rememberOperation(participant, operation, result);

    const update: ProjectRoomSceneUpdate = {
      type: "scene.update",
      identity: clone(this.identity),
      sequence: this.sequence,
      originSessionId: participant.sessionId,
      originActorId: participant.actorId,
      operationId: operation.operationId,
      baseSequence: operation.baseSequence,
      elements: clone(authoritativeOperationElements),
      ...(sharedSceneConfigChanged
        ? { sharedSceneConfig: clone(operation.sharedSceneConfig) }
        : {}),
      acceptedElementIds: [...acceptedElementIds],
      supersededElementIds: [...supersededElementIds],
    };
    this.broadcast(update);
    this.schedulePersistence();

    return clone(result);
  }

  private rememberOperation(
    participant: ProjectRoomParticipant,
    operation: ProjectRoomSceneOperation,
    result: ProjectRoomOperationResult,
  ) {
    this.operations.set(operation.operationId, {
      actorId: participant.actorId,
      result: clone(result),
    });
    if (operation.clientSequence !== undefined) {
      this.latestClientOperationBySession.set(participant.sessionId, {
        clientSequence: operation.clientSequence,
        operationId: operation.operationId,
      });
    }
    while (this.operations.size > this.operationHistoryLimit) {
      const oldestOperationId = this.operations.keys().next().value;
      if (typeof oldestOperationId !== "string") {
        break;
      }
      this.operations.delete(oldestOperationId);
    }
  }

  public flushPersistence(): Promise<void> {
    this.clearPersistenceTimer();
    if (!this.persistence) {
      return Promise.resolve();
    }

    const nextWrite = this.persistenceQueue.then(async () => {
      if (!this.persistence || this.persistedSequence >= this.sequence) {
        return;
      }
      const targetSequence = this.sequence;
      let result: PersistProjectRoomResult;
      try {
        result = await this.persistence.persist({
          identity: clone(this.identity),
          sequence: targetSequence,
          previousProjectRevision: this.projectRevision,
          scene: {
            elements: clone(this.elements),
            sharedSceneConfig: clone(this.sharedSceneConfig),
          },
        });
      } catch (error) {
        if (this.lifecycle !== "closing") {
          this.lifecycle = "storage-error";
        }
        this.lastPersistenceError = error;
        const errorCode =
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "PROJECT_STORAGE_DIVERGED"
            ? "PROJECT_STORAGE_DIVERGED"
            : "PERSISTENCE_FAILED";
        this.broadcast({
          type: "scene.persistence-failed",
          identity: clone(this.identity),
          sequence: targetSequence,
          error: {
            code: errorCode,
            message:
              error instanceof Error
                ? error.message
                : "Project room persistence failed.",
            ...(error && typeof error === "object" && "details" in error
              ? { details: error.details }
              : {}),
          },
        });
        throw error;
      }
      this.persistedSequence = targetSequence;
      this.projectRevision = result.projectRevision;
      this.lastPersistenceError = null;
      if (this.lifecycle !== "closing") {
        this.lifecycle = "active";
      }
      const event: ProjectRoomPersisted = {
        type: "scene.persisted",
        identity: clone(this.identity),
        sequence: targetSequence,
        projectRevision: result.projectRevision,
      };
      this.broadcast(event);
    });
    this.persistenceQueue = nextWrite.catch((error) => {
      this.lastPersistenceError = error;
    });
    return nextWrite;
  }

  public beginClosing() {
    if (this.lifecycle === "closed" || this.lifecycle === "closing") {
      return;
    }
    this.lifecycle = "closing";
    this.clearPersistenceTimer();
    this.broadcast({
      type: "room.closing",
      identity: clone(this.identity),
    });
  }

  public cancelClosing() {
    if (this.lifecycle !== "closing") {
      return;
    }
    this.lifecycle = this.lastPersistenceError ? "storage-error" : "active";
  }

  public close(reason: ProjectRoomClosed["reason"] = "project-closed") {
    if (this.lifecycle === "closed") {
      return;
    }
    this.beginClosing();
    this.broadcast({
      type: "room.closed",
      identity: clone(this.identity),
      reason,
    });
    this.participants.clear();
    this.participantSelections.clear();
    this.latestClientOperationBySession.clear();
    this.participantListeners.clear();
    this.listeners.clear();
    this.lifecycle = "closed";
  }

  private schedulePersistence() {
    if (!this.persistence || this.lifecycle === "storage-error") {
      return;
    }
    this.clearPersistenceTimer();
    this.persistenceTimer = setTimeout(() => {
      this.persistenceTimer = null;
      void this.flushPersistence().catch(() => undefined);
    }, this.persistence.debounceMs);
  }

  private clearPersistenceTimer() {
    if (this.persistenceTimer) {
      clearTimeout(this.persistenceTimer);
      this.persistenceTimer = null;
    }
  }

  private broadcast(event: ProjectRoomEvent) {
    for (const listener of this.listeners) {
      listener(clone(event));
    }
    for (const listener of this.participantListeners.values()) {
      listener(clone(event));
    }
  }

  private broadcastParticipants() {
    const event: ProjectRoomParticipantsChanged = {
      type: "participants.changed",
      identity: clone(this.identity),
      participants: [...this.participants.values()].map(clone),
    };
    this.broadcast(event);
  }

  private assertActive() {
    if (this.lifecycle === "closing") {
      throw new ProjectRoomError(
        "ROOM_CLOSING",
        "The project room is closing and is not accepting operations.",
        { lifecycle: this.lifecycle },
      );
    }
    if (this.lifecycle !== "active" && this.lifecycle !== "storage-error") {
      throw new ProjectRoomError(
        "ROOM_CLOSED",
        "The project room is not accepting operations.",
        { lifecycle: this.lifecycle },
      );
    }
  }

  private assertOperationIdentity(operation: ProjectRoomSceneOperation) {
    if (
      operation.projectId !== this.identity.projectId ||
      operation.canonicalProjectPath !== this.identity.canonicalProjectPath
    ) {
      throw new ProjectRoomError(
        "PROJECT_MISMATCH",
        "The operation targets a different project.",
      );
    }
    if (operation.roomId !== this.identity.roomId) {
      throw new ProjectRoomError(
        "ROOM_MISMATCH",
        "The operation targets a different room.",
      );
    }
    if (operation.sessionEpoch !== this.identity.sessionEpoch) {
      throw new ProjectRoomError(
        "SESSION_EPOCH_EXPIRED",
        "The operation belongs to an expired project session.",
        {
          expectedSessionEpoch: this.identity.sessionEpoch,
          receivedSessionEpoch: operation.sessionEpoch,
        },
      );
    }
  }
}

export const createProjectRoom = (input: CreateProjectRoomInput) =>
  new ProjectRoom(input);

export const isSameProjectRoomIdentity = sameIdentity;
