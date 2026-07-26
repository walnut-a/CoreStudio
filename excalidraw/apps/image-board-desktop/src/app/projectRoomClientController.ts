import type {
  DesktopProjectRoomJoinInput,
  ProjectRoomClosed,
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
import { areJsonValuesEqual } from "../shared/jsonValueEquality";

export interface ProjectRoomClientTransport {
  join(input: DesktopProjectRoomJoinInput): Promise<ProjectRoomJoinResult>;
  submitOperation(
    operation: ProjectRoomSceneOperation,
  ): Promise<ProjectRoomOperationResult>;
  leave(sessionId: string): Promise<boolean>;
  cancelPendingJoin?(): Promise<void> | void;
  subscribe(listener: (event: ProjectRoomEvent) => void): () => void;
  subscribeSnapshot(
    listener: (joined: ProjectRoomJoinResult) => void,
  ): () => void;
  requestResync(): Promise<void> | void;
  requestPersistence?(): Promise<void>;
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
  ) => readonly ProjectRoomSceneElement[] | void;
  applyParticipants?: (participants: ProjectRoomParticipant[]) => void;
  applyImageRecords?: (imageRecords: ImageRecordMap) => void;
  onRoomClosed?: (event: ProjectRoomClosed) => void;
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

interface LocalSceneChangeOptions {
  submitOperation?: (
    operation: ProjectRoomSceneOperation,
  ) => Promise<ProjectRoomOperationResult>;
}

interface PendingLocalSceneChange {
  nextElements: readonly ProjectRoomSceneElement[];
  files: Record<string, unknown>;
  nextSharedSceneConfig?: Record<string, unknown>;
  options: LocalSceneChangeOptions;
  waiters: Array<{
    resolve: (result: ProjectRoomOperationResult | null) => void;
    reject: (error: unknown) => void;
  }>;
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
  private readonly pendingOperations = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private applyingAuthoritativeScene = false;
  private joined: ProjectRoomJoinResult | null = null;
  private awaitingResync = false;
  private latestOperationId: string | null = null;
  private latestSubmittedSequence = 0;
  private nextClientSequence = 1;
  private lifecycleGeneration = 0;
  private localChangeQueue: Promise<void> = Promise.resolve();
  private pendingLocalSceneChange: PendingLocalSceneChange | null = null;
  private processingLocalSceneChanges = false;
  private lastSubmissionError: Error | null = null;
  private lastPersistenceError: Error | null = null;
  private lastAppliedAuthoritativeVersions = new Map<
    string,
    { version: number; versionNonce: number }
  >();
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
    this.unsubscribeSnapshot = this.input.transport.subscribeSnapshot(
      (joined) => {
        try {
          this.applySnapshot(joined);
        } catch (error) {
          this.handleSceneApplicationFailure(error);
        }
      },
    );
    try {
      const joined = await this.input.transport.join({
        projectPath: this.input.projectPath,
        sessionId: this.input.sessionId,
      });
      if (generation !== this.lifecycleGeneration) {
        await this.input.transport.leave(joined.sessionId);
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
    if (this.activeSessionId) {
      await this.input.transport.leave(this.activeSessionId);
    } else {
      await this.input.transport.cancelPendingJoin?.();
    }
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
    options: LocalSceneChangeOptions = {},
  ) {
    const result = new Promise<ProjectRoomOperationResult | null>(
      (resolve, reject) => {
        if (this.pendingLocalSceneChange) {
          this.pendingLocalSceneChange.nextElements = nextElements;
          this.pendingLocalSceneChange.files = files;
          this.pendingLocalSceneChange.nextSharedSceneConfig =
            nextSharedSceneConfig;
          this.pendingLocalSceneChange.options = options;
          this.pendingLocalSceneChange.waiters.push({ resolve, reject });
          return;
        }
        this.pendingLocalSceneChange = {
          nextElements,
          files,
          nextSharedSceneConfig,
          options,
          waiters: [{ resolve, reject }],
        };
      },
    );
    if (!this.processingLocalSceneChanges) {
      const drain = this.processPendingLocalSceneChanges();
      this.localChangeQueue = drain.catch(() => undefined);
    }
    // Scene changes can originate from render callbacks that cannot await the
    // submission. Keep the returned promise rejectable for explicit callers,
    // while ensuring a fire-and-forget waiter cannot surface as an unhandled
    // rejection. The controller still exposes the failure through sync state
    // and waitForSubmission().
    void result.catch(() => undefined);
    return result;
  }

  private async processPendingLocalSceneChanges() {
    this.processingLocalSceneChanges = true;
    try {
      while (this.pendingLocalSceneChange) {
        const pending = this.pendingLocalSceneChange;
        this.pendingLocalSceneChange = null;
        try {
          const result = await this.processLocalSceneChange(
            pending.nextElements,
            pending.files,
            pending.nextSharedSceneConfig,
            pending.options,
          );
          for (const waiter of pending.waiters) {
            waiter.resolve(result);
          }
        } catch (error) {
          for (const waiter of pending.waiters) {
            waiter.reject(error);
          }
        }
      }
    } finally {
      this.processingLocalSceneChanges = false;
    }
  }

  private async processLocalSceneChange(
    nextElements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
    nextSharedSceneConfig: Record<string, unknown> | undefined,
    options: LocalSceneChangeOptions,
  ) {
    if (this.applyingAuthoritativeScene || !this.identity) {
      return null;
    }
    const operationIdentity = this.identity;
    const currentById = new Map(
      this.elements.map((element) => [element.id, element]),
    );
    const changedElements = nextElements.filter((element) => {
      if (!hasVersionIdentityChanged(currentById.get(element.id), element)) {
        return false;
      }
      const lastApplied = this.lastAppliedAuthoritativeVersions.get(element.id);
      return (
        !lastApplied ||
        lastApplied.version !== element.version ||
        lastApplied.versionNonce !== element.versionNonce
      );
    });
    const sharedSceneConfigChanged =
      nextSharedSceneConfig !== undefined &&
      !areJsonValuesEqual(nextSharedSceneConfig, this.sharedSceneConfig);
    if (changedElements.length === 0 && !sharedSceneConfigChanged) {
      return null;
    }

    if (changedElements.length > 0) {
      await this.input.ensureAssetsForElements?.(changedElements, files);
    }
    if (this.identity !== operationIdentity) {
      return null;
    }
    const operationId = this.input.randomId
      ? this.input.randomId()
      : crypto.randomUUID();
    const operation: ProjectRoomSceneOperation = {
      ...operationIdentity,
      operationId,
      clientSequence: this.nextClientSequence++,
      baseSequence: this.confirmedSequence,
      elements: structuredClone(changedElements),
      ...(sharedSceneConfigChanged
        ? { sharedSceneConfig: structuredClone(nextSharedSceneConfig) }
        : {}),
    };
    this.latestOperationId = operationId;
    this.pendingOperations.add(operationId);
    this.input.onSyncStateChange?.("syncing");
    try {
      const result = await (
        options.submitOperation ??
        this.input.transport.submitOperation.bind(this.input.transport)
      )(operation);
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
    const persistenceErrorAtCall = this.lastPersistenceError;
    await this.localChangeQueue;
    if (this.lastSubmissionError) {
      throw this.lastSubmissionError;
    }
    const targetSequence = Math.max(
      this.latestSubmittedSequence,
      this.confirmedSequence,
    );
    if (targetSequence === 0 || this.persistedSequence >= targetSequence) {
      return this.getWriteStatus();
    }
    if (this.lastPersistenceError) {
      if (!persistenceErrorAtCall) {
        throw this.lastPersistenceError;
      }
      if (!this.input.transport.requestPersistence) {
        throw this.lastPersistenceError;
      }
      this.lastPersistenceError = null;
      this.input.onSyncStateChange?.("pending-persistence");
      try {
        await this.input.transport.requestPersistence();
      } catch (error) {
        this.lastPersistenceError =
          error instanceof Error ? error : new Error(String(error));
        this.input.onSyncStateChange?.("error", this.lastPersistenceError);
        throw this.lastPersistenceError;
      }
      if (this.persistedSequence >= targetSequence) {
        return this.getWriteStatus();
      }
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

  public async waitForSubmission() {
    await this.localChangeQueue;
    if (this.lastSubmissionError) {
      throw this.lastSubmissionError;
    }
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
    if (event.type === "assets.updated") {
      this.input.applyImageRecords?.(structuredClone(event.imageRecords));
      return;
    }
    if (event.type === "room.closed") {
      this.input.onRoomClosed?.(structuredClone(event));
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
      this.requestResync();
      return;
    }

    const previousElements = this.elements;
    const previousSharedSceneConfig = this.sharedSceneConfig;
    const previousConfirmedSequence = this.confirmedSequence;
    const elementsById = new Map(
      this.elements.map((element) => [element.id, element]),
    );
    for (const element of event.elements) {
      elementsById.set(element.id, structuredClone(element));
    }
    if (event.sharedSceneConfig !== undefined) {
      this.sharedSceneConfig = structuredClone(event.sharedSceneConfig);
    }
    this.elements = orderElements([...elementsById.values()]);
    this.confirmedSequence = event.sequence;
    const wasPending = this.pendingOperations.delete(event.operationId);
    const confirmation =
      event.originSessionId === this.activeSessionId && wasPending;
    try {
      this.applyScene(confirmation ? "confirmation" : "remote");
    } catch (error) {
      this.elements = previousElements;
      this.sharedSceneConfig = previousSharedSceneConfig;
      this.confirmedSequence = previousConfirmedSequence;
      this.handleSceneApplicationFailure(error);
    }
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
    this.pendingOperations.clear();
    this.awaitingResync = false;
    this.lastSubmissionError = null;
    this.lastPersistenceError = null;
    this.latestSubmittedSequence = Math.max(
      this.latestSubmittedSequence,
      snapshot.sequence,
    );
    this.input.applyParticipants?.(structuredClone(snapshot.participants));
    if (joined.bootstrap?.imageRecords) {
      this.input.applyImageRecords?.(
        structuredClone(joined.bootstrap.imageRecords),
      );
    }
    this.applyScene("snapshot");
    this.input.onSyncStateChange?.(
      this.persistedSequence >= this.confirmedSequence
        ? "saved"
        : "pending-persistence",
    );
  }

  private requestResync(error?: Error) {
    if (error) {
      this.input.onSyncStateChange?.("error", error);
    }
    if (this.awaitingResync) {
      return;
    }
    this.awaitingResync = true;
    try {
      void Promise.resolve(this.input.transport.requestResync()).catch(
        (requestError) => {
          this.input.onSyncStateChange?.(
            "error",
            requestError instanceof Error
              ? requestError
              : new Error(String(requestError)),
          );
        },
      );
    } catch (requestError) {
      this.input.onSyncStateChange?.(
        "error",
        requestError instanceof Error
          ? requestError
          : new Error(String(requestError)),
      );
    }
  }

  private handleSceneApplicationFailure(error: unknown) {
    this.requestResync(
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  private applyScene(
    origin: ApplyAuthoritativeProjectRoomSceneInput["origin"],
  ) {
    this.applyingAuthoritativeScene = true;
    try {
      const appliedElements = this.input.applyAuthoritativeScene({
        elements: structuredClone(this.elements),
        sharedSceneConfig: structuredClone(this.sharedSceneConfig),
        sequence: this.confirmedSequence,
        origin,
      });
      this.lastAppliedAuthoritativeVersions = new Map(
        (appliedElements ?? this.elements).map((element) => [
          element.id,
          {
            version: element.version,
            versionNonce: element.versionNonce,
          },
        ]),
      );
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
