import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
} from "../../shared/acpTypes";
import type { AcpRunLogSurface } from "./agentConversationMode";
import { mergeAcpConversationEntries } from "./acpTaskUiState";

export interface OpenAcpRunLogStateInput {
  taskId: string;
  openInConversationDock?: boolean;
  hasCurrentProject: boolean;
  hasInitialData: boolean;
}

export interface OpenAcpRunLogState {
  taskId: string;
  runLogSurface: AcpRunLogSurface;
  appSettingsOpen: false;
  runLogDialogOpen: boolean;
  chatDockOpen: boolean;
  runLogDetail: null;
  runLogError: null;
  runLogRawOpen: false;
}

export interface CloseAcpRunLogState {
  runLogTaskId: null;
  runLogSurface: AcpRunLogSurface | null;
  clearRunLogDetail: boolean;
  runLogDialogOpen: false;
}

export interface AcpRunLogDetailLoadSuccessState {
  runLogDetail: AcpRunLogDetail;
  conversationEntries: AcpRunLogEntry[] | null;
  runLogError: null;
}

export interface AcpRunLogDetailLoadFailureState {
  runLogError: string;
}

export const buildOpenAcpRunLogState = ({
  taskId,
  openInConversationDock = false,
  hasCurrentProject,
  hasInitialData,
}: OpenAcpRunLogStateInput): OpenAcpRunLogState => {
  const useConversationDock =
    openInConversationDock && hasCurrentProject && hasInitialData;

  return {
    taskId,
    runLogSurface: useConversationDock ? "conversation" : "record",
    appSettingsOpen: false,
    runLogDialogOpen: !useConversationDock,
    chatDockOpen: useConversationDock,
    runLogDetail: null,
    runLogError: null,
    runLogRawOpen: false,
  };
};

export const buildCloseAcpRunLogState = (
  currentSurface: AcpRunLogSurface | null,
): CloseAcpRunLogState => {
  const shouldClearRecordSurface = currentSurface === "record";

  return {
    runLogTaskId: null,
    runLogSurface: shouldClearRecordSurface ? null : currentSurface,
    clearRunLogDetail: shouldClearRecordSurface,
    runLogDialogOpen: false,
  };
};

export const buildAcpRunLogDetailLoadSuccessState = ({
  detail,
  surface,
  currentConversationEntries,
}: {
  detail: AcpRunLogDetail;
  surface: AcpRunLogSurface | null;
  currentConversationEntries: AcpRunLogEntry[];
}): AcpRunLogDetailLoadSuccessState => ({
  runLogDetail: detail,
  conversationEntries:
    surface === "conversation"
      ? mergeAcpConversationEntries(currentConversationEntries, detail.entries)
      : null,
  runLogError: null,
});

export const buildAcpRunLogDetailLoadFailureState = (
  error: string,
): AcpRunLogDetailLoadFailureState => ({
  runLogError: error,
});
