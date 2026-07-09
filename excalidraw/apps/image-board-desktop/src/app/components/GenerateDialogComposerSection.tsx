import type {
  Dispatch,
  KeyboardEvent,
  Ref,
  SetStateAction,
  SyntheticEvent,
} from "react";

import { GenerateComposerTaskStatus } from "./GenerateComposerTaskStatus";
import { GenerateDialogComposerActionsSection } from "./GenerateDialogComposerActionsSection";
import { GenerateDialogComposerContentSection } from "./GenerateDialogComposerContentSection";
import type { InlinePromptEditorHandle } from "./InlinePromptEditor";

import type {
  GenerateComposerConfig,
  GenerateComposerMode,
} from "../agent/useGenerateComposerController";
import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferenceItemPayload,
  GenerationReferencePayload,
  GenerationSource,
} from "../../shared/providerTypes";

type GenerateComposerAgentTaskStatus = GenerateComposerConfig["agentTaskStatus"];
type GenerateComposerAgentTaskEvent = NonNullable<
  NonNullable<GenerateComposerAgentTaskStatus>["events"]
>[number];

interface GenerateDialogComposerSectionProps {
  classNames: readonly string[];
  showComposerTaskBar: boolean;
  showComposerModeSwitch: boolean;
  showComposerModeIndicator: boolean;
  composerModeOptions: readonly GenerateComposerMode[];
  effectiveComposerMode: GenerateComposerMode;
  isAgentOperationMode: boolean;
  isPromptComposerMode: boolean;
  agentSelectionItems: readonly GenerationReferenceItemPayload[];
  promptEditorRef: Ref<InlinePromptEditorHandle>;
  promptEditorParts: GenerationPromptPart[];
  promptReferences: GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  promptEditorResetKey: number;
  referenceLimitMessage: string | null;
  promptLibraryOpen: boolean;
  advancedOpen: boolean;
  canSubmit: boolean;
  loading: boolean;
  showGenerationSourceSwitch: boolean;
  agentGenerationSelectable: boolean;
  effectiveGenerationSource: GenerationSource;
  generationSourceLabel: string;
  agentGenerationUnavailableMessage?: string;
  generationSourceResetKey: string | number;
  agentTaskStatus: GenerateComposerAgentTaskStatus;
  agentTaskEvents: readonly GenerateComposerAgentTaskEvent[];
  onSelectComposerMode: (
    mode: GenerateComposerMode,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onSelectGenerationSource: (
    source: GenerationSource,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
  onCancelGeneration?: (event: SyntheticEvent<HTMLElement>) => void;
  onCommitPendingReference: () => void | Promise<unknown>;
  onPromptChange: (parts: GenerationPromptPart[]) => void;
  onPromptKeyPressCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyUpCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  onPromptKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onOpenAgentRunLog?: (taskId: string) => void;
  setPromptLibraryOpen: Dispatch<SetStateAction<boolean>>;
  setAdvancedOpen: Dispatch<SetStateAction<boolean>>;
}

export const GenerateDialogComposerSection = ({
  classNames,
  showComposerTaskBar,
  showComposerModeSwitch,
  showComposerModeIndicator,
  composerModeOptions,
  effectiveComposerMode,
  isAgentOperationMode,
  isPromptComposerMode,
  agentSelectionItems,
  promptEditorRef,
  promptEditorParts,
  promptReferences,
  pendingReference,
  promptEditorResetKey,
  referenceLimitMessage,
  promptLibraryOpen,
  advancedOpen,
  canSubmit,
  loading,
  showGenerationSourceSwitch,
  agentGenerationSelectable,
  effectiveGenerationSource,
  generationSourceLabel,
  agentGenerationUnavailableMessage,
  generationSourceResetKey,
  agentTaskStatus,
  agentTaskEvents,
  onSelectComposerMode,
  onSelectGenerationSource,
  onStopInputEvent,
  onCancelGeneration,
  onCommitPendingReference,
  onPromptChange,
  onPromptKeyPressCapture,
  onPromptKeyUpCapture,
  onPromptKeyDown,
  onOpenAgentRunLog,
  setPromptLibraryOpen,
  setAdvancedOpen,
}: GenerateDialogComposerSectionProps) => (
  <div className={classNames.join(" ")}>
    <GenerateDialogComposerContentSection
      showComposerTaskBar={showComposerTaskBar}
      showComposerModeSwitch={showComposerModeSwitch}
      showComposerModeIndicator={showComposerModeIndicator}
      composerModeOptions={composerModeOptions}
      effectiveComposerMode={effectiveComposerMode}
      isAgentOperationMode={isAgentOperationMode}
      agentSelectionItems={agentSelectionItems}
      promptEditorRef={promptEditorRef}
      promptEditorParts={promptEditorParts}
      promptReferences={promptReferences}
      pendingReference={pendingReference}
      promptEditorResetKey={promptEditorResetKey}
      referenceLimitMessage={referenceLimitMessage}
      onSelectComposerMode={onSelectComposerMode}
      onStopInputEvent={onStopInputEvent}
      onCommitPendingReference={onCommitPendingReference}
      onPromptChange={onPromptChange}
      onPromptKeyPressCapture={onPromptKeyPressCapture}
      onPromptKeyUpCapture={onPromptKeyUpCapture}
      onPromptKeyDown={onPromptKeyDown}
    />
    <GenerateDialogComposerActionsSection
      showAgentSourceSelect={isAgentOperationMode}
      showPromptComposerActions={isPromptComposerMode}
      showPromptTools={effectiveComposerMode === "direct"}
      promptLibraryOpen={promptLibraryOpen}
      advancedOpen={advancedOpen}
      canSubmit={canSubmit}
      loading={loading}
      showGenerationSourceSwitch={showGenerationSourceSwitch}
      agentGenerationSelectable={agentGenerationSelectable}
      effectiveGenerationSource={effectiveGenerationSource}
      generationSourceLabel={generationSourceLabel}
      agentGenerationUnavailableMessage={agentGenerationUnavailableMessage}
      generationSourceResetKey={generationSourceResetKey}
      onSelectGenerationSource={onSelectGenerationSource}
      onStopInputEvent={onStopInputEvent}
      onCancelGeneration={onCancelGeneration}
      setPromptLibraryOpen={setPromptLibraryOpen}
      setAdvancedOpen={setAdvancedOpen}
    />
    <GenerateComposerTaskStatus
      status={agentTaskStatus}
      events={agentTaskEvents}
      onOpenAgentRunLog={onOpenAgentRunLog}
      onStopInputEvent={onStopInputEvent}
    />
  </div>
);
