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
  onRoomClosed?: () => void;
  onSyncStateChange?: (
    state: "syncing" | "pending-persistence" | "saved" | "error",
    error?: Error,
  ) => void;
  ensureAssetsForElements?: (
    elements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
  ) => Promise<void>;
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
  private readonly pendingOperations = new Set<string>();
  private unsubscribe: (() => void) | null = null;
  private unsubscribeSnapshot: (() => void) | null = null;
  private applyingAuthoritativeScene = false;
  private joined: ProjectRoomJoinResult | null = null;
  private awaitingResync = false;
  private latestOperationId: string | null = null;
  private latestSubmittedSequence = 0;
  private lifecycleGeneration = 0;
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

  public async handleLocalSceneChange(
    nextElements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown> = {},
    nextSharedSceneConfig?: Record<string, unknown>,
    options: {
      submitOperation?: (
        operation: ProjectRoomSceneOperation,
      ) => Promise<ProjectRoomOperationResult>;
    } = {},
  ) {
    if (this.applyingAuthoritativeScene || !this.identity) {
      return null;
    }
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

    if (changedElements.length > 0) {
      await this.input.ensureAssetsForElements?.(changedElements, files);
    }
    this.elements = orderElements(
      nextElements.map((element) => structuredClone(element)),
    );
    if (sharedSceneConfigChanged) {
      this.sharedSceneConfig = structuredClone(nextSharedSceneConfig);
    }
    const operationId = this.input.randomId
      ? this.input.randomId()
      : crypto.randomUUID();
    const operation: ProjectRoomSceneOperation = {
      ...this.identity,
      operationId,
      baseSequence: this.confirmedSequence,
      elements: structuredClone(changedElements),
      ...(sharedSceneConfigChanged
        ? { sharedSceneConfig: structuredClone(nextSharedSceneConfig) }
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
      this.input.onSyncStateChange?.(
        "error",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  public async waitForPersistence(timeoutMs = 10_000) {
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
    this.elements = orderElements([...elementsById.values()]);
    this.confirmedSequence = event.sequence;
    const wasPending = this.pendingOperations.delete(event.operationId);
    const confirmation =
      event.originSessionId === this.activeSessionId && wasPending;
    this.applyScene(confirmation ? "confirmation" : "remote");
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
    this.latestSubmittedSequence = Math.max(
      this.latestSubmittedSequence,
      snapshot.sequence,
    );
    this.input.applyParticipants?.(structuredClone(snapshot.participants));
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
