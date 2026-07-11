import type {
  DesktopMenuAction,
  DesktopMenuEvent,
  DesktopProjectBundle,
} from "../shared/desktopBridgeTypes";
import { runCurrentProjectEntryMenuFailureAction } from "./currentProjectApplyController";

type MaybePromise<T> = T | Promise<T>;

export interface DesktopMenuEventActionHandlers {
  createProject: () => MaybePromise<unknown>;
  openProject: () => MaybePromise<unknown>;
  openRecentProject: (projectPath: string) => MaybePromise<unknown>;
  beginProjectOpen: () => number;
  openProjectBundle: (
    projectBundle: DesktopProjectBundle,
    sequence: number,
  ) => MaybePromise<unknown>;
  handleProjectOpenFailed: (
    errorMessage: string | null | undefined,
  ) => MaybePromise<unknown>;
  repairProjectThumbnails: () => MaybePromise<unknown>;
  inspectProjectHealth: () => MaybePromise<unknown>;
  cleanProjectCache: () => MaybePromise<unknown>;
  importImages: () => MaybePromise<unknown>;
  openGenerateDialog: () => MaybePromise<unknown>;
  focusProviderSettings: () => void;
  openAppSettings: () => void;
  setAgentBridgeEnabled: (enabled: boolean) => MaybePromise<unknown>;
  revealProject: () => MaybePromise<unknown>;
  showAbout: () => void;
}

export interface DesktopMenuEventRendererActionsInput
  extends Omit<DesktopMenuEventActionHandlers, "handleProjectOpenFailed"> {
  getLatestOpenRequestId: () => number;
  setLatestOpenRequestId: (requestId: number) => void;
  projectOpenFailedFallbackMessage: string;
  setProjectError: (message: string) => void;
  clearProjectNotice: () => void;
}

export interface DesktopMenuEventRendererActions {
  handle(event: DesktopMenuEvent): DesktopMenuEventActionResult;
}

export type DesktopMenuEventActionResult =
  | {
      status: "handled";
      action: DesktopMenuAction;
    }
  | {
      status:
        | "ignored-missing-project-path"
        | "ignored-missing-project-bundle"
        | "ignored-stale-project-open"
        | "ignored-unknown-action";
      action: DesktopMenuAction;
    };

const isStaleProjectOpenEvent = ({
  event,
  latestOpenRequestId,
}: {
  event: DesktopMenuEvent;
  latestOpenRequestId: number;
}) =>
  event.openRequestId !== undefined &&
  event.openRequestId < latestOpenRequestId;

const applyLatestOpenRequestId = ({
  event,
  setLatestOpenRequestId,
}: {
  event: DesktopMenuEvent;
  setLatestOpenRequestId: (requestId: number) => void;
}) => {
  if (event.openRequestId !== undefined) {
    setLatestOpenRequestId(event.openRequestId);
  }
};

export const runDesktopMenuEventAction = ({
  event,
  latestOpenRequestId,
  setLatestOpenRequestId,
  handlers,
}: {
  event: DesktopMenuEvent;
  latestOpenRequestId: number;
  setLatestOpenRequestId: (requestId: number) => void;
  handlers: DesktopMenuEventActionHandlers;
}): DesktopMenuEventActionResult => {
  switch (event.action) {
    case "new-project":
      void handlers.createProject();
      return { status: "handled", action: event.action };
    case "open-project":
      void handlers.openProject();
      return { status: "handled", action: event.action };
    case "open-recent-project":
      if (!event.projectPath) {
        return {
          status: "ignored-missing-project-path",
          action: event.action,
        };
      }
      void handlers.openRecentProject(event.projectPath);
      return { status: "handled", action: event.action };
    case "project-opened":
      if (!event.projectBundle) {
        return {
          status: "ignored-missing-project-bundle",
          action: event.action,
        };
      }
      if (isStaleProjectOpenEvent({ event, latestOpenRequestId })) {
        return {
          status: "ignored-stale-project-open",
          action: event.action,
        };
      }
      applyLatestOpenRequestId({ event, setLatestOpenRequestId });
      void handlers.openProjectBundle(
        event.projectBundle,
        handlers.beginProjectOpen(),
      );
      return { status: "handled", action: event.action };
    case "project-open-failed":
      if (isStaleProjectOpenEvent({ event, latestOpenRequestId })) {
        return {
          status: "ignored-stale-project-open",
          action: event.action,
        };
      }
      applyLatestOpenRequestId({ event, setLatestOpenRequestId });
      void handlers.handleProjectOpenFailed(event.errorMessage);
      return { status: "handled", action: event.action };
    case "repair-project-thumbnails":
      void handlers.repairProjectThumbnails();
      return { status: "handled", action: event.action };
    case "inspect-project-health":
      void handlers.inspectProjectHealth();
      return { status: "handled", action: event.action };
    case "clean-project-cache":
      void handlers.cleanProjectCache();
      return { status: "handled", action: event.action };
    case "import-images":
      void handlers.importImages();
      return { status: "handled", action: event.action };
    case "generate-image":
      void handlers.openGenerateDialog();
      return { status: "handled", action: event.action };
    case "provider-settings":
      handlers.focusProviderSettings();
      return { status: "handled", action: event.action };
    case "app-settings":
      handlers.openAppSettings();
      return { status: "handled", action: event.action };
    case "set-agent-bridge-enabled":
      void handlers.setAgentBridgeEnabled(event.enabled === true);
      return { status: "handled", action: event.action };
    case "reveal-project":
      void handlers.revealProject();
      return { status: "handled", action: event.action };
    case "show-about":
      handlers.showAbout();
      return { status: "handled", action: event.action };
    default:
      return { status: "ignored-unknown-action", action: event.action };
  }
};

export const createDesktopMenuEventRendererActions = ({
  getLatestOpenRequestId,
  setLatestOpenRequestId,
  projectOpenFailedFallbackMessage,
  setProjectError,
  clearProjectNotice,
  ...handlers
}: DesktopMenuEventRendererActionsInput): DesktopMenuEventRendererActions => ({
  handle: (event) =>
    runDesktopMenuEventAction({
      event,
      latestOpenRequestId: getLatestOpenRequestId(),
      setLatestOpenRequestId,
      handlers: {
        ...handlers,
        handleProjectOpenFailed: (errorMessage) =>
          runCurrentProjectEntryMenuFailureAction({
            errorMessage,
            fallbackMessage: projectOpenFailedFallbackMessage,
            setProjectError,
            clearProjectNotice,
          }),
      },
    }),
});
