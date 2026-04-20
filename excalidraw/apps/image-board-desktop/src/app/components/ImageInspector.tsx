import type { ImageRecord } from "../../shared/projectTypes";
import type { ProviderId } from "../../shared/providerTypes";
import type { ImageLineageEntry } from "../imageRelationships";
import {
  copy,
  getImageSourceLabel,
  getOptionalText,
} from "../copy";
import { getProviderDefinition } from "../../shared/providerCatalog";
import { DesktopButton } from "./DesktopButton";

export interface GenerationTaskRecord {
  status: "pending" | "error";
  provider: ProviderId;
  model: string;
  prompt: string;
  negativePrompt?: string | null;
  seed?: number | null;
  width: number;
  height: number;
  startedAt: string;
  errorMessage?: string | null;
  rawError?: string | null;
  stack?: string | null;
}

interface ImageInspectorProps {
  record: ImageRecord | null;
  parentRecord: ImageRecord | null;
  ancestorRecords: ImageRecord[];
  descendantRecords: ImageLineageEntry[];
  task: GenerationTaskRecord | null;
  onCopyPrompt: () => void;
  onReuseSettings: () => void;
  onCopyTaskError: () => void;
}

const getImageRecordSummary = (record: ImageRecord) => {
  const prompt = record.prompt?.trim();
  const promptSummary = prompt
    ? prompt.length > 48
      ? `${prompt.slice(0, 48)}...`
      : prompt
    : record.fileId;

  return `${new Date(record.createdAt).toLocaleString("zh-CN")} · ${promptSummary}`;
};

const getParentImageSummary = (
  record: ImageRecord,
  parentRecord: ImageRecord | null,
) => {
  if (!record.parentFileId) {
    return null;
  }

  if (!parentRecord) {
    return record.parentFileId;
  }

  return getImageRecordSummary(parentRecord);
};

const formatDateTime = (value: string) => new Date(value).toLocaleString("zh-CN");

const formatSize = (width: number, height: number) => `${width} × ${height}`;

const getProviderLabel = (provider?: ProviderId) =>
  provider ? getProviderDefinition(provider).label : copy.inspector.importedProvider;

const getImageRecordTitle = (record: ImageRecord) =>
  record.sourceType === "generated"
    ? copy.inspector.generatedImageTitle
    : copy.inspector.importedImageTitle;

export const ImageInspector = ({
  record,
  parentRecord,
  ancestorRecords,
  descendantRecords,
  task,
  onCopyPrompt,
  onReuseSettings,
  onCopyTaskError,
}: ImageInspectorProps) => {
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
      task.status === "error" ? copy.inspector.taskFailed : copy.inspector.taskPending;

    return (
      <section className="image-inspector">
        <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
          <header className="image-inspector__hero">
            <div className="image-inspector__hero-main">
              <span className="image-inspector__eyebrow">{taskStatusText}</span>
              <h2>{copy.inspector.taskTitle}</h2>
              <p>{getOptionalText(task.model)}</p>
            </div>
            <div className="image-inspector__hero-facts">
              <span>{getProviderDefinition(task.provider).label}</span>
              <span>{formatSize(task.width, task.height)}</span>
            </div>
          </header>

          <section className="image-inspector__prompt-card">
            <div className="image-inspector__section-header">
              <h3>{copy.inspector.prompt}</h3>
            </div>
            <p className="image-inspector__prompt-text">
              {getOptionalText(task.prompt)}
            </p>
          </section>

          <section className="image-inspector__section">
            <h3>{copy.inspector.detailsTitle}</h3>
            <dl className="image-inspector__detail-grid">
              <div className="image-inspector__detail-item">
                <dt>{copy.inspector.taskStatus}</dt>
                <dd className="image-inspector__detail-value">{taskStatusText}</dd>
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
          {task.status === "error" && (
            <div className="image-inspector__actions">
              <DesktopButton type="button" onClick={onCopyTaskError}>
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
      <section className="image-inspector image-inspector--empty">
        <div className="image-inspector__empty-card">
          <h2>{copy.inspector.title}</h2>
          <p>{copy.inspector.empty}</p>
        </div>
      </section>
    );
  }

  const sourceLabel = getImageSourceLabel(record.sourceType);
  const imageTitle = getImageRecordTitle(record);
  const modelText = getOptionalText(record.model);
  const parentSummary = getParentImageSummary(record, parentRecord);

  return (
    <section className="image-inspector">
      <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
        <header className="image-inspector__hero">
          <div className="image-inspector__hero-main">
            <span className="image-inspector__eyebrow">{sourceLabel}</span>
            <h2>{imageTitle}</h2>
            <p>{modelText}</p>
          </div>
          <div className="image-inspector__hero-facts">
            <span>{formatSize(record.width, record.height)}</span>
            <span>{formatDateTime(record.createdAt)}</span>
          </div>
        </header>

        <section className="image-inspector__prompt-card">
          <div className="image-inspector__section-header">
            <h3>{copy.inspector.prompt}</h3>
          </div>
          <p className="image-inspector__prompt-text">
            {getOptionalText(record.prompt)}
          </p>
        </section>

        <section className="image-inspector__section">
          <h3>{copy.inspector.detailsTitle}</h3>
          <dl className="image-inspector__detail-grid">
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.source}</dt>
              <dd className="image-inspector__detail-value">{sourceLabel}</dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.provider}</dt>
              <dd className="image-inspector__detail-value">
                {getProviderLabel(record.provider)}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.model}</dt>
              <dd className="image-inspector__detail-value">{modelText}</dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.size}</dt>
              <dd className="image-inspector__detail-value">
                {formatSize(record.width, record.height)}
              </dd>
            </div>
            {record.parentFileId && (
              <div className="image-inspector__detail-item image-inspector__detail-item--wide">
                <dt>{copy.inspector.parentImage}</dt>
                <dd className="image-inspector__detail-value">
                  {parentSummary}
                </dd>
              </div>
            )}
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.negativePrompt}</dt>
              <dd className="image-inspector__detail-value">
                {getOptionalText(record.negativePrompt)}
              </dd>
            </div>
            <div className="image-inspector__detail-item">
              <dt>{copy.inspector.seed}</dt>
              <dd className="image-inspector__detail-value">
                {getOptionalText(record.seed)}
              </dd>
            </div>
          </dl>
        </section>
        {(ancestorRecords.length > 0 || descendantRecords.length > 0) && (
          <section className="image-inspector__chain">
            <h3>{copy.inspector.chainTitle}</h3>

            <ol className="image-inspector__chain-list">
              {ancestorRecords.map((ancestorRecord) => (
                <li
                  key={ancestorRecord.fileId}
                  className="image-inspector__chain-item"
                >
                  <span className="image-inspector__chain-summary">
                    {getImageRecordSummary(ancestorRecord)}
                  </span>
                </li>
              ))}
              <li className="image-inspector__chain-item image-inspector__chain-item--current">
                <span className="image-inspector__chain-label">
                  {copy.inspector.currentImage}
                </span>
                <span className="image-inspector__chain-summary">
                  {getImageRecordSummary(record)}
                </span>
              </li>
            </ol>

            {descendantRecords.length > 0 && (
              <div className="image-inspector__chain-group">
                <p className="image-inspector__chain-group-title">
                  {copy.inspector.descendantImages}
                </p>
                <ol className="image-inspector__chain-list image-inspector__chain-list--descendants">
                  {descendantRecords.map(({ record: descendantRecord, depth }) => (
                    <li
                      key={descendantRecord.fileId}
                      className="image-inspector__chain-item"
                      style={{
                        "--image-inspector-chain-depth": `${depth}`,
                      } as React.CSSProperties}
                    >
                      <span className="image-inspector__chain-summary">
                        {getImageRecordSummary(descendantRecord)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        )}
        <div className="image-inspector__actions">
          <DesktopButton
            type="button"
            onClick={onCopyPrompt}
            disabled={!record.prompt}
          >
            {copy.inspector.copyPrompt}
          </DesktopButton>
          <DesktopButton
            type="button"
            onClick={onReuseSettings}
            disabled={record.sourceType !== "generated"}
          >
            {copy.inspector.reuseSettings}
          </DesktopButton>
        </div>
      </div>
    </section>
  );
};
