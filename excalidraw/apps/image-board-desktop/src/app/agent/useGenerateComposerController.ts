import { useEffect, useState } from "react";

import type { AcpTaskStatus } from "../../shared/acpTypes";
import type { GenerationSource } from "../../shared/providerTypes";

export const GENERATION_MODE_LABEL = "生成方式";
export const DIRECT_INPUT_LABEL = "直接输入";
export const AGENT_OPERATION_LABEL = "Agent 操作";
export const BUILTIN_GENERATION_LABEL = "直接生成";
export const AGENT_GENERATION_LABEL = "ACP Agent";

export type GenerateComposerMode = "direct" | "agent" | "acp";
export type GenerateComposerModeSwitchVariant = "agent-operation" | "acp-agent";

export interface GenerateComposerConfig {
  defaultMode?: GenerateComposerMode;
  showModeSwitch?: boolean;
  modeSwitchVariant?: GenerateComposerModeSwitchVariant;
  showModeIndicator?: boolean;
  defaultGenerationSource?: GenerationSource;
  showGenerationSourceSwitch?: boolean;
  agentGenerationAvailable?: boolean;
  agentGenerationUnavailableMessage?: string;
  agentTaskStatus?: {
    taskId?: string;
    status: AcpTaskStatus;
    message: string;
    transcript?: string;
    events?: Array<{
      id: string;
      title: string;
      detail?: string;
      tone?: "neutral" | "success" | "danger";
    }>;
    logPath?: string;
  } | null;
}

export interface GenerateComposerViewModel {
  showComposerModeSwitch: boolean;
  modeSwitchVariant: GenerateComposerModeSwitchVariant;
  composerModeOptions: readonly GenerateComposerMode[];
  defaultComposerMode: GenerateComposerMode;
  showComposerModeIndicator: boolean;
  composerMode: GenerateComposerMode;
  effectiveComposerMode: GenerateComposerMode;
  defaultGenerationSource: GenerationSource;
  showGenerationSourceSwitch: boolean;
  generationSource: GenerationSource;
  selectedGenerationSource: GenerationSource;
  isAgentOperationMode: boolean;
  isAcpAgentMode: boolean;
  isPromptComposerMode: boolean;
  agentGenerationAvailable: boolean;
  agentGenerationUnavailableMessage?: string;
  agentTaskStatus: GenerateComposerConfig["agentTaskStatus"];
  agentTaskEvents: NonNullable<
    NonNullable<GenerateComposerConfig["agentTaskStatus"]>["events"]
  >;
  agentGenerationSelectable: boolean;
  effectiveGenerationSource: GenerationSource;
  generationSourceLabel: string;
}

interface GenerateComposerDefaults {
  showComposerModeSwitch: boolean;
  modeSwitchVariant: GenerateComposerModeSwitchVariant;
  composerModeOptions: readonly GenerateComposerMode[];
  defaultComposerMode: GenerateComposerMode;
  showComposerModeIndicator: boolean;
  defaultGenerationSource: GenerationSource;
  showGenerationSourceSwitch: boolean;
}

interface BuildGenerateComposerViewModelInput {
  composerConfig?: GenerateComposerConfig;
  initialGenerationSource?: GenerationSource;
  composerMode?: GenerateComposerMode;
  generationSource?: GenerationSource;
}

interface GetGenerateComposerCanSubmitInput {
  effectiveGenerationSource: GenerationSource;
  hasSubmitContent: boolean;
  agentGenerationAvailable: boolean;
  builtInGenerationConfigured: boolean;
  referenceLimitExceeded: boolean;
}

interface UseGenerateComposerControllerInput {
  composerConfig?: GenerateComposerConfig;
  initialGenerationSource?: GenerationSource;
  open: boolean;
}

export const normalizeComposerMode = (
  mode: GenerateComposerConfig["defaultMode"],
): GenerateComposerMode =>
  mode === "agent" || mode === "acp" ? mode : "direct";

export const getComposerModeLabel = (mode: GenerateComposerMode) => {
  if (mode === "agent") {
    return AGENT_OPERATION_LABEL;
  }
  if (mode === "acp") {
    return AGENT_GENERATION_LABEL;
  }
  return DIRECT_INPUT_LABEL;
};

export const normalizeGenerationSource = (
  source: GenerateComposerConfig["defaultGenerationSource"],
): GenerationSource => (source === "agent" ? "agent" : "builtin");

export const getGenerationSourceForComposerMode = (
  modeSwitchVariant: GenerateComposerModeSwitchVariant,
  mode: GenerateComposerMode,
): GenerationSource | null => {
  if (modeSwitchVariant !== "acp-agent") {
    return null;
  }

  return mode === "acp" ? "agent" : "builtin";
};

export const getGenerateComposerDefaults = (
  composerConfig?: GenerateComposerConfig,
  initialGenerationSource?: GenerationSource,
): GenerateComposerDefaults => {
  const showComposerModeSwitch = Boolean(composerConfig?.showModeSwitch);
  const modeSwitchVariant =
    composerConfig?.modeSwitchVariant ?? "agent-operation";
  const composerModeOptions: readonly GenerateComposerMode[] =
    modeSwitchVariant === "acp-agent"
      ? (["direct", "acp"] as const)
      : (["agent", "direct"] as const);
  const requestedDefaultComposerMode = normalizeComposerMode(
    composerConfig?.defaultMode,
  );
  const defaultComposerMode =
    showComposerModeSwitch &&
    !composerModeOptions.includes(requestedDefaultComposerMode)
      ? composerModeOptions[0]
      : requestedDefaultComposerMode;
  const defaultGenerationSource = normalizeGenerationSource(
    composerConfig?.defaultGenerationSource ?? initialGenerationSource,
  );

  return {
    showComposerModeSwitch,
    modeSwitchVariant,
    composerModeOptions,
    defaultComposerMode,
    showComposerModeIndicator: Boolean(composerConfig?.showModeIndicator),
    defaultGenerationSource,
    showGenerationSourceSwitch: Boolean(
      composerConfig?.showGenerationSourceSwitch,
    ),
  };
};

export const buildGenerateComposerViewModel = ({
  composerConfig,
  initialGenerationSource,
  composerMode,
  generationSource,
}: BuildGenerateComposerViewModelInput): GenerateComposerViewModel => {
  const defaults = getGenerateComposerDefaults(
    composerConfig,
    initialGenerationSource,
  );
  const currentComposerMode = composerMode ?? defaults.defaultComposerMode;
  const effectiveComposerMode = defaults.showComposerModeSwitch
    ? currentComposerMode
    : defaults.defaultComposerMode;
  const currentGenerationSource =
    generationSource ?? defaults.defaultGenerationSource;
  const selectedGenerationSource = defaults.showGenerationSourceSwitch
    ? currentGenerationSource
    : defaults.defaultGenerationSource;
  const isAgentOperationMode = effectiveComposerMode === "agent";
  const isAcpAgentMode = effectiveComposerMode === "acp";
  const agentGenerationAvailable =
    composerConfig?.agentGenerationAvailable ?? isAgentOperationMode;
  const agentGenerationSelectable =
    isAgentOperationMode || isAcpAgentMode || agentGenerationAvailable;
  const effectiveGenerationSource = isAcpAgentMode
    ? "agent"
    : selectedGenerationSource === "agent" && !agentGenerationSelectable
      ? "builtin"
      : selectedGenerationSource;

  return {
    ...defaults,
    composerMode: currentComposerMode,
    effectiveComposerMode,
    generationSource: currentGenerationSource,
    selectedGenerationSource,
    isAgentOperationMode,
    isAcpAgentMode,
    isPromptComposerMode: !isAgentOperationMode,
    agentGenerationAvailable,
    agentGenerationUnavailableMessage:
      composerConfig?.agentGenerationUnavailableMessage,
    agentTaskStatus: composerConfig?.agentTaskStatus ?? null,
    agentTaskEvents: composerConfig?.agentTaskStatus?.events ?? [],
    agentGenerationSelectable,
    effectiveGenerationSource,
    generationSourceLabel:
      effectiveGenerationSource === "agent"
        ? AGENT_GENERATION_LABEL
        : BUILTIN_GENERATION_LABEL,
  };
};

export const getGenerateComposerCanSubmit = ({
  effectiveGenerationSource,
  hasSubmitContent,
  agentGenerationAvailable,
  builtInGenerationConfigured,
  referenceLimitExceeded,
}: GetGenerateComposerCanSubmitInput) =>
  Boolean(
    effectiveGenerationSource === "agent"
      ? hasSubmitContent && agentGenerationAvailable
      : hasSubmitContent &&
          builtInGenerationConfigured &&
          !referenceLimitExceeded,
  );

export const useGenerateComposerController = ({
  composerConfig,
  initialGenerationSource,
  open,
}: UseGenerateComposerControllerInput) => {
  const defaults = getGenerateComposerDefaults(
    composerConfig,
    initialGenerationSource,
  );
  const [composerMode, setComposerMode] = useState<GenerateComposerMode>(
    defaults.defaultComposerMode,
  );
  const [generationSource, setGenerationSource] = useState<GenerationSource>(
    defaults.defaultGenerationSource,
  );

  useEffect(() => {
    setComposerMode(defaults.defaultComposerMode);
  }, [defaults.defaultComposerMode, open]);

  useEffect(() => {
    setGenerationSource(defaults.defaultGenerationSource);
  }, [defaults.defaultGenerationSource, open]);

  return {
    ...buildGenerateComposerViewModel({
      composerConfig,
      initialGenerationSource,
      composerMode,
      generationSource,
    }),
    setComposerMode,
    setGenerationSource,
  };
};
