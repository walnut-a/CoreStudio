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
  ProjectImageWritebackJournalReadIssue,
  ProjectImageRecordReadIssue,
  ProjectThumbnailReadMode,
} from "./projectTypes";
import type {
  ProjectRecordBoardPresence,
  ProjectRecordExplanation,
} from "./projectRecordIntegrity";
import type {
  GenerationSource,
  GenerationRequest,
  GenerationResponse,
  ProviderId,
  ProviderSettings,
} from "./providerTypes";
import type { ModelCatalogSnapshot } from "./modelCatalogContract";
import type {
  AgentHost,
  AgentRendererCommandRequest,
} from "./agentBridgeTypes";
import type {
  DesktopLocalePreference,
  DesktopLocaleSettings,
} from "./desktopLocale";
import type {
  DesktopCanvasInteractionSettings,
  TrackpadZoomSpeed,
} from "./canvasInteractionSettings";
import type {
  DesktopAppUpdateAvailability,
  DesktopAppUpdateCheckResponse,
} from "./appUpdate";
import type {
  DesktopProjectRoomJoinInput,
  ProjectRoomEvent,
  ProjectRoomOperationResult,
  ProjectRoomParticipant,
  ProjectRoomSceneElement,
  ProjectRoomSceneOperation,
  ProjectRoomSnapshot,
} from "./projectRoomProtocol";

export const IPC_CHANNELS = {
  createProject: "image-board:create-project",
  openProject: "image-board:open-project",
  openRecentProject: "image-board:open-recent-project",
  loadRecentProjects: "image-board:load-recent-projects",
  removeRecentProject: "image-board:remove-recent-project",
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
  getStableAgentBoardUrl: "image-board:get-stable-agent-board-url",
  loadAppInfo: "image-board:load-app-info",
  loadAppUpdateAvailability: "image-board:load-app-update-availability",
  checkForAppUpdates: "image-board:check-for-app-updates",
  appUpdateAvailabilityChanged: "image-board:app-update-availability-changed",
  openExternal: "image-board:open-external",
  inspectCodexIntegration: "image-board:inspect-codex-integration",
  installCodexIntegration: "image-board:install-codex-integration",
  inspectAgentIntegration: "image-board:inspect-agent-integration",
  installAgentIntegration: "image-board:install-agent-integration",
  removeAgentIntegration: "image-board:remove-agent-integration",
  loadProviderSettings: "image-board:load-provider-settings",
  saveProviderSettings: "image-board:save-provider-settings",
  deleteProviderSettings: "image-board:delete-provider-settings",
  setGenerateComposerVisible: "image-board:set-generate-composer-visible",
  refreshModelCatalog: "image-board:refresh-model-catalog",
  generateImages: "image-board:generate-images",
  cancelGenerateImages: "image-board:cancel-generate-images",
  readClipboardImage: "image-board:read-clipboard-image",
  writeProjectClipboard: "image-board:write-project-clipboard",
  loadLocaleSettings: "image-board:load-locale-settings",
  saveLocalePreference: "image-board:save-locale-preference",
  loadCanvasInteractionSettings: "image-board:load-canvas-interaction-settings",
  saveTrackpadZoomSpeed: "image-board:save-trackpad-zoom-speed",
  canvasInteractionSettingsChanged:
    "image-board:canvas-interaction-settings-changed",
  menuAction: "image-board:menu-action",
  nativeEditContextChanged: "image-board:native-edit-context-changed",
  rendererReady: "image-board:renderer-ready",
  projectStateChanged: "image-board:project-state-changed",
  flushProjectRoomRequest: "image-board:flush-project-room-request",
  flushProjectRoomResponse: "image-board:flush-project-room-response",
  agentCommandRequest: "image-board:agent-command-request",
  agentCommandResponse: "image-board:agent-command-response",
  getAgentBridgeStatus: "image-board:get-agent-bridge-status",
  setAgentBridgeEnabled: "image-board:set-agent-bridge-enabled",
  getAgentIntegrationSettings: "image-board:get-agent-integration-settings",
  setCodexImageGenerationEnabled:
    "image-board:set-codex-image-generation-enabled",
  setAgentImageGenerationEnabled:
    "image-board:set-agent-image-generation-enabled",
  projectRoomJoin: "image-board:project-room-join",
  projectRoomResync: "image-board:project-room-resync",
  projectRoomOperation: "image-board:project-room-operation",
  projectRoomFlushPersistence: "image-board:project-room-flush-persistence",
  projectRoomLeave: "image-board:project-room-leave",
  projectRoomCloseState: "image-board:project-room-close-state",
  projectRoomClose: "image-board:project-room-close",
  projectRoomEvent: "image-board:project-room-event",
  projectViewsState: "image-board:project-views-state",
  loadProjectViewsState: "image-board:load-project-views-state",
  agentActiveProjectsChanged: "image-board:agent-active-projects-changed",
  loadAgentActiveProjects: "image-board:load-agent-active-projects",
  openProjectView: "image-board:open-project-view",
  activateProjectView: "image-board:activate-project-view",
  closeProjectView: "image-board:close-project-view",
  reorderProjectViews: "image-board:reorder-project-views",
  recoverProjectView: "image-board:recover-project-view",
  projectThemeChanged: "image-board:project-theme-changed",
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
  | "edit-undo"
  | "edit-redo"
  | "edit-cut"
  | "edit-copy"
  | "edit-paste"
  | "edit-select-all"
  | "set-agent-bridge-enabled"
  | "reveal-project";

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
  imageRecordReadIssues?: ProjectImageRecordReadIssue[];
  writebackJournalReadIssues?: ProjectImageWritebackJournalReadIssue[];
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

export type DesktopProjectViewStatus = "ready" | "crashed";
export type DesktopProjectTheme = "light" | "dark";

export interface DesktopProjectViewEntry {
  projectPath: string;
  projectId: string;
  name: string;
  status: DesktopProjectViewStatus;
  webContentsId: number;
  safeMode?: boolean;
  theme?: DesktopProjectTheme;
}

export interface DesktopProjectViewOpenOptions {
  safeMode?: boolean;
}

export interface DesktopProjectViewsState {
  activeProjectPath: string | null;
  projects: DesktopProjectViewEntry[];
}

export type DesktopAgentActivityStatus =
  | "working"
  | "connected"
  | "reconnecting";

export interface DesktopAgentActivity {
  actorId: string;
  displayLabel: string;
  host?: AgentHost;
  status: DesktopAgentActivityStatus;
}

export interface DesktopAgentActiveProject {
  projectId: string;
  projectPath: string;
  name: string;
  status: DesktopAgentActivityStatus;
  agentCount: number;
  agents: DesktopAgentActivity[];
}

export interface DesktopProjectThemeChangedPayload {
  projectPath: string;
  theme: DesktopProjectTheme;
}

export interface DesktopAgentBridgeStatus {
  enabled: boolean;
  ready: boolean;
  currentProject: DesktopCurrentProject | null;
  boardUrl: string | null;
}

export interface DesktopAgentIntegrationSettings {
  codex: {
    allowImageGeneration: boolean;
  };
  cursor: {
    allowImageGeneration: boolean;
  };
  "claude-code": {
    allowImageGeneration: boolean;
  };
}

export interface RecentProjectEntry {
  projectPath: string;
  name: string;
  lastOpenedAt: string;
  selectionAvailability?: "current" | "available" | "unavailable";
}

export interface DesktopAppInfo {
  name: string;
  version: string;
  runtimeIdentity?: DesktopRuntimeIdentity;
}

export interface DesktopRuntimeIdentity {
  schemaVersion: 1;
  instanceKind:
    | "source-dev"
    | "packaged-preview"
    | "production"
    | "qa"
    | "packaged-dev";
  runtimeLabel: string;
  runtimeMode: string;
  appName: string;
  appPath: string;
  executable: string;
  userData: string;
  windowTitle: string;
  bridgePort: number;
  sessionPath: string;
  settingsDirectory: string;
  rendererUrl: string | null;
  debugPort: number | null;
  identityPath: string;
  mainPid: number;
  mainPgid: number;
  gitCommit: string;
  gitDirty: boolean;
  appVersion: string;
  buildId: string;
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
  backupPath?: string | null;
}

export type ProjectRepairFileDetailReason =
  | "record-missing"
  | "thumbnail-not-needed"
  | "thumbnail-cache-exists"
  | "thumbnail-source-unreadable"
  | "thumbnail-rebuild-failed"
  | "board-restore-failed";

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
    | "incomplete-generation-record"
    | "broken-parent-link"
    | "broken-prompt-reference"
    | "inconsistent-provenance"
    | "record-key-mismatch"
    | "invalid-record-field"
    | "invalid-provider-metadata"
    | "invalid-writeback-journal";
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
  generationSource?: GenerationSource;
  provider?: string;
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

export type PublicProviderSettings = Partial<
  Record<
    ProviderId,
    Omit<ProviderSettings, "apiKey"> & {
      isConfigured: boolean;
    }
  >
>;

export interface ProviderConfigurationSnapshot {
  schemaVersion: 2;
  composerVisible?: boolean;
  defaultProvider: ProviderId | null;
  providers: PublicProviderSettings;
  modelCatalog?: ModelCatalogSnapshot;
}

export interface SaveProviderSettingsInput {
  provider: ProviderId;
  apiKey: string;
  displayName?: string;
  baseUrl?: string;
  defaultModel?: string;
  customModels?: ProviderSettings["customModels"];
}

export interface DeleteProviderSettingsInput {
  provider: ProviderId;
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
  executablePath?: string;
  installedIntegrationVersion?: string | null;
}

export interface CodexIntegrationStatus {
  host?: AgentHost;
  state: "ready" | "install" | "update" | "repair" | "error";
  command?: string;
  appVersion: string;
  integrationVersion: string;
  guideUrl: string;
  checks: CodexIntegrationCheck[];
  detectedAt: string;
}

export type AgentIntegrationStatus = CodexIntegrationStatus & {
  host: AgentHost;
  skillPath: string;
  canRemove: boolean;
};

export type CodexIntegrationInstallResult =
  | {
      ok: true;
      output: string;
      warning: string | null;
    }
  | {
      ok: false;
      error: string;
      details: string;
    };
export type AgentIntegrationInstallResult = CodexIntegrationInstallResult;
export interface GenerateImagesInput {
  projectPath: string;
  generationJobId?: string;
  request: GenerationRequest;
}

export interface DesktopProjectRoomFlushRequest {
  requestId: number;
}

export interface DesktopProjectRoomFlushResponse {
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
  getStableAgentBoardUrl?(projectPath: string): Promise<string | null>;
  switchAgentBoardProject?(): Promise<void>;
  loadAppInfo?(): Promise<DesktopAppInfo>;
  loadAppUpdateAvailability?(): Promise<DesktopAppUpdateAvailability>;
  checkForAppUpdates?(): Promise<DesktopAppUpdateCheckResponse>;
  onAppUpdateAvailabilityChanged?(
    listener: (availability: DesktopAppUpdateAvailability) => void,
  ): () => void;
  openExternal?(url: string): Promise<void>;
  inspectCodexIntegration?(): Promise<CodexIntegrationStatus>;
  installCodexIntegration?(): Promise<CodexIntegrationInstallResult>;
  inspectAgentIntegration?(host: AgentHost): Promise<AgentIntegrationStatus>;
  installAgentIntegration?(
    host: AgentHost,
  ): Promise<AgentIntegrationInstallResult>;
  removeAgentIntegration?(
    host: AgentHost,
  ): Promise<AgentIntegrationInstallResult>;
  loadProviderSettings(): Promise<ProviderConfigurationSnapshot>;
  saveProviderSettings(
    input: SaveProviderSettingsInput,
  ): Promise<ProviderConfigurationSnapshot>;
  deleteProviderSettings(
    input: DeleteProviderSettingsInput,
  ): Promise<ProviderConfigurationSnapshot>;
  setGenerateComposerVisible?(
    visible: boolean,
  ): Promise<ProviderConfigurationSnapshot>;
  refreshModelCatalog?(): Promise<ProviderConfigurationSnapshot>;
  generateImages(input: GenerateImagesInput): Promise<GenerationResponse>;
  cancelGenerateImages?(generationJobId: string): Promise<void>;
  readClipboardImage?(): Promise<ImportedImagePayload | null>;
  writeProjectClipboard?(input: {
    projectPath: string;
    elements: readonly ProjectRoomSceneElement[];
  }): Promise<void>;
  loadLocaleSettings?(): Promise<DesktopLocaleSettings>;
  saveLocalePreference?(
    preference: DesktopLocalePreference,
  ): Promise<DesktopLocaleSettings>;
  loadCanvasInteractionSettings?(): Promise<DesktopCanvasInteractionSettings>;
  saveTrackpadZoomSpeed?(
    speed: TrackpadZoomSpeed,
  ): Promise<DesktopCanvasInteractionSettings>;
  onCanvasInteractionSettingsChanged?(
    listener: (settings: DesktopCanvasInteractionSettings) => void,
  ): () => void;
  onMenuAction(listener: (event: DesktopMenuEvent) => void): () => void;
  notifyRendererReady?(): void;
  notifyProjectStateChanged?(
    currentProject: DesktopCurrentProject | null,
  ): void;
  getAgentBridgeStatus?(): Promise<DesktopAgentBridgeStatus>;
  setAgentBridgeEnabled?(enabled: boolean): Promise<DesktopAgentBridgeStatus>;
  getAgentIntegrationSettings?(): Promise<DesktopAgentIntegrationSettings>;
  setCodexImageGenerationEnabled?(
    enabled: boolean,
  ): Promise<DesktopAgentIntegrationSettings>;
  setAgentImageGenerationEnabled?(
    host: AgentHost,
    enabled: boolean,
  ): Promise<DesktopAgentIntegrationSettings>;
  joinProjectRoom?(
    input: DesktopProjectRoomJoinInput,
  ): Promise<ProjectRoomSnapshot>;
  resyncProjectRoom?(sessionId: string): Promise<ProjectRoomSnapshot>;
  submitProjectRoomOperation?(input: {
    sessionId: string;
    operation: ProjectRoomSceneOperation;
  }): Promise<ProjectRoomOperationResult>;
  flushProjectRoomPersistence?(sessionId: string): Promise<void>;
  leaveProjectRoom?(sessionId: string): Promise<boolean>;
  getProjectRoomCloseState?(input: {
    projectPath: string;
    sessionId: string;
  }): Promise<{
    roomId: string;
    otherParticipants: ProjectRoomParticipant[];
  } | null>;
  closeProjectRoom?(input: {
    projectPath: string;
    force?: boolean;
    expectedRoomId?: string;
    requestingSessionId?: string;
    acknowledgedParticipantSessionIds?: string[];
  }): Promise<boolean>;
  onProjectRoomEvent?(
    listener: (sessionId: string, event: ProjectRoomEvent) => void,
  ): () => void;
  loadProjectViewsState?(): Promise<DesktopProjectViewsState>;
  loadAgentActiveProjects?(): Promise<DesktopAgentActiveProject[]>;
  openProjectView?(
    projectPath: string,
    options?: DesktopProjectViewOpenOptions,
  ): Promise<DesktopProjectViewsState>;
  activateProjectView?(
    projectPath: string | null,
  ): Promise<DesktopProjectViewsState>;
  closeProjectView?(projectPath: string): Promise<DesktopProjectViewsState>;
  reorderProjectViews?(
    projectPaths: string[],
  ): Promise<DesktopProjectViewsState>;
  recoverProjectView?(projectPath: string): Promise<DesktopProjectViewsState>;
  notifyProjectThemeChanged?(payload: DesktopProjectThemeChangedPayload): void;
  onProjectViewsState?(
    listener: (state: DesktopProjectViewsState) => void,
  ): () => void;
  onAgentActiveProjectsChanged?(
    listener: (projects: DesktopAgentActiveProject[]) => void,
  ): () => void;
  onFlushProjectRoomRequest?(listener: () => Promise<void> | void): () => void;
  onAgentCommandRequest?(
    listener: (
      request: AgentRendererCommandRequest,
    ) => Promise<unknown> | unknown,
  ): () => void;
}
