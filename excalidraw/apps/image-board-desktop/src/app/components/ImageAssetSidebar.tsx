import { useEffect, useRef, type Ref } from "react";

import { Switch } from "@excalidraw/excalidraw/components/Switch";

import type { ImageAssetListItem } from "../imageAssetViewModel";
import { copy } from "../copy";
import { SideDock } from "./SideDock";

import "./ImageAssetSidebar.css";

interface ImageAssetSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: readonly ImageAssetListItem[];
  generatedOnly: boolean;
  onGeneratedOnlyChange: (value: boolean) => void;
  selectedFileId?: string | null;
  revealRequest?: { fileId: string; requestId: number } | null;
  onSelectRecord?: (fileId: string) => void;
  rootRef?: Ref<HTMLElement>;
}

export const ImageAssetSidebar = ({
  open,
  onOpenChange,
  records,
  generatedOnly,
  onGeneratedOnlyChange,
  selectedFileId,
  revealRequest,
  onSelectRecord,
  rootRef,
}: ImageAssetSidebarProps) => {
  const revealTargetRef = useRef<HTMLButtonElement | null>(null);
  const revealRequestId = revealRequest?.requestId;

  useEffect(() => {
    if (revealRequestId === undefined) {
      return;
    }
    revealTargetRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [revealRequestId]);

  return (
    <SideDock
      side="left"
      title={copy.agentUi.imageAssetsTitle}
      open={open}
      onOpenChange={onOpenChange}
      rootRef={rootRef}
    >
      <div className="image-asset-sidebar">
        <label
          className="image-asset-sidebar__filter"
          htmlFor="image-assets-generated-only"
        >
          <span>{copy.agentUi.imageAssetFilterGeneratedOnly}</span>
          <Switch
            name="image-assets-generated-only"
            checked={generatedOnly}
            onChange={onGeneratedOnlyChange}
          />
        </label>
        {records.length ? (
          <div
            className="image-asset-sidebar__list"
            aria-label={copy.agentUi.imageAssetsList}
          >
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`image-asset-sidebar__item${
                  record.fileId === selectedFileId
                    ? " image-asset-sidebar__item--selected"
                    : ""
                }`}
                aria-current={
                  record.fileId === selectedFileId ? "true" : undefined
                }
                ref={
                  record.fileId === revealRequest?.fileId
                    ? revealTargetRef
                    : undefined
                }
                disabled={!onSelectRecord}
                onClick={() => onSelectRecord?.(record.fileId)}
              >
                {record.thumbnailDataUrl ? (
                  <img
                    src={record.thumbnailDataUrl}
                    alt=""
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="image-asset-sidebar__thumbnail"
                    aria-hidden="true"
                  />
                )}
                <span className="image-asset-sidebar__item-body">
                  <strong>{record.title}</strong>
                  <span>
                    {[record.meta, ...record.relationshipLabels]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </SideDock>
  );
};
