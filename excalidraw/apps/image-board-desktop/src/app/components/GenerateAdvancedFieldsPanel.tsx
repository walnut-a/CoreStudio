import type { KeyboardEvent } from "react";

import {
  ASPECT_RATIO_AUTO_ID,
  getProviderDefinition,
} from "../../shared/providerCatalog";
import { copy } from "../copy";

import type {
  AspectRatioOption,
  GenerationField,
  GenerationRequest,
  ProviderId,
  ProviderModelDefinition,
} from "../../shared/providerTypes";

interface GenerateAdvancedFieldsPanelProps {
  request: Pick<
    GenerationRequest,
    | "provider"
    | "model"
    | "negativePrompt"
    | "width"
    | "height"
    | "seed"
    | "imageCount"
  >;
  providerModels: Record<string, ProviderModelDefinition>;
  visibleFields: Record<GenerationField, boolean>;
  selectedAspectRatio: string;
  aspectRatioOptions: readonly AspectRatioOption[];
  configuredProviders: readonly ProviderId[];
  onProviderChange: (provider: ProviderId) => void;
  onModelChange: (model: string) => void;
  onNegativePromptChange: (negativePrompt: string) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSeedChange: (seed: number | null) => void;
  onImageCountChange: (imageCount: number) => void;
  onTextInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const GenerateAdvancedFieldsPanel = ({
  request,
  providerModels,
  visibleFields,
  selectedAspectRatio,
  aspectRatioOptions,
  configuredProviders,
  onProviderChange,
  onModelChange,
  onNegativePromptChange,
  onAspectRatioChange,
  onWidthChange,
  onHeightChange,
  onSeedChange,
  onImageCountChange,
  onTextInputKeyDown,
}: GenerateAdvancedFieldsPanelProps) => {
  if (configuredProviders.length === 0) {
    return null;
  }

  const selectedModel = providerModels[request.model];
  const maxImageCount = selectedModel?.capabilities.maxImageCount ?? 4;

  return (
    <>
      <label>
        {copy.generateDialog.provider}
        <select
          value={request.provider}
          onChange={(event) =>
            onProviderChange(event.target.value as ProviderId)
          }
        >
          {configuredProviders.map((providerId) => (
            <option key={providerId} value={providerId}>
              {getProviderDefinition(providerId).label}
            </option>
          ))}
        </select>
      </label>

      <label>
        {copy.generateDialog.model}
        <select
          value={request.model}
          onChange={(event) => onModelChange(event.target.value)}
        >
          {Object.values(providerModels).map((model) => (
            <option key={model.id} value={model.id}>
              {model.custom ? `自定义：${model.label}` : model.label}
            </option>
          ))}
        </select>
      </label>

      {visibleFields.negativePrompt ? (
        <label className="dialog-form-grid__full">
          {copy.generateDialog.negativePrompt}
          <textarea
            rows={3}
            value={request.negativePrompt || ""}
            onKeyDown={onTextInputKeyDown}
            onChange={(event) => onNegativePromptChange(event.target.value)}
          />
        </label>
      ) : null}

      {visibleFields.aspectRatio ? (
        <label>
          {copy.generateDialog.aspectRatio}
          <select
            value={selectedAspectRatio}
            onChange={(event) => onAspectRatioChange(event.target.value)}
          >
            <option value={ASPECT_RATIO_AUTO_ID}>
              {copy.generateDialog.aspectRatioAuto}
            </option>
            {aspectRatioOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {visibleFields.width ? (
        <label>
          {copy.generateDialog.width}
          <input
            type="number"
            min={256}
            step={64}
            value={request.width}
            onChange={(event) => onWidthChange(Number(event.target.value))}
          />
        </label>
      ) : null}

      {visibleFields.height ? (
        <label>
          {copy.generateDialog.height}
          <input
            type="number"
            min={256}
            step={64}
            value={request.height}
            onChange={(event) => onHeightChange(Number(event.target.value))}
          />
        </label>
      ) : null}

      {visibleFields.seed ? (
        <label>
          {copy.generateDialog.seed}
          <input
            type="number"
            value={request.seed ?? ""}
            onChange={(event) =>
              onSeedChange(
                event.target.value ? Number(event.target.value) : null,
              )
            }
          />
        </label>
      ) : null}

      {visibleFields.imageCount ? (
        <label>
          {copy.generateDialog.imageCount}
          <input
            type="number"
            min={1}
            max={maxImageCount}
            value={request.imageCount}
            onChange={(event) => onImageCountChange(Number(event.target.value))}
          />
        </label>
      ) : null}
    </>
  );
};
