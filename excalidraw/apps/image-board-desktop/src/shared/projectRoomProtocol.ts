import type { ImageRecordMap, ProjectManifest } from "./projectTypes";

export const PROJECT_ROOM_PROTOCOL_VERSION = 2;
export const PROJECT_ROOM_CAPABILITY_VERSION = 1;

export type ProjectRoomLifecycle =
  | "opening"
  | "active"
  | "closing"
  | "storage-error"
  | "closed";

export type ProjectRoomParticipantRole =
  | "desktop-editor"
  | "board-editor"
  | "agent-writer";

export type ProjectRoomParticipantTransport = "ipc" | "websocket" | "command";

export interface ProjectRoomIdentity {
  projectId: string;
  canonicalProjectPath: string;
  roomId: string;
  sessionEpoch: number;
}

export interface ProjectRoomSceneElement {
  id: string;
  version: number;
  versionNonce: number;
  index?: string | null;
  isDeleted: boolean;
  [key: string]: unknown;
}

export interface ProjectRoomParticipant {
  actorId: string;
  sessionId: string;
  transport: ProjectRoomParticipantTransport;
  role: ProjectRoomParticipantRole;
  displayLabel: string;
}

export interface ProjectRoomParticipantSelection {
  source: "agent-board";
  projectPath: string;
  updatedAt: string;
  selection?: unknown;
  scene?: {
    selectedElementIds?: string[];
    viewport?: {
      scrollX?: number;
      scrollY?: number;
      zoom?: number;
      width?: number;
      height?: number;
    };
  };
}

export interface DesktopProjectRoomJoinInput {
  projectPath: string;
  sessionId: string;
}

export interface ProjectRoomScene {
  elements: ProjectRoomSceneElement[];
  sharedSceneConfig: Record<string, unknown>;
}

export interface ProjectRoomSceneOperation extends ProjectRoomIdentity {
  operationId: string;
  clientSequence?: number;
  baseSequence: number;
  elements: ProjectRoomSceneElement[];
  sharedSceneConfig?: Record<string, unknown>;
}

export type ProjectRoomErrorCode =
  | "AUTH_REQUIRED"
  | "TOKEN_EXPIRED"
  | "PROJECT_MISMATCH"
  | "ROOM_MISMATCH"
  | "SESSION_EPOCH_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "ROOM_CLOSED"
  | "ROOM_CLOSING"
  | "ROOM_WRITE_MODE_ACTIVE"
  | "PERSISTENCE_FAILED"
  | "PARTICIPANTS_CHANGED"
  | "FORBIDDEN"
  | "PROJECT_ROOM_ALREADY_OPEN"
  | "OPERATION_ID_CONFLICT";

export interface ProjectRoomSnapshot {
  type: "room.snapshot";
  identity: ProjectRoomIdentity;
  sequence: number;
  persistedSequence: number;
  projectRevision: string;
  scene: ProjectRoomScene;
  participants: ProjectRoomParticipant[];
}

export interface ProjectRoomJoinResult {
  snapshot: ProjectRoomSnapshot;
  sessionId: string;
  resumeToken?: string;
  bootstrap?: ProjectRoomBootstrap;
}

export interface ProjectRoomBootstrap {
  projectPath: string;
  project: ProjectManifest;
  imageRecords: ImageRecordMap;
}

export interface ProjectRoomOperationResult {
  type: "operation.accepted" | "operation.superseded";
  operationId: string;
  sequence: number;
  acceptedElementIds: string[];
  supersededElementIds: string[];
}

export interface ProjectRoomSceneUpdate {
  type: "scene.update";
  identity: ProjectRoomIdentity;
  sequence: number;
  originSessionId: string;
  originActorId: string;
  operationId: string;
  baseSequence: number;
  elements: ProjectRoomSceneElement[];
  sharedSceneConfig?: Record<string, unknown>;
  acceptedElementIds: string[];
  supersededElementIds: string[];
}

export interface ProjectRoomPersisted {
  type: "scene.persisted";
  identity: ProjectRoomIdentity;
  sequence: number;
  projectRevision: string;
}

export interface ProjectRoomPersistenceFailed {
  type: "scene.persistence-failed";
  identity: ProjectRoomIdentity;
  sequence: number;
  error: {
    code: "PERSISTENCE_FAILED";
    message: string;
    details?: unknown;
  };
}

export interface ProjectRoomParticipantsChanged {
  type: "participants.changed";
  identity: ProjectRoomIdentity;
  participants: ProjectRoomParticipant[];
}

export interface ProjectRoomAssetsUpdated {
  type: "assets.updated";
  identity: ProjectRoomIdentity;
  imageRecords: ImageRecordMap;
}

export interface ProjectRoomClosed {
  type: "room.closed";
  identity: ProjectRoomIdentity;
  reason: "project-closed";
}

export interface ProjectRoomClosing {
  type: "room.closing";
  identity: ProjectRoomIdentity;
}

export type ProjectRoomEvent =
  | ProjectRoomSceneUpdate
  | ProjectRoomPersisted
  | ProjectRoomPersistenceFailed
  | ProjectRoomAssetsUpdated
  | ProjectRoomParticipantsChanged
  | ProjectRoomClosing
  | ProjectRoomClosed;

export interface DesktopProjectRoomEventEnvelope {
  sessionId: string;
  event: ProjectRoomEvent;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

export const isProjectRoomSceneElement = (
  value: unknown,
): value is ProjectRoomSceneElement =>
  isObject(value) &&
  isNonEmptyString(value.id) &&
  isNonNegativeInteger(value.version) &&
  Number.isInteger(value.versionNonce) &&
  (value.index === undefined ||
    value.index === null ||
    typeof value.index === "string") &&
  typeof value.isDeleted === "boolean";

export const isProjectRoomParticipantSelection = (
  value: unknown,
): value is ProjectRoomParticipantSelection =>
  isObject(value) &&
  value.source === "agent-board" &&
  isNonEmptyString(value.projectPath) &&
  isNonEmptyString(value.updatedAt) &&
  (value.scene === undefined || isObject(value.scene));

export const isProjectRoomSceneOperation = (
  value: unknown,
): value is ProjectRoomSceneOperation => {
  if (
    !isObject(value) ||
    "actorId" in value ||
    "sessionId" in value ||
    "originSessionId" in value ||
    !isNonEmptyString(value.projectId) ||
    !isNonEmptyString(value.canonicalProjectPath) ||
    !isNonNegativeInteger(value.sessionEpoch) ||
    !isNonEmptyString(value.roomId) ||
    !isNonEmptyString(value.operationId) ||
    (value.clientSequence !== undefined &&
      !isNonNegativeInteger(value.clientSequence)) ||
    "interactionId" in value ||
    "final" in value ||
    !isNonNegativeInteger(value.baseSequence) ||
    !Array.isArray(value.elements) ||
    (value.sharedSceneConfig !== undefined &&
      !isObject(value.sharedSceneConfig)) ||
    "imageRecords" in value
  ) {
    return false;
  }

  const elementIds = new Set<string>();
  for (const element of value.elements) {
    if (!isProjectRoomSceneElement(element) || elementIds.has(element.id)) {
      return false;
    }
    elementIds.add(element.id);
  }
  return true;
};
