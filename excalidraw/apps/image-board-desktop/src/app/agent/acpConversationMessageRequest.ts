import { normalizeGenerationRequest } from "../../shared/providerCatalog";
import type {
  CustomProviderModel,
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";

export const shouldBuildAcpConversationSelectionReference = ({
  selectionReferenceSignature,
  removedSelectionReferenceSignature,
}: {
  selectionReferenceSignature: string | null;
  removedSelectionReferenceSignature: string | null;
}) =>
  !selectionReferenceSignature ||
  removedSelectionReferenceSignature !== selectionReferenceSignature;

export const buildAcpConversationMessageRequest = ({
  currentRequest,
  message,
  reference,
  customModels,
}: {
  currentRequest: GenerationRequest;
  message: string;
  reference: GenerationReferencePayload | null;
  customModels: readonly CustomProviderModel[];
}): GenerationRequest =>
  normalizeGenerationRequest(
    {
      ...currentRequest,
      generationSource: "agent",
      prompt: message,
      promptParts: [],
      promptReferences: [],
      reference,
    },
    {
      customModels,
    },
  );
