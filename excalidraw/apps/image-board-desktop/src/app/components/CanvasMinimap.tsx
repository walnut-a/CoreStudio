import { Tooltip } from "@excalidraw/excalidraw/components/Tooltip";
import { IconButton } from "@excalidraw/excalidraw/components/IconButton";
import type {
  ExcalidrawImperativeAPI,
  Offsets,
} from "@excalidraw/excalidraw/types";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  measureEdgeOcclusionOffsets,
  mergeCanvasViewportOffsets,
  minimapPointToScene,
} from "../canvasMinimapGeometry";
import {
  renderCanvasMinimap,
  type CanvasMinimapBoundsCache,
  type CanvasMinimapRenderModel,
} from "../canvasMinimapRenderer";
import { copy } from "../copy";

import "./CanvasMinimap.css";

interface CanvasMinimapProps {
  api: ExcalidrawImperativeAPI | null;
  preferenceKey: string;
  onOpenChange?: (open: boolean) => void;
  canvasContainerRef?: RefObject<HTMLElement | null>;
  leftOcclusionRef?: RefObject<HTMLElement | null>;
  rightOcclusionRef?: RefObject<HTMLElement | null>;
  avoidElementRef?: RefObject<HTMLElement | null>;
}

type DragState = {
  grabOffsetX: number;
  grabOffsetY: number;
  pointerId: number;
};

const hasPoint = (
  bounds: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number },
  minimumSize = 0,
) => {
  const width = Math.max(bounds.width, minimumSize);
  const height = Math.max(bounds.height, minimumSize);
  const x = bounds.x - (width - bounds.width) / 2;
  const y = bounds.y - (height - bounds.height) / 2;
  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
};

const readPreference = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};

const savePreference = (key: string, open: boolean) => {
  try {
    window.localStorage.setItem(key, String(open));
  } catch {
    // A blocked storage policy should not disable the minimap itself.
  }
};

export const CanvasMinimap = ({
  api,
  preferenceKey,
  onOpenChange,
  canvasContainerRef,
  leftOcclusionRef,
  rightOcclusionRef,
  avoidElementRef,
}: CanvasMinimapProps) => {
  const [open, setOpen] = useState(() => readPreference(preferenceKey));
  const [zoomPercent, setZoomPercent] = useState(() =>
    Math.round((api?.getAppState().zoom.value ?? 1) * 100),
  );
  const [empty, setEmpty] = useState(true);
  const [avoidShift, setAvoidShift] = useState(0);
  const avoidShiftRef = useRef(0);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boundsCacheRef = useRef<CanvasMinimapBoundsCache>(new Map());
  const modelRef = useRef<CanvasMinimapRenderModel | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const renderFrameRef = useRef<number | null>(null);
  const navigationFrameRef = useRef<number | null>(null);
  const pendingNavigationRef = useRef<{
    animation: boolean;
    point: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    setOpen(readPreference(preferenceKey));
  }, [preferenceKey]);

  useEffect(() => {
    if (!api) {
      return;
    }
    setZoomPercent(Math.round(api.getAppState().zoom.value * 100));
    return api.onScrollChange((_scrollX, _scrollY, zoom) => {
      setZoomPercent(Math.round(zoom.value * 100));
    });
  }, [api]);

  useLayoutEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(
    () => () => {
      onOpenChange?.(false);
    },
    [onOpenChange],
  );

  const updateAvoidance = useCallback(() => {
    const button = toggleRef.current;
    const popover = popoverRef.current;
    const avoidElement = avoidElementRef?.current;
    if (!button || !popover || !avoidElement) {
      if (avoidShiftRef.current !== 0) {
        avoidShiftRef.current = 0;
        setAvoidShift(0);
      }
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const avoidRect = avoidElement.getBoundingClientRect();
    const overlapsHorizontally =
      popoverRect.left < avoidRect.right && popoverRect.right > avoidRect.left;
    const basePopoverTop = popoverRect.top + avoidShiftRef.current;
    const maxShift = Math.max(0, basePopoverTop - 16);
    const nextShift =
      overlapsHorizontally &&
      avoidRect.height > 0 &&
      avoidRect.top < buttonRect.top
        ? Math.min(maxShift, Math.max(0, buttonRect.top - avoidRect.top))
        : 0;

    if (Math.abs(nextShift - avoidShiftRef.current) > 0.5) {
      avoidShiftRef.current = nextShift;
      setAvoidShift(nextShift);
    }
  }, [avoidElementRef]);

  const getOffsets = useCallback((): Required<Offsets> => {
    if (!api) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    const canvasRect = canvasContainerRef?.current?.getBoundingClientRect();
    const hostOffsets = canvasRect
      ? measureEdgeOcclusionOffsets(canvasRect, {
          left: leftOcclusionRef?.current?.getBoundingClientRect(),
          right: rightOcclusionRef?.current?.getBoundingClientRect(),
        })
      : undefined;
    return mergeCanvasViewportOffsets(
      api.getViewportOffsets({ padding: 0 }),
      hostOffsets,
    );
  }, [api, canvasContainerRef, leftOcclusionRef, rightOcclusionRef]);

  const draw = useCallback(() => {
    if (!api || !canvasRef.current || !open) {
      return;
    }
    const elements = api.getSceneElements();
    setEmpty(elements.length === 0);
    modelRef.current = renderCanvasMinimap({
      canvas: canvasRef.current,
      elements,
      appState: api.getAppState(),
      offsets: getOffsets(),
      cache: boundsCacheRef.current,
    });
    updateAvoidance();
  }, [api, getOffsets, open, updateAvoidance]);

  const scheduleDraw = useCallback(() => {
    if (renderFrameRef.current !== null) {
      return;
    }
    renderFrameRef.current = window.requestAnimationFrame(() => {
      renderFrameRef.current = null;
      draw();
    });
  }, [draw]);

  useLayoutEffect(() => {
    if (open) {
      updateAvoidance();
    }
  }, [open, updateAvoidance]);

  useEffect(() => {
    if (!api || !open) {
      boundsCacheRef.current.clear();
      modelRef.current = null;
      return;
    }

    const unsubscribeChange = api.onChange(() => scheduleDraw());
    const unsubscribeScroll = api.onScrollChange(() => scheduleDraw());
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => scheduleDraw());
    for (const element of [
      canvasRef.current,
      canvasContainerRef?.current,
      leftOcclusionRef?.current,
      rightOcclusionRef?.current,
      avoidElementRef?.current,
    ]) {
      if (element) {
        observer?.observe(element);
      }
    }
    scheduleDraw();

    return () => {
      unsubscribeChange();
      unsubscribeScroll();
      observer?.disconnect();
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
      if (navigationFrameRef.current !== null) {
        window.cancelAnimationFrame(navigationFrameRef.current);
        navigationFrameRef.current = null;
      }
      pendingNavigationRef.current = null;
      dragRef.current = null;
      boundsCacheRef.current.clear();
      modelRef.current = null;
    };
  }, [
    api,
    avoidElementRef,
    canvasContainerRef,
    leftOcclusionRef,
    open,
    rightOcclusionRef,
    scheduleDraw,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setOpen(false);
      savePreference(preferenceKey, false);
      window.requestAnimationFrame(() => toggleRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, preferenceKey]);

  const queueNavigation = useCallback(
    (point: { x: number; y: number }, animation: boolean) => {
      if (!api) {
        return;
      }
      pendingNavigationRef.current = { point, animation };
      if (navigationFrameRef.current !== null) {
        return;
      }
      navigationFrameRef.current = window.requestAnimationFrame(() => {
        navigationFrameRef.current = null;
        const pending = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        if (!pending) {
          return;
        }
        api.setViewport({
          target: {
            x: pending.point.x,
            y: pending.point.y,
            width: 0,
            height: 0,
          },
          fit: "none",
          offsets: modelRef.current?.offsets ?? getOffsets(),
          animation: pending.animation ? { duration: 180 } : false,
        });
      });
    },
    [api, getOffsets],
  );

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    savePreference(preferenceKey, false);
    toggleRef.current?.focus();
  }, [preferenceKey]);

  const getMinimapPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Number.isFinite(event.clientX)
        ? event.clientX - rect.left
        : (modelRef.current?.transform.mapWidth ?? rect.width) / 2,
      y: Number.isFinite(event.clientY)
        ? event.clientY - rect.top
        : (modelRef.current?.transform.mapHeight ?? rect.height) / 2,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const model = modelRef.current;
    if (!model) {
      return;
    }
    event.preventDefault();
    const mapPoint = getMinimapPoint(event);
    const scenePoint = minimapPointToScene(mapPoint, model.transform);
    const viewportCenter = {
      x: model.viewportBounds.x + model.viewportBounds.width / 2,
      y: model.viewportBounds.y + model.viewportBounds.height / 2,
    };
    const insideViewport = hasPoint(model.viewportMapBounds, mapPoint, 8);
    dragRef.current = {
      grabOffsetX: insideViewport ? scenePoint.x - viewportCenter.x : 0,
      grabOffsetY: insideViewport ? scenePoint.y - viewportCenter.y : 0,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    queueNavigation(
      {
        x: scenePoint.x - dragRef.current.grabOffsetX,
        y: scenePoint.y - dragRef.current.grabOffsetY,
      },
      !insideViewport,
    );
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const model = modelRef.current;
    const drag = dragRef.current;
    if (!model || !drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const scenePoint = minimapPointToScene(
      getMinimapPoint(event),
      model.transform,
    );
    queueNavigation(
      {
        x: scenePoint.x - drag.grabOffsetX,
        y: scenePoint.y - drag.grabOffsetY,
      },
      false,
    );
  };

  const stopDragging = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRestoreFocus();
      return;
    }
    const model = modelRef.current;
    if (!model || !event.key.startsWith("Arrow")) {
      return;
    }
    event.preventDefault();
    const factor = event.shiftKey ? 0.5 : 0.1;
    const center = {
      x: model.viewportBounds.x + model.viewportBounds.width / 2,
      y: model.viewportBounds.y + model.viewportBounds.height / 2,
    };
    if (event.key === "ArrowLeft") {
      center.x -= model.viewportBounds.width * factor;
    } else if (event.key === "ArrowRight") {
      center.x += model.viewportBounds.width * factor;
    } else if (event.key === "ArrowUp") {
      center.y -= model.viewportBounds.height * factor;
    } else if (event.key === "ArrowDown") {
      center.y += model.viewportBounds.height * factor;
    }
    queueNavigation(center, true);
  };

  if (!api) {
    return null;
  }

  const label = `${
    open ? copy.minimap.close : copy.minimap.open
  }，当前缩放 ${zoomPercent}%`;

  return (
    <div className="canvas-minimap__zoom-control">
      <Tooltip label={label}>
        <IconButton
          ref={toggleRef}
          type="toggle"
          checked={open}
          icon={`${zoomPercent}%`}
          className="reset-zoom-button zoom-button canvas-minimap__toggle"
          title={label}
          aria-label={label}
          onSelect={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            savePreference(preferenceKey, nextOpen);
          }}
        />
      </Tooltip>
      {open ? (
        <div
          ref={popoverRef}
          className="canvas-minimap__popover"
          style={
            {
              "--canvas-minimap-avoid-shift": `${avoidShift}px`,
            } as CSSProperties
          }
        >
          <canvas
            ref={canvasRef}
            className="canvas-minimap__canvas"
            role="application"
            aria-label={copy.minimap.description}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          />
          {empty ? (
            <span className="canvas-minimap__empty">{copy.minimap.empty}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
