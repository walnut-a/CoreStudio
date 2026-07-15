import {
  newElementWith,
  newFrameElement,
  newImageElement,
  newTextElement,
} from "@excalidraw/element";
import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";

import { isAutoAspectRatioRequest } from "../shared/providerCatalog";
import type { GenerationRequest } from "../shared/providerTypes";
import type { ImagePlacement } from "./project/imagePlacement";
import { normalizeGeneratedImageDimensions } from "./project/imagePlacement";
import { copy } from "./copy";
import { appendElementsWithSyncedIndices } from "./sceneOrder";

const PENDING_PLACEHOLDER_STROKE = "#6d5efc";
const PENDING_PLACEHOLDER_FILL = "#f4f2ff";
const PENDING_PLACEHOLDER_ERROR_STROKE = "#d14343";
const PENDING_PLACEHOLDER_ERROR_FILL = "#fff1f2";

export interface PendingGenerationSlot {
  frameId: string;
  labelId: string;
  fitReturnedImageSize: boolean;
}

export const buildPendingGenerationPlaceholders = ({
  request,
  placements,
  createGroupId = () => crypto.randomUUID(),
}: {
  request: GenerationRequest;
  placements: readonly ImagePlacement[];
  createGroupId?: (index: number) => string;
}): {
  slots: PendingGenerationSlot[];
  placeholderFrames: ExcalidrawElement[];
  placeholderElements: ExcalidrawElement[];
} => {
  const slots: PendingGenerationSlot[] = [];
  const placeholderFrames: ExcalidrawElement[] = [];
  const placeholderElements = placements.flatMap((placement, index) => {
    const slotGroupId = createGroupId(index);
    const frame = newFrameElement({
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      groupIds: [slotGroupId],
      backgroundColor: PENDING_PLACEHOLDER_FILL,
      strokeColor: PENDING_PLACEHOLDER_STROKE,
      strokeStyle: "dashed",
      strokeWidth: 2,
      roughness: 0,
      opacity: 80,
    });
    const label = newTextElement({
      x: placement.x + placement.width / 2,
      y: placement.y + placement.height / 2,
      text:
        request.imageCount > 1
          ? `${copy.generateDialog.pendingCanvasLabel}\n${index + 1}/${
              request.imageCount
            }`
          : copy.generateDialog.pendingCanvasLabel,
      groupIds: [slotGroupId],
      frameId: frame.id,
      fontSize: 24,
      textAlign: "center",
      verticalAlign: "middle",
      autoResize: true,
      strokeColor: PENDING_PLACEHOLDER_STROKE,
      backgroundColor: "transparent",
      roughness: 0,
    });

    placeholderFrames.push(frame);
    slots.push({
      frameId: frame.id,
      labelId: label.id,
      fitReturnedImageSize: isAutoAspectRatioRequest(request),
    });

    return [frame, label];
  });

  return {
    slots,
    placeholderFrames,
    placeholderElements,
  };
};

export const buildPendingGenerationFailureSceneUpdate = ({
  elements,
  slots,
}: {
  elements: readonly ExcalidrawElement[];
  slots: readonly PendingGenerationSlot[];
}): {
  elements: readonly ExcalidrawElement[];
  selectedElementIds?: Record<string, true>;
} => {
  const firstSlot = slots[0];
  if (!firstSlot) {
    return {
      elements,
      selectedElementIds: undefined,
    };
  }

  const slotFrameIds = new Set(slots.map((slot) => slot.frameId));
  const slotLabelIds = new Set(slots.map((slot) => slot.labelId));

  return {
    elements: elements.map((element) => {
      if (slotFrameIds.has(element.id)) {
        return newElementWith(element, {
          strokeColor: PENDING_PLACEHOLDER_ERROR_STROKE,
          backgroundColor: PENDING_PLACEHOLDER_ERROR_FILL,
        });
      }

      if (slotLabelIds.has(element.id) && element.type === "text") {
        return newElementWith(element, {
          text: copy.generateDialog.failedCanvasLabel,
          originalText: copy.generateDialog.failedCanvasLabel,
          strokeColor: PENDING_PLACEHOLDER_ERROR_STROKE,
        });
      }

      return element;
    }),
    selectedElementIds: {
      [firstSlot.frameId]: true,
    },
  };
};

export const buildPendingGenerationPlaceholderSceneUpdate = ({
  existingElements,
  placeholderElements,
  placeholderFrames,
}: {
  existingElements: readonly ExcalidrawElement[];
  placeholderElements: readonly ExcalidrawElement[];
  placeholderFrames: readonly ExcalidrawElement[];
}): {
  elements: readonly ExcalidrawElement[];
  focusElements: readonly ExcalidrawElement[];
} => ({
  elements: appendElementsWithSyncedIndices(
    existingElements,
    placeholderElements,
  ),
  focusElements: placeholderFrames.length > 0 ? placeholderFrames : [],
});

export const buildPendingGenerationSlotReplacementSceneUpdate = ({
  elements,
  selectedElementIds,
  slot,
  asset,
}: {
  elements: readonly ExcalidrawElement[];
  selectedElementIds: Readonly<Record<string, true>>;
  slot: PendingGenerationSlot;
  asset: {
    fileId: string;
    width: number;
    height: number;
  };
}): {
  elements: readonly ExcalidrawElement[];
  selectedElementIds: Record<string, true>;
  imageElement: ExcalidrawElement;
} | null => {
  const frame = elements.find(
    (element) => element.id === slot.frameId && !element.isDeleted,
  );
  if (!frame) {
    return null;
  }

  const returnedImageSize = slot.fitReturnedImageSize
    ? normalizeGeneratedImageDimensions({
        width: asset.width,
        height: asset.height,
      })
    : {
        width: frame.width,
        height: frame.height,
      };
  const frameCenter = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };
  const imageElement = newImageElement({
    type: "image",
    fileId: asset.fileId as FileId,
    status: "saved",
    scale: [1, 1],
    x: frameCenter.x - returnedImageSize.width / 2,
    y: frameCenter.y - returnedImageSize.height / 2,
    width: returnedImageSize.width,
    height: returnedImageSize.height,
  });

  const nextSelectedElementIds = { ...selectedElementIds };
  const shouldSelectNewImage =
    Boolean(nextSelectedElementIds[slot.frameId]) ||
    Boolean(nextSelectedElementIds[slot.labelId]);
  delete nextSelectedElementIds[slot.frameId];
  delete nextSelectedElementIds[slot.labelId];
  if (shouldSelectNewImage) {
    nextSelectedElementIds[imageElement.id] = true;
  }

  return {
    elements: appendElementsWithSyncedIndices(
      elements.map((element) =>
        element.id === slot.frameId || element.id === slot.labelId
          ? newElementWith(element, { isDeleted: true })
          : element,
      ),
      [imageElement],
    ),
    selectedElementIds: nextSelectedElementIds,
    imageElement,
  };
};
