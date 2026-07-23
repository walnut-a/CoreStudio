import { exportToBlob } from "@excalidraw/utils";

import type { ExcalidrawElement, NonDeleted } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImageRecordMap } from "../shared/projectTypes";
import type { ProjectAssetPayload } from "../shared/desktopBridgeTypes";

import type { GenerationReferencePayload } from "../shared/providerTypes";
import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import { copy } from "./copy";
import { getElementsSceneBounds } from "./workspaceBounds";

const REFERENCE_EXPORT_PADDING = 24;
const REFERENCE_ITEM_TEXT_MAX_LENGTH = 16;
const binaryFileRevisions = new WeakMap<
  object,
  {
    dataURL: string;
    created: number;
    mimeType: string;
    revision: string;
  }
>();

type SceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

const getDataUrlFingerprint = (value: string) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  return `${value.length}:${(first >>> 0).toString(16)}:${(
    second >>> 0
  ).toString(16)}`;
};

const getBinaryFileRevision = (file: BinaryFiles[string]) => {
  const dataURL = file.dataURL ?? "";
  const mimeType = file.mimeType ?? "";
  const cached = binaryFileRevisions.get(file);
  if (
    cached &&
    cached.dataURL === dataURL &&
    cached.created === file.created &&
    cached.mimeType === mimeType
  ) {
    return cached.revision;
  }

  const revision = [
    file.created,
    mimeType,
    getDataUrlFingerprint(dataURL),
  ].join(":");
  binaryFileRevisions.set(file, {
    dataURL,
    created: file.created,
    mimeType,
    revision,
  });
  return revision;
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
    reader.onerror = () =>
      reject(reader.error || new Error("读取参考图片失败。"));
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
    return copy.selectionReference.text;
  }

  const firstLine = element.text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine
    ? copy.selectionReference.textLabel(truncateReferenceItemText(firstLine))
    : copy.selectionReference.text;
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

const getShapeLabel = (type: ExcalidrawElement["type"]) => {
  const shapes = copy.selectionReference.shapes;
  const shapeLabels: Partial<Record<ExcalidrawElement["type"], string>> = {
    rectangle: shapes.rectangle,
    diamond: shapes.diamond,
    ellipse: shapes.ellipse,
    arrow: shapes.arrow,
    line: shapes.line,
    freedraw: shapes.freedraw,
    frame: shapes.frame,
    magicframe: shapes.frame,
    embeddable: shapes.embeddable,
    iframe: shapes.embeddable,
  };
  return shapeLabels[type] ?? copy.selectionReference.element;
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
        label: copy.selectionReference.image,
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
      label: getShapeLabel(element.type),
    };
  });

const unique = <T>(values: readonly T[]) => Array.from(new Set(values));

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
    (element): element is NonDeleted<ExcalidrawElement> => !element.isDeleted,
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

  return selectedElements
    .map((element) => {
      const elementVersion =
        typeof element.version === "number" ? `@${element.version}` : "";
      if (element.type !== "image") {
        return `${element.id}${elementVersion}`;
      }

      const fileId = element.fileId ?? "";
      if (!fileId) {
        return `${element.id}${elementVersion}`;
      }
      const file = fileId ? scene?.files[fileId] : null;
      if (!file) {
        return `${element.id}${elementVersion}#${fileId}#missing`;
      }

      const assetRevision = getBinaryFileRevision(file);
      return `${element.id}${elementVersion}#${fileId}#${assetRevision}`;
    })
    .join("|");
};

export const getSelectedReferenceImageFileIds = (scene: SceneSnapshot | null) =>
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
