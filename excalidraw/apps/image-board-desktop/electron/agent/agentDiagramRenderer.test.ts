import { describe, expect, it, vi } from "vitest";

import { createAgentDiagramRendererParser } from "./agentDiagramRenderer";

describe("createAgentDiagramRendererParser", () => {
  it("loads the hidden browser worker only when a diagram is requested", async () => {
    const loadURL = vi.fn(async () => undefined);
    const executeJavaScript = vi.fn(async () => ({
      elements: [{ type: "rectangle" }],
    }));
    const destroy = vi.fn();
    const createWindow = vi.fn(() => ({
      loadURL,
      loadFile: vi.fn(async () => undefined),
      webContents: { executeJavaScript },
      isDestroyed: () => false,
      destroy,
    }));
    const parse = createAgentDiagramRendererParser({
      createWindow,
      rendererUrl: "http://127.0.0.1:5174",
      packagedWorkerPath: "/app/dist/diagram-worker.html",
    });

    expect(createWindow).not.toHaveBeenCalled();
    await expect(parse("flowchart LR\nA --> B")).resolves.toEqual({
      elements: [{ type: "rectangle" }],
    });
    expect(loadURL).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/diagram-worker.html",
    );
    expect(executeJavaScript).toHaveBeenCalledWith(
      expect.stringContaining('"flowchart LR\\nA --> B"'),
      true,
    );
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("loads the packaged worker and always destroys it after an error", async () => {
    const error = new Error("diagram failed");
    const loadFile = vi.fn(async () => undefined);
    const destroy = vi.fn();
    const parse = createAgentDiagramRendererParser({
      createWindow: () => ({
        loadURL: vi.fn(async () => undefined),
        loadFile,
        webContents: {
          executeJavaScript: vi.fn(async () => {
            throw error;
          }),
        },
        isDestroyed: () => false,
        destroy,
      }),
      rendererUrl: null,
      packagedWorkerPath: "/app/dist/diagram-worker.html",
    });

    await expect(parse("flowchart LR\nA --> B")).rejects.toThrow(
      "diagram failed",
    );
    expect(loadFile).toHaveBeenCalledWith("/app/dist/diagram-worker.html");
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
