import type { GenerationSource } from "../../shared/providerTypes";

export type AcpRunLogSurface = "conversation" | "record";
export type GenerationSidebarMode = "direct" | "agent";

export const getConversationRunLogDetail = <T>(
  surface: AcpRunLogSurface | null,
  detail: T | null,
): T | null => (surface === "conversation" ? detail : null);

export const getGenerationSidebarMode = ({
  acpExperimentalEnabled,
  generationSource,
  acpRunLogSurface,
  acpAgentTaskRunning,
}: {
  acpExperimentalEnabled: boolean;
  generationSource: GenerationSource;
  acpRunLogSurface: AcpRunLogSurface | null;
  acpAgentTaskRunning: boolean;
}): GenerationSidebarMode => {
  if (!acpExperimentalEnabled) {
    return "direct";
  }

  return generationSource === "agent" ||
    acpRunLogSurface === "conversation" ||
    acpAgentTaskRunning
    ? "agent"
    : "direct";
};

export interface BuildAgentConversationSurfaceStateInput<
  RunLogDetail,
  ErrorValue,
> {
  acpExperimentalEnabled: boolean;
  generationSource: GenerationSource;
  acpRunLogSurface: AcpRunLogSurface | null;
  acpAgentTaskRunning: boolean;
  runLogDetail: RunLogDetail | null;
  error: ErrorValue | null;
}

export interface AgentConversationSurfaceState<RunLogDetail, ErrorValue> {
  mode: GenerationSidebarMode;
  runLogDetail: RunLogDetail | null;
  error: ErrorValue | null;
}

export interface DirectGenerationRecordsSurfaceState {
  runLogSurface: AcpRunLogSurface | null;
  shouldUpdateSurface: boolean;
}

export const buildAgentConversationSurfaceState = <
  RunLogDetail,
  ErrorValue,
>({
  acpExperimentalEnabled,
  generationSource,
  acpRunLogSurface,
  acpAgentTaskRunning,
  runLogDetail,
  error,
}: BuildAgentConversationSurfaceStateInput<
  RunLogDetail,
  ErrorValue
>): AgentConversationSurfaceState<RunLogDetail, ErrorValue> => ({
  mode: getGenerationSidebarMode({
    acpExperimentalEnabled,
    generationSource,
    acpRunLogSurface,
    acpAgentTaskRunning,
  }),
  runLogDetail: getConversationRunLogDetail(acpRunLogSurface, runLogDetail),
  error: getConversationRunLogDetail(acpRunLogSurface, error),
});

export const buildDirectGenerationRecordsSurfaceState = (
  currentSurface: AcpRunLogSurface | null,
): DirectGenerationRecordsSurfaceState => {
  if (currentSurface !== "conversation") {
    return {
      runLogSurface: currentSurface,
      shouldUpdateSurface: false,
    };
  }

  return {
    runLogSurface: null,
    shouldUpdateSurface: true,
  };
};
