import type { ClipboardData } from "@excalidraw/excalidraw/clipboard";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

export const hasClipboardFiles = (files: BinaryFiles | undefined) =>
  Boolean(files && Object.keys(files).length > 0);

export const isEmptyClipboardData = (data: ClipboardData) =>
  !data.elements?.length &&
  !hasClipboardFiles(data.files) &&
  !data.mixedContent?.length &&
  !data.errorMessage &&
  !(data.text ?? "").trim();
