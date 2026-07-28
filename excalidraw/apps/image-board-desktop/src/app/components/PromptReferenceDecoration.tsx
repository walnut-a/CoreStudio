import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { toDataUri } from "../../shared/promptReferences";
import { copy } from "../copy";

import type {
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
} from "../../shared/providerTypes";

interface PromptReferenceDecorationContextValue {
  references: readonly GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
}

const PromptReferenceDecorationContext =
  createContext<PromptReferenceDecorationContextValue>({
    references: [],
    pendingReference: null,
  });

export const PromptReferenceDecorationProvider = ({
  references,
  pendingReference,
  children,
}: {
  references: readonly GenerationPromptReferencePayload[];
  pendingReference: GenerationReferencePayload | null;
  children: ReactNode;
}) => {
  const value = useMemo(
    () => ({ references, pendingReference }),
    [pendingReference, references],
  );

  return (
    <PromptReferenceDecorationContext.Provider value={value}>
      {children}
    </PromptReferenceDecorationContext.Provider>
  );
};

const getReferenceLabel = (
  reference: GenerationPromptReferencePayload,
  index: number,
) => `${index + 1} ${reference.label}`;

const getPendingReferenceLabel = (reference: GenerationReferencePayload) => {
  const items = reference.items || [];
  if (items.length === 1 && items[0]?.kind === "image") {
    return copy.generateDialog.pendingImage;
  }
  return copy.generateDialog.pendingAnnotatedImage;
};

const getPendingThumbnail = (reference: GenerationReferencePayload) => {
  if (reference.image) {
    return toDataUri(reference.image.mimeType, reference.image.dataBase64);
  }

  const items = reference.items || [];
  if (items.length !== 1 || items[0]?.kind !== "image") {
    return null;
  }

  return items[0].thumbnailDataUrl ?? null;
};

const PromptReferenceChip = ({
  label,
  index,
  thumbnail,
  pending = false,
  referenceId,
}: {
  label: string;
  index: number;
  thumbnail?: string | null;
  pending?: boolean;
  referenceId?: string;
}) => {
  const [thumbnailAvailable, setThumbnailAvailable] = useState(
    Boolean(thumbnail),
  );

  useEffect(() => {
    setThumbnailAvailable(Boolean(thumbnail));
  }, [thumbnail]);

  const accessibleLabel = pending
    ? copy.generateDialog.pendingReference(index + 1, label)
    : `${index + 1} ${label}`;

  return (
    <span
      className={[
        "generate-composer__reference-chip",
        pending
          ? "generate-composer__reference-chip--pending"
          : "generate-composer__reference-chip--image",
        thumbnailAvailable
          ? "generate-composer__reference-chip--with-thumbnail"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-reference-id={referenceId}
      data-pending-reference={pending ? "true" : undefined}
      title={accessibleLabel}
      aria-label={accessibleLabel}
      contentEditable={false}
    >
      {thumbnailAvailable && thumbnail ? (
        <span className="generate-composer__reference-chip-thumbnail">
          <img
            src={thumbnail}
            alt={
              pending
                ? copy.generateDialog.pendingReferenceThumbnail(
                    index + 1,
                    label,
                  )
                : copy.generateDialog.referenceThumbnail(accessibleLabel)
            }
            draggable={false}
            onError={() => setThumbnailAvailable(false)}
          />
        </span>
      ) : null}
      <span className="generate-composer__reference-chip-index">
        {index + 1}
      </span>
      <span className="generate-composer__reference-chip-label">{label}</span>
    </span>
  );
};

export const PromptReferenceNodeView = ({
  referenceId,
}: {
  referenceId: string;
}) => {
  const { references } = useContext(PromptReferenceDecorationContext);
  const index = references.findIndex(
    (reference) => reference.id === referenceId,
  );
  const reference = references[index];
  if (!reference) {
    return null;
  }

  return (
    <PromptReferenceChip
      referenceId={referenceId}
      index={index}
      label={reference.label}
      thumbnail={reference.thumbnailDataUrl}
    />
  );
};

export const PendingPromptReferenceChip = ({
  reference,
  index,
}: {
  reference: GenerationReferencePayload;
  index: number;
}) => (
  <PromptReferenceChip
    pending
    index={index}
    label={getPendingReferenceLabel(reference)}
    thumbnail={getPendingThumbnail(reference)}
  />
);

export const PendingPromptReferenceNodeView = () => {
  const { pendingReference, references } = useContext(
    PromptReferenceDecorationContext,
  );
  if (!pendingReference) {
    return null;
  }

  return (
    <PendingPromptReferenceChip
      reference={pendingReference}
      index={references.length}
    />
  );
};

export { getReferenceLabel };
