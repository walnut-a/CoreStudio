import { type ReactNode, useEffect, useRef, useState } from "react";

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
import { getProviderDefinition } from "../../shared/providerCatalog";
import { copyIcon } from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";

interface ImageInspectorProps {
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
  onRenameImage?: (displayName: string | null) => Promise<void> | void;
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
const formatTaskSize = (task: GenerationTaskRecord) =>
  task.aspectRatio === null
    ? copy.inspector.autoAspectRatio
    : formatSize(task.width, task.height);

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
  onRenameImage,
}: ImageInspectorProps) => {
  const inspectorRef = useRef<HTMLElement | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  usePlainTextCopyWithin(inspectorRef);

  useEffect(() => {
    setRenaming(false);
    setRenameValue(record?.displayName ?? record?.sourceFileName ?? "");
    setRenameSaving(false);
  }, [record?.displayName, record?.fileId, record?.sourceFileName]);

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
    const taskStatusText =
      task.status === "error"
        ? copy.inspector.taskFailed
        : copy.inspector.taskPending;

    return (
      <section className="image-inspector" ref={inspectorRef}>
        <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
          <header className="image-inspector__hero">
            <div className="image-inspector__hero-main">
              <span className="image-inspector__eyebrow">{taskStatusText}</span>
              <h4>{copy.inspector.taskTitle}</h4>
              <p>{getOptionalText(task.model)}</p>
            </div>
            <div className="image-inspector__hero-facts">
              <span>{getProviderDefinition(task.provider).label}</span>
              <span>{formatTaskSize(task)}</span>
            </div>
          </header>

          <section className="image-inspector__prompt-section">
            <div className="image-inspector__section-header">
              <h4>{copy.inspector.prompt}</h4>
            </div>
            <div className="image-inspector__prompt-body">
              <p className="image-inspector__prompt-text">
                {getOptionalText(task.prompt)}
              </p>
            </div>
          </section>

          <section className="image-inspector__section">
            <h4>{copy.inspector.detailsTitle}</h4>
            <dl className="image-inspector__detail-grid">
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.taskStatus}</dt>
                <dd className="image-inspector__detail-value">
                  {taskStatusText}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.taskStartedAt}</dt>
                <dd className="image-inspector__detail-value">
                  {formatDateTime(task.startedAt)}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.negativePrompt}</dt>
                <dd className="image-inspector__detail-value">
                  {getOptionalText(task.negativePrompt)}
                </dd>
              </div>
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.seed}</dt>
                <dd className="image-inspector__detail-value">
                  {getOptionalText(task.seed)}
                </dd>
              </div>
              {task.status === "error" && (
                <div className="image-inspector__detail-item image-inspector__detail-item--wide">
                  <dt>{copy.inspector.taskMessage}</dt>
                  <dd className="image-inspector__detail-value">
                    {getOptionalText(task.errorMessage)}
                  </dd>
                </div>
              )}
              {task.status === "error" && (
                <div className="image-inspector__detail-item image-inspector__detail-item--wide">
                  <dt>{copy.inspector.taskRawError}</dt>
                  <dd className="image-inspector__pre">
                    {getOptionalText(task.rawError)}
                  </dd>
                </div>
              )}
              {task.status === "error" && task.stack && (
                <div className="image-inspector__detail-item image-inspector__detail-item--wide">
                  <dt>{copy.inspector.taskStack}</dt>
                  <dd className="image-inspector__pre">{task.stack}</dd>
                </div>
              )}
            </dl>
          </section>
          {task.status === "error" && onCopyTaskError && (
            <div className="image-inspector__actions">
              <DesktopButton
                type="button"
                size="small"
                onClick={onCopyTaskError}
              >
                {copy.inspector.copyTaskError}
              </DesktopButton>
            </div>
          )}
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
        <div className="image-inspector__empty-card">
          <h2>{copy.inspector.title}</h2>
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
        record.provider?.trim() ||
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
        <header className="image-inspector__hero">
          <div className="image-inspector__hero-main">
            {renaming ? (
              <form
                className="image-inspector__rename-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!onRenameImage || renameSaving) {
                    return;
                  }
                  const nextName = renameValue.trim() || null;
                  setRenameSaving(true);
                  void Promise.resolve(onRenameImage(nextName))
                    .then(() => setRenaming(false))
                    .catch(() => undefined)
                    .finally(() => setRenameSaving(false));
                }}
              >
                <input
                  autoFocus
                  aria-label={copy.inspector.assetName}
                  placeholder={imageTitle}
                  value={renameValue}
                  maxLength={120}
                  onChange={(event) => setRenameValue(event.target.value)}
                />
                <div className="image-inspector__rename-actions">
                  <DesktopButton
                    type="submit"
                    size="small"
                    disabled={renameSaving}
                  >
                    {copy.inspector.saveName}
                  </DesktopButton>
                  <DesktopButton
                    type="button"
                    size="small"
                    onClick={() => setRenaming(false)}
                  >
                    {copy.inspector.cancelRename}
                  </DesktopButton>
                </div>
              </form>
            ) : (
              <div className="image-inspector__title-row">
                <h4>{imageTitle}</h4>
                {onRenameImage ? (
                  <DesktopButton
                    type="button"
                    size="small"
                    onClick={() => {
                      setRenameValue(record.displayName ?? "");
                      setRenaming(true);
                    }}
                  >
                    {copy.inspector.rename}
                  </DesktopButton>
                ) : null}
              </div>
            )}
          </div>
          <dl className="image-inspector__detail-grid image-inspector__metadata">
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.size}</dt>
              <dd className="image-inspector__detail-value">
                {formatSize(record.width, record.height)}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.mimeType}</dt>
              <dd className="image-inspector__detail-value">
                {record.mimeType}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.createdAt}</dt>
              <dd className="image-inspector__detail-value">
                {formatDateTime(record.createdAt)}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.source}</dt>
              <dd className="image-inspector__detail-value">
                {generationAttribution || provenance.sourceLabel}
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
        </header>

        {(hasGenerationParameters ||
          record.prompt?.trim() ||
          promptReferenceList.length > 0) && (
          <section
            className="image-inspector__generation"
            aria-label={
              record.sourceType === "generated"
                ? copy.inspector.generationInfo
                : copy.inspector.prompt
            }
          >
            {record.sourceType === "generated" && (
              <h4>{copy.inspector.generationInfo}</h4>
            )}
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
                      {record.model}
                    </dd>
                  </div>
                )}
                {record.sourceType === "generated" && record.provider && (
                  <div className="image-inspector__detail-item">
                    <dt>{copy.inspector.provider}</dt>
                    <dd className="image-inspector__detail-value">
                      {provenance.providerLabel}
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
          <section className="image-inspector__chain">
            <h4>{copy.inspector.chainTitle}</h4>

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
