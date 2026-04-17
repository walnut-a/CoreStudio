import { exportToBlob } from "@excalidraw/utils";

import type { ExcalidrawElement, NonDeleted } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ImageRecordMap } from "../shared/projectTypes";

import type { GenerationReferencePayload } from "../shared/providerTypes";

const REFERENCE_EXPORT_PADDING = 24;

type SceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

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

export const getSelectedReferenceElements = (
  scene: SceneSnapshot | null,
): NonDeleted<ExcalidrawElement>[] => {
  if (!scene) {
    return [];
  }

  const selectedElementIds = new Set(
    Object.entries(scene.appState.selectedElementIds || {})
      .filter(([, selected]) => Boolean(selected))
      .map(([elementId]) => elementId),
  );
  const selectedGroupIds = new Set(
    Object.entries(scene.appState.selectedGroupIds || {})
      .filter(([, selected]) => Boolean(selected))
      .map(([groupId]) => groupId),
  );

  if (!selectedElementIds.size && !selectedGroupIds.size) {
    return [];
  }

  return scene.elements.filter(
    (element): element is NonDeleted<ExcalidrawElement> =>
      !element.isDeleted &&
      (selectedElementIds.has(element.id) ||
        isSelectedGroupElement(element, selectedGroupIds)),
  );
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
  if (!selectedElements.length) {
    return null;
  }

  const textNotes = extractReferenceTextNotes(selectedElements);
  return {
    enabled: false,
    elementCount: selectedElements.length,
    textCount: textNotes.length,
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
