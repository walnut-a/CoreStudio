import type {
  ImagePromptReferenceRecord,
  ImageAssetRendition,
  ImageAssetRequestRendition,
  ImageGenerationOrigin,
  ImageRecordMap,
  ImageSourceType,
  ProjectManifest,
  ProjectAgentAccess,
  ProjectImageWritebackTransaction,
  ProjectThumbnailReadMode,
} from "./projectTypes";
import type {
  ProjectRecordBoardPresence,
  ProjectRecordExplanation,
} from "./projectRecordIntegrity";
import type {
  GenerationRequest,
  GenerationResponse,
  ProviderId,
  ProviderSettings,
} from "./providerTypes";
import type { AgentRendererCommandRequest } from "./agentBridgeTypes";
import type {
  AcpAgentSettings,
  AcpRunLogDetail,
  AcpRunSummary,
  AcpThreadDetail,
  AcpThreadSummary,
  AcpTaskEvent,
  AcpTaskRequest,
} from "./acpTypes";

export const IPC_CHANNELS = {
  createProject: "image-board:create-project",
  openProject: "image-board:open-project",
  openRecentProject: "image-board:open-recent-project",
  loadRecentProjects: "image-board:load-recent-projects",
  removeRecentProject: "image-board:remove-recent-project",
  writeProjectScene: "image-board:write-project-scene",
  readProjectAssetPayloads: "image-board:read-project-asset-payloads",
  inspectProjectHealth: "image-board:inspect-project-health",
  rebuildProjectThumbnails: "image-board:rebuild-project-thumbnails",
  persistImageAssets: "image-board:persist-image-assets",
  beginImageWriteback: "image-board:begin-image-writeback",
  commitImageWriteback: "image-board:commit-image-writeback",
  rollbackImageWriteback: "image-board:rollback-image-writeback",
  importImages: "image-board:import-images",
  cleanProjectCache: "image-board:clean-project-cache",
  revealProjectInFinder: "image-board:reveal-project-in-finder",
  loadAppInfo: "image-board:load-app-info",
  inspectCodexIntegration: "image-board:inspect-codex-integration",
  loadProviderSettings: "image-board:load-provider-settings",
  saveProviderSettings: "image-board:save-provider-settings",
  loadPromptLibrary: "image-board:load-prompt-library",
  savePrompt: "image-board:save-prompt",
  deleteSavedPrompt: "image-board:delete-saved-prompt",
  markSavedPromptUsed: "image-board:mark-saved-prompt-used",
  generateImages: "image-board:generate-images",
  cancelGenerateImages: "image-board:cancel-generate-images",
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
  listAcpAgentRunLogs: "image-board:list-acp-agent-run-logs",
  readAcpAgentRunLog: "image-board:read-acp-agent-run-log",
  listAcpAgentThreads: "image-board:list-acp-agent-threads",
  readAcpAgentThread: "image-board:read-acp-agent-thread",
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
  skippedDetails?: ProjectRepairFileDetail[];
  failedDetails?: ProjectRepairFileDetail[];
  repairedGenerationRecordFileIds: string[];
  restoredBoardFileIds?: string[];
  restoredSceneJson?: string;
  repairedAcpOutputFileIds?: string[];
  repairedAcpOutputRecords?: ImageRecordMap;
  backupPath?: string | null;
}

export type ProjectRepairFileDetailReason =
  | "record-missing"
  | "thumbnail-not-needed"
  | "thumbnail-cache-exists"
  | "thumbnail-rebuild-failed"
  | "board-restore-failed"
  | "acp-output-import-failed";

export interface ProjectRepairFileDetail {
  fileId: string;
  reason: ProjectRepairFileDetailReason;
  message: string;
  path?: string;
}

export type ProjectHealthIssueSeverity = "info" | "warning" | "error";
export type ProjectHealthIssueResolutionStatus =
  | "repairable"
  | "manual"
  | "info";

export interface ProjectHealthIssueResolution {
  status: ProjectHealthIssueResolutionStatus;
  summary: string;
}

export interface ProjectHealthIssue {
  code:
    | "scene-parse-failed"
    | "missing-image-record"
    | "missing-asset-file"
    | "missing-thumbnail-cache"
    | "missing-preview-cache"
    | "orphan-image-record"
    | "orphan-generated-record"
    | "unwritten-acp-output"
    | "incomplete-generation-record"
    | "broken-parent-link"
    | "broken-prompt-reference";
  severity: ProjectHealthIssueSeverity;
  fileId?: string;
  elementId?: string;
  path?: string;
  message: string;
  repairable: boolean;
  boardPresence?: ProjectRecordBoardPresence;
  resolution?: ProjectHealthIssueResolution;
}

export interface ProjectHealthReport {
  checkedAt: string;
  projectPath: string;
  imageRecordCount: number;
  generatedImageRecordCount: number;
  sceneImageFileCount: number;
  missingImageRecordFileIds: string[];
  unindexedAssetFileIds?: string[];
  missingAssetFileIds: string[];
  missingThumbnailFileIds: string[];
  missingPreviewFileIds: string[];
  orphanImageRecordFileIds: string[];
  orphanGeneratedImageRecordFileIds: string[];
  unwrittenAcpOutputFileIds?: string[];
  incompleteGenerationRecordFileIds: string[];
  brokenParentFileIds: string[];
  brokenPromptReferenceFileIds: string[];
  recordExplanations?: Record<string, ProjectRecordExplanation>;
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
  generationOrigin?: ImageGenerationOrigin;
  provider?: ProviderId;
  model?: string;
  prompt?: string;
  negativePrompt?: string;
  seed?: number | null;
  generationTaskId?: string | null;
  generationThreadId?: string | null;
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

export type CodexIntegrationCheckId = "cli" | "skill" | "compatibility";
export type CodexIntegrationCheckStatus =
  | "ready"
  | "missing"
  | "outdated"
  | "broken";

export interface CodexIntegrationCheck {
  id: CodexIntegrationCheckId;
  status: CodexIntegrationCheckStatus;
  label: string;
  detail: string;
}

export interface CodexIntegrationStatus {
  state: "ready" | "install" | "update" | "repair" | "error";
  command: string;
  checks: CodexIntegrationCheck[];
  detectedAt: string;
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
  generationJobId?: string;
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
  removeRecentProject?(projectPath: string): Promise<RecentProjectEntry[]>;
  writeProjectScene(input: {
    projectPath: string;
    sceneJson: string;
    expectedSceneHash?: string | null;
  }): Promise<ProjectManifest | void>;
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
  beginImageWriteback(input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
  }): Promise<ProjectImageWritebackTransaction>;
  commitImageWriteback(input: {
    projectPath: string;
    transactionId: string;
  }): Promise<void>;
  rollbackImageWriteback(input: {
    projectPath: string;
    transactionId: string;
  }): Promise<ImageRecordMap>;
  importImages(): Promise<ImportedImagePayload[]>;
  revealProjectInFinder(projectPath: string): Promise<void>;
  loadAppInfo?(): Promise<DesktopAppInfo>;
  inspectCodexIntegration?(): Promise<CodexIntegrationStatus>;
  loadProviderSettings(): Promise<PublicProviderSettings>;
  saveProviderSettings(
    input: SaveProviderSettingsInput,
  ): Promise<PublicProviderSettings>;
  loadPromptLibrary(): Promise<SavedPrompt[]>;
  savePrompt(input: SavePromptInput): Promise<SavedPrompt[]>;
  deleteSavedPrompt(id: string): Promise<SavedPrompt[]>;
  markSavedPromptUsed(id: string): Promise<SavedPrompt[]>;
  generateImages(input: GenerateImagesInput): Promise<GenerationResponse>;
  cancelGenerateImages?(generationJobId: string): Promise<void>;
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
  startAcpAgentTask?(
    request: AcpTaskRequest,
  ): Promise<{ taskId: string; threadId?: string }>;
  cancelAcpAgentTask?(taskId: string): Promise<void>;
  listAcpAgentRunLogs?(input?: { limit?: number }): Promise<AcpRunSummary[]>;
  readAcpAgentRunLog?(taskId: string): Promise<AcpRunLogDetail>;
  listAcpAgentThreads?(input?: {
    projectToken?: string;
    limit?: number;
  }): Promise<AcpThreadSummary[]>;
  readAcpAgentThread?(threadId: string): Promise<AcpThreadDetail>;
  onAcpAgentTaskEvent?(listener: (event: AcpTaskEvent) => void): () => void;
  onFlushAutosaveRequest?(listener: () => Promise<void> | void): () => void;
  onAgentCommandRequest?(
    listener: (
      request: AgentRendererCommandRequest,
    ) => Promise<unknown> | unknown,
  ): () => void;
}
