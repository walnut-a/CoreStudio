import {
  appendNotesToPrompt,
  buildInlineReferenceNotes,
  buildLegacyReferenceNotes,
  buildPromptTextWithInlineReferences,
  getOrderedPromptReferences,
  hasPromptReferences,
  referencePlaceholderText,
  toDataUri,
} from "../../src/shared/promptReferences";

import type { GenerationRequest } from "../../src/shared/providerTypes";

export const getEnabledReference = (request: GenerationRequest) =>
  request.reference?.enabled && request.reference.image
    ? request.reference
    : null;

export const getEnabledPromptReferences = (request: GenerationRequest) =>
  getOrderedPromptReferences(request);

export const buildPromptWithReferenceNotes = (request: GenerationRequest) => {
  if (hasPromptReferences(request)) {
    const references = getOrderedPromptReferences(request);
    return appendNotesToPrompt(
      buildPromptTextWithInlineReferences(request),
      buildInlineReferenceNotes(references),
    );
  }

  return appendNotesToPrompt(
    request.prompt,
    buildLegacyReferenceNotes(request.reference),
  );
};

export const buildGenerateContentPartsWithReferences = (
  request: GenerationRequest,
) => {
  const references = getOrderedPromptReferences(request);
  if (!references.length) {
    return null;
  }

  const referenceMap = new Map(
    references.map((reference, index) => [reference.id, { reference, index }]),
  );
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  for (const part of request.promptParts || [
    { type: "text" as const, text: request.prompt },
  ]) {
    if (part.type === "text") {
      if (part.text) {
        parts.push({ text: part.text });
      }
      continue;
    }

    const entry = referenceMap.get(part.referenceId);
    const image = entry?.reference.image;
    if (!entry || !image) {
      continue;
    }

    parts.push({
      text: `${referencePlaceholderText(entry.index + 1)}：${
        entry.reference.label
      }`,
    });
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.dataBase64,
      },
    });
  }

  return parts.length ? parts : null;
};

export { toDataUri };
