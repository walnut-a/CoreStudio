import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { getTooltipDiv } from "@excalidraw/excalidraw/components/Tooltip";
import type { ImageRecordMap } from "../../shared/projectTypes";
import { getImageAncestors, getImageDescendants } from "../imageRelationships";
import { ImagePalette } from "./ImagePalette";
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
  onCopyColor: (hex: string) => void;
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
  onReady,
}: {
  onReady: (fileId: string, image: HTMLImageElement) => void;
  item: ImageBrowseItem;
  readOriginal: ImageBrowseViewProps["readOriginal"];
  actualSize: boolean;
  thumbnail?: string;
}) => {
  type LoadedImage = { asset: ProjectAssetPayload; title: string };
  type PendingImage = LoadedImage & {
    loaded: (image: HTMLImageElement) => Promise<void>;
    failed: () => void;
  };
  const [displayed, setDisplayed] = useState<LoadedImage>();
  const [pending, setPending] = useState<PendingImage>();
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ready = displayed?.asset.fileId === item.fileId && !pending && !failed;
  useEffect(() => {
    let current = true;
    setPending(undefined);
    setFailed(false);
    setPreviewFailed(false);
    if (displayed?.asset.fileId === item.fileId) return;
    const fail = () => {
      if (current) {
        setPending(undefined);
        setFailed(true);
      }
    };
    void readOriginal(item.fileId)
      .then((asset) => {
        if (!current) return;
        if (!asset) {
          fail();
          return;
        }
        const next = { asset, title: item.title };
        setPending({
          ...next,
          failed: fail,
          loaded: async (image) => {
            try {
              await image.decode?.();
              if (current) {
                // Keep the decoded DOM image mounted while replacing the old frame.
                onReady(item.fileId, image);
                setDisplayed(next);
                setPending(undefined);
              }
            } catch {
              fail();
            }
          },
        });
      })
      .catch(fail);
    return () => {
      current = false;
    };
  }, [item.fileId, readOriginal, attempt]);
  const frames = [displayed, pending].filter(
    (frame): frame is LoadedImage | PendingImage => Boolean(frame),
  );
  return (
    <div
      className={`image-browse-original${
        actualSize && displayed ? " image-browse-original--actual" : ""
      }`}
    >
      {!displayed && thumbnail && !previewFailed && (
        <img
          className="image-browse-original__preview"
          src={thumbnail}
          alt=""
          draggable={false}
          onError={() => setPreviewFailed(true)}
        />
      )}
      {frames.map((frame) => {
        const isPending = "loaded" in frame;
        return (
          <img
            key={frame.asset.fileId}
            className={`image-browse-original__full${
              isPending
                ? " image-browse-original__full--pending"
                : " image-browse-original__full--ready"
            }`}
            src={`data:${frame.asset.mimeType};base64,${frame.asset.dataBase64}`}
            alt={frame.title}
            draggable={false}
            width={frame.asset.width}
            height={frame.asset.height}
            onLoad={
              isPending
                ? (event) => {
                    void frame.loaded(event.currentTarget);
                  }
                : undefined
            }
            onError={isPending ? frame.failed : undefined}
          />
        );
      })}
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
  onCopyColor,
}: {
  projectPath: string;
  imageRecords: ImageRecordMap;
  onCopyText: ImageBrowseViewProps["onCopyText"];
  onCopyColor: ImageBrowseViewProps["onCopyColor"];
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
  const [loadedImage, setLoadedImage] = useState<{
    fileId: string;
    image: HTMLImageElement;
  } | null>(null);
  const onImageReady = useCallback(
    (fileId: string, image: HTMLImageElement) =>
      setLoadedImage({ fileId, image }),
    [],
  );

  const colorProperties = (
    <ImagePalette
      fileId={item.fileId}
      projectPath={projectPath}
      image={loadedImage?.fileId === item.fileId ? loadedImage.image : null}
      onCopyColor={onCopyColor}
    />
  );
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
    const tooltip = getTooltipDiv();
    dialog.appendChild(tooltip);
    return () => {
      tooltip.classList.remove("excalidraw-tooltip--visible");
      document.body.appendChild(tooltip);
      dialog.close();
    };
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
        <div className="image-browse-detail__image">
          <OriginalImage
            item={item}
            readOriginal={readOriginal}
            actualSize={actualSize}
            thumbnail={thumbnail}
            onReady={onImageReady}
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
                colorProperties={colorProperties}
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
              <>
                {colorProperties}
                <p className="image-browse-detail__properties-empty">
                  {copy.browse.noProperties}
                </p>
              </>
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
  onCopyColor,
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
          onCopyColor={onCopyColor}
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
