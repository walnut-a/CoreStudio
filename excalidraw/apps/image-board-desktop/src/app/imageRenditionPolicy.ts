import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type {
  ImageAssetRequestRendition,
  ImageRecord,
  ImageRecordMap,
} from "../shared/projectTypes";
import type { ImageRenditionRequest } from "./imageRenditions";
import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";

// Display-source estimate only; this does not control the editor's own caches.
export const IMAGE_DECODED_MEMORY_BUDGET = 192 * 1024 * 1024;
export const IMAGE_RENDITION_BATCH_SIZE = 2;
export const IMAGE_RENDITION_BATCH_BYTES = 16 * 1024 * 1024;
const rank = { thumbnail: 0, preview: 1, original: 2 } as const;
const positive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const createImageRenditionCropGuard = (
  elements: readonly ExcalidrawElement[],
) => {
  const crops = new Map<
    string,
    Array<{ naturalWidth: number; naturalHeight: number }>
  >();
  for (const element of elements) {
    if (element.type === "image" && element.fileId && element.crop) {
      const existing = crops.get(element.fileId) ?? [];
      existing.push(element.crop);
      crops.set(element.fileId, existing);
    }
  }
  return (asset: ProjectAssetPayload) =>
    (crops.get(asset.fileId) ?? []).every(
      (crop) =>
        crop.naturalWidth === asset.width &&
        crop.naturalHeight === asset.height,
    );
};

const getSavedCropRendition = (
  crop: NonNullable<Extract<ExcalidrawElement, { type: "image" }>["crop"]>,
  record: ImageRecord,
  current: ImageAssetRequestRendition,
): ImageAssetRequestRendition => {
  const longest = Math.max(crop.naturalWidth, crop.naturalHeight);
  if (longest === Math.max(record.width, record.height)) return "original";
  if (longest === 320) return "thumbnail";
  if (longest === 1280) return "preview";
  // Unknown imported crop spaces must not trigger a destructive pixel swap.
  return current;
};

export const estimateImageRenditionBytes = (
  record: ImageRecord,
  rendition: ImageAssetRequestRendition,
) => {
  const width = positive(record.width, 320);
  const height = positive(record.height, 320);
  const cap =
    rendition === "original" ? Infinity : rendition === "preview" ? 1280 : 320;
  const scale = Math.min(1, cap / Math.max(width, height));
  return Math.ceil(width * scale) * Math.ceil(height * scale) * 4;
};

export const imageRenditionRevision = (record: ImageRecord) =>
  JSON.stringify([
    record.assetPath,
    record.contentHash,
    record.width,
    record.height,
    record.mimeType,
  ]);

export const planImageRenditions = ({
  elements,
  appState,
  imageRecords,
  loadedPreviewFileIds,
  loadedOriginalFileIds,
  devicePixelRatio,
  memoryBudgetBytes = IMAGE_DECODED_MEMORY_BUDGET,
}: {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  imageRecords: ImageRecordMap;
  loadedPreviewFileIds: ReadonlySet<string>;
  loadedOriginalFileIds: ReadonlySet<string>;
  devicePixelRatio: number;
  memoryBudgetBytes?: number;
}) => {
  const zoom = positive(appState.zoom?.value, 1);
  const dpr = Math.max(1, Math.min(3, positive(devicePixelRatio, 1)));
  const view = {
    x: -(appState.scrollX || 0),
    y: -(appState.scrollY || 0),
    w: positive(appState.width, 1) / zoom,
    h: positive(appState.height, 1) / zoom,
  };
  const current = (id: string): ImageAssetRequestRendition =>
    loadedOriginalFileIds.has(id)
      ? "original"
      : loadedPreviewFileIds.has(id)
      ? "preview"
      : "thumbnail";
  const candidates = new Map<
    string,
    { rendition: ImageAssetRequestRendition; priority: number; pinned: boolean }
  >();
  const fixed = new Map<string, ImageAssetRequestRendition>();
  // One cropped/deleted occurrence constrains every occurrence of that file.
  for (const element of elements) {
    if (
      element.type !== "image" ||
      !element.fileId ||
      !imageRecords[element.fileId]
    )
      continue;
    const id = element.fileId;
    const existing = current(id);
    if (
      element.crop ||
      element.isDeleted ||
      appState.croppingElementId === element.id
    ) {
      const rendition = element.isDeleted
        ? existing
        : element.crop
        ? getSavedCropRendition(element.crop, imageRecords[id], existing)
        : existing;
      const previous = fixed.get(id);
      fixed.set(id, previous && previous !== rendition ? existing : rendition);
    }
  }
  for (const element of elements) {
    if (
      element.type !== "image" ||
      !element.fileId ||
      !imageRecords[element.fileId]
    ) {
      continue;
    }
    const id = element.fileId;
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const cos = Math.abs(Math.cos(element.angle || 0));
    const sin = Math.abs(Math.sin(element.angle || 0));
    const halfW = (element.width * cos + element.height * sin) / 2;
    const halfH = (element.width * sin + element.height * cos) / 2;
    const intersects = (padding: number) =>
      cx + halfW > view.x - view.w * padding &&
      cx - halfW < view.x + view.w * (1 + padding) &&
      cy + halfH > view.y - view.h * padding &&
      cy - halfH < view.y + view.h * (1 + padding);
    const visible = intersects(0);
    const nearby = visible || intersects(0.25);
    const pinned = fixed.has(id);
    const crop = element.crop;
    const screen =
      Math.max(
        element.width *
          (crop ? positive(crop.naturalWidth / crop.width, 1) : 1),
        element.height *
          (crop ? positive(crop.naturalHeight / crop.height, 1) : 1),
      ) * zoom;
    const existing = current(id);
    const originalFactor = existing === "original" ? 0.8 : 1;
    const previewFactor = existing !== "thumbnail" ? 0.8 : 1;
    let rendition: ImageAssetRequestRendition = "thumbnail";
    if (
      visible &&
      (screen >= 720 * originalFactor || screen * dpr >= 1400 * originalFactor)
    ) {
      rendition = "original";
    } else if (nearby && screen >= 180 * previewFactor) {
      rendition = "preview";
    }
    // A source that already fits 320px cannot gain or shed decoded pixels by
    // changing its rendition label. Avoid rereading the same original bytes.
    const record = imageRecords[id];
    if (
      Math.max(positive(record.width, 320), positive(record.height, 320)) <= 320
    ) {
      rendition = existing;
    }
    if (pinned) rendition = fixed.get(id)!;
    const priority =
      (pinned ? 0 : visible ? 1 : 2) * 1e6 +
      (appState.selectedElementIds?.[element.id] ? 0 : 1e5) +
      Math.hypot(
        (cx - view.x - view.w / 2) / view.w,
        (cy - view.y - view.h / 2) / view.h,
      );
    const previous = candidates.get(id);
    candidates.set(id, {
      rendition:
        previous && rank[previous.rendition] > rank[rendition]
          ? previous.rendition
          : rendition,
      pinned: pinned || !!previous?.pinned,
      priority: Math.min(previous?.priority ?? Infinity, priority),
    });
  }
  // Files no longer in the scene are retained: the host cannot invalidate
  // deleted-element bitmaps held by the editor's undo history.
  for (const id of [...loadedPreviewFileIds, ...loadedOriginalFileIds]) {
    if (imageRecords[id] && !candidates.has(id)) {
      candidates.set(id, {
        rendition: current(id),
        priority: Infinity,
        pinned: true,
      });
    }
  }
  const ordered = [...candidates].sort(
    (a, b) => a[1].priority - b[1].priority || a[0].localeCompare(b[0]),
  );
  const desired = new Map<string, ImageAssetRequestRendition>();
  let estimatedBytes = ordered.reduce(
    (sum, [id]) =>
      sum + estimateImageRenditionBytes(imageRecords[id], "thumbnail"),
    0,
  );
  // Reserve crop/undo-compatible pixels before distributing the budget.
  for (const [id, item] of ordered) {
    if (item.pinned) {
      estimatedBytes +=
        estimateImageRenditionBytes(imageRecords[id], item.rendition) -
        estimateImageRenditionBytes(imageRecords[id], "thumbnail");
    }
  }
  for (const [id, item] of ordered) {
    let rendition = item.rendition;
    const extra = (grade: ImageAssetRequestRendition) =>
      estimateImageRenditionBytes(imageRecords[id], grade) -
      estimateImageRenditionBytes(imageRecords[id], "thumbnail");
    if (!item.pinned) {
      if (
        rendition === "original" &&
        estimatedBytes + extra(rendition) > memoryBudgetBytes
      ) {
        rendition = "preview";
      }
      if (
        rendition === "preview" &&
        estimatedBytes + extra(rendition) > memoryBudgetBytes
      ) {
        rendition = "thumbnail";
      }
      estimatedBytes += extra(rendition);
    }
    desired.set(id, rendition);
  }
  const requests: ImageRenditionRequest[] = ordered
    .filter(([id]) => desired.get(id) !== current(id))
    .map(([fileId]) => ({ fileId, rendition: desired.get(fileId)! }));
  // Free pixels before loading new ones; preserve viewport priority within each group.
  requests.sort(
    (a, b) =>
      Number(rank[a.rendition] >= rank[current(a.fileId)]) -
      Number(rank[b.rendition] >= rank[current(b.fileId)]),
  );
  return {
    desired,
    requests,
    estimatedBytes,
    overBudgetBytes: Math.max(0, estimatedBytes - memoryBudgetBytes),
  };
};

export const takeImageRenditionBatch = (
  requests: readonly ImageRenditionRequest[],
  records: ImageRecordMap,
) => {
  const batch: ImageRenditionRequest[] = [];
  let bytes = 0;
  for (const request of requests) {
    const nextBytes = estimateImageRenditionBytes(
      records[request.fileId],
      request.rendition,
    );
    if (
      batch.length &&
      (batch.length >= IMAGE_RENDITION_BATCH_SIZE ||
        request.rendition !== batch[0].rendition ||
        bytes + nextBytes > IMAGE_RENDITION_BATCH_BYTES)
    ) {
      break;
    }
    batch.push(request);
    bytes += nextBytes;
  }
  return batch;
};
