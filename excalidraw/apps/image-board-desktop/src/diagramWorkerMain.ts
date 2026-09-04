import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/element/transform";

const addDiagramMetadata = (
  elements: Awaited<ReturnType<typeof parseMermaidToExcalidraw>>["elements"],
  diagramId: string,
) =>
  elements.map((element, index) => ({
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

Object.assign(globalThis, {
  __corestudioParseMermaid: async (
    source: string,
    diagramId: string | null,
  ) => {
    const parsed = await parseMermaidToExcalidraw(source);
    if (!diagramId || Object.keys(parsed.files ?? {}).length > 0) {
      return parsed;
    }
    return {
      ...parsed,
      nativeElements: convertToExcalidrawElements(
        addDiagramMetadata(parsed.elements, diagramId),
        { regenerateIds: true },
      ),
    };
  },
});
