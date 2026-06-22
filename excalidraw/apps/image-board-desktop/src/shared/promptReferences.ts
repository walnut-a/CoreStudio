import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
  GenerationRequest,
} from "./providerTypes";
import type { ImagePromptReferenceRecord } from "./projectTypes";

export const referencePlaceholderText = (index: number) => `参考图 ${index}`;

export const toDataUri = (mimeType: string, dataBase64: string) =>
  `data:${mimeType};base64,${dataBase64}`;

export const hasPromptReferences = (request: GenerationRequest) =>
  Boolean(request.promptReferences?.some((reference) => reference.image));

export const normalizePromptParts = (
  parts: readonly GenerationPromptPart[] | undefined,
  fallbackPrompt: string,
): GenerationPromptPart[] => {
  if (!parts?.length) {
    return fallbackPrompt ? [{ type: "text", text: fallbackPrompt }] : [];
  }

  const normalized: GenerationPromptPart[] = [];
  for (const part of parts) {
    if (part.type === "text") {
      if (!part.text) {
        continue;
      }
      const previous = normalized[normalized.length - 1];
      if (previous?.type === "text") {
        previous.text += part.text;
      } else {
        normalized.push({ type: "text", text: part.text });
      }
      continue;
    }

    if (part.referenceId) {
      normalized.push({ type: "reference", referenceId: part.referenceId });
    }
  }

  return normalized;
};

const getReferenceMap = (
  references: readonly GenerationPromptReferencePayload[] | undefined,
) =>
  new Map(
    (references || [])
      .filter((reference) => reference.image)
      .map((reference) => [reference.id, reference]),
  );

export const getOrderedPromptReferences = (
  request: Pick<
    GenerationRequest,
    "prompt" | "promptParts" | "promptReferences"
  >,
) => {
  const referenceMap = getReferenceMap(request.promptReferences);
  const orderedReferences: GenerationPromptReferencePayload[] = [];
  const included = new Set<string>();

  for (const part of normalizePromptParts(
    request.promptParts,
    request.prompt,
  )) {
    if (part.type !== "reference" || included.has(part.referenceId)) {
      continue;
    }
    const reference = referenceMap.get(part.referenceId);
    if (reference) {
      orderedReferences.push(reference);
      included.add(part.referenceId);
    }
  }

  for (const reference of referenceMap.values()) {
    if (!included.has(reference.id)) {
      orderedReferences.push(reference);
    }
  }

  return orderedReferences;
};

export const buildPromptTextWithInlineReferences = (
  request: Pick<
    GenerationRequest,
    "prompt" | "promptParts" | "promptReferences"
  >,
) => {
  const referenceMap = getReferenceMap(request.promptReferences);
  let referenceIndex = 0;
  const parts = normalizePromptParts(request.promptParts, request.prompt);
  const text = parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (!referenceMap.has(part.referenceId)) {
        return "";
      }
      referenceIndex += 1;
      return referencePlaceholderText(referenceIndex);
    })
    .join("");

  return text || request.prompt;
};

const unique = <T,>(values: readonly T[]) => Array.from(new Set(values));

const getReferenceSource = (
  reference: GenerationReferencePayload,
): {
  fileIds: string[];
  elementIds: string[];
} => {
  const sourceFileIds = reference.source?.fileIds || [];
  const debugFileIds = reference.debug?.fileId ? [reference.debug.fileId] : [];
  const itemFileIds =
    reference.items?.flatMap((item) => (item.fileId ? [item.fileId] : [])) || [];

  return {
    fileIds: unique([...sourceFileIds, ...debugFileIds, ...itemFileIds]),
    elementIds: unique(reference.source?.elementIds || []),
  };
};

const getPromptReferenceKind = (
  reference: GenerationReferencePayload,
): ImagePromptReferenceRecord["kind"] =>
  reference.items?.length === 1 && reference.items[0]?.kind === "image"
    ? "image"
    : "snapshot";

const buildPromptReferenceRecord = (
  reference: GenerationPromptReferencePayload,
  index: number,
): ImagePromptReferenceRecord => {
  const source = getReferenceSource(reference);

  return {
    id: reference.id,
    index,
    label: referencePlaceholderText(index),
    kind: getPromptReferenceKind(reference),
    ...(source.fileIds.length ? { fileIds: source.fileIds } : {}),
    ...(source.elementIds.length ? { elementIds: source.elementIds } : {}),
  };
};

export const buildImagePromptReferenceRecords = (
  request: Pick<
    GenerationRequest,
    "prompt" | "promptParts" | "promptReferences" | "reference"
  >,
): ImagePromptReferenceRecord[] => {
  const orderedReferences = getOrderedPromptReferences(request);
  if (orderedReferences.length) {
    return orderedReferences.map((reference, index) =>
      buildPromptReferenceRecord(reference, index + 1),
    );
  }

  if (!request.reference?.enabled) {
    return [];
  }

  const source = getReferenceSource(request.reference);
  return [
    {
      id: "legacy-reference-1",
      index: 1,
      label: referencePlaceholderText(1),
      kind: getPromptReferenceKind(request.reference),
      ...(source.fileIds.length ? { fileIds: source.fileIds } : {}),
      ...(source.elementIds.length ? { elementIds: source.elementIds } : {}),
    },
  ];
};

export const buildInlineReferenceNotes = (
  references: readonly GenerationPromptReferencePayload[],
) => {
  const notes = references.flatMap((reference, referenceIndex) =>
    (reference.textNotes || [])
      .filter(Boolean)
      .map(
        (note, noteIndex) =>
          `${referencePlaceholderText(referenceIndex + 1)} 文字 ${
            noteIndex + 1
          }：${note}`,
      ),
  );

  if (!notes.length) {
    return "";
  }

  return `参考图中的文字说明：\n${notes.join("\n")}`;
};

export const buildLegacyReferenceNotes = (
  reference: GenerationReferencePayload | null | undefined,
) => {
  const notes = reference?.enabled
    ? (reference.textNotes || []).filter(Boolean)
    : [];

  if (!notes.length) {
    return "";
  }

  return `参考选区中的文字说明：\n${notes
    .map((note, index) => `${index + 1}. ${note}`)
    .join("\n")}`;
};

export const appendNotesToPrompt = (prompt: string, notes: string) => {
  if (!notes) {
    return prompt;
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return notes;
  }

  return `${trimmedPrompt}\n\n${notes}`;
};
