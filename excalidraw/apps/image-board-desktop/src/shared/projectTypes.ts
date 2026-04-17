import type { ProviderId } from "./providerTypes";

export const PROJECT_FORMAT_VERSION = 1;
export const PROJECT_FILENAMES = {
  project: "project.json",
  scene: "scene.excalidraw.json",
  imageRecords: "image-records.json",
  assetsDir: "assets",
  exportsDir: "exports",
} as const;

export type ImageSourceType = "generated" | "imported";

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
}

export type ImageRecordMap = Record<string, ImageRecord>;
