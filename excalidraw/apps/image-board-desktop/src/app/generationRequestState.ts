import { normalizeGenerationRequest } from "../shared/providerCatalog";
import type {
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
    isSameStringArray(left.textNotes, right.textNotes)
  );
};

const isSameGenerationRequest = (
  left: GenerationRequest,
  right: GenerationRequest,
) => {
  return (
    left.provider === right.provider &&
    left.model === right.model &&
    left.prompt === right.prompt &&
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
