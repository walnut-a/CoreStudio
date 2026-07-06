import { exportToBlob } from "@excalidraw/utils";

import type { ExcalidrawElement, NonDeleted } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImageRecordMap } from "../shared/projectTypes";
import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";

import type { GenerationReferencePayload } from "../shared/providerTypes";
import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import { getElementsSceneBounds } from "./workspaceBounds";

const REFERENCE_EXPORT_PADDING = 24;
const REFERENCE_ITEM_TEXT_MAX_LENGTH = 16;

type SceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type SelectionReferenceOriginalImageLoadPlan =
  | { action: "skip" }
  | { action: "load"; fileIds: string[] };

export interface LoadSelectionReferenceOriginalSceneInput<
  TProject extends { imageRecords: ImageRecordMap },
  TScene extends SceneSnapshot,
> {
  scene: TScene | null;
  project: TProject | null;
  readOriginalAssets: (
    project: TProject,
    fileIds: string[],
  ) => Promise<readonly ProjectAssetPayload[]>;
  getTimestamp?: () => number;
}

export interface CreateSelectionReferenceOriginalSceneRendererActionsInput<
  TProject extends { imageRecords: ImageRecordMap },
> {
  getProject: () => TProject | null;
  readOriginalAssets: (
    project: TProject,
    fileIds: string[],
  ) => Promise<readonly ProjectAssetPayload[]>;
  getTimestamp?: () => number;
}

export interface SelectionReferenceOriginalSceneRendererActions<
  TScene extends SceneSnapshot,
> {
  load: (scene: TScene | null) => Promise<TScene | null>;
}

const readBlobAsArrayBuffer = (blob: Blob) => {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("读取参考图片失败。"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
};

const toBase64 = async (blob: Blob) => {
  const buffer = await readBlobAsArrayBuffer(blob);
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(binary, "binary").toString("base64");
};

const isSelectedGroupElement = (
  element: ExcalidrawElement,
  selectedGroupIds: Set<string>,
) => element.groupIds.some((groupId) => selectedGroupIds.has(groupId));

const parseDataUrl = (dataURL: string) => {
  const match = dataURL.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, payload] = match;
  if (!payload) {
    return null;
  }

  return {
    mimeType,
    dataBase64: payload,
  };
};

const getSingleImageReferencePayload = (
  scene: SceneSnapshot,
  selectedElements: readonly NonDeleted<ExcalidrawElement>[],
  imageRecords?: ImageRecordMap | null,
) => {
  if (selectedElements.length !== 1) {
    return null;
  }

  const [element] = selectedElements;
  if (element.type !== "image" || !element.fileId) {
    return null;
  }

  const file = scene.files[element.fileId];
  if (!file?.dataURL) {
    return null;
  }

  const image = parseDataUrl(file.dataURL);
  if (!image) {
    return null;
  }

  const imageRecord = imageRecords?.[element.fileId];
  return {
    image,
    debug: {
      fileId: element.fileId,
      sourceType: imageRecord?.sourceType,
      sourceProvider: imageRecord?.provider,
      sourceModel: imageRecord?.model,
      parentFileId: imageRecord?.parentFileId ?? null,
    },
  };
};

const truncateReferenceItemText = (text: string) =>
  text.length > REFERENCE_ITEM_TEXT_MAX_LENGTH
    ? `${text.slice(0, REFERENCE_ITEM_TEXT_MAX_LENGTH)}...`
    : text;

const getTextReferenceItemLabel = (element: ExcalidrawElement) => {
  if (element.type !== "text") {
    return "文本";
  }

  const firstLine = element.text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine ? `文本：${truncateReferenceItemText(firstLine)}` : "文本";
};

const getImageReferenceItemThumbnail = (
  element: ExcalidrawElement,
  files: BinaryFiles,
) => {
  if (element.type !== "image" || !element.fileId) {
    return null;
  }

  return files[element.fileId]?.dataURL ?? null;
};

const shapeLabels: Partial<Record<ExcalidrawElement["type"], string>> = {
  rectangle: "矩形",
  diamond: "菱形",
  ellipse: "椭圆",
  arrow: "箭头",
  line: "线条",
  freedraw: "手绘",
  frame: "画框",
  magicframe: "画框",
  embeddable: "嵌入",
  iframe: "嵌入",
};

const buildReferenceItems = (
  selectedElements: readonly NonDeleted<ExcalidrawElement>[],
  files: BinaryFiles,
) =>
  selectedElements.map((element, itemIndex) => {
    if (element.type === "image") {
      const thumbnailDataUrl = getImageReferenceItemThumbnail(element, files);
      return {
        id: element.id,
        index: itemIndex + 1,
        kind: "image" as const,
        label: "图片",
        ...(element.fileId ? { fileId: element.fileId } : {}),
        ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
      };
    }

    if (element.type === "text") {
      return {
        id: element.id,
        index: itemIndex + 1,
        kind: "text" as const,
        label: getTextReferenceItemLabel(element),
      };
    }

    return {
      id: element.id,
      index: itemIndex + 1,
      kind: "shape" as const,
      label: shapeLabels[element.type] ?? "元素",
    };
  });

const unique = <T,>(values: readonly T[]) => Array.from(new Set(values));

const buildReferenceSource = (
  selectedElements: readonly NonDeleted<ExcalidrawElement>[],
) => {
  const elementIds = selectedElements.map((element) => element.id);
  const fileIds = unique(
    selectedElements.flatMap((element) =>
      element.type === "image" && element.fileId ? [element.fileId] : [],
    ),
  );

  return {
    ...(elementIds.length ? { elementIds } : {}),
    ...(fileIds.length ? { fileIds } : {}),
  };
};

const getSelectedElementIdOrder = (
  appState: Pick<AppState, "selectedElementIds">,
) =>
  Object.entries(appState.selectedElementIds || {})
    .filter(([, selected]) => Boolean(selected))
    .map(([elementId]) => elementId);

export const getSelectedReferenceElements = (
  scene: SceneSnapshot | null,
): NonDeleted<ExcalidrawElement>[] => {
  if (!scene) {
    return [];
  }

  const selectedElementIdOrder = getSelectedElementIdOrder(scene.appState);
  const selectedElementIds = new Set(selectedElementIdOrder);
  const selectedGroupIds = new Set(
    Object.entries(scene.appState.selectedGroupIds || {})
      .filter(([, selected]) => Boolean(selected))
      .map(([groupId]) => groupId),
  );

  if (!selectedElementIds.size && !selectedGroupIds.size) {
    return [];
  }

  const selectableElements = scene.elements.filter(
    (element): element is NonDeleted<ExcalidrawElement> =>
      !element.isDeleted,
  );
  const elementsById = new Map(
    selectableElements.map((element) => [element.id, element]),
  );
  const selectedElements: NonDeleted<ExcalidrawElement>[] = [];

  for (const elementId of selectedElementIdOrder) {
    const element = elementsById.get(elementId);
    if (element) {
      selectedElements.push(element);
    }
  }

  const includedElementIds = new Set(
    selectedElements.map((element) => element.id),
  );

  for (const element of selectableElements) {
    if (
      !selectedElementIds.has(element.id) &&
      !includedElementIds.has(element.id) &&
      isSelectedGroupElement(element, selectedGroupIds)
    ) {
      selectedElements.push(element);
    }
  }

  return selectedElements;
};

export const getSelectionReferenceSignature = (scene: SceneSnapshot | null) => {
  const selectedElements = getSelectedReferenceElements(scene);
  if (!selectedElements.length) {
    return null;
  }

  return selectedElements.map((element) => element.id).join("|");
};

export const getSelectedReferenceImageFileIds = (
  scene: SceneSnapshot | null,
) =>
  unique(
    getSelectedReferenceElements(scene).flatMap((element) =>
      element.type === "image" && element.fileId ? [element.fileId] : [],
    ),
  );

export const buildSelectionReferenceOriginalImageLoadPlan = (
  scene: SceneSnapshot | null,
): SelectionReferenceOriginalImageLoadPlan => {
  const fileIds = getSelectedReferenceImageFileIds(scene);
  if (!fileIds.length) {
    return { action: "skip" };
  }

  return {
    action: "load",
    fileIds,
  };
};

export const loadSelectionReferenceOriginalScene = async <
  TProject extends { imageRecords: ImageRecordMap },
  TScene extends SceneSnapshot,
>({
  scene,
  project,
  readOriginalAssets,
  getTimestamp = Date.now,
}: LoadSelectionReferenceOriginalSceneInput<
  TProject,
  TScene
>): Promise<TScene | null> => {
  if (!scene || !project) {
    return scene;
  }

  const loadPlan = buildSelectionReferenceOriginalImageLoadPlan(scene);
  if (loadPlan.action === "skip") {
    return scene;
  }

  const assets = await readOriginalAssets(project, loadPlan.fileIds);
  if (!assets.length) {
    return scene;
  }

  return {
    ...scene,
    files: {
      ...scene.files,
      ...buildExcalidrawBinaryFilesFromProjectAssets({
        assets,
        imageRecords: project.imageRecords,
        fallbackCreatedAt: getTimestamp(),
      }),
    },
  };
};

export const createSelectionReferenceOriginalSceneRendererActions = <
  TProject extends { imageRecords: ImageRecordMap },
>(
  input: CreateSelectionReferenceOriginalSceneRendererActionsInput<TProject>,
) => ({
  load: <TScene extends SceneSnapshot>(scene: TScene | null) =>
    loadSelectionReferenceOriginalScene({
      scene,
      project: input.getProject(),
      readOriginalAssets: input.readOriginalAssets,
      getTimestamp: input.getTimestamp,
    }),
});

export const getGenerationReferenceAnchorBounds = (
  request: { reference?: { enabled?: boolean } | null },
  scene: SceneSnapshot | null,
) => {
  if (!request.reference?.enabled) {
    return null;
  }

  return getElementsSceneBounds(getSelectedReferenceElements(scene));
};

export const stripSelectionReferenceThumbnails = (
  reference: GenerationReferencePayload | null,
): GenerationReferencePayload | null => {
  if (!reference?.items?.length) {
    return reference;
  }

  return {
    ...reference,
    items: reference.items.map(
      ({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item,
    ),
  };
};

export const extractReferenceTextNotes = (
  elements: readonly ExcalidrawElement[],
) => {
  return elements.flatMap((element) => {
    if (element.isDeleted || element.type !== "text") {
      return [];
    }

    return element.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  });
};

export const buildSelectionReferenceSummary = (
  scene: SceneSnapshot | null,
): GenerationReferencePayload | null => {
  const selectedElements = getSelectedReferenceElements(scene);
  if (!scene || !selectedElements.length) {
    return null;
  }

  const textNotes = extractReferenceTextNotes(selectedElements);
  const items = buildReferenceItems(selectedElements, scene.files);
  const source = buildReferenceSource(selectedElements);
  return {
    enabled: true,
    elementCount: selectedElements.length,
    textCount: textNotes.length,
    items,
    source,
    ...(textNotes.length ? { textNotes } : {}),
  };
};

export const buildSelectionReference = async ({
  scene,
  includeImage,
  imageRecords,
}: {
  scene: SceneSnapshot | null;
  includeImage: boolean;
  imageRecords?: ImageRecordMap | null;
}): Promise<GenerationReferencePayload | null> => {
  const reference = buildSelectionReferenceSummary(scene);
  if (!reference || !scene) {
    return null;
  }

  if (!includeImage) {
    return reference;
  }

  const selectedElements = getSelectedReferenceElements(scene);
  const originalImage = getSingleImageReferencePayload(
    scene,
    selectedElements,
    imageRecords,
  );
  if (originalImage?.image) {
    return {
      ...reference,
      image: originalImage.image,
      debug: originalImage.debug,
    };
  }

  const blob = await exportToBlob({
    elements: selectedElements,
    appState: {
      exportBackground: false,
      viewBackgroundColor: scene.appState.viewBackgroundColor,
    },
    files: scene.files,
    exportPadding: REFERENCE_EXPORT_PADDING,
    mimeType: "image/png",
  });

  return {
    ...reference,
    image: {
      mimeType: blob.type || "image/png",
      dataBase64: await toBase64(blob),
    },
  };
};
