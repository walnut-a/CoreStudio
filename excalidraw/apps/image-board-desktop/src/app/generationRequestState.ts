import { normalizeGenerationRequest } from "../shared/providerCatalog";

import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferenceItemPayload,
  GenerationReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";

const isSameStringArray = (
  left: string[] | undefined,
  right: string[] | undefined,
) => {
  const nextLeft = left ?? [];
  const nextRight = right ?? [];

  if (nextLeft.length !== nextRight.length) {
    return false;
  }

  return nextLeft.every((value, index) => value === nextRight[index]);
};

const isSameReferencePayload = (
  left: GenerationReferencePayload | null | undefined,
  right: GenerationReferencePayload | null | undefined,
) => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.enabled === right.enabled &&
    left.elementCount === right.elementCount &&
    left.textCount === right.textCount &&
    isSameStringArray(left.textNotes, right.textNotes) &&
    isSameReferenceItems(left.items, right.items)
  );
};

const isSameReferenceItems = (
  left: GenerationReferenceItemPayload[] | undefined,
  right: GenerationReferenceItemPayload[] | undefined,
) => {
  const nextLeft = left ?? [];
  const nextRight = right ?? [];

  if (nextLeft.length !== nextRight.length) {
    return false;
  }

  return nextLeft.every((leftItem, index) => {
    const rightItem = nextRight[index];
    return (
      leftItem.id === rightItem.id &&
      leftItem.index === rightItem.index &&
      leftItem.kind === rightItem.kind &&
      leftItem.label === rightItem.label &&
      leftItem.thumbnailDataUrl === rightItem.thumbnailDataUrl
    );
  });
};

const isSamePromptParts = (
  left: GenerationPromptPart[] | undefined,
  right: GenerationPromptPart[] | undefined,
) => {
  const nextLeft = left ?? [];
  const nextRight = right ?? [];
  if (nextLeft.length !== nextRight.length) {
    return false;
  }

  return nextLeft.every((leftPart, index) => {
    const rightPart = nextRight[index];
    if (leftPart.type !== rightPart?.type) {
      return false;
    }
    return leftPart.type === "text"
      ? leftPart.text === (rightPart as typeof leftPart).text
      : leftPart.referenceId === (rightPart as typeof leftPart).referenceId;
  });
};

const isSamePromptReferences = (
  left: GenerationPromptReferencePayload[] | undefined,
  right: GenerationPromptReferencePayload[] | undefined,
) => {
  const nextLeft = left ?? [];
  const nextRight = right ?? [];
  if (nextLeft.length !== nextRight.length) {
    return false;
  }

  return nextLeft.every((leftReference, index) => {
    const rightReference = nextRight[index];
    if (!rightReference) {
      return false;
    }
    return (
      leftReference.id === rightReference.id &&
      leftReference.label === rightReference.label &&
      leftReference.thumbnailDataUrl === rightReference.thumbnailDataUrl &&
      isSameReferencePayload(leftReference, rightReference)
    );
  });
};

const isSameGenerationRequest = (
  left: GenerationRequest,
  right: GenerationRequest,
) => {
  return (
    left.provider === right.provider &&
    left.model === right.model &&
    left.prompt === right.prompt &&
    isSamePromptParts(left.promptParts, right.promptParts) &&
    isSamePromptReferences(left.promptReferences, right.promptReferences) &&
    (left.negativePrompt ?? "") === (right.negativePrompt ?? "") &&
    (left.aspectRatio ?? undefined) === (right.aspectRatio ?? undefined) &&
    left.width === right.width &&
    left.height === right.height &&
    (left.seed ?? null) === (right.seed ?? null) &&
    left.imageCount === right.imageCount &&
    isSameReferencePayload(left.reference, right.reference)
  );
};

export const syncSelectionReferenceIntoRequest = (
  current: GenerationRequest,
  selectionReferenceSummary: GenerationReferencePayload | null,
) => {
  const next = normalizeGenerationRequest({
    ...current,
    reference: selectionReferenceSummary
      ? {
          ...selectionReferenceSummary,
          enabled: selectionReferenceSummary.enabled,
        }
      : null,
  });

  return isSameGenerationRequest(current, next) ? current : next;
};
