import type { GenerationReferencePayload } from "../shared/providerTypes";
import type { DesktopCopy } from "./copy";

const MAX_IMAGE_PREVIEWS = 2;

type SelectionContextCopy = DesktopCopy["agentBoard"]["selectionContext"];

export interface AgentBoardSelectionImagePreview {
  id: string;
  index: number;
  thumbnailDataUrl: string | null;
}

export interface AgentBoardSelectionContextViewModel {
  selected: boolean;
  summary: string;
  clipboardText: string | null;
  imagePreviews: AgentBoardSelectionImagePreview[];
  imagePreviewOverflow: number;
  counts: {
    elements: number;
    images: number;
    text: number;
    shapes: number;
  };
}

export interface CoreStudioSelectionReferenceSnapshot {
  source: "agent-board";
  mode: "snapshot";
  projectName: string;
  projectId: string;
  summary: {
    elements: number;
    images: number;
    texts: number;
    shapes: number;
  };
  elementIds: string[];
  fileIds: string[];
}

const buildSnapshotClipboardText = (
  reference: GenerationReferencePayload,
  counts: AgentBoardSelectionContextViewModel["counts"],
  labels: SelectionContextCopy,
  projectName: string,
  projectId: string,
) => {
  const items = reference.items ?? [];
  const snapshot: CoreStudioSelectionReferenceSnapshot = {
    source: "agent-board",
    mode: "snapshot",
    projectName,
    projectId,
    summary: {
      elements: counts.elements,
      images: counts.images,
      texts: counts.text,
      shapes: counts.shapes,
    },
    elementIds: reference.source?.elementIds ?? items.map((item) => item.id),
    fileIds:
      reference.source?.fileIds ??
      items.flatMap((item) => (item.fileId ? [item.fileId] : [])),
  };

  return [
    labels.snapshotInstruction,
    '<corestudio-selection-reference version="1">',
    JSON.stringify(snapshot),
    "</corestudio-selection-reference>",
  ].join("\n");
};

export const buildAgentBoardSelectionContextViewModel = (
  reference: GenerationReferencePayload | null | undefined,
  labels: SelectionContextCopy,
  projectName: string,
  projectId: string,
): AgentBoardSelectionContextViewModel => {
  const items = reference?.items ?? [];
  const images = items.filter((item) => item.kind === "image");
  const textCount = items.filter((item) => item.kind === "text").length;
  const shapeCount = items.filter((item) => item.kind === "shape").length;
  const elementCount = reference?.elementCount ?? 0;
  const selected = Boolean(reference?.enabled && elementCount > 0);
  const counts = {
    elements: selected ? elementCount : 0,
    images: selected ? images.length : 0,
    text: selected ? textCount : 0,
    shapes: selected ? shapeCount : 0,
  };

  if (!selected) {
    return {
      selected: false,
      summary: labels.empty,
      clipboardText: null,
      imagePreviews: [],
      imagePreviewOverflow: 0,
      counts,
    };
  }

  let summary: string;
  if (counts.images === counts.elements) {
    summary = labels.imageSummary(counts.images);
  } else if (counts.text === counts.elements) {
    summary = labels.textSummary(counts.text);
  } else if (counts.shapes === counts.elements) {
    summary = labels.shapeSummary(counts.shapes);
  } else {
    summary = labels.mixedSummary(counts);
  }

  return {
    selected: true,
    summary,
    clipboardText: buildSnapshotClipboardText(
      reference!,
      counts,
      labels,
      projectName,
      projectId,
    ),
    imagePreviews: images.slice(0, MAX_IMAGE_PREVIEWS).map((item) => ({
      id: item.id,
      index: item.index,
      thumbnailDataUrl: item.thumbnailDataUrl ?? null,
    })),
    imagePreviewOverflow: Math.max(0, images.length - MAX_IMAGE_PREVIEWS),
    counts,
  };
};
