import { normalizeGenerationRequest } from "../shared/providerCatalog";
import { copy } from "./copy";
import { clearSubmittedPromptRequest } from "./generatePromptRequest";

import type {
  CustomProviderModel,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferenceItemPayload,
  GenerationReferencePayload,
  GenerationRequest,
  GenerationSource,
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
    (left.generationSource ?? "builtin") ===
      (right.generationSource ?? "builtin") &&
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

export type GenerationExecutionPlan = {
  kind: "start-builtin-generation";
  generationSource: Extract<GenerationSource, "builtin">;
};

export const buildGenerationExecutionPlan = (
  _request: GenerationRequest,
): GenerationExecutionPlan => ({
    kind: "start-builtin-generation",
    generationSource: "builtin",
  });

export const buildBuiltinGenerationSubmittedRequest = (
  request: GenerationRequest,
): GenerationRequest => clearSubmittedPromptRequest(request);

export const applyBuiltinGenerationSubmittedRequestState = ({
  request,
  setGenerateRequest,
}: {
  request: GenerationRequest;
  setGenerateRequest: (request: GenerationRequest) => void;
}) => {
  const submittedRequest = buildBuiltinGenerationSubmittedRequest(request);
  setGenerateRequest(submittedRequest);
  return submittedRequest;
};

export const getMissingSelectionReferenceImageErrorMessage = () =>
  copy.generationError.missingSelectionReference;

export type BuiltinGenerationReferencePlan =
  | {
      kind: "load-selection-reference";
    }
  | {
      kind: "skip-selection-reference";
    };

export const buildBuiltinGenerationReferencePlan = ({
  request,
  customModels = [],
}: {
  request: GenerationRequest;
  customModels?: readonly CustomProviderModel[];
}): BuiltinGenerationReferencePlan => {
  const normalizedRequest = normalizeGenerationRequest(request, {
    customModels,
  });

  return normalizedRequest.reference?.enabled
    ? { kind: "load-selection-reference" }
    : { kind: "skip-selection-reference" };
};

export const buildBuiltinGenerationPreparedRequest = ({
  request,
  customModels = [],
  selectionReference,
}: {
  request: GenerationRequest;
  customModels?: readonly CustomProviderModel[];
  selectionReference?: GenerationReferencePayload | null;
}): GenerationRequest => {
  const normalizedRequest = normalizeGenerationRequest(request, {
    customModels,
  });

  if (!normalizedRequest.reference?.enabled) {
    return normalizedRequest;
  }

  if (!selectionReference?.image) {
    throw new Error(getMissingSelectionReferenceImageErrorMessage());
  }

  return {
    ...normalizedRequest,
    reference: {
      ...selectionReference,
      enabled: true,
    },
  };
};

export const prepareBuiltinGenerationRequestAction = async <Scene>({
  request,
  customModels = [],
  sourceScene,
  loadOriginalScene,
  readSelectionReference,
  assertProjectActive = () => {},
}: {
  request: GenerationRequest;
  customModels?: readonly CustomProviderModel[];
  sourceScene: Scene;
  loadOriginalScene: (scene: Scene) => Promise<Scene>;
  readSelectionReference: (
    sceneWithOriginalImages: Scene,
  ) => Promise<GenerationReferencePayload | null>;
  assertProjectActive?: () => void;
}): Promise<GenerationRequest> => {
  const referencePlan = buildBuiltinGenerationReferencePlan({
    request,
    customModels,
  });
  let selectionReference: GenerationReferencePayload | null = null;

  if (referencePlan.kind === "load-selection-reference") {
    const sceneWithOriginalImageFiles = await loadOriginalScene(sourceScene);
    assertProjectActive();
    selectionReference = await readSelectionReference(
      sceneWithOriginalImageFiles,
    );
    assertProjectActive();
  }

  return buildBuiltinGenerationPreparedRequest({
    request,
    customModels,
    selectionReference,
  });
};

export const buildGenerationErrorDisplayRequest = ({
  request,
  customModels = [],
}: {
  request: GenerationRequest;
  customModels?: readonly CustomProviderModel[];
}): GenerationRequest =>
  normalizeGenerationRequest(request, {
    customModels,
  });
