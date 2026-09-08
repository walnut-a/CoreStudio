import { type ReactNode, useRef } from "react";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
} from "../../shared/projectTypes";
import { referencePlaceholderText } from "../../shared/promptReferences";
import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "../generationTaskState";
import { getImageAssetTitle } from "../imageAssetViewModel";
import { buildImageProvenanceViewModel } from "../imageProvenance";
import { copy, DESKTOP_LANG_CODE, getOptionalText } from "../copy";
import { usePlainTextCopyWithin } from "../usePlainTextCopyWithin";
import {
  getModelDefinition,
  getOptionalProviderDefinition,
} from "../../shared/providerCatalog";
import { copyIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

interface ImageInspectorProps {
  colorProperties?: ReactNode;
  projectPath?: string | null;
  record: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onCopyTaskError?: () => void;
  onLocateImageRecord?: (fileId: string) => void;
  onLocatePromptReference?: (reference: ImagePromptReferenceRecord) => void;
  onCopyImageId?: () => void;
}

// Without a navigation capability, references and lineage remain selectable text.
const InspectorLink = ({
  children,
  onClick,
  className,
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  className: string;
  "aria-label"?: string;
  title?: string;
}) =>
  onClick ? (
    <button type="button" className={className} onClick={onClick} {...props}>
      {children}
    </button>
  ) : (
    <span className={className}>{children}</span>
  );

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? copy.inspector.unknownTime
    : date.toLocaleString(DESKTOP_LANG_CODE);
};

const formatChainDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? copy.inspector.unknownTime
    : date.toLocaleString(DESKTOP_LANG_CODE, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const formatCompactDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? copy.inspector.unknownTime
    : date.toLocaleString(DESKTOP_LANG_CODE, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const getImageRecordPromptSummary = (record: ImageRecord) => {
  const prompt = record.prompt?.trim();
  return prompt
    ? prompt.length > 48
      ? `${prompt.slice(0, 48)}...`
      : prompt
    : getImageAssetTitle(record);
};

const getImageRecordSummary = (record: ImageRecord) =>
  `${formatDateTime(record.createdAt)} · ${getImageRecordPromptSummary(
    record,
  )}`;

const formatSize = (width: number, height: number) => `${width} × ${height}`;

const getModelLabel = (
  provider: string | undefined,
  model: string | undefined,
) => {
  const normalizedModel = model?.trim();
  if (!normalizedModel) {
    return copy.inspector.emptyValue;
  }
  const providerDefinition = getOptionalProviderDefinition(provider);
  if (!providerDefinition) {
    return normalizedModel;
  }
  const providerPrefix = `${providerDefinition.id}/`;
  const catalogModel = normalizedModel.startsWith(providerPrefix)
    ? normalizedModel.slice(providerPrefix.length)
    : normalizedModel;
  return getModelDefinition(providerDefinition.id, catalogModel).label;
};

const formatImageFormat = (mimeType: string) => {
  const subtype = mimeType.split("/")[1]?.split("+")[0]?.trim();
  return subtype ? subtype.toUpperCase().replace("JPG", "JPEG") : mimeType;
};

const InspectorDisclosure = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <details className="image-inspector__disclosure">
    <summary>{label}</summary>
    <div className="image-inspector__disclosure-content">{children}</div>
  </details>
);

const getImageRecordTitle = (record: ImageRecord) =>
  record.sourceType === "generated"
    ? copy.inspector.generatedImageTitle
    : copy.inspector.importedImageTitle;

const getGenerationAttribution = (record: ImageRecord) => {
  if (
    record.sourceType !== "generated" ||
    record.generationOrigin !== "corestudio"
  ) {
    return null;
  }
  return record.generationSource === "agent"
    ? copy.inspector.coreStudioGenerationByCodex
    : copy.inspector.coreStudioGenerationByApp;
};

const hasPromptReferenceTarget = (reference: ImagePromptReferenceRecord) =>
  Boolean(reference.fileIds?.length || reference.elementIds?.length);

const renderPromptTextWithReferences = (
  prompt: string | undefined,
  references: ImagePromptReferenceRecord[] | undefined,
  onLocatePromptReference: ImageInspectorProps["onLocatePromptReference"],
) => {
  const promptText = getOptionalText(prompt);
  const renderableReferences = (references || [])
    .filter(hasPromptReferenceTarget)
    .sort((left, right) => left.index - right.index);

  if (!prompt?.trim() || !renderableReferences.length) {
    return promptText;
  }

  const nodes: ReactNode[] = [];
  let rest = promptText;

  for (const reference of renderableReferences) {
    const placeholder = referencePlaceholderText(reference.index);
    const placeholderIndex = rest.indexOf(placeholder);
    if (placeholderIndex < 0) {
      continue;
    }

    const before = rest.slice(0, placeholderIndex);
    if (before) {
      nodes.push(before);
    }

    nodes.push(
      <InspectorLink
        key={reference.id}
        className="image-inspector__prompt-reference"
        aria-label={copy.inspector.locateReference(placeholder)}
        title={copy.inspector.locateImage}
        onClick={
          onLocatePromptReference
            ? () => onLocatePromptReference(reference)
            : undefined
        }
      >
        {placeholder}
      </InspectorLink>,
    );
    rest = rest.slice(placeholderIndex + placeholder.length);
  }

  if (rest) {
    nodes.push(rest);
  }

  return nodes.length ? nodes : promptText;
};

const getPromptReferenceList = (
  references: ImagePromptReferenceRecord[] | undefined,
) =>
  (references || [])
    .filter(hasPromptReferenceTarget)
    .sort((left, right) => left.index - right.index);

export const ImageInspector = ({
  colorProperties,
  projectPath,
  record,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onCopyTaskError,
  onLocateImageRecord,
  onLocatePromptReference,
  onCopyImageId,
}: ImageInspectorProps) => {
  const inspectorRef = useRef<HTMLElement | null>(null);
  usePlainTextCopyWithin(inspectorRef);

  const handleScrollWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const maxScrollTop = Math.max(
      0,
      container.scrollHeight - container.clientHeight,
    );

    if (maxScrollTop === 0) {
      return;
    }

    container.scrollTop = Math.min(
      maxScrollTop,
      Math.max(0, container.scrollTop + event.deltaY),
    );

    event.preventDefault();
    event.stopPropagation();
  };

  if (task) {
    const failed = task.status === "error";
    const taskStatusText = failed
      ? copy.inspector.taskFailed
      : copy.inspector.taskPending;

    return (
      <section className="image-inspector" ref={inspectorRef}>
        <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
          <section
            className="image-inspector__group image-inspector__task-status"
            aria-label={copy.inspector.taskStatusTitle}
          >
            <h3 className="image-inspector__group-title">
              {copy.inspector.taskStatusTitle}
            </h3>
            <div
              className={`image-inspector__task-state${
                failed ? " image-inspector__task-state--error" : ""
              }`}
            >
              <span className="image-inspector__task-dot" aria-hidden="true" />
              <div className="image-inspector__task-state-copy">
                <strong>{taskStatusText}</strong>
                <span>
                  {failed
                    ? getOptionalText(task.errorMessage)
                    : copy.inspector.taskStarted(
                        formatCompactDateTime(task.startedAt),
                      )}
                </span>
              </div>
            </div>
            {failed && (
              <InspectorDisclosure label={copy.inspector.errorDetails}>
                <div className="image-inspector__section-header">
                  <h4>{copy.inspector.technicalInfo}</h4>
                  {onCopyTaskError && (
                    <DesktopButton
                      type="button"
                      size="small"
                      className="image-inspector__copy-button"
                      aria-label={copy.inspector.copyTaskError}
                      title={copy.inspector.copyTaskError}
                      onClick={onCopyTaskError}
                    >
                      {copyIcon}
                    </DesktopButton>
                  )}
                </div>
                <div className="image-inspector__pre">
                  {getOptionalText(task.rawError)}
                  {task.stack ? `\n\n${task.stack}` : ""}
                </div>
              </InspectorDisclosure>
            )}
          </section>

          <section
            className="image-inspector__group image-inspector__generation"
            aria-label={copy.inspector.generationInfo}
          >
            <h3 className="image-inspector__group-title">
              {copy.inspector.generationInfo}
            </h3>
            <section className="image-inspector__prompt-section">
              <div className="image-inspector__section-header">
                <h4>{copy.inspector.prompt}</h4>
                <DesktopButton
                  type="button"
                  size="small"
                  className="image-inspector__copy-button"
                  aria-label={copy.inspector.copyPrompt}
                  title={copy.inspector.copyPrompt}
                  onClick={onCopyPrompt}
                >
                  {copyIcon}
                </DesktopButton>
              </div>
              <div className="image-inspector__prompt-body">
                <p className="image-inspector__prompt-text">
                  {getOptionalText(task.prompt)}
                </p>
              </div>
            </section>
            <dl className="image-inspector__detail-grid image-inspector__metadata">
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.model}</dt>
                <dd className="image-inspector__detail-value">
                  {getModelLabel(task.provider, task.model)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    );
  }

  if (!record) {
    return (
      <section
        className="image-inspector image-inspector--empty"
        ref={inspectorRef}
      >
        <div className="image-inspector__group image-inspector__empty-card">
          <h3 className="image-inspector__group-title">
            {copy.inspector.title}
          </h3>
          <p>{copy.inspector.empty}</p>
        </div>
      </section>
    );
  }

  const imageTitle =
    record.displayName?.trim() ||
    record.sourceFileName?.trim() ||
    getImageRecordTitle(record);
  const provenance = buildImageProvenanceViewModel(record);
  const hasGenerationParameters =
    record.sourceType === "generated" &&
    Boolean(
      record.model?.trim() ||
        record.seed != null ||
        record.negativePrompt?.trim(),
    );
  const generationAttribution = getGenerationAttribution(record);
  const promptReferenceList = getPromptReferenceList(record.promptReferences);
  const detachedPromptReferenceList = promptReferenceList.filter(
    (reference) =>
      !record.prompt?.includes(referencePlaceholderText(reference.index)),
  );
  const renderLocateChainItem = (
    chainRecord: ImageRecord,
    options: {
      style?: React.CSSProperties;
    } = {},
  ) => {
    const summary = getImageRecordSummary(chainRecord);
    const promptSummary = getImageRecordPromptSummary(chainRecord);

    return (
      <li
        key={chainRecord.fileId}
        className={`image-inspector__chain-item${
          onLocateImageRecord ? " image-inspector__chain-item--actionable" : ""
        }`}
        style={options.style}
      >
        <span className="image-inspector__chain-marker" aria-hidden="true" />
        <InspectorLink
          className={`image-inspector__chain-content${
            onLocateImageRecord ? " image-inspector__chain-button" : ""
          }`}
          aria-label={`${copy.inspector.locateImage}：${summary}`}
          title={copy.inspector.locateImage}
          onClick={
            onLocateImageRecord
              ? () => onLocateImageRecord(chainRecord.fileId)
              : undefined
          }
        >
          <span className="image-inspector__chain-heading">
            <span className="image-inspector__chain-label">
              {getImageRecordTitle(chainRecord)}
            </span>
            <time
              className="image-inspector__chain-time"
              dateTime={chainRecord.createdAt}
            >
              {formatChainDateTime(chainRecord.createdAt)}
            </time>
          </span>
          <span className="image-inspector__chain-summary">
            {promptSummary}
          </span>
        </InspectorLink>
      </li>
    );
  };

  return (
    <section
      className="image-inspector image-inspector--record"
      ref={inspectorRef}
    >
      <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
        <section
          className="image-inspector__group image-inspector__file-info"
          aria-label={copy.inspector.title}
        >
          <h3 className="image-inspector__group-title">
            {copy.inspector.title}
          </h3>
          <dl className="image-inspector__detail-grid image-inspector__metadata">
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.name}</dt>
              <dd className="image-inspector__detail-value">{imageTitle}</dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.size}</dt>
              <dd className="image-inspector__detail-value">
                {formatSize(record.width, record.height)}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.format}</dt>
              <dd className="image-inspector__detail-value">
                {formatImageFormat(record.mimeType)}
              </dd>
            </div>
          </dl>
          <InspectorDisclosure label={copy.inspector.moreInfo}>
            <dl className="image-inspector__detail-grid image-inspector__metadata">
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.source}</dt>
                <dd className="image-inspector__detail-value">
                  {generationAttribution || provenance.sourceLabel}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.createdAt}</dt>
                <dd className="image-inspector__detail-value">
                  {formatDateTime(record.createdAt)}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.assetPath}</dt>
                <dd className="image-inspector__detail-value image-inspector__detail-code">
                  {projectPath
                    ? `${projectPath.replace(/\/$/, "")}/${record.assetPath}`
                    : record.assetPath}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.imageId}</dt>
                <dd className="image-inspector__id-value">
                  <code title={record.fileId}>{record.fileId}</code>
                  {onCopyImageId ? (
                    <DesktopButton
                      type="button"
                      size="small"
                      className="image-inspector__copy-button"
                      aria-label={copy.inspector.copyImageId}
                      title={copy.inspector.copyImageId}
                      onClick={onCopyImageId}
                    >
                      {copyIcon}
                    </DesktopButton>
                  ) : null}
                </dd>
              </div>
            </dl>
          </InspectorDisclosure>
        </section>

        {colorProperties}

        {(hasGenerationParameters ||
          record.prompt?.trim() ||
          promptReferenceList.length > 0) && (
          <section
            className="image-inspector__group image-inspector__generation"
            aria-label={
              record.sourceType === "generated"
                ? copy.inspector.generationInfo
                : copy.inspector.prompt
            }
          >
            <h3 className="image-inspector__group-title">
              {record.sourceType === "generated"
                ? copy.inspector.generationInfo
                : copy.inspector.prompt}
            </h3>
            {(record.prompt?.trim() || promptReferenceList.length > 0) && (
              <section className="image-inspector__prompt-section">
                <div className="image-inspector__section-header">
                  <h4>{copy.inspector.prompt}</h4>
                  {record.prompt?.trim() && (
                    <DesktopButton
                      type="button"
                      size="small"
                      className="image-inspector__copy-button"
                      aria-label={copy.inspector.copyPrompt}
                      title={copy.inspector.copyPrompt}
                      onClick={onCopyPrompt}
                    >
                      {copyIcon}
                    </DesktopButton>
                  )}
                </div>
                <div className="image-inspector__prompt-body">
                  {record.prompt?.trim() && (
                    <p className="image-inspector__prompt-text">
                      {renderPromptTextWithReferences(
                        record.prompt,
                        record.promptReferences,
                        onLocatePromptReference,
                      )}
                    </p>
                  )}
                  {detachedPromptReferenceList.length ? (
                    <div
                      className="image-inspector__prompt-reference-list"
                      aria-label={copy.inspector.promptReferences}
                    >
                      {detachedPromptReferenceList.map((reference) => (
                        <InspectorLink
                          key={reference.id}
                          className="image-inspector__prompt-reference-chip"
                          aria-label={copy.inspector.locateReference(
                            reference.label,
                          )}
                          title={copy.inspector.locateImage}
                          onClick={
                            onLocatePromptReference
                              ? () => onLocatePromptReference(reference)
                              : undefined
                          }
                        >
                          {reference.label}
                        </InspectorLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            )}
            {hasGenerationParameters && (
              <dl className="image-inspector__detail-grid image-inspector__metadata">
                {record.sourceType === "generated" && record.model?.trim() && (
                  <div className="image-inspector__detail-item">
                    <dt>{copy.inspector.model}</dt>
                    <dd className="image-inspector__detail-value">
                      {getModelLabel(record.provider, record.model)}
                    </dd>
                  </div>
                )}
                {record.sourceType === "generated" && record.seed != null && (
                  <div className="image-inspector__detail-item">
                    <dt>{copy.inspector.seed}</dt>
                    <dd className="image-inspector__detail-value">
                      {record.seed}
                    </dd>
                  </div>
                )}
                {record.sourceType === "generated" &&
                  record.negativePrompt?.trim() && (
                    <div className="image-inspector__detail-item image-inspector__detail-item--wide">
                      <dt>{copy.inspector.negativePrompt}</dt>
                      <dd className="image-inspector__detail-value">
                        {record.negativePrompt}
                      </dd>
                    </div>
                  )}
              </dl>
            )}
          </section>
        )}

        {(ancestorRecords.length > 0 || descendantRecords.length > 0) && (
          <section
            className="image-inspector__group image-inspector__chain"
            aria-label={copy.inspector.chainTitle}
          >
            <h3 className="image-inspector__group-title">
              {copy.inspector.chainTitle}
            </h3>
            <ol className="image-inspector__chain-list">
              {ancestorRecords.map((ancestorRecord) =>
                renderLocateChainItem(ancestorRecord),
              )}
              <li className="image-inspector__chain-item image-inspector__chain-item--current">
                <span
                  className="image-inspector__chain-marker"
                  aria-hidden="true"
                />
                <span className="image-inspector__chain-content">
                  <span className="image-inspector__chain-heading">
                    <span className="image-inspector__chain-label">
                      {copy.inspector.currentImage}
                    </span>
                    <time
                      className="image-inspector__chain-time"
                      dateTime={record.createdAt}
                    >
                      {formatChainDateTime(record.createdAt)}
                    </time>
                  </span>
                  <span className="image-inspector__chain-summary">
                    {getImageRecordPromptSummary(record)}
                  </span>
                </span>
              </li>
            </ol>
            {descendantRecords.length > 0 && (
              <div className="image-inspector__chain-group">
                <p className="image-inspector__chain-group-title">
                  {copy.inspector.descendantImages}
                </p>
                <ol className="image-inspector__chain-list image-inspector__chain-list--descendants">
                  {descendantRecords.map(
                    ({ record: descendantRecord, depth }) =>
                      renderLocateChainItem(descendantRecord, {
                        style: {
                          "--image-inspector-chain-depth": `${depth}`,
                        } as React.CSSProperties,
                      }),
                  )}
                </ol>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
};
