import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import type {
  ImageAssetRequestRendition,
  ImageRecordMap,
} from "../shared/projectTypes";

export const IMAGE_HIGH_RES_VIEWPORT_PADDING_RATIO = 1;
export const IMAGE_HIGH_RES_LOAD_DEBOUNCE_MS = 220;
export const IMAGE_HIGH_RES_MIN_ZOOM = 0.35;
export const IMAGE_HIGH_RES_MIN_SCREEN_DIMENSION = 180;
export const IMAGE_PREVIEW_MIN_SCREEN_DIMENSION = 180;
export const IMAGE_ORIGINAL_MIN_SCREEN_DIMENSION = 1400;

export interface ImageRenditionRequest {
  fileId: string;
  rendition: ImageAssetRequestRendition;
}

const getFiniteNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getPositiveFiniteNumber = (value: unknown, fallback: number) => {
  const numberValue = getFiniteNumber(value, fallback);
  return numberValue > 0 ? numberValue : fallback;
};

const getViewportBounds = (
  appState: Pick<AppState, "width" | "height" | "scrollX" | "scrollY" | "zoom">,
  paddingRatio: number,
) => {
  const zoomValue = getPositiveFiniteNumber(appState.zoom?.value, 1);
  const width = getPositiveFiniteNumber(appState.width, 1) / zoomValue;
  const height = getPositiveFiniteNumber(appState.height, 1) / zoomValue;
  const paddingX = width * Math.max(0, paddingRatio);
  const paddingY = height * Math.max(0, paddingRatio);

  return {
    x: -getFiniteNumber(appState.scrollX, 0) - paddingX,
    y: -getFiniteNumber(appState.scrollY, 0) - paddingY,
    width: width + paddingX * 2,
    height: height + paddingY * 2,
  };
};

const getImageBounds = (element: ExcalidrawElement) => ({
  x: getFiniteNumber(element.x, 0),
  y: getFiniteNumber(element.y, 0),
  width: getPositiveFiniteNumber(element.width, 0),
  height: getPositiveFiniteNumber(element.height, 0),
});

const intersects = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const isWorthLoadingOriginalAtZoom = (
  imageBounds: { width: number; height: number },
  zoomValue: number,
  minZoom: number,
  minScreenDimension: number,
) => {
  if (zoomValue >= minZoom) {
    return true;
  }

  const longestScreenDimension =
    Math.max(imageBounds.width, imageBounds.height) * zoomValue;

  return longestScreenDimension >= minScreenDimension;
};

const getLongestScreenDimension = (
  imageBounds: { width: number; height: number },
  zoomValue: number,
) => Math.max(imageBounds.width, imageBounds.height) * zoomValue;

const getRequestedRenditionForScreenSize = ({
  imageBounds,
  zoomValue,
  previewMinScreenDimension,
  originalMinScreenDimension,
}: {
  imageBounds: { width: number; height: number };
  zoomValue: number;
  previewMinScreenDimension: number;
  originalMinScreenDimension: number;
}): ImageAssetRequestRendition | null => {
  const longestScreenDimension = getLongestScreenDimension(
    imageBounds,
    zoomValue,
  );

  if (longestScreenDimension >= originalMinScreenDimension) {
    return "original";
  }

  if (longestScreenDimension >= previewMinScreenDimension) {
    return "preview";
  }

  return null;
};

const hasRenditionInFlight = ({
  fileId,
  rendition,
  loadedPreviewFileIds,
  loadingPreviewFileIds,
  loadedOriginalFileIds,
  loadingOriginalFileIds,
}: {
  fileId: string;
  rendition: ImageAssetRequestRendition;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadingPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  loadingOriginalFileIds: ReadonlySet<string>;
}) => {
  if (
    loadedOriginalFileIds.has(fileId) ||
    loadingOriginalFileIds.has(fileId)
  ) {
    return true;
  }

  return (
    rendition === "preview" &&
    (loadedPreviewFileIds.has(fileId) || loadingPreviewFileIds.has(fileId))
  );
};

export const getImageFileIdsNearViewport = ({
  elements,
  appState,
  imageRecords,
  loadedOriginalFileIds,
  loadingOriginalFileIds,
  viewportPaddingRatio = IMAGE_HIGH_RES_VIEWPORT_PADDING_RATIO,
  minZoom = IMAGE_HIGH_RES_MIN_ZOOM,
  minScreenDimension = IMAGE_HIGH_RES_MIN_SCREEN_DIMENSION,
}: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  imageRecords: ImageRecordMap;
  loadedOriginalFileIds: ReadonlySet<string>;
  loadingOriginalFileIds: ReadonlySet<string>;
  viewportPaddingRatio?: number;
  minZoom?: number;
  minScreenDimension?: number;
}) => {
  const zoomValue = getPositiveFiniteNumber(appState.zoom?.value, 1);
  const viewportBounds = getViewportBounds(appState, viewportPaddingRatio);
  const fileIds: string[] = [];
  const seenFileIds = new Set<string>();

  for (const element of elements) {
    if (
      element.isDeleted ||
      element.type !== "image" ||
      !element.fileId ||
      seenFileIds.has(element.fileId) ||
      !imageRecords[element.fileId] ||
      loadedOriginalFileIds.has(element.fileId) ||
      loadingOriginalFileIds.has(element.fileId)
    ) {
      continue;
    }

    const imageBounds = getImageBounds(element);
    if (
      !isWorthLoadingOriginalAtZoom(
        imageBounds,
        zoomValue,
        minZoom,
        minScreenDimension,
      )
    ) {
      continue;
    }

    if (!intersects(imageBounds, viewportBounds)) {
      continue;
    }

    seenFileIds.add(element.fileId);
    fileIds.push(element.fileId);
  }

  return fileIds;
};

export const getImageRenditionRequestsNearViewport = ({
  elements,
  appState,
  imageRecords,
  loadedPreviewFileIds,
  loadingPreviewFileIds,
  loadedOriginalFileIds,
  loadingOriginalFileIds,
  viewportPaddingRatio = IMAGE_HIGH_RES_VIEWPORT_PADDING_RATIO,
  previewMinScreenDimension = IMAGE_PREVIEW_MIN_SCREEN_DIMENSION,
  originalMinScreenDimension = IMAGE_ORIGINAL_MIN_SCREEN_DIMENSION,
}: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  imageRecords: ImageRecordMap;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadingPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  loadingOriginalFileIds: ReadonlySet<string>;
  viewportPaddingRatio?: number;
  previewMinScreenDimension?: number;
  originalMinScreenDimension?: number;
}) => {
  const zoomValue = getPositiveFiniteNumber(appState.zoom?.value, 1);
  const viewportBounds = getViewportBounds(appState, viewportPaddingRatio);
  const requests: ImageRenditionRequest[] = [];
  const seenFileIds = new Set<string>();

  for (const element of elements) {
    if (
      element.isDeleted ||
      element.type !== "image" ||
      !element.fileId ||
      seenFileIds.has(element.fileId) ||
      !imageRecords[element.fileId]
    ) {
      continue;
    }

    const imageBounds = getImageBounds(element);
    if (!intersects(imageBounds, viewportBounds)) {
      continue;
    }

    const rendition = getRequestedRenditionForScreenSize({
      imageBounds,
      zoomValue,
      previewMinScreenDimension,
      originalMinScreenDimension,
    });
    if (!rendition) {
      continue;
    }

    if (
      hasRenditionInFlight({
        fileId: element.fileId,
        rendition,
        loadedPreviewFileIds,
        loadingPreviewFileIds,
        loadedOriginalFileIds,
        loadingOriginalFileIds,
      })
    ) {
      continue;
    }

    seenFileIds.add(element.fileId);
    requests.push({
      fileId: element.fileId,
      rendition,
    });
  }

  return requests;
};
