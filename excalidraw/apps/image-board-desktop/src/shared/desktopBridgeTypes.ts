import type { ImageRecordMap, ProjectManifest, ImageSourceType } from "./projectTypes";
import type {
  GenerationRequest,
  GenerationResponse,
  ProviderId,
  ProviderSettings,
} from "./providerTypes";

export const IPC_CHANNELS = {
  createProject: "image-board:create-project",
  openProject: "image-board:open-project",
  openRecentProject: "image-board:open-recent-project",
  loadRecentProjects: "image-board:load-recent-projects",
  writeProjectScene: "image-board:write-project-scene",
  readProjectAssetPayloads: "image-board:read-project-asset-payloads",
  persistImageAssets: "image-board:persist-image-assets",
  importImages: "image-board:import-images",
  revealProjectInFinder: "image-board:reveal-project-in-finder",
  loadProviderSettings: "image-board:load-provider-settings",
  saveProviderSettings: "image-board:save-provider-settings",
  loadPromptLibrary: "image-board:load-prompt-library",
  savePrompt: "image-board:save-prompt",
  deleteSavedPrompt: "image-board:delete-saved-prompt",
  markSavedPromptUsed: "image-board:mark-saved-prompt-used",
  generateImages: "image-board:generate-images",
  readClipboardImage: "image-board:read-clipboard-image",
  menuAction: "image-board:menu-action",
  rendererReady: "image-board:renderer-ready",
  flushAutosaveRequest: "image-board:flush-autosave-request",
  flushAutosaveResponse: "image-board:flush-autosave-response",
} as const;

export type DesktopMenuAction =
  | "new-project"
  | "open-project"
  | "open-recent-project"
  | "project-opened"
  | "project-open-failed"
  | "import-images"
  | "generate-image"
  | "provider-settings"
  | "reveal-project";

export interface DesktopMenuEvent {
  action: DesktopMenuAction;
  openRequestId?: number;
  projectPath?: string | null;
  projectBundle?: DesktopProjectBundle | null;
  errorMessage?: string | null;
}

export interface DesktopProjectBundle {
  projectPath: string;
  project: ProjectManifest;
  sceneJson: string;
  imageRecords: ImageRecordMap;
}

export interface RecentProjectEntry {
  projectPath: string;
  name: string;
  lastOpenedAt: string;
}

export interface ProjectAssetPayload {
  fileId: string;
  mimeType: string;
  dataBase64: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface PersistedImageAssetInput extends ProjectAssetPayload {
  sourceType: ImageSourceType;
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  parentFileId?: string | null;
}

export interface ImportedImagePayload extends ProjectAssetPayload {
  fileName: string;
}

export type PublicProviderSettings = Record<
  ProviderId,
  Omit<ProviderSettings, "apiKey"> & { isConfigured: boolean }
>;

export interface SaveProviderSettingsInput {
  provider: ProviderId;
  apiKey: string;
  defaultModel?: string;
  customModels?: ProviderSettings["customModels"];
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface SavePromptInput {
  id?: string;
  title: string;
  content: string;
  tags: string[];
}

export interface GenerateImagesInput {
  projectPath: string;
  request: GenerationRequest;
}

export interface DesktopAutosaveFlushRequest {
  requestId: number;
}

export interface DesktopAutosaveFlushResponse {
  requestId: number;
  ok: boolean;
  errorMessage?: string | null;
}

export interface DesktopBridgeApi {
  createProject(): Promise<DesktopProjectBundle | null>;
  openProject(): Promise<DesktopProjectBundle | null>;
  openRecentProject(projectPath: string): Promise<DesktopProjectBundle | null>;
  loadRecentProjects(): Promise<RecentProjectEntry[]>;
  writeProjectScene(input: {
    projectPath: string;
    sceneJson: string;
  }): Promise<void>;
  readProjectAssetPayloads(input: {
    projectPath: string;
    fileIds: string[];
  }): Promise<ProjectAssetPayload[]>;
  persistImageAssets(input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }): Promise<ImageRecordMap>;
  importImages(): Promise<ImportedImagePayload[]>;
  revealProjectInFinder(projectPath: string): Promise<void>;
  loadProviderSettings(): Promise<PublicProviderSettings>;
  saveProviderSettings(
    input: SaveProviderSettingsInput,
  ): Promise<PublicProviderSettings>;
  loadPromptLibrary(): Promise<SavedPrompt[]>;
  savePrompt(input: SavePromptInput): Promise<SavedPrompt[]>;
  deleteSavedPrompt(id: string): Promise<SavedPrompt[]>;
  markSavedPromptUsed(id: string): Promise<SavedPrompt[]>;
  generateImages(input: GenerateImagesInput): Promise<GenerationResponse>;
  readClipboardImage?(): Promise<ImportedImagePayload | null>;
  onMenuAction(listener: (event: DesktopMenuEvent) => void): () => void;
  notifyRendererReady?(): void;
  onFlushAutosaveRequest?(
    listener: () => Promise<void> | void,
  ): () => void;
}
