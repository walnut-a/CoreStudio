export type ProviderId = "gemini" | "zenmux" | "fal";

export type GenerationField =
  | "prompt"
  | "negativePrompt"
  | "width"
  | "height"
  | "seed"
  | "imageCount";

export type SizeControlMode = "exact" | "aspect-ratio";

export interface ProviderCapabilities {
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  supportsImageCount: boolean;
  supportsReferenceImages: boolean;
  maxImageCount: number;
  sizeControlMode: SizeControlMode;
}

export interface ProviderModelDefinition {
  id: string;
  label: string;
  capabilities: ProviderCapabilities;
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  defaultModel: string;
  models: Record<string, ProviderModelDefinition>;
}

export interface GenerationRequest {
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string;
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
  lastStatus?: "unknown" | "success" | "error";
  lastCheckedAt?: string | null;
  lastError?: string | null;
}
