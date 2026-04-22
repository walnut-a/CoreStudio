export type ProviderId =
  | "gemini"
  | "zenmux"
  | "fal"
  | "jimeng"
  | "openai"
  | "openrouter";

export type GenerationField =
  | "prompt"
  | "negativePrompt"
  | "width"
  | "height"
  | "aspectRatio"
  | "seed"
  | "imageCount";

export type SizeControlMode = "exact" | "aspect-ratio";

export type ProviderRequestAdapter =
  | "gemini-generate-content"
  | "zenmux-vertex-generate-content"
  | "zenmux-vertex-gpt-image"
  | "fal-image"
  | "jimeng-image"
  | "openai-images"
  | "openrouter-chat-image";

export type CustomModelCapabilityTemplateId =
  | "image-editing-aspect-ratio"
  | "text-to-image-aspect-ratio"
  | "text-to-image-exact"
  | "seeded-exact";

export interface ProviderCapabilities {
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsImageCount: boolean;
  supportsReferenceImages: boolean;
  maxImageCount: number;
  sizeControlMode: SizeControlMode;
}

export interface AspectRatioOption {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface ProviderModelDefinition {
  id: string;
  label: string;
  capabilities: ProviderCapabilities;
  adapter?: ProviderRequestAdapter;
  custom?: boolean;
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  defaultModel: string;
  models: Record<string, ProviderModelDefinition>;
}

export interface CustomProviderModel {
  id: string;
  label?: string;
  capabilityTemplate: CustomModelCapabilityTemplateId;
  adapter?: ProviderRequestAdapter;
  capabilities?: ProviderCapabilities;
}

export interface GenerationRequest {
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string;
  /**
   * `null` means do not send an explicit ratio and let the provider decide.
   * `undefined` is treated as a legacy request and falls back to width/height.
   */
  aspectRatio?: string | null;
  width: number;
  height: number;
  seed?: number | null;
  imageCount: number;
  reference?: GenerationReferencePayload | null;
}

export interface GenerationReferenceImagePayload {
  mimeType: string;
  dataBase64: string;
}

export interface GenerationReferenceDebugPayload {
  fileId?: string;
  sourceType?: "generated" | "imported";
  sourceProvider?: ProviderId;
  sourceModel?: string;
  parentFileId?: string | null;
}

export interface GenerationReferencePayload {
  enabled: boolean;
  elementCount: number;
  textCount: number;
  textNotes?: string[];
  image?: GenerationReferenceImagePayload;
  debug?: GenerationReferenceDebugPayload;
}

export interface ProviderImagePayload {
  fileName: string;
  mimeType: string;
  dataBase64: string;
  width: number;
  height: number;
}

export interface GenerationResponse {
  provider: ProviderId;
  model: string;
  seed: number | null;
  createdAt: string;
  images: ProviderImagePayload[];
}

export interface ProviderSettings {
  apiKey: string;
  defaultModel?: string;
  customModels?: CustomProviderModel[];
  lastStatus?: "unknown" | "success" | "error";
  lastCheckedAt?: string | null;
  lastError?: string | null;
}
