import type { ProviderId } from "./providerTypes";

export const PROJECT_FORMAT_VERSION = 1;
export const PROJECT_FILENAMES = {
  project: "project.json",
  scene: "scene.excalidraw.json",
  imageRecords: "image-records.json",
  assetsDir: "assets",
  cacheDir: "cache",
  exportsDir: "exports",
} as const;

export type ImageSourceType = "generated" | "imported";
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
  sourceType: ImageSourceType;
  provider?: ProviderId;
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
