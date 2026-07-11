import {
  useEffect,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";

import { chevronDownIcon } from "./CoreStudioIcons";
import {
  AGENT_GENERATION_LABEL,
  BUILTIN_GENERATION_LABEL,
  GENERATION_MODE_LABEL,
  getComposerModeLabel,
  type GenerateComposerMode,
} from "../agent/useGenerateComposerController";

import type { GenerationSource } from "../../shared/providerTypes";

interface GenerateComposerModeBarProps {
  showModeSwitch: boolean;
  showModeIndicator: boolean;
  composerModeOptions: readonly GenerateComposerMode[];
  effectiveComposerMode: GenerateComposerMode;
  onSelectMode: (
    mode: GenerateComposerMode,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

interface GenerateComposerSourceSelectProps {
  visible: boolean;
  selectable: boolean;
  effectiveGenerationSource: GenerationSource;
  label: string;
  unavailableMessage?: string;
  resetKey: string | number;
  onSelectSource: (
    source: GenerationSource,
    event: SyntheticEvent<HTMLElement>,
  ) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateComposerModeBar = ({
  showModeSwitch,
  showModeIndicator,
  composerModeOptions,
  effectiveComposerMode,
  onSelectMode,
  onStopInputEvent,
}: GenerateComposerModeBarProps) => {
  if (!showModeSwitch && !showModeIndicator) {
    return null;
  }

  return (
    <div
      className="generate-composer__taskbar"
      role="toolbar"
      aria-label="生成任务状态"
      onMouseDown={onStopInputEvent}
    >
      {showModeSwitch ? (
        <div
          className="generate-composer__mode-switch"
          role="tablist"
          aria-label="输入模式"
        >
          {composerModeOptions.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={effectiveComposerMode === mode}
              className="generate-composer__mode-tab"
              onMouseDown={onStopInputEvent}
              onClick={(event) => {
                onSelectMode(mode, event);
              }}
            >
              {getComposerModeLabel(mode)}
            </button>
          ))}
        </div>
      ) : showModeIndicator ? (
        <span className="generate-composer__mode-status">
          {getComposerModeLabel(effectiveComposerMode)}
        </span>
      ) : null}
    </div>
  );
};

export const GenerateComposerSourceSelect = ({
  visible,
  selectable,
  effectiveGenerationSource,
  label,
  unavailableMessage,
  resetKey,
  onSelectSource,
  onStopInputEvent,
}: GenerateComposerSourceSelectProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [resetKey, visible]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onStopInputEvent(event);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  if (!visible) {
    return null;
  }

  if (!selectable) {
    return (
      <span className="generate-composer__source-field">
        <span
          className="generate-composer__source-status"
          aria-label={GENERATION_MODE_LABEL}
          title={unavailableMessage}
        >
          {BUILTIN_GENERATION_LABEL}
        </span>
      </span>
    );
  }

  return (
    <span className="generate-composer__source-field">
      <button
        type="button"
        className={[
          "generate-composer__source-trigger",
          open ? "generate-composer__source-trigger--open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={GENERATION_MODE_LABEL}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={onStopInputEvent}
        onClick={(event) => {
          onStopInputEvent(event);
          setOpen((current) => !current);
        }}
      >
        <span className="generate-composer__source-label">{label}</span>
        <span className="generate-composer__source-chevron" aria-hidden="true">
          {chevronDownIcon()}
        </span>
      </button>
      {open ? (
        <div
          className="generate-composer__source-menu"
          role="listbox"
          aria-label={GENERATION_MODE_LABEL}
          onMouseDown={onStopInputEvent}
          onKeyDown={handleKeyDown}
        >
          <button
            type="button"
            role="option"
            aria-selected={effectiveGenerationSource === "builtin"}
            className="generate-composer__source-menu-item"
            onMouseDown={onStopInputEvent}
            onClick={(event) => {
              onSelectSource("builtin", event);
              setOpen(false);
            }}
          >
            {BUILTIN_GENERATION_LABEL}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={effectiveGenerationSource === "agent"}
            aria-disabled={!selectable}
            className="generate-composer__source-menu-item"
            onMouseDown={onStopInputEvent}
            onClick={(event) => {
              onSelectSource("agent", event);
              setOpen(false);
            }}
          >
            {AGENT_GENERATION_LABEL}
          </button>
        </div>
      ) : null}
    </span>
  );
};
