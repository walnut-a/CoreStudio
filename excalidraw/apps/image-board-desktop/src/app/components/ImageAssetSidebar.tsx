import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
  type UIEvent,
} from "react";

import type { ImageAssetListItem } from "../imageAssetViewModel";
import type { ImageAssetThumbnailStore } from "../imageAssetThumbnailStore";
import { copy } from "../copy";
import { SideDock } from "./SideDock";

import "./ImageAssetSidebar.css";

interface ImageAssetSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: readonly ImageAssetListItem[];
  selectedFileId?: string | null;
  revealRequest?: { fileId: string; requestId: number } | null;
  onSelectRecord?: (fileId: string) => void;
  onVisibleFileIdsChange?: (fileIds: string[]) => void;
  thumbnailProjectPath?: string | null;
  thumbnailStore?: ImageAssetThumbnailStore;
  rootRef?: Ref<HTMLElement>;
}

const IMAGE_ASSET_ROW_HEIGHT = 64;
const IMAGE_ASSET_DEFAULT_VISIBLE_ROWS = 12;
const IMAGE_ASSET_OVERSCAN_ROWS = 6;
const EMPTY_THUMBNAIL_SNAPSHOT: {
  projectPath: null;
  dataUrls: Readonly<Record<string, string>>;
} = { projectPath: null, dataUrls: {} };
const subscribeToNoopStore = () => () => undefined;
const getEmptyThumbnailSnapshot = () => EMPTY_THUMBNAIL_SNAPSHOT;

const getVirtualRange = ({
  itemCount,
  scrollTop,
  viewportHeight,
}: {
  itemCount: number;
  scrollTop: number;
  viewportHeight: number;
}) => {
  const firstVisibleIndex = Math.floor(scrollTop / IMAGE_ASSET_ROW_HEIGHT);
  const visibleCount = Math.ceil(viewportHeight / IMAGE_ASSET_ROW_HEIGHT);
  return {
    startIndex: Math.max(0, firstVisibleIndex - IMAGE_ASSET_OVERSCAN_ROWS),
    endIndex: Math.min(
      itemCount,
      firstVisibleIndex + visibleCount + IMAGE_ASSET_OVERSCAN_ROWS,
    ),
  };
};

export const ImageAssetSidebar = ({
  open,
  onOpenChange,
  records,
  selectedFileId,
  revealRequest,
  onSelectRecord,
  onVisibleFileIdsChange,
  thumbnailProjectPath,
  thumbnailStore,
  rootRef,
}: ImageAssetSidebarProps) => {
  const [filter, setFilter] = useState<"all" | "generated" | "imported">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const revealTargetRef = useRef<HTMLButtonElement | null>(null);
  const revealRequestId = revealRequest?.requestId;
  const thumbnailSnapshot = useSyncExternalStore(
    thumbnailStore?.subscribe ?? subscribeToNoopStore,
    thumbnailStore?.getSnapshot ?? getEmptyThumbnailSnapshot,
  );
  const thumbnailDataUrls =
    thumbnailSnapshot.projectPath === thumbnailProjectPath
      ? thumbnailSnapshot.dataUrls
      : EMPTY_THUMBNAIL_SNAPSHOT.dataUrls;
  const [viewport, setViewport] = useState({
    scrollTop: 0,
    height: IMAGE_ASSET_ROW_HEIGHT * IMAGE_ASSET_DEFAULT_VISIBLE_ROWS,
  });
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (filter === "all" || record.sourceType === filter) &&
          (!normalizedSearchQuery ||
            record.searchText.includes(normalizedSearchQuery)),
      ),
    [filter, normalizedSearchQuery, records],
  );
  const { startIndex, endIndex } = getVirtualRange({
    itemCount: filteredRecords.length,
    scrollTop: viewport.scrollTop,
    viewportHeight: viewport.height,
  });
  const visibleRecords = useMemo(
    () => filteredRecords.slice(startIndex, endIndex),
    [endIndex, filteredRecords, startIndex],
  );
  const visibleFileIds = useMemo(
    () => visibleRecords.map((record) => record.fileId),
    [visibleRecords],
  );

  useLayoutEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = viewport.scrollTop;
    }
  }, [open]);

  useLayoutEffect(() => {
    const maxScrollTop = Math.max(
      0,
      filteredRecords.length * IMAGE_ASSET_ROW_HEIGHT - viewport.height,
    );
    if (viewport.scrollTop <= maxScrollTop) {
      return;
    }
    if (listRef.current) {
      listRef.current.scrollTop = maxScrollTop;
    }
    setViewport((current) => ({ ...current, scrollTop: maxScrollTop }));
  }, [filteredRecords.length, viewport.height, viewport.scrollTop]);

  useEffect(() => {
    const list = listRef.current;
    if (!open || !list || typeof ResizeObserver === "undefined") {
      return;
    }
    const updateHeight = () => {
      if (list.clientHeight > 0) {
        setViewport((current) => ({
          ...current,
          height: list.clientHeight,
        }));
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(list);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (open) {
      onVisibleFileIdsChange?.(visibleFileIds);
    }
  }, [onVisibleFileIdsChange, open, visibleFileIds]);

  useEffect(() => {
    if (revealRequestId === undefined || !revealRequest) {
      return;
    }
    const index = filteredRecords.findIndex(
      (record) => record.fileId === revealRequest.fileId,
    );
    const list = listRef.current;
    if (index < 0 || !list) {
      return;
    }
    const nextScrollTop = Math.max(
      0,
      index * IMAGE_ASSET_ROW_HEIGHT - viewport.height / 2,
    );
    list.scrollTop = nextScrollTop;
    setViewport((current) => ({ ...current, scrollTop: nextScrollTop }));
  }, [filteredRecords, revealRequest, revealRequestId, viewport.height]);

  useEffect(() => {
    if (revealRequestId === undefined) {
      return;
    }
    revealTargetRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [revealRequestId, startIndex]);

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    setViewport({
      scrollTop: list.scrollTop,
      height: list.clientHeight || viewport.height,
    });
  };

  return (
    <SideDock
      side="left"
      title={copy.agentUi.imageAssetsTitle}
      open={open}
      onOpenChange={onOpenChange}
      rootRef={rootRef}
    >
      <div className="image-asset-sidebar">
        <div className="image-asset-sidebar__controls">
          <input
            type="search"
            className="image-asset-sidebar__search"
            aria-label={copy.agentUi.imageAssetSearch}
            placeholder={copy.agentUi.imageAssetSearch}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <div
            className="image-asset-sidebar__segments"
            aria-label={copy.agentUi.imageAssetFilter}
          >
            {(
              [
                ["all", copy.agentUi.imageAssetFilterAll],
                ["generated", copy.agentUi.imageAssetFilterGenerated],
                ["imported", copy.agentUi.imageAssetFilterImported],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {filteredRecords.length ? (
          <div
            ref={listRef}
            className="image-asset-sidebar__list"
            aria-label={copy.agentUi.imageAssetsList}
            onScroll={handleListScroll}
          >
            <div
              className="image-asset-sidebar__virtual-spacer"
              style={{
                height: filteredRecords.length * IMAGE_ASSET_ROW_HEIGHT,
              }}
            >
              <div
                className="image-asset-sidebar__virtual-window"
                style={{
                  transform: `translateY(${
                    startIndex * IMAGE_ASSET_ROW_HEIGHT
                  }px)`,
                }}
              >
                {visibleRecords.map((record) => (
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
                    {thumbnailDataUrls[record.fileId] ||
                    record.thumbnailDataUrl ? (
                      <img
                        src={
                          thumbnailDataUrls[record.fileId] ??
                          record.thumbnailDataUrl ??
                          undefined
                        }
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        width={38}
                        height={38}
                      />
                    ) : (
                      <span
                        className="image-asset-sidebar__thumbnail"
                        aria-hidden="true"
                      />
                    )}
                    <span className="image-asset-sidebar__item-body">
                      <span className="image-asset-sidebar__item-heading">
                        <strong>{record.title}</strong>
                        <span className="image-asset-sidebar__badges">
                          {record.statusLabels.map((label) => (
                            <span
                              key={label}
                              className="image-asset-sidebar__badge"
                            >
                              {label}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="image-asset-sidebar__meta">
                        <span className="image-asset-sidebar__meta-context">
                          {[
                            record.timeLabel,
                            record.sourceLabel,
                            record.providerLabel,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="image-asset-sidebar__meta-size">
                          {record.sizeLabel}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SideDock>
  );
};
