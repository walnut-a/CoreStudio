import type {
  GenerationRequest,
  GenerationSource,
} from "../../shared/providerTypes";
import type {
  GenerateComposerMode,
  GenerateComposerModeSwitchVariant,
} from "./useGenerateComposerController";
import { getGenerationSourceForComposerMode } from "./useGenerateComposerController";

interface BuildGenerateComposerModeSelectionPlanInput {
  modeSwitchVariant: GenerateComposerModeSwitchVariant;
  mode: GenerateComposerMode;
}

interface GenerateComposerModeSelectionPlan {
  mode: GenerateComposerMode;
  generationSource: GenerationSource | null;
}

interface BuildGenerateComposerSourceSelectionPlanInput {
  source: GenerationSource;
  agentGenerationSelectable: boolean;
}

interface GenerateComposerSourceSelectionPlan {
  accepted: boolean;
  generationSource: GenerationSource | null;
}

type GenerationSourceSetter = (source: GenerationSource) => void;

type GenerateRequestUpdater = (
  updater: (current: GenerationRequest) => GenerationRequest,
) => GenerationRequest;

const applyGenerateComposerGenerationSource = ({
  source,
  setGenerationSource,
  updateRequest,
}: {
  source: GenerationSource;
  setGenerationSource: GenerationSourceSetter;
  updateRequest: GenerateRequestUpdater;
}) => {
  setGenerationSource(source);
  updateRequest((current) => ({
    ...current,
    generationSource: source,
  }));
};

export const buildGenerateComposerModeSelectionPlan = ({
  modeSwitchVariant,
  mode,
}: BuildGenerateComposerModeSelectionPlanInput): GenerateComposerModeSelectionPlan => ({
  mode,
  generationSource: getGenerationSourceForComposerMode(
    modeSwitchVariant,
    mode,
  ),
});

export const buildGenerateComposerSourceSelectionPlan = ({
  source,
  agentGenerationSelectable,
}: BuildGenerateComposerSourceSelectionPlanInput): GenerateComposerSourceSelectionPlan => {
  if (source === "agent" && !agentGenerationSelectable) {
    return {
      accepted: false,
      generationSource: null,
    };
  }

  return {
    accepted: true,
    generationSource: source,
  };
};

export const applyGenerateComposerModeSelection = ({
  modeSwitchVariant,
  mode,
  setComposerMode,
  setGenerationSource,
  updateRequest,
}: BuildGenerateComposerModeSelectionPlanInput & {
  setComposerMode: (mode: GenerateComposerMode) => void;
  setGenerationSource: GenerationSourceSetter;
  updateRequest: GenerateRequestUpdater;
}) => {
  const plan = buildGenerateComposerModeSelectionPlan({
    modeSwitchVariant,
    mode,
  });
  setComposerMode(plan.mode);
  if (plan.generationSource) {
    applyGenerateComposerGenerationSource({
      source: plan.generationSource,
      setGenerationSource,
      updateRequest,
    });
  }
  return plan;
};

export const applyGenerateComposerSourceSelection = ({
  source,
  agentGenerationSelectable,
  setGenerationSource,
  updateRequest,
}: BuildGenerateComposerSourceSelectionPlanInput & {
  setGenerationSource: GenerationSourceSetter;
  updateRequest: GenerateRequestUpdater;
}) => {
  const plan = buildGenerateComposerSourceSelectionPlan({
    source,
    agentGenerationSelectable,
  });
  if (plan.accepted && plan.generationSource) {
    applyGenerateComposerGenerationSource({
      source: plan.generationSource,
      setGenerationSource,
      updateRequest,
    });
  }
  return plan;
};

export const createGenerateComposerModeSelectionHandlers = <TEvent>({
  modeSwitchVariant,
  agentGenerationSelectable,
  stopInputEventPropagation,
  setComposerMode,
  setGenerationSource,
  updateRequest,
}: {
  modeSwitchVariant: GenerateComposerModeSwitchVariant;
  agentGenerationSelectable: boolean;
  stopInputEventPropagation: (event: TEvent) => void;
  setComposerMode: (mode: GenerateComposerMode) => void;
  setGenerationSource: GenerationSourceSetter;
  updateRequest: GenerateRequestUpdater;
}) => ({
  selectComposerMode: (mode: GenerateComposerMode, event: TEvent) => {
    stopInputEventPropagation(event);
    return applyGenerateComposerModeSelection({
      modeSwitchVariant,
      mode,
      setComposerMode,
      setGenerationSource,
      updateRequest,
    });
  },
  selectGenerationSource: (source: GenerationSource, event: TEvent) => {
    stopInputEventPropagation(event);
    return applyGenerateComposerSourceSelection({
      source,
      agentGenerationSelectable,
      setGenerationSource,
      updateRequest,
    });
  },
});
