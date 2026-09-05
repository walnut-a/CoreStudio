export const PROJECT_FORMAT_VERSION = 1;
export const PROJECT_FILENAMES = {
  project: "project.json",
  scene: "scene.excalidraw.json",
  imageRecords: "image-records.json",
  assetsDir: "assets",
  cacheDir: "cache",
  exportsDir: "exports",
  imageIntake: "image-intake.json",
} as const;

export type ImageSourceType = "generated" | "imported";
export type ImageGenerationOrigin = "corestudio" | "agent-board";
export type ImageAssetRendition =
  | "original"
  | "thumbnail"
  | "preview"
  | "placeholder";
export type ImageAssetRequestRendition = Exclude<
  ImageAssetRendition,
  "placeholder"
>;
export type ProjectThumbnailReadMode = "read-through" | "cache-only";

export type ImagePromptReferenceKind = "image" | "snapshot";

export interface ImagePromptReferenceRecord {
  id: string;
  index: number;
  label: string;
  kind: ImagePromptReferenceKind;
  fileIds?: string[];
  elementIds?: string[];
}

export interface ProjectManifest {
  formatVersion: number;
  appVersion: string;
  /**
   * Stable, non-secret project identity. Legacy manifests are normalized with
   * an id before they are exposed to the renderer.
   */
  projectId?: string;
  /**
   * Stable, non-secret local Agent Board address identity. It is generated
   * lazily and must never be used as a room or participant credential.
   */
  stableBoardId?: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneFile: string;
  imageRecordsFile: string;
  assetsDir: string;
  exportsDir: string;
  agentAccess: ProjectAgentAccess;
}

export interface ProjectAgentAccess {
  token: string;
  enabled: boolean;
}

export interface ImageRecord {
  fileId: string;
  assetPath: string;
  /** SHA-256 of an automatically accepted original; detects external replacement. */
  contentHash?: string;
  displayName?: string;
  sourceFileName?: string;
  sourceType: ImageSourceType;
  generationOrigin?: ImageGenerationOrigin;
  generationSource?: "builtin" | "agent";
  /**
   * Provider identifiers from CoreStudio use ProviderId, while images written
   * by an external agent may carry an identifier unknown to this client.
   */
  provider?: string;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  width: number;
  height: number;
  createdAt: string;
  mimeType: string;
  notes?: string | null;
  parentFileId?: string | null;
  promptReferences?: ImagePromptReferenceRecord[];
}

export type ImageRecordMap = Record<string, ImageRecord>;

export type ProjectImageRecordReadIssueCode =
  | "inconsistent-provenance"
  | "record-key-mismatch"
  | "invalid-record-field"
  | "invalid-provider-metadata";

export interface ProjectImageRecordReadIssue {
  code: ProjectImageRecordReadIssueCode;
  fileId: string;
  message: string;
  repairable: boolean;
  normalization?: "add-corestudio-origin" | "remove-imported-origin";
}

export interface ProjectImageWritebackTransaction {
  transactionId: string;
  projectPath: string;
  fileIds: string[];
  imageRecords: ImageRecordMap;
}

export interface ProjectImageWritebackJournal {
  schemaVersion: 1;
  transactionId: string;
  createdAt: string;
  previousRecords: Record<string, ImageRecord | null>;
  nextRecords: ImageRecordMap;
}

export interface ProjectImageWritebackJournalReadIssue {
  transactionId: string;
  code: "WRITEBACK_JOURNAL_INVALID";
  message: string;
}
