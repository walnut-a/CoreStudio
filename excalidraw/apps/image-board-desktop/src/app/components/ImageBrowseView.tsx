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
  actualSizeIcon,
  closeIcon,
  browseDownIcon,
  browsePreviousIcon,
  browseNextIcon,
  browseUpIcon,
  fitImageIcon,
  locateImageIcon,
  rightDockIcon,
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
  initialScrollTop?: number;
  onScrollTopChange?: (scrollTop: number) => void;
}

type DetailOriginRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

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
  originRect,
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
  originRect: DetailOriginRect;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<
    "preparing" | "opening" | "idle" | "closing"
  >("preparing");
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
    const animationFrame = window.requestAnimationFrame(() => {
      setMotion((current) => (current === "preparing" ? "opening" : current));
    });
    const tooltip = getTooltipDiv();
    dialog.appendChild(tooltip);
    return () => {
      tooltip.classList.remove("excalidraw-tooltip--visible");
      document.body.appendChild(tooltip);
      window.cancelAnimationFrame(animationFrame);
      dialog.close();
    };
  }, []);
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const bounds = imageStageRef.current!.getBoundingClientRect();
    if (bounds.width > 0 && bounds.height > 0) {
      const targetAspectRatio = Math.max(0.01, item.aspectRatio);
      const stageAspectRatio = bounds.width / bounds.height;
      const targetWidth =
        targetAspectRatio >= stageAspectRatio
          ? bounds.width
          : bounds.height * targetAspectRatio;
      const targetHeight =
        targetAspectRatio >= stageAspectRatio
          ? bounds.width / targetAspectRatio
          : bounds.height;
      const originScale = Math.max(
        0.04,
        Math.min(
          1,
          originRect.width / targetWidth,
          originRect.height / targetHeight,
        ),
      );
      const originCenterX = originRect.left + originRect.width / 2;
      const originCenterY = originRect.top + originRect.height / 2;
      dialog.style.setProperty(
        "--image-browse-origin-x",
        `${originCenterX - (bounds.left + bounds.width / 2)}px`,
      );
      dialog.style.setProperty(
        "--image-browse-origin-y",
        `${originCenterY - (bounds.top + bounds.height / 2)}px`,
      );
      dialog.style.setProperty(
        "--image-browse-origin-scale-x",
        String(originScale),
      );
      dialog.style.setProperty(
        "--image-browse-origin-scale-y",
        String(originScale),
      );
    }
  }, [item.aspectRatio, originRect]);
  useEffect(() => {
    if (motion !== "closing") return;
    const fallback = window.setTimeout(onClose, 280);
    return () => window.clearTimeout(fallback);
  }, [motion, onClose]);
  useEffect(() => setActualSize(false), [item.fileId]);
  const requestClose = useCallback(() => {
    setMotion((current) => (current === "closing" ? current : "closing"));
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="image-browse-detail"
      style={{ overflow: "hidden" }}
      data-motion={motion}
      aria-label={item.title}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (motion === "closing") onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
        if (
          motion !== "closing" &&
          !actualSize &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
          event.preventDefault();
          onNavigate(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
    >
      <div className="image-browse-detail__body">
        <div ref={imageStageRef} className="image-browse-detail__image">
          <div
            className="image-browse-detail__media"
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              if (motion === "closing") {
                onClose();
              } else if (motion === "opening") {
                setMotion("idle");
              }
            }}
          >
            <OriginalImage
              item={item}
              readOriginal={readOriginal}
              actualSize={actualSize}
              thumbnail={thumbnail}
              onReady={onImageReady}
            />
          </div>
        </div>
        {propertiesOpen && relationships && (
          <aside
            id={propertiesId}
            className="image-browse-detail__properties"
            data-open="true"
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
      <div
        className="image-browse-detail__actions"
        role="toolbar"
        aria-label={copy.browse.imageActions}
      >
        <div className="image-browse-detail__action-group">
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={copy.browse.close}
            title={copy.browse.close}
            data-label={copy.browse.close}
            disabled={motion === "closing"}
            onClick={requestClose}
          >
            {closeIcon}
          </DesktopButton>
          <span className="image-browse-detail__action-separator" />
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={copy.browse.locateOnCanvas}
            title={copy.browse.locateOnCanvas}
            data-label={copy.browse.locateOnCanvas}
            onClick={() => onLocateImage(item.fileId)}
          >
            {locateImageIcon}
          </DesktopButton>
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={actualSize ? copy.browse.fit : copy.browse.actualSize}
            title={actualSize ? copy.browse.fit : copy.browse.actualSize}
            data-label={actualSize ? copy.browse.fit : copy.browse.actualSize}
            aria-pressed={actualSize}
            onClick={() => setActualSize((value) => !value)}
          >
            {actualSize ? fitImageIcon : actualSizeIcon}
          </DesktopButton>
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={copy.browse.properties}
            title={copy.browse.properties}
            data-label={copy.browse.properties}
            aria-expanded={propertiesOpen}
            aria-controls={propertiesId}
            aria-pressed={propertiesOpen}
            onClick={() => setPropertiesOpen((open) => !open)}
          >
            {rightDockIcon}
          </DesktopButton>
        </div>
        <div className="image-browse-detail__navigation">
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={copy.browse.previous}
            title={copy.browse.previous}
            data-label={copy.browse.previous}
            disabled={index === 0}
            onClick={() => onNavigate(-1)}
          >
            {browseUpIcon}
          </DesktopButton>
          <span className="image-browse-detail__counter">
            {index + 1} / {count}
          </span>
          <DesktopButton
            size="small"
            className="image-browse-detail__action"
            aria-label={copy.browse.next}
            title={copy.browse.next}
            data-label={copy.browse.next}
            disabled={index === count - 1}
            onClick={() => onNavigate(1)}
          >
            {browseDownIcon}
          </DesktopButton>
        </div>
      </div>
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
  initialScrollTop = 0,
  onScrollTopChange,
}: ImageBrowseViewProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollIdleTimerRef = useRef<number | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const [detailOrigin, setDetailOrigin] = useState<DetailOriginRect | null>(
    null,
  );
  const [viewport, setViewport] = useState({
    width: 900,
    height: 600,
    scrollTop: initialScrollTop,
  });
  const [scrolling, setScrolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const thumbnails = useSyncExternalStore(
    thumbnailStore.subscribe,
    thumbnailStore.getSnapshot,
  );
  useLayoutEffect(() => {
    const grid = gridRef.current!;
    grid.scrollTop = initialScrollTop;
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
  }, [initialScrollTop]);
  useEffect(() => () => window.clearTimeout(scrollIdleTimerRef.current), []);
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
  useLayoutEffect(() => {
    if (!selectedId || selectedIndex < 0) return;
    const grid = gridRef.current;
    const tile = layout.tiles[selectedIndex];
    if (!grid || !tile) return;
    const viewportTop = viewport.scrollTop;
    const viewportBottom = viewportTop + viewport.height;
    let nextScrollTop = viewportTop;
    if (tile.top < viewportTop) {
      nextScrollTop = Math.max(0, tile.top);
    } else if (tile.top + tile.height > viewportBottom) {
      nextScrollTop = Math.min(
        tile.top,
        Math.max(0, layout.totalHeight - viewport.height),
      );
    }
    if (nextScrollTop !== viewportTop) {
      grid.scrollTop = nextScrollTop;
      setViewport((value) => ({ ...value, scrollTop: nextScrollTop }));
      onScrollTopChange?.(nextScrollTop);
      return;
    }
    const currentTile = tileRefs.current.get(selectedId);
    if (!currentTile) return;
    triggerRef.current = currentTile;
    const { left, top, width, height } = currentTile.getBoundingClientRect();
    setDetailOrigin((current) =>
      current &&
      current.left === left &&
      current.top === top &&
      current.width === width &&
      current.height === height
        ? current
        : { left, top, width, height },
    );
  }, [
    layout,
    onScrollTopChange,
    selectedId,
    selectedIndex,
    viewport.height,
    viewport.scrollTop,
  ]);
  const close = () => {
    setSelectedId(null);
    // Keep the grid mounted: its scroll position and originating focus survive the dialog.
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (triggerRef.current?.isConnected) {
          triggerRef.current.focus({ preventScroll: true });
        } else {
          gridRef.current?.focus({ preventScroll: true });
        }
      }, 0);
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
        {viewport.scrollTop > 160 && (
          <DesktopButton
            size="small"
            onClick={() => {
              const grid = gridRef.current;
              if (!grid) return;
              const reduceMotion =
                window.matchMedia?.("(prefers-reduced-motion: reduce)")
                  ?.matches ?? false;
              grid.scrollTo({
                top: 0,
                behavior: reduceMotion ? "auto" : "smooth",
              });
            }}
          >
            {browseUpIcon}
            {copy.browse.backToTop}
          </DesktopButton>
        )}
      </header>
      <div
        ref={gridRef}
        className="image-browse-grid"
        data-scrolling={scrolling ? "true" : "false"}
        role="region"
        aria-label={copy.browse.grid}
        tabIndex={0}
        onScroll={(event) => {
          const scrollTop = event.currentTarget.scrollTop;
          setViewport((value) => ({ ...value, scrollTop }));
          onScrollTopChange?.(scrollTop);
          setScrolling(true);
          window.clearTimeout(scrollIdleTimerRef.current);
          scrollIdleTimerRef.current = window.setTimeout(
            () => setScrolling(false),
            650,
          );
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
                  ref={(element) => {
                    if (element) tileRefs.current.set(item.fileId, element);
                    else tileRefs.current.delete(item.fileId);
                  }}
                  type="button"
                  className="image-browse-tile"
                  style={layout.tiles[range.start + index]}
                  aria-label={item.title}
                  title={item.title}
                  onClick={(event) => {
                    triggerRef.current = event.currentTarget;
                    const { left, top, width, height } =
                      event.currentTarget.getBoundingClientRect();
                    setDetailOrigin({ left, top, width, height });
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
      {selectedIndex >= 0 && detailOrigin && (
        <ImageDetail
          projectPath={projectPath}
          imageRecords={imageRecords}
          onCopyText={onCopyText}
          onCopyColor={onCopyColor}
          originRect={detailOrigin}
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
