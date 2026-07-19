import type {
  DesktopProjectBundle,
  PublicProviderSettings,
} from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { buildGenerationErrorDisplayRendererRequest } from "./generationRequestRendererController";

export type GenerationSubmitRendererActionResult =
  | { status: "skipped-no-project" }
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
  startBuiltinGeneration,
  showGenerationError,
}: {
  request: GenerationRequest;
  project: DesktopProjectBundle | null;
  providerSettings: PublicProviderSettings | null;
  rejectOnError: boolean;
  clearGenerationError: () => void;
  assertProjectActive: () => void;
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

  const builtinRequest: GenerationRequest = {
    ...request,
    generationSource: "builtin",
  };

  try {
    const result = await startBuiltinGeneration(builtinRequest, project);
    void result.completion;
    return { status: "builtin-started" };
  } catch (error) {
    showGenerationError(
      buildGenerationErrorDisplayRendererRequest({
        request: builtinRequest,
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
      startBuiltinGeneration: (request, project) =>
        startBuiltinGeneration(request, project, normalizedOptions),
      showGenerationError,
    });
  };

  return { submit };
};
