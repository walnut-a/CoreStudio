import type {
  DesktopProjectRoomJoinInput,
  ProjectRoomEvent,
  ProjectRoomIdentity,
  ProjectRoomJoinResult,
  ProjectRoomOperationResult,
  ProjectRoomParticipant,
  ProjectRoomParticipantSelection,
  ProjectRoomScene,
  ProjectRoomSceneElement,
  ProjectRoomSceneOperation,
  ProjectRoomSnapshot,
} from "../shared/projectRoomProtocol";
import type { ImageRecordMap } from "../shared/projectTypes";

export interface ProjectRoomClientTransport {
  join(input: DesktopProjectRoomJoinInput): Promise<ProjectRoomJoinResult>;
  submitOperation(
    operation: ProjectRoomSceneOperation,
  ): Promise<ProjectRoomOperationResult>;
  leave(sessionId: string): Promise<boolean>;
  subscribe(listener: (event: ProjectRoomEvent) => void): () => void;
  subscribeSnapshot?(
    listener: (joined: ProjectRoomJoinResult) => void,
  ): () => void;
  requestResync?(): void;
  updateSelection?(selection: ProjectRoomParticipantSelection): Promise<void>;
}

export interface ApplyAuthoritativeProjectRoomSceneInput
  extends ProjectRoomScene {
  sequence: number;
  origin: "snapshot" | "remote" | "confirmation";
}

export interface CreateProjectRoomClientControllerInput {
  projectPath: string;
  sessionId: string;
  transport: ProjectRoomClientTransport;
  applyAuthoritativeScene: (
    input: ApplyAuthoritativeProjectRoomSceneInput,
  ) => void;
  applyParticipants?: (participants: ProjectRoomParticipant[]) => void;
  applyImageRecords?: (imageRecords: ImageRecordMap) => void;
  onRoomClosed?: () => void;
  onSyncStateChange?: (
    state: "syncing" | "pending-persistence" | "saved" | "error",
    error?: Error,
  ) => void;
  ensureAssetsForElements?: (
    elements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
  ) => Promise<ImageRecordMap | void>;
  randomId?: () => string;
}

const orderElements = (elements: ProjectRoomSceneElement[]) =>
  [...elements].sort((left, right) => {
    if (typeof left.index !== "string" || typeof right.index !== "string") {
      return 0;
    }
    if (left.index === right.index) {
      return left.id.localeCompare(right.id);
    }
    return left.index < right.index ? -1 : 1;
  });

const hasVersionIdentityChanged = (
  current: ProjectRoomSceneElement | undefined,
  next: ProjectRoomSceneElement,
) =>
  !current ||
  current.version !== next.version ||
  current.versionNonce !== next.versionNonce;

export class ProjectRoomClientController {
  public confirmedSequence = 0;
  public persistedSequence = 0;

  private identity: ProjectRoomIdentity | null = null;
  private activeSessionId: string | null = null;
  private elements: ProjectRoomSceneElement[] = [];
  private sharedSceneConfig: Record<string, unknown> = {};
  private imageRecords: ImageRecordMap = {};
  private readonly pendingOperations = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private applyingAuthoritativeScene = false;
  private joined: ProjectRoomJoinResult | null = null;
  private awaitingResync = false;
  private latestOperationId: string | null = null;
  private latestSubmittedSequence = 0;
  private lifecycleGeneration = 0;
  private localChangeQueue: Promise<void> = Promise.resolve();
  private lastSubmissionError: Error | null = null;
  private lastPersistenceError: Error | null = null;
  private readonly eventsReceivedBeforeJoin: ProjectRoomEvent[] = [];
  private readonly persistenceWaiters = new Set<{
    targetSequence: number;
    resolve: () => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  constructor(private readonly input: CreateProjectRoomClientControllerInput) {}

  public get pendingOperationCount() {
    return this.pendingOperations.size;
  }

  public getWriteStatus() {
    return this.identity
      ? {
          operationId: this.latestOperationId,
          roomId: this.identity.roomId,
          roomSequence: this.latestSubmittedSequence,
          persistedSequence: this.persistedSequence,
          persisted:
            this.latestSubmittedSequence > 0 &&
            this.persistedSequence >= this.latestSubmittedSequence,
        }
      : null;
  }

  public async start(): Promise<ProjectRoomJoinResult> {
    if (this.joined) {
      return this.joined;
    }
    const generation = this.lifecycleGeneration;
    this.unsubscribe = this.input.transport.subscribe((event) => {
      this.handleRoomEvent(event);
    });
    this.unsubscribeSnapshot =
      this.input.transport.subscribeSnapshot?.((joined) => {
        this.applySnapshot(joined);
      }) ?? null;
    try {
      const joined = await this.input.transport.join({
        projectPath: this.input.projectPath,
        sessionId: this.input.sessionId,
      });
      if (generation !== this.lifecycleGeneration) {
        return joined;
      }
      this.applySnapshot(joined);
      this.joined = joined;
      this.replayEventsReceivedBeforeJoin();
      return joined;
    } catch (error) {
      this.unsubscribe?.();
      this.unsubscribe = null;
      this.unsubscribeSnapshot?.();
      this.unsubscribeSnapshot = null;
      throw error;
    }
  }

  public async stop() {
    this.lifecycleGeneration += 1;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    const unsubscribeSnapshot = this.unsubscribeSnapshot;
    this.unsubscribeSnapshot = null;
    unsubscribe?.();
    unsubscribeSnapshot?.();
    await this.input.transport.leave(
      this.activeSessionId ?? this.input.sessionId,
    );
    this.identity = null;
    this.activeSessionId = null;
    this.joined = null;
    this.pendingOperations.clear();
    this.eventsReceivedBeforeJoin.length = 0;
    this.awaitingResync = false;
    this.rejectPersistenceWaiters(
      new Error("Project room client stopped before persistence completed."),
    );
  }

  public updateParticipantSelection(
    selection: ProjectRoomParticipantSelection,
  ) {
    return (
      this.input.transport.updateSelection?.(selection) ?? Promise.resolve()
    );
  }

  public handleLocalSceneChange(
    nextElements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown> = {},
    nextSharedSceneConfig?: Record<string, unknown>,
    options: {
      submitOperation?: (
        operation: ProjectRoomSceneOperation,
      ) => Promise<ProjectRoomOperationResult>;
    } = {},
  ) {
    const task = this.localChangeQueue.then(() =>
      this.processLocalSceneChange(
        nextElements,
        files,
        nextSharedSceneConfig,
        options,
      ),
    );
    this.localChangeQueue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  private async processLocalSceneChange(
    nextElements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
    nextSharedSceneConfig: Record<string, unknown> | undefined,
    options: {
      submitOperation?: (
        operation: ProjectRoomSceneOperation,
      ) => Promise<ProjectRoomOperationResult>;
    },
  ) {
    if (this.applyingAuthoritativeScene || !this.identity) {
      return null;
    }
    const operationIdentity = this.identity;
    const currentById = new Map(
      this.elements.map((element) => [element.id, element]),
    );
    const changedElements = nextElements.filter((element) =>
      hasVersionIdentityChanged(currentById.get(element.id), element),
    );
    const sharedSceneConfigChanged =
      nextSharedSceneConfig !== undefined &&
      JSON.stringify(nextSharedSceneConfig) !==
        JSON.stringify(this.sharedSceneConfig);
    if (changedElements.length === 0 && !sharedSceneConfigChanged) {
      return null;
    }

    const persistedImageRecords =
      changedElements.length > 0
        ? await this.input.ensureAssetsForElements?.(changedElements, files)
        : undefined;
    const newImageRecords = persistedImageRecords
      ? Object.fromEntries(
          Object.entries(persistedImageRecords).filter(
            ([fileId]) => !(fileId in this.imageRecords),
          ),
        )
      : {};
    if (this.identity !== operationIdentity) {
      return null;
    }
    const operationId = this.input.randomId
      ? this.input.randomId()
      : crypto.randomUUID();
    const operation: ProjectRoomSceneOperation = {
      ...operationIdentity,
      operationId,
      baseSequence: this.confirmedSequence,
      elements: structuredClone(changedElements),
      ...(sharedSceneConfigChanged
        ? { sharedSceneConfig: structuredClone(nextSharedSceneConfig) }
        : {}),
      ...(Object.keys(newImageRecords).length > 0
        ? { imageRecords: structuredClone(newImageRecords) }
        : {}),
      final: true,
    };
    this.latestOperationId = operationId;
    this.pendingOperations.add(operationId);
    this.input.onSyncStateChange?.("syncing");
    try {
      const result = await (
        options.submitOperation ??
        this.input.transport.submitOperation.bind(this.input.transport)
      )(operation);
      const acceptedElementIds = new Set(result.acceptedElementIds);
      const elementsById = new Map(
        this.elements.map((element) => [element.id, element]),
      );
      for (const element of changedElements) {
        if (acceptedElementIds.has(element.id)) {
          elementsById.set(element.id, structuredClone(element));
        }
      }
      this.elements = orderElements([...elementsById.values()]);
      if (sharedSceneConfigChanged) {
        this.sharedSceneConfig = structuredClone(nextSharedSceneConfig);
      }
      if (Object.keys(newImageRecords).length > 0) {
        this.imageRecords = {
          ...this.imageRecords,
          ...structuredClone(newImageRecords),
        };
      }
      this.lastSubmissionError = null;
      this.latestSubmittedSequence = Math.max(
        this.latestSubmittedSequence,
        result.sequence,
      );
      if (this.persistedSequence >= this.latestSubmittedSequence) {
        this.input.onSyncStateChange?.("saved");
      } else {
        this.input.onSyncStateChange?.("pending-persistence");
      }
      return result;
    } catch (error) {
      this.pendingOperations.delete(operationId);
      this.lastSubmissionError =
        error instanceof Error ? error : new Error(String(error));
      this.input.onSyncStateChange?.("error", this.lastSubmissionError);
      throw error;
    }
  }

  public async waitForPersistence(timeoutMs = 10_000) {
    await this.localChangeQueue;
    if (this.lastSubmissionError) {
      throw this.lastSubmissionError;
    }
    if (this.lastPersistenceError) {
      throw this.lastPersistenceError;
    }
    const targetSequence = Math.max(
      this.latestSubmittedSequence,
      this.confirmedSequence,
    );
    if (targetSequence === 0 || this.persistedSequence >= targetSequence) {
      return this.getWriteStatus();
    }
    await new Promise<void>((resolve, reject) => {
      const waiter = {
        targetSequence,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.persistenceWaiters.delete(waiter);
          reject(
            Object.assign(
              new Error("Timed out waiting for project room persistence."),
              {
                code: "PERSISTENCE_FAILED",
                details: { targetSequence },
              },
            ),
          );
        }, timeoutMs),
      };
      this.persistenceWaiters.add(waiter);
    });
    return this.getWriteStatus();
  }

  private handleRoomEvent(event: ProjectRoomEvent) {
    if (!this.identity) {
      this.eventsReceivedBeforeJoin.push(structuredClone(event));
      return;
    }
    if (
      event.identity.projectId !== this.identity.projectId ||
      event.identity.roomId !== this.identity.roomId ||
      event.identity.sessionEpoch !== this.identity.sessionEpoch
    ) {
      return;
    }
    if (event.type === "participants.changed") {
      this.input.applyParticipants?.(structuredClone(event.participants));
      return;
    }
    if (event.type === "room.closed") {
      this.input.onRoomClosed?.();
      return;
    }
    if (event.type === "room.closing") {
      return;
    }
    if (event.type === "scene.persisted") {
      this.persistedSequence = Math.max(this.persistedSequence, event.sequence);
      this.lastPersistenceError = null;
      this.resolvePersistenceWaiters();
      this.input.onSyncStateChange?.("saved");
      return;
    }
    if (event.type === "scene.persistence-failed") {
      const error = Object.assign(new Error(event.error.message), {
        code: event.error.code,
        ...(event.error.details !== undefined
          ? { details: event.error.details }
          : {}),
      });
      this.lastPersistenceError = error;
      this.rejectPersistenceWaiters(error);
      this.input.onSyncStateChange?.("error", error);
      return;
    }
    if (event.sequence <= this.confirmedSequence) {
      return;
    }
    if (event.sequence > this.confirmedSequence + 1) {
      if (!this.awaitingResync) {
        this.awaitingResync = true;
        this.input.transport.requestResync?.();
      }
      return;
    }

    const elementsById = new Map(
      this.elements.map((element) => [element.id, element]),
    );
    for (const element of event.elements) {
      elementsById.set(element.id, structuredClone(element));
    }
    if (event.sharedSceneConfig !== undefined) {
      this.sharedSceneConfig = structuredClone(event.sharedSceneConfig);
    }
    if (event.imageRecords !== undefined) {
      this.imageRecords = {
        ...this.imageRecords,
        ...structuredClone(event.imageRecords),
      };
      this.input.applyImageRecords?.(structuredClone(this.imageRecords));
    }
    this.elements = orderElements([...elementsById.values()]);
    this.confirmedSequence = event.sequence;
    const wasPending = this.pendingOperations.delete(event.operationId);
    const confirmation =
      event.originSessionId === this.activeSessionId && wasPending;
    this.applyScene(confirmation ? "confirmation" : "remote");
  }

  private replayEventsReceivedBeforeJoin() {
    const events = this.eventsReceivedBeforeJoin.splice(0);
    for (const event of events) {
      this.handleRoomEvent(event);
    }
  }

  private applySnapshot(joined: ProjectRoomJoinResult) {
    const snapshot = joined.snapshot;
    this.activeSessionId = joined.sessionId;
    this.identity = structuredClone(snapshot.identity);
    this.confirmedSequence = snapshot.sequence;
    this.persistedSequence = snapshot.persistedSequence;
    this.elements = structuredClone(snapshot.scene.elements);
    this.sharedSceneConfig = structuredClone(snapshot.scene.sharedSceneConfig);
    this.imageRecords = structuredClone(
      snapshot.imageRecords ?? joined.bootstrap?.imageRecords ?? {},
    );
    this.pendingOperations.clear();
    this.awaitingResync = false;
    this.lastSubmissionError = null;
    this.lastPersistenceError = null;
    this.latestSubmittedSequence = Math.max(
      this.latestSubmittedSequence,
      snapshot.sequence,
    );
    this.input.applyParticipants?.(structuredClone(snapshot.participants));
    this.input.applyImageRecords?.(structuredClone(this.imageRecords));
    this.applyScene("snapshot");
  }

  private applyScene(
    origin: ApplyAuthoritativeProjectRoomSceneInput["origin"],
  ) {
    this.applyingAuthoritativeScene = true;
    try {
      this.input.applyAuthoritativeScene({
        elements: structuredClone(this.elements),
        sharedSceneConfig: structuredClone(this.sharedSceneConfig),
        sequence: this.confirmedSequence,
        origin,
      });
    } finally {
      this.applyingAuthoritativeScene = false;
    }
  }

  private resolvePersistenceWaiters() {
    for (const waiter of this.persistenceWaiters) {
      if (this.persistedSequence >= waiter.targetSequence) {
        clearTimeout(waiter.timer);
        this.persistenceWaiters.delete(waiter);
        waiter.resolve();
      }
    }
  }

  private rejectPersistenceWaiters(error: Error) {
    for (const waiter of this.persistenceWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.persistenceWaiters.clear();
  }
}

export const createProjectRoomClientController = (
  input: CreateProjectRoomClientControllerInput,
) => new ProjectRoomClientController(input);
