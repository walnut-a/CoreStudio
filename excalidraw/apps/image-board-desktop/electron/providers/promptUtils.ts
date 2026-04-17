import type { GenerationRequest } from "../../src/shared/providerTypes";

const REFERENCE_PROMPT_PREFIX = "参考选区中的文字说明：";

export const getEnabledReference = (request: GenerationRequest) =>
  request.reference?.enabled && request.reference.image ? request.reference : null;

export const buildPromptWithReferenceNotes = (request: GenerationRequest) => {
  const notes = request.reference?.enabled
    ? (request.reference.textNotes || []).filter(Boolean)
    : [];

  if (!notes.length) {
    return request.prompt;
  }

  const noteLines = notes.map((note, index) => `${index + 1}. ${note}`).join("\n");
  const prompt = request.prompt.trim();

  if (!prompt) {
    return `${REFERENCE_PROMPT_PREFIX}\n${noteLines}`;
  }

  return `${prompt}\n\n${REFERENCE_PROMPT_PREFIX}\n${noteLines}`;
};

export const toDataUri = (
  mimeType: string,
  dataBase64: string,
) => `data:${mimeType};base64,${dataBase64}`;
