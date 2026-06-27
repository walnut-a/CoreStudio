import type {
  ImagePromptReferenceRecord,
  ImageAssetRendition,
  ImageAssetRequestRendition,
  ImageRecordMap,
  ImageSourceType,
  ProjectManifest,
  ProjectAgentAccess,
  ProjectThumbnailReadMode,
} from "./projectTypes";
import type {
  GenerationRequest,
  GenerationResponse,
  ProviderId,
  ProviderSettings,
} from "./providerTypes";
import type { AgentRendererCommandRequest } from "./agentBridgeTypes";
import type {
  AcpAgentSettings,
  AcpTaskEvent,
  AcpTaskRequest,
} from "./acpTypes";

export const IPC_CHANNELS = {
  createProject: "image-board:create-project",
  openProject: "image-board:open-project",
  openRecentProject: "image-board:open-recent-project",
  loadRecentProjects: "image-board:load-recent-projects",
  writeProjectScene: "image-board:write-project-scene",
  readProjectAssetPayloads: "image-board:read-project-asset-payloads",
  inspectProjectHealth: "image-board:inspect-project-health",
  rebuildProjectThumbnails: "image-board:rebuild-project-thumbnails",
  persistImageAssets: "image-board:persist-image-assets",
  importImages: "image-board:import-images",
  cleanProjectCache: "image-board:clean-project-cache",
  revealProjectInFinder: "image-board:reveal-project-in-finder",
  loadAppInfo: "image-board:load-app-info",
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
  projectStateChanged: "image-board:project-state-changed",
  flushAutosaveRequest: "image-board:flush-autosave-request",
  flushAutosaveResponse: "image-board:flush-autosave-response",
  agentCommandRequest: "image-board:agent-command-request",
  agentCommandResponse: "image-board:agent-command-response",
  getAgentBridgeStatus: "image-board:get-agent-bridge-status",
  setAgentBridgeEnabled: "image-board:set-agent-bridge-enabled",
  loadAcpAgentSettings: "image-board:load-acp-agent-settings",
  saveAcpAgentSettings: "image-board:save-acp-agent-settings",
  startAcpAgentTask: "image-board:start-acp-agent-task",
  cancelAcpAgentTask: "image-board:cancel-acp-agent-task",
  acpAgentTaskEvent: "image-board:acp-agent-task-event",
} as const;

export type DesktopMenuAction =
  | "new-project"
  | "open-project"
  | "open-project-safe"
  | "open-recent-project"
  | "inspect-project-health"
  | "repair-project-thumbnails"
  | "clean-project-cache"
  | "project-opened"
  | "project-open-failed"
  | "import-images"
  | "generate-image"
  | "provider-settings"
  | "app-settings"
  | "set-agent-bridge-enabled"
  | "reveal-project"
  | "show-about";

export interface DesktopMenuEvent {
  action: DesktopMenuAction;
  openRequestId?: number;
  projectPath?: string | null;
  projectBundle?: DesktopProjectBundle | null;
  errorMessage?: string | null;
  enabled?: boolean;
}

export interface DesktopProjectBundle {
  projectPath: string;
  project: ProjectManifest;
  sceneJson: string;
  imageRecords: ImageRecordMap;
  safeMode?: boolean;
}

export interface DesktopCurrentProject {
  projectPath: string;
  name: string;
  agentAccess: ProjectAgentAccess;
}

export interface DesktopProjectStateChangedPayload {
  currentProject: DesktopCurrentProject | null;
}

export interface DesktopAgentBridgeStatus {
  enabled: boolean;
  ready: boolean;
  currentProject: DesktopCurrentProject | null;
  boardUrl: string | null;
}

export interface RecentProjectEntry {
  projectPath: string;
  name: string;
  lastOpenedAt: string;
}

export interface DesktopAppInfo {
  name: string;
  version: string;
}

export interface ProjectAssetPayload {
  fileId: string;
  mimeType: string;
  dataBase64: string;
  width: number;
  height: number;
  createdAt: string;
  rendition?: ImageAssetRendition;
}

export interface RebuildProjectThumbnailsResult {
  generatedFileIds: string[];
  skippedFileIds: string[];
  failedFileIds: string[];
  backupPath?: string | null;
}

export type ProjectHealthIssueSeverity = "info" | "warning" | "error";

export interface ProjectHealthIssue {
  code:
    | "scene-parse-failed"
    | "missing-image-record"
    | "missing-asset-file"
    | "missing-thumbnail-cache"
    | "missing-preview-cache"
    | "orphan-image-record"
    | "broken-parent-link"
    | "broken-prompt-reference";
  severity: ProjectHealthIssueSeverity;
  fileId?: string;
  elementId?: string;
  path?: string;
  message: string;
  repairable: boolean;
}

export interface ProjectHealthReport {
  checkedAt: string;
  projectPath: string;
  imageRecordCount: number;
  sceneImageFileCount: number;
  missingImageRecordFileIds: string[];
  missingAssetFileIds: string[];
  missingThumbnailFileIds: string[];
  missingPreviewFileIds: string[];
  orphanImageRecordFileIds: string[];
  brokenParentFileIds: string[];
  brokenPromptReferenceFileIds: string[];
  issues: ProjectHealthIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    repairableCount: number;
  };
}

export interface CleanProjectCacheResult {
  removedFileCount: number;
  removedBytes: number;
  skippedFileCount: number;
}

export interface PersistedImageAssetInput extends ProjectAssetPayload {
  sourceType: ImageSourceType;
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  parentFileId?: string | null;
  promptReferences?: ImagePromptReferenceRecord[];
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
    rendition?: ImageAssetRequestRendition;
    thumbnailMode?: ProjectThumbnailReadMode;
  }): Promise<ProjectAssetPayload[]>;
  inspectProjectHealth?(input: {
    projectPath: string;
  }): Promise<ProjectHealthReport>;
  rebuildProjectThumbnails?(input: {
    projectPath: string;
    fileIds: string[];
    force?: boolean;
    createBackup?: boolean;
  }): Promise<RebuildProjectThumbnailsResult>;
  cleanProjectCache?(input: {
    projectPath: string;
  }): Promise<CleanProjectCacheResult>;
  persistImageAssets(input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }): Promise<ImageRecordMap>;
  importImages(): Promise<ImportedImagePayload[]>;
  revealProjectInFinder(projectPath: string): Promise<void>;
  loadAppInfo?(): Promise<DesktopAppInfo>;
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
  notifyProjectStateChanged?(
    currentProject: DesktopCurrentProject | null,
  ): void;
  getAgentBridgeStatus?(): Promise<DesktopAgentBridgeStatus>;
  setAgentBridgeEnabled?(enabled: boolean): Promise<DesktopAgentBridgeStatus>;
  loadAcpAgentSettings?(): Promise<AcpAgentSettings>;
  saveAcpAgentSettings?(settings: AcpAgentSettings): Promise<AcpAgentSettings>;
  startAcpAgentTask?(request: AcpTaskRequest): Promise<{ taskId: string }>;
  cancelAcpAgentTask?(taskId: string): Promise<void>;
  onAcpAgentTaskEvent?(listener: (event: AcpTaskEvent) => void): () => void;
  onFlushAutosaveRequest?(listener: () => Promise<void> | void): () => void;
  onAgentCommandRequest?(
    listener: (
      request: AgentRendererCommandRequest,
    ) => Promise<unknown> | unknown,
  ): () => void;
}
