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
    return (
      <section className="image-inspector">
        <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
          <h2>{copy.inspector.taskTitle}</h2>
          <dl>
            <div>
              <dt>{copy.inspector.taskStatus}</dt>
              <dd>
                {task.status === "error"
                  ? copy.inspector.taskFailed
                  : copy.inspector.taskPending}
              </dd>
            </div>
            <div>
              <dt>{copy.inspector.provider}</dt>
              <dd>{getProviderDefinition(task.provider).label}</dd>
            </div>
            <div>
              <dt>{copy.inspector.model}</dt>
              <dd>{getOptionalText(task.model)}</dd>
            </div>
            <div>
              <dt>{copy.inspector.prompt}</dt>
              <dd>{getOptionalText(task.prompt)}</dd>
            </div>
            <div>
              <dt>{copy.inspector.negativePrompt}</dt>
              <dd>{getOptionalText(task.negativePrompt)}</dd>
            </div>
            <div>
              <dt>{copy.inspector.seed}</dt>
              <dd>{getOptionalText(task.seed)}</dd>
            </div>
            <div>
              <dt>{copy.inspector.size}</dt>
              <dd>
                {task.width} × {task.height}
              </dd>
            </div>
            <div>
              <dt>{copy.inspector.taskStartedAt}</dt>
              <dd>{new Date(task.startedAt).toLocaleString("zh-CN")}</dd>
            </div>
            {task.status === "error" && (
              <div>
                <dt>{copy.inspector.taskMessage}</dt>
                <dd>{getOptionalText(task.errorMessage)}</dd>
              </div>
            )}
            {task.status === "error" && (
              <div>
                <dt>{copy.inspector.taskRawError}</dt>
                <dd className="image-inspector__pre">
                  {getOptionalText(task.rawError)}
                </dd>
              </div>
            )}
            {task.status === "error" && task.stack && (
              <div>
                <dt>{copy.inspector.taskStack}</dt>
                <dd className="image-inspector__pre">{task.stack}</dd>
              </div>
            )}
          </dl>
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
        <h2>{copy.inspector.title}</h2>
        <p>{copy.inspector.empty}</p>
      </section>
    );
  }

  return (
    <section className="image-inspector">
      <div className="image-inspector__scroll" onWheel={handleScrollWheel}>
        <h2>{copy.inspector.title}</h2>
        <dl>
          <div>
            <dt>{copy.inspector.source}</dt>
            <dd>{getImageSourceLabel(record.sourceType)}</dd>
          </div>
          {record.parentFileId && (
            <div>
              <dt>{copy.inspector.parentImage}</dt>
              <dd>{getParentImageSummary(record, parentRecord)}</dd>
            </div>
          )}
          <div>
            <dt>{copy.inspector.provider}</dt>
            <dd>{record.provider || copy.inspector.importedProvider}</dd>
          </div>
          <div>
            <dt>{copy.inspector.model}</dt>
            <dd>{getOptionalText(record.model)}</dd>
          </div>
          <div>
            <dt>{copy.inspector.prompt}</dt>
            <dd>{getOptionalText(record.prompt)}</dd>
          </div>
          <div>
            <dt>{copy.inspector.negativePrompt}</dt>
            <dd>{getOptionalText(record.negativePrompt)}</dd>
          </div>
          <div>
            <dt>{copy.inspector.seed}</dt>
            <dd>{getOptionalText(record.seed)}</dd>
          </div>
          <div>
            <dt>{copy.inspector.size}</dt>
            <dd>
              {record.width} × {record.height}
            </dd>
          </div>
          <div>
            <dt>{copy.inspector.createdAt}</dt>
            <dd>{new Date(record.createdAt).toLocaleString("zh-CN")}</dd>
          </div>
        </dl>
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
