import { render, screen, waitFor } from "@testing-library/react";
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
import { setActiveDesktopLocale } from "../copy";
import { AgentBoard } from "./AgentBoard";

const bridgeUrl = "http://127.0.0.1:60909";
const token = "project-token";

const envelope = <T,>(data: T) => ({
  ok: true,
  data,
});

const createFetch = (missingFileIds: string[] = []) =>
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
              agentAccess: {
                token,
                enabled: true,
              },
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
            missingFileIds,
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
      `/agent-board?bridge=${encodeURIComponent(
        bridgeUrl,
      )}&projectToken=${token}`,
    );
  });

  afterEach(() => {
    setActiveDesktopLocale("zh-CN");
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
    expect(props.interaction).toEqual({
      enabled: {
        navigation: true,
      },
    });
    expect(props.ui).toBe(false);
    expect(props.viewModeEnabled).toBeUndefined();
    expect(props.zenModeEnabled).toBeUndefined();
    expect(props.initialData).toMatchObject({
      appState: {
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
    expect(props.initialState).toEqual({
      viewport: {
        target: props.initialData.elements,
        fit: "scale-down",
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

  it("does not ask for a second write authorization", async () => {
    const fetch = createFetch();
    vi.stubGlobal("fetch", fetch);

    render(<AgentBoard />);

    await screen.findByTestId("agent-board-excalidraw");
    expect(
      screen.queryByRole("button", { name: "申请写入授权" }),
    ).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.some(([url]) =>
        String(url).endsWith(AGENT_HTTP_ROUTES.authorize),
      ),
    ).toBe(false);
  });

  it("shows setup guidance when the copied board link is incomplete", () => {
    window.history.pushState({}, "", "/agent-board");

    render(<AgentBoard />);

    expect(
      screen.getByRole("heading", { name: "缺少连接信息" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/复制 Agent Board 链接/)).toBeInTheDocument();
  });

  it("localizes board chrome while preserving project data", async () => {
    setActiveDesktopLocale("en");
    vi.stubGlobal("fetch", createFetch(["missing-file"]));

    render(<AgentBoard />);

    expect(
      await screen.findByRole("heading", { name: "Shell concept" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "View the current CoreStudio board in Codex's built-in browser. Write-back uses the local project token.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByLabelText("Board status")).toBeInTheDocument();
    expect(screen.getByText("Current project")).toBeInTheDocument();
    expect(screen.getByLabelText("Board summary")).toBeInTheDocument();
    expect(screen.getByText("Elements")).toBeInTheDocument();
    expect(screen.getByText("Images")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Selection")).toBeInTheDocument();
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByText("Image loading")).toBeInTheDocument();
    expect(screen.getByText("1 image failed to load")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Refresh the status, or check the project assets in the desktop app.",
      ),
    ).toBeInTheDocument();
  });

  it("localizes incomplete-link guidance", () => {
    setActiveDesktopLocale("en");
    window.history.pushState({}, "", "/agent-board");

    render(<AgentBoard />);

    expect(
      screen.getByRole("heading", { name: "Connection information missing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Copy the Agent Board link from the CoreStudio desktop app, then open it in Codex's built-in browser.",
      ),
    ).toBeInTheDocument();
  });

  it("localizes CoreStudio errors for unrecognized bridge data", async () => {
    setActiveDesktopLocale("en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ unexpected: true }),
      })),
    );

    render(<AgentBoard />);

    expect(
      await screen.findByText("Agent Bridge returned unrecognized data."),
    ).toBeInTheDocument();
  });

  it("preserves bridge error messages in their original language", async () => {
    setActiveDesktopLocale("en");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          ok: false,
          error: {
            code: "PROJECT_UNAVAILABLE",
            message: "当前项目暂时无法读取。",
          },
        }),
      })),
    );

    render(<AgentBoard />);

    expect(
      await screen.findByText("当前项目暂时无法读取。"),
    ).toBeInTheDocument();
  });
});
