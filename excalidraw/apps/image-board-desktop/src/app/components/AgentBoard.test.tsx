import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { excalidrawSpy } = vi.hoisted(() => ({
  excalidrawSpy: vi.fn(),
}));

vi.mock("@excalidraw/excalidraw", () => ({
  Excalidraw: (props: any) => {
    excalidrawSpy(props);
    return (
      <div data-testid="agent-board-excalidraw">
        elements:{props.initialData.elements.length}
      </div>
    );
  },
}));

import { AGENT_HTTP_ROUTES } from "../../shared/agentBridgeTypes";
import { AgentBoard } from "./AgentBoard";

const bridgeUrl = "http://127.0.0.1:60909";
const token = "read-token";

const envelope = <T,>(data: T) => ({
  ok: true,
  data,
});

const createFetch = () =>
  vi.fn(async (url: string, init?: RequestInit) => {
    const route = new URL(url).pathname;

    if (route === AGENT_HTTP_ROUTES.status) {
      return {
        json: async () =>
          envelope({
            ready: true,
            currentProject: {
              projectPath: "/Users/alice/Documents/Shell concept",
              name: "Shell concept",
            },
          }),
      };
    }

    if (route === AGENT_HTTP_ROUTES.sceneBoard) {
      return {
        json: async () =>
          envelope({
            project: {
              projectPath: "/Users/alice/Documents/Shell concept",
              name: "Shell concept",
              updatedAt: "2026-06-24T10:00:00.000Z",
            },
            updatedAt: "2026-06-24T10:30:00.000Z",
            elements: [
              {
                id: "rect-1",
                type: "rectangle",
                x: 0,
                y: 0,
                width: 120,
                height: 80,
                isDeleted: false,
              },
            ],
            appState: {
              viewBackgroundColor: "#ffffff",
              selectedElementIds: {
                "rect-1": true,
              },
              selectedGroupIds: {},
            },
            files: {
              "file-1": {
                id: "file-1",
                mimeType: "image/png",
                dataURL: "data:image/png;base64,ZmFrZQ==",
                created: 1,
              },
            },
            metrics: {
              elementCount: 1,
              imageElementCount: 0,
              textElementCount: 0,
              fileCount: 1,
              imageRecordCount: 1,
              selectedElementIds: ["rect-1"],
            },
            missingFileIds: [],
          }),
      };
    }

    if (route === AGENT_HTTP_ROUTES.sceneSelection) {
      return {
        json: async () =>
          envelope({
            selected: true,
          }),
      };
    }

    if (route === AGENT_HTTP_ROUTES.authorize) {
      expect(init?.method).toBe("POST");
      return {
        json: async () =>
          envelope({
            taskId: "task-1",
            writeToken: "write-token-1",
            expiresAt: "2026-06-25T10:00:00.000Z",
          }),
      };
    }

    throw new Error(`Unexpected route: ${route}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("AgentBoard", () => {
  beforeEach(() => {
    excalidrawSpy.mockClear();
    window.history.pushState(
      {},
      "",
      `/agent-board?bridge=${encodeURIComponent(bridgeUrl)}&token=${token}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the current project as a read-only Excalidraw board", async () => {
    const fetch = createFetch();
    vi.stubGlobal("fetch", fetch);

    render(<AgentBoard />);

    expect(
      await screen.findByTestId("agent-board-excalidraw"),
    ).toHaveTextContent("elements:1");
    expect(
      screen.getByRole("heading", { name: "Shell concept" }),
    ).toBeInTheDocument();
    expect(screen.getByText("元素")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("选区")).toBeInTheDocument();
    expect(screen.getByText("1 个")).toBeInTheDocument();

    await waitFor(() => expect(excalidrawSpy).toHaveBeenCalled());
    const props = excalidrawSpy.mock.calls.at(-1)?.[0];
    expect(props.viewModeEnabled).toBe(true);
    expect(props.zenModeEnabled).toBe(true);
    expect(props.initialData).toMatchObject({
      scrollToContent: true,
      appState: {
        viewModeEnabled: true,
        zenModeEnabled: true,
        selectedElementIds: {
          "rect-1": true,
        },
      },
      files: {
        "file-1": {
          dataURL: "data:image/png;base64,ZmFrZQ==",
        },
      },
    });
    expect(
      fetch.mock.calls.some(([url]) =>
        String(url).endsWith(AGENT_HTTP_ROUTES.sceneBoard),
      ),
    ).toBe(true);
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${token}`,
    });
  });

  it("keeps write authorization separate from browser canvas rendering", async () => {
    const fetch = createFetch();
    vi.stubGlobal("fetch", fetch);

    render(<AgentBoard />);

    await screen.findByTestId("agent-board-excalidraw");
    fireEvent.click(screen.getByRole("button", { name: "申请写入授权" }));

    expect(await screen.findByText("task-1")).toBeInTheDocument();
    const authorizeCall = fetch.mock.calls.find(([url]) =>
      String(url).endsWith(AGENT_HTTP_ROUTES.authorize),
    );
    expect(authorizeCall?.[1]?.body).toBe(
      JSON.stringify({
        permissions: ["write-board", "generate-image"],
        reason: "Agent Board 操作当前画板",
      }),
    );
  });

  it("shows setup guidance when the copied board link is incomplete", () => {
    window.history.pushState({}, "", "/agent-board");

    render(<AgentBoard />);

    expect(
      screen.getByRole("heading", { name: "缺少连接信息" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/复制 Agent Board 链接/)).toBeInTheDocument();
  });
});
