import { copy } from "../copy";

export interface GenerationRecordListItem {
  id: string;
  fileId: string;
  title: string;
  meta: string;
  statusLabel?: string;
  thumbnailDataUrl?: string | null;
}

interface GenerationRecordSidebarProps {
  records: readonly GenerationRecordListItem[];
  onSelectRecord?: (fileId: string) => void;
}

export const GenerationRecordSidebar = ({
  records,
  onSelectRecord,
}: GenerationRecordSidebarProps) => {
  return (
    <div className="generation-record-sidebar">
      {records.length > 0 ? (
        <div
          className="generation-record-sidebar__list"
          aria-label={copy.agentUi.generationRecordsList}
        >
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              className="generation-record-sidebar__item"
              disabled={!onSelectRecord}
              onClick={() => onSelectRecord?.(record.fileId)}
            >
              {record.thumbnailDataUrl ? (
                <img src={record.thumbnailDataUrl} alt="" aria-hidden="true" />
              ) : (
                <span
                  className="generation-record-sidebar__thumbnail"
                  aria-hidden="true"
                />
              )}
              <span className="generation-record-sidebar__item-body">
                <strong>{record.title}</strong>
                <span>
                  {[record.meta, record.statusLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
