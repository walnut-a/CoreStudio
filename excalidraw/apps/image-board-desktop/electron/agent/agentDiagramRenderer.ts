import type { ParseMermaidDiagram } from "../../src/app/agent/agentDiagramCompiler";

interface AgentDiagramRendererWindow {
  loadURL: (url: string) => Promise<unknown>;
  loadFile: (filePath: string) => Promise<unknown>;
  webContents: {
    executeJavaScript: (code: string, userGesture: boolean) => Promise<unknown>;
  };
  isDestroyed: () => boolean;
  destroy: () => void;
}

const buildWorkerExpression = (
  source: string,
  options?: { diagramId: string },
) => `
  (() => {
    const parse = globalThis.__corestudioParseMermaid;
    if (typeof parse !== "function") {
      throw new Error("CoreStudio diagram worker is not ready.");
    }
    return parse(${JSON.stringify(source)}, ${JSON.stringify(
  options?.diagramId ?? null,
)});
  })()
`;

const assertParsedDiagram = (
  value: unknown,
): Awaited<ReturnType<ParseMermaidDiagram>> => {
  if (
    !value ||
    typeof value !== "object" ||
    !("elements" in value) ||
    !Array.isArray(value.elements)
  ) {
    throw new Error("CoreStudio diagram worker returned invalid data.");
  }
  return value as Awaited<ReturnType<ParseMermaidDiagram>>;
};

export const createAgentDiagramRendererParser = ({
  createWindow,
  rendererUrl,
  packagedWorkerPath,
}: {
  createWindow: () => AgentDiagramRendererWindow;
  rendererUrl: string | null;
  packagedWorkerPath: string;
}): ParseMermaidDiagram => {
  return async (source, options) => {
    const worker = createWindow();
    try {
      if (rendererUrl) {
        await worker.loadURL(
          new URL("diagram-worker.html", `${rendererUrl}/`).toString(),
        );
      } else {
        await worker.loadFile(packagedWorkerPath);
      }
      return assertParsedDiagram(
        await worker.webContents.executeJavaScript(
          buildWorkerExpression(source, options),
          true,
        ),
      );
    } finally {
      if (!worker.isDestroyed()) {
        worker.destroy();
      }
    }
  };
};
