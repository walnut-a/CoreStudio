import { convertToExcalidrawElements } from "@excalidraw/element";
import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";

import { findNearestOpenScenePlacement } from "../project/imagePlacement";
import {
  getElementsSceneBounds,
  getSceneOccupiedBounds,
  type SceneBounds,
} from "../sceneGeometry";

export type ParseMermaidDiagram = (source: string) => Promise<{
  elements: ExcalidrawElementSkeleton[];
  files?: Record<string, unknown>;
}>;

const DEFAULT_DIAGRAM_GAP = 64;
const MAX_DIAGRAM_ELEMENTS = 500;

const parseMermaidDiagram: ParseMermaidDiagram = async (source) => {
  const { parseMermaidToExcalidraw } = await import(
    "@excalidraw/mermaid-to-excalidraw"
  );
  return parseMermaidToExcalidraw(source);
};

const hasBinaryFiles = (files: Record<string, unknown> | undefined) =>
  files !== undefined && Object.keys(files).length > 0;

const translateElements = (
  elements: readonly ExcalidrawElement[],
  deltaX: number,
  deltaY: number,
) =>
  elements.map(
    (element) =>
      ({
        ...element,
        x: element.x + deltaX,
        y: element.y + deltaY,
      } as ExcalidrawElement),
  );

export const compileAgentMermaidDiagram = async ({
  source,
  diagramId,
  anchorBounds,
  viewportCenter,
  existingElements,
  parseMermaid = parseMermaidDiagram,
}: {
  source: string;
  diagramId: string;
  anchorBounds: SceneBounds | null;
  viewportCenter: { x: number; y: number };
  existingElements: readonly ExcalidrawElement[];
  parseMermaid?: ParseMermaidDiagram;
}) => {
  const parsed = await parseMermaid(source);
  if (hasBinaryFiles(parsed.files)) {
    throw new Error(
      "Mermaid diagram requires binary image assets and is not supported.",
    );
  }
  if (!parsed.elements.length) {
    throw new Error("Mermaid diagram did not produce any native elements.");
  }
  if (parsed.elements.length > MAX_DIAGRAM_ELEMENTS) {
    throw new Error(
      `Mermaid diagram exceeds the ${MAX_DIAGRAM_ELEMENTS}-element limit.`,
    );
  }

  const skeletons = parsed.elements.map((element, index) => ({
    ...element,
    customData: {
      ...element.customData,
      corestudioDiagram: {
        schemaVersion: 1,
        diagramId,
        format: "mermaid",
        semanticId: element.id ?? `${element.type}-${index + 1}`,
      },
    },
  }));
  const converted = convertToExcalidrawElements(skeletons, {
    regenerateIds: true,
  });
  if (converted.length > MAX_DIAGRAM_ELEMENTS) {
    throw new Error(
      `Mermaid diagram exceeds the ${MAX_DIAGRAM_ELEMENTS}-element limit.`,
    );
  }
  const sourceBounds = getElementsSceneBounds(converted);
  if (!sourceBounds) {
    throw new Error("Mermaid diagram produced invalid element bounds.");
  }

  const preferredCenter = anchorBounds
    ? {
        x:
          anchorBounds.x +
          anchorBounds.width +
          DEFAULT_DIAGRAM_GAP +
          sourceBounds.width / 2,
        y: anchorBounds.y + anchorBounds.height / 2,
      }
    : viewportCenter;
  const openStart = findNearestOpenScenePlacement({
    startX: preferredCenter.x - sourceBounds.width / 2,
    startY: preferredCenter.y - sourceBounds.height / 2,
    totalWidth: sourceBounds.width,
    totalHeight: sourceBounds.height,
    occupiedBounds: getSceneOccupiedBounds(existingElements),
    gap: DEFAULT_DIAGRAM_GAP,
  });
  const elements = translateElements(
    converted,
    openStart.x - sourceBounds.x,
    openStart.y - sourceBounds.y,
  );
  const bounds = getElementsSceneBounds(elements);
  if (!bounds) {
    throw new Error("Mermaid diagram placement produced invalid bounds.");
  }

  return { elements, bounds };
};
