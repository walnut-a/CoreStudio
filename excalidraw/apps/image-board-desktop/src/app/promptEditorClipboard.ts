import type {
  GenerationPromptPart,
  GenerationPromptReferencePayload,
} from "../shared/providerTypes";

export const PROMPT_EDITOR_CLIPBOARD_MIME =
  "application/x-corestudio-prompt-fragment+json";
const PROMPT_EDITOR_CLIPBOARD_HTML_ATTRIBUTE =
  "data-corestudio-prompt-fragment";

export interface PromptEditorClipboardFragment {
  version: 1;
  parts: GenerationPromptPart[];
  references: GenerationPromptReferencePayload[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string";

const isStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isOptionalStringArray = (value: unknown) =>
  value === undefined || isStringArray(value);

const isPromptPart = (value: unknown): value is GenerationPromptPart =>
  isRecord(value) &&
  ((value.type === "text" && typeof value.text === "string") ||
    (value.type === "reference" &&
      typeof value.referenceId === "string" &&
      value.referenceId.length > 0));

const isReferenceItem = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === "string" &&
  Number.isSafeInteger(value.index) &&
  (value.kind === "image" || value.kind === "text" || value.kind === "shape") &&
  typeof value.label === "string" &&
  isOptionalString(value.fileId) &&
  isOptionalString(value.thumbnailDataUrl);

const isReferenceImage = (value: unknown) =>
  isRecord(value) &&
  typeof value.mimeType === "string" &&
  typeof value.dataBase64 === "string";

const isReferenceDebug = (value: unknown) =>
  isRecord(value) &&
  isOptionalString(value.fileId) &&
  (value.sourceType === undefined ||
    value.sourceType === "generated" ||
    value.sourceType === "imported") &&
  isOptionalString(value.sourceProvider) &&
  isOptionalString(value.sourceModel) &&
  (value.parentFileId === undefined ||
    value.parentFileId === null ||
    typeof value.parentFileId === "string");

const isReferenceSource = (value: unknown) =>
  isRecord(value) &&
  isOptionalStringArray(value.elementIds) &&
  isOptionalStringArray(value.fileIds);

const isPromptReference = (
  value: unknown,
): value is GenerationPromptReferencePayload =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.id.length > 0 &&
  typeof value.label === "string" &&
  typeof value.enabled === "boolean" &&
  Number.isSafeInteger(value.elementCount) &&
  Number(value.elementCount) >= 0 &&
  Number.isSafeInteger(value.textCount) &&
  Number(value.textCount) >= 0 &&
  isOptionalStringArray(value.textNotes) &&
  (value.items === undefined ||
    (Array.isArray(value.items) && value.items.every(isReferenceItem))) &&
  (value.image === undefined || isReferenceImage(value.image)) &&
  (value.debug === undefined || isReferenceDebug(value.debug)) &&
  (value.source === undefined || isReferenceSource(value.source)) &&
  isOptionalString(value.thumbnailDataUrl);

export const serializePromptEditorClipboardFragment = (
  fragment: Omit<PromptEditorClipboardFragment, "version">,
) => JSON.stringify({ version: 1, ...fragment });

export const parsePromptEditorClipboardFragment = (
  serialized: string,
): PromptEditorClipboardFragment | null => {
  if (!serialized) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.parts) ||
    !value.parts.every(isPromptPart) ||
    !Array.isArray(value.references) ||
    !value.references.every(isPromptReference)
  ) {
    return null;
  }

  const referencesById = new Map<string, GenerationPromptReferencePayload>();
  for (const reference of value.references) {
    if (referencesById.has(reference.id)) {
      return null;
    }
    referencesById.set(reference.id, reference);
  }

  const referencedIds = new Set(
    value.parts
      .filter(
        (part): part is Extract<GenerationPromptPart, { type: "reference" }> =>
          part.type === "reference",
      )
      .map((part) => part.referenceId),
  );
  if (
    referencedIds.size === 0 ||
    [...referencedIds].some((id) => !referencesById.has(id))
  ) {
    return null;
  }

  return {
    version: 1,
    parts: value.parts,
    references: [...referencedIds].map((id) => referencesById.get(id)!),
  };
};

export const embedPromptEditorClipboardFragmentInHtml = (
  html: string,
  serializedFragment: string,
) =>
  `<span ${PROMPT_EDITOR_CLIPBOARD_HTML_ATTRIBUTE}="${encodeURIComponent(
    serializedFragment,
  )}">${html}</span>`;

export const parsePromptEditorClipboardFragmentFromHtml = (html: string) => {
  const match = html.match(
    new RegExp(
      `${PROMPT_EDITOR_CLIPBOARD_HTML_ATTRIBUTE}=(?:"([^"]*)"|'([^']*)')`,
    ),
  );
  const encodedFragment = match?.[1] ?? match?.[2];
  if (!encodedFragment) {
    return null;
  }

  try {
    return parsePromptEditorClipboardFragment(
      decodeURIComponent(encodedFragment),
    );
  } catch {
    return null;
  }
};

export const clonePromptEditorClipboardFragment = (
  fragment: PromptEditorClipboardFragment,
  createReferenceId: () => string,
): Omit<PromptEditorClipboardFragment, "version"> => {
  const nextIds = new Map(
    fragment.references.map((reference) => [reference.id, createReferenceId()]),
  );

  return {
    parts: fragment.parts.map((part) =>
      part.type === "reference"
        ? {
            type: "reference",
            referenceId: nextIds.get(part.referenceId)!,
          }
        : { ...part },
    ),
    references: fragment.references.map((reference) => ({
      ...reference,
      id: nextIds.get(reference.id)!,
    })),
  };
};
