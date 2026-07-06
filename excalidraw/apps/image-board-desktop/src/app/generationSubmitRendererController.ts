import type {
  DesktopProjectBundle,
  PublicProviderSettings,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { buildGenerationExecutionPlan } from "./generationRequestState";
import { buildGenerationErrorDisplayRendererRequest } from "./generationRequestRendererController";

export type GenerationSubmitRendererActionResult =
  | { status: "skipped-no-project" }
  | { status: "acp-agent-started" }
  | { status: "acp-agent-failed" }
  | { status: "builtin-started" }
  | { status: "builtin-failed" };

export type GenerationSubmitRendererOptions<
  PlacementViewport = unknown,
  Scene = unknown,
> = {
  expectedProjectPath?: string;
  placementViewport?: PlacementViewport | null;
  referenceScene?: Scene | null;
  rejectOnError?: boolean;
};

export type GenerationSubmitRendererActionsInput<
  PlacementViewport = unknown,
  Scene = unknown,
> = {
  getProject: () => DesktopProjectBundle | null;
  getProviderSettings: () => PublicProviderSettings | null;
  clearGenerationError: () => void;
  assertProjectActive: (expectedProjectPath?: string) => void;
  startAcpAgentGeneration: (request: GenerationRequest) => Promise<unknown>;
  startBuiltinGeneration: (
    request: GenerationRequest,
    project: DesktopProjectBundle,
    options: GenerationSubmitRendererOptions<PlacementViewport, Scene>,
  ) => Promise<{ completion?: Promise<unknown> }>;
  showGenerationError: (
    request: GenerationRequest,
    error: unknown,
    fallbackMessage?: string,
  ) => unknown;
};

export const runGenerationSubmitRendererAction = async ({
  request,
  project,
  providerSettings,
  rejectOnError,
  clearGenerationError,
  assertProjectActive,
  startAcpAgentGeneration,
  startBuiltinGeneration,
  showGenerationError,
}: {
  request: GenerationRequest;
  project: DesktopProjectBundle | null;
  providerSettings: PublicProviderSettings | null;
  rejectOnError: boolean;
  clearGenerationError: () => void;
  assertProjectActive: () => void;
  startAcpAgentGeneration: (request: GenerationRequest) => Promise<unknown>;
  startBuiltinGeneration: (
    request: GenerationRequest,
    project: DesktopProjectBundle,
  ) => Promise<{ completion?: Promise<unknown> }>;
  showGenerationError: (
    request: GenerationRequest,
    error: unknown,
    fallbackMessage?: string,
  ) => unknown;
}): Promise<GenerationSubmitRendererActionResult> => {
  if (!project) {
    return { status: "skipped-no-project" };
  }

  assertProjectActive();
  clearGenerationError();

  const executionPlan = buildGenerationExecutionPlan(request);
  if (executionPlan.kind === "start-acp-agent-task") {
    try {
      await startAcpAgentGeneration(request);
      return { status: "acp-agent-started" };
    } catch (error) {
      showGenerationError(request, error, "ACP Agent 任务启动失败。");
      if (rejectOnError) {
        throw error;
      }
      return { status: "acp-agent-failed" };
    }
  }

  try {
    const result = await startBuiltinGeneration(request, project);
    void result.completion;
    return { status: "builtin-started" };
  } catch (error) {
    showGenerationError(
      buildGenerationErrorDisplayRendererRequest({
        request,
        providerSettings,
      }),
      error,
    );
    if (rejectOnError) {
      throw error;
    }
    return { status: "builtin-failed" };
  }
};

export const createGenerationSubmitRendererActions = <
  PlacementViewport = unknown,
  Scene = unknown,
>({
  getProject,
  getProviderSettings,
  clearGenerationError,
  assertProjectActive,
  startAcpAgentGeneration,
  startBuiltinGeneration,
  showGenerationError,
}: GenerationSubmitRendererActionsInput<PlacementViewport, Scene>) => {
  const submit = (
    request: GenerationRequest,
    _keepOpen: boolean,
    options: GenerationSubmitRendererOptions<PlacementViewport, Scene> = {},
  ) => {
    const normalizedOptions = {
      ...options,
      rejectOnError: options.rejectOnError,
    };

    return runGenerationSubmitRendererAction({
      request,
      project: getProject(),
      providerSettings: getProviderSettings(),
      rejectOnError: Boolean(normalizedOptions.rejectOnError),
      clearGenerationError,
      assertProjectActive: () =>
        assertProjectActive(normalizedOptions.expectedProjectPath),
      startAcpAgentGeneration,
      startBuiltinGeneration: (request, project) =>
        startBuiltinGeneration(request, project, normalizedOptions),
      showGenerationError,
    });
  };

  return { submit };
};
