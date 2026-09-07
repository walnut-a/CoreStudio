import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ImageRecordMap } from "../../shared/projectTypes";
import { getImageAncestors, getImageDescendants } from "../imageRelationships";
import { ImageInspector } from "./ImageInspector";
import "./ImageInspector.css";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";
import type { ImageAssetThumbnailStore } from "../imageAssetThumbnailStore";
import {
  buildBrowseLayout,
  getBrowseWindow,
  type ImageBrowseItem,
} from "../imageBrowseModel";
import { copy } from "../copy";
import {
  closeIcon,
  browsePreviousIcon,
  browseNextIcon,
} from "./CoreStudioIcons";
import { DesktopButton } from "./DesktopButton";
import "./ImageBrowseView.css";

interface ImageBrowseViewProps {
  items: readonly ImageBrowseItem[];
  imageRecords: ImageRecordMap;
  onCopyText: (text: string) => void;
  projectPath: string;
  thumbnailStore: ImageAssetThumbnailStore;
  onVisibleFileIdsChange: (fileIds: string[]) => unknown;
  readOriginal: (fileId: string) => Promise<ProjectAssetPayload | undefined>;
  onBackToCanvas: () => void;
  onLocateImage: (fileId: string) => void;
}

const OriginalImage = ({
  item,
  readOriginal,
  actualSize,
  thumbnail,
}: {
  item: ImageBrowseItem;
  readOriginal: ImageBrowseViewProps["readOriginal"];
  actualSize: boolean;
  thumbnail?: string;
}) => {
  const [asset, setAsset] = useState<ProjectAssetPayload>();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setAsset(undefined);
    setReady(false);
    setFailed(false);
    void readOriginal(item.fileId)
      .then((result) => {
        if (current) {
          setAsset(result);
          setFailed(!result);
        }
      })
      .catch(() => {
        if (current) {
          setFailed(true);
        }
      });
    return () => {
      current = false;
    };
  }, [item.fileId, readOriginal, attempt]);
  return (
    <div
      className={`image-browse-original${
        actualSize && ready ? " image-browse-original--actual" : ""
      }`}
    >
      {(!ready || !actualSize) && thumbnail && !previewFailed && (
        <img
          className={`image-browse-original__preview${
            ready ? " image-browse-original__preview--loaded" : ""
          }`}
          src={thumbnail}
          alt=""
          draggable={false}
          onError={() => setPreviewFailed(true)}
        />
      )}
      {asset && !failed && (
        <img
          className={`image-browse-original__full${
            ready ? " image-browse-original__full--ready" : ""
          }`}
          src={`data:${asset.mimeType};base64,${asset.dataBase64}`}
          alt={item.title}
          draggable={false}
          width={asset.width}
          height={asset.height}
          onLoad={() => setReady(true)}
          onError={() => {
            setReady(false);
            setFailed(true);
          }}
        />
      )}
      {!ready && (
        <div className="image-browse-original__status" role="status">
          <span>{failed ? copy.browse.loadFailed : copy.browse.loading}</span>
          {failed && (
            <DesktopButton
              size="small"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {copy.browse.retry}
            </DesktopButton>
          )}
        </div>
      )}
    </div>
  );
};

const ImageDetail = ({
  projectPath,
  item,
  index,
  count,
  readOriginal,
  onClose,
  onNavigate,
  onLocateImage,
  thumbnail,
  imageRecords,
  onCopyText,
}: {
  projectPath: string;
  imageRecords: ImageRecordMap;
  onCopyText: ImageBrowseViewProps["onCopyText"];
  item: ImageBrowseItem;
  index: number;
  count: number;
  readOriginal: ImageBrowseViewProps["readOriginal"];
  onClose: () => void;
  onNavigate: (delta: number) => void;
  onLocateImage: ImageBrowseViewProps["onLocateImage"];
  thumbnail?: string;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [actualSize, setActualSize] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const propertiesId = useId();
  const record = imageRecords[item.fileId] ?? null;
  const relationships = useMemo(
    () =>
      propertiesOpen
        ? {
            ancestors: getImageAncestors(imageRecords, record),
            descendants: getImageDescendants(imageRecords, record),
          }
        : null,
    [imageRecords, record, propertiesOpen],
  );
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  useEffect(() => setActualSize(false), [item.fileId]);
  return (
    <dialog
      ref={dialogRef}
      className="image-browse-detail"
      aria-label={item.title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
        if (
          !actualSize &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          event.preventDefault();
          onNavigate(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <header className="image-browse-detail__header">
        <div className="image-browse-detail__title">
          <strong title={item.title}>{item.title}</strong>
          <span>{item.sizeLabel}</span>
        </div>
        <DesktopButton size="small" onClick={() => onLocateImage(item.fileId)}>
          {copy.browse.locateOnCanvas}
        </DesktopButton>
        <DesktopButton
          size="small"
          aria-pressed={actualSize}
          onClick={() => setActualSize((value) => !value)}
        >
          {actualSize ? copy.browse.fit : copy.browse.actualSize}
        </DesktopButton>
        <DesktopButton
          size="small"
          aria-expanded={propertiesOpen}
          aria-controls={propertiesId}
          onClick={() => setPropertiesOpen((open) => !open)}
        >
          {copy.browse.properties}
        </DesktopButton>
        <DesktopButton
          size="small"
          className="image-browse-icon-button"
          aria-label={copy.browse.close}
          title={copy.browse.close}
          onClick={onClose}
        >
          {closeIcon}
        </DesktopButton>
      </header>
      <div className="image-browse-detail__body">
        <div key={item.fileId} className="image-browse-detail__image">
          <OriginalImage
            item={item}
            readOriginal={readOriginal}
            actualSize={actualSize}
            thumbnail={thumbnail}
          />
        </div>
        {propertiesOpen && relationships && (
          <aside
            id={propertiesId}
            className="image-browse-detail__properties"
            aria-label={copy.browse.imageProperties}
          >
            {record ? (
              <ImageInspector
                projectPath={projectPath}
                key={record.fileId}
                record={record}
                ancestorRecords={relationships.ancestors}
                descendantRecords={relationships.descendants}
                task={null}
                onCopyPrompt={() => onCopyText(record.prompt ?? "")}
                onCopyImageId={() => onCopyText(record.fileId)}
              />
            ) : (
              <p className="image-browse-detail__properties-empty">
                {copy.browse.noProperties}
              </p>
            )}
          </aside>
        )}
      </div>
      <footer className="image-browse-detail__footer">
        <DesktopButton
          size="small"
          className="image-browse-icon-button"
          aria-label={copy.browse.previous}
          title={copy.browse.previous}
          disabled={index === 0}
          onClick={() => onNavigate(-1)}
        >
          {browsePreviousIcon}
        </DesktopButton>
        <span>
          {index + 1} / {count}
        </span>
        <DesktopButton
          size="small"
          className="image-browse-icon-button"
          aria-label={copy.browse.next}
          title={copy.browse.next}
          disabled={index === count - 1}
          onClick={() => onNavigate(1)}
        >
          {browseNextIcon}
        </DesktopButton>
      </footer>
    </dialog>
  );
};

export const ImageBrowseView = ({
  items,
  imageRecords,
  onCopyText,
  projectPath,
  thumbnailStore,
  onVisibleFileIdsChange,
  readOriginal,
  onBackToCanvas,
  onLocateImage,
}: ImageBrowseViewProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [viewport, setViewport] = useState({
    width: 900,
    height: 600,
    scrollTop: 0,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const thumbnails = useSyncExternalStore(
    thumbnailStore.subscribe,
    thumbnailStore.getSnapshot,
  );
  useLayoutEffect(() => {
    const grid = gridRef.current!;
    const resize = () => {
      const style = getComputedStyle(grid);
      const padding =
        (parseFloat(style.paddingLeft) || 0) +
        (parseFloat(style.paddingRight) || 0);
      setViewport((value) => ({
        ...value,
        width: grid.clientWidth ? grid.clientWidth - padding : 900,
        height: grid.clientHeight || 600,
      }));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);
  const layout = useMemo(
    () => buildBrowseLayout(items, viewport.width),
    [items, viewport.width],
  );
  const range = getBrowseWindow(layout, viewport.height, viewport.scrollTop);
  const visibleItems = useMemo(
    () => items.slice(range.start, range.end),
    [items, range.start, range.end],
  );
  useEffect(() => {
    void onVisibleFileIdsChange(visibleItems.map((item) => item.fileId));
  }, [visibleItems, onVisibleFileIdsChange]);
  const selectedIndex = items.findIndex((item) => item.fileId === selectedId);
  const close = () => {
    setSelectedId(null);
    // Keep the grid mounted: its scroll position and originating focus survive the dialog.
    queueMicrotask(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus({ preventScroll: true });
      } else {
        gridRef.current?.focus({ preventScroll: true });
      }
    });
  };
  useEffect(() => {
    if (selectedId && selectedIndex < 0) {
      close();
    }
  }, [selectedId, selectedIndex]);
  return (
    <section
      className="image-browse-view"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="image-browse-navigation">
        <DesktopButton size="small" onClick={onBackToCanvas}>
          {browsePreviousIcon}
          {copy.browse.backToCanvas}
        </DesktopButton>
      </header>
      <div
        ref={gridRef}
        className="image-browse-grid"
        role="region"
        aria-label={copy.browse.grid}
        tabIndex={0}
        onScroll={(event) => {
          const scrollTop = event.currentTarget.scrollTop;
          setViewport((value) => ({ ...value, scrollTop }));
        }}
      >
        {items.length === 0 ? (
          <p className="image-browse-message">{copy.browse.empty}</p>
        ) : (
          <div
            className="image-browse-grid__items"
            style={{ height: layout.totalHeight }}
          >
            {visibleItems.map((item, index) => {
              const thumbnail =
                thumbnails.projectPath === projectPath
                  ? thumbnails.dataUrls[item.fileId]
                  : undefined;
              return (
                <button
                  key={item.fileId}
                  type="button"
                  className="image-browse-tile"
                  style={layout.tiles[range.start + index]}
                  aria-label={item.title}
                  title={item.title}
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    setSelectedId(item.fileId);
                  }}
                >
                  <span className="image-browse-tile__image">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" draggable={false} />
                    ) : (
                      <span className="image-browse-tile__placeholder">
                        {copy.browse.previewUnavailable}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedIndex >= 0 && (
        <ImageDetail
          projectPath={projectPath}
          imageRecords={imageRecords}
          onCopyText={onCopyText}
          item={items[selectedIndex]}
          index={selectedIndex}
          count={items.length}
          readOriginal={readOriginal}
          thumbnail={
            thumbnails.projectPath === projectPath
              ? thumbnails.dataUrls[items[selectedIndex].fileId]
              : undefined
          }
          onClose={close}
          onLocateImage={onLocateImage}
          onNavigate={(delta) => {
            const next = items[selectedIndex + delta];
            if (next) {
              setSelectedId(next.fileId);
            }
          }}
        />
      )}
    </section>
  );
};
