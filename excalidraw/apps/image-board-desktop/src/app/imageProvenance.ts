import { getOptionalProviderDefinition } from "../shared/providerCatalog";
import type { ImageRecord } from "../shared/projectTypes";
import {
  getImageGenerationOriginLabel,
  getImageSourceLabel,
} from "./copy";

export interface ImageProvenanceViewModel {
  sourceLabel: string;
  providerLabel: string | null;
}

export const buildImageProvenanceViewModel = (
  record: Pick<ImageRecord, "sourceType" | "generationOrigin" | "provider">,
): ImageProvenanceViewModel => {
  const normalizedProvider = record.provider?.trim();

  return {
    sourceLabel:
      record.generationOrigin === "corestudio"
        ? "CoreStudio"
        : (getImageGenerationOriginLabel(record.generationOrigin) ??
          getImageSourceLabel(record.sourceType)),
    providerLabel: normalizedProvider
      ? (getOptionalProviderDefinition(normalizedProvider)?.label ??
        normalizedProvider)
      : null,
  };
};
