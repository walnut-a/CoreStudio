import { newElement } from "@excalidraw/element";
import { describe, expect, it, vi } from "vitest";

import { compileAgentMermaidDiagram } from "./agentDiagramCompiler";

const parseFlowchart = vi.fn(async () => ({
  elements: [
    {
      id: "start",
      type: "rectangle" as const,
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      label: { text: "Start" },
    },
    {
      id: "review",
      type: "diamond" as const,
      x: 260,
      y: 0,
      width: 160,
      height: 80,
      label: { text: "Review" },
    },
    {
      id: "start_review",
      type: "arrow" as const,
      x: 160,
      y: 40,
      width: 100,
      height: 0,
      start: { id: "start" },
      end: { id: "review" },
    },
  ],
  files: {},
}));

describe("compileAgentMermaidDiagram", () => {
  it("uses the bundled Mermaid converter for a native flowchart", async () => {
    const getBBoxDescriptor = Object.getOwnPropertyDescriptor(
      SVGElement.prototype,
      "getBBox",
    );
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value: () => ({ x: 0, y: 0, width: 100, height: 20 }),
    });
    let result: Awaited<ReturnType<typeof compileAgentMermaidDiagram>>;
    try {
      result = await compileAgentMermaidDiagram({
        source: "flowchart LR\nA[Start] --> B{Review}",
        diagramId: "diagram-bundled",
        anchorBounds: null,
        viewportCenter: { x: 320, y: 240 },
        existingElements: [],
      });
    } finally {
      if (getBBoxDescriptor) {
        Object.defineProperty(
          SVGElement.prototype,
          "getBBox",
          getBBoxDescriptor,
        );
      } else {
        Reflect.deleteProperty(SVGElement.prototype, "getBBox");
      }
    }

    expect(
      result.elements.some((element) => element.type === "rectangle"),
    ).toBe(true);
    expect(result.elements.some((element) => element.type === "diamond")).toBe(
      true,
    );
    expect(result.elements.some((element) => element.type === "arrow")).toBe(
      true,
    );
    expect(result.elements.some((element) => element.type === "text")).toBe(
      true,
    );
  });

  it("creates editable native elements with bindings, metadata, and collision-free placement", async () => {
    const existing = newElement({
      type: "rectangle",
      x: 100,
      y: 100,
      width: 200,
      height: 120,
    });

    const result = await compileAgentMermaidDiagram({
      source: "flowchart LR\nstart[Start] --> review{Review}",
      diagramId: "diagram-1",
      anchorBounds: { x: 100, y: 100, width: 200, height: 120 },
      viewportCenter: { x: 0, y: 0 },
      existingElements: [existing],
      parseMermaid: parseFlowchart,
    });

    expect(result.bounds.x).toBeGreaterThan(existing.x + existing.width);
    expect(result.elements.some((element) => element.type === "text")).toBe(
      true,
    );
    const start = result.elements.find(
      (element) =>
        element.customData?.corestudioDiagram?.semanticId === "start",
    );
    const arrow = result.elements.find(
      (element) =>
        element.customData?.corestudioDiagram?.semanticId === "start_review",
    );
    expect(start).toMatchObject({
      type: "rectangle",
      customData: {
        corestudioDiagram: {
          schemaVersion: 1,
          diagramId: "diagram-1",
          format: "mermaid",
          semanticId: "start",
        },
      },
    });
    expect(arrow).toMatchObject({
      type: "arrow",
      startBinding: { elementId: expect.any(String) },
      endBinding: { elementId: expect.any(String) },
    });
  });

  it("accepts native elements converted by the hidden browser worker", async () => {
    const nativeElement = newElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 160,
      height: 80,
      customData: {
        corestudioDiagram: {
          schemaVersion: 1,
          diagramId: "diagram-worker",
          format: "mermaid",
          semanticId: "start",
        },
      },
    });
    const parseMermaid = vi.fn(async () => ({
      elements: [
        {
          id: "start",
          type: "rectangle" as const,
          x: 0,
          y: 0,
          width: 160,
          height: 80,
        },
      ],
      nativeElements: [nativeElement],
    }));

    const result = await compileAgentMermaidDiagram({
      source: "flowchart LR\nstart[Start]",
      diagramId: "diagram-worker",
      anchorBounds: null,
      viewportCenter: { x: 320, y: 240 },
      existingElements: [],
      parseMermaid,
    });

    expect(parseMermaid).toHaveBeenCalledWith("flowchart LR\nstart[Start]", {
      diagramId: "diagram-worker",
    });
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toMatchObject({
      type: "rectangle",
      customData: {
        corestudioDiagram: {
          diagramId: "diagram-worker",
          semanticId: "start",
        },
      },
    });
  });

  it("rejects Mermaid conversions that fall back to binary image files", async () => {
    await expect(
      compileAgentMermaidDiagram({
        source: "pie\n  title Pets",
        diagramId: "diagram-1",
        anchorBounds: null,
        viewportCenter: { x: 0, y: 0 },
        existingElements: [],
        parseMermaid: async () => ({
          elements: [],
          files: { "file-1": { dataURL: "data:image/svg+xml;base64,abc" } },
        }),
      }),
    ).rejects.toThrow(
      "Mermaid diagram requires binary image assets and is not supported",
    );
  });
});
