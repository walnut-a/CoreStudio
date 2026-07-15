import { useEffect, useMemo, useState } from "react";

import { Excalidraw } from "@excalidraw/excalidraw";

import { AGENT_HTTP_ROUTES } from "../../shared/agentBridgeTypes";
import { copy, DESKTOP_LANG_CODE } from "../copy";
import { DesktopButton } from "./DesktopButton";

import "./AgentBoard.css";

import type { AgentEnvelope } from "../../shared/agentBridgeTypes";
import type { DesktopCurrentProject } from "../../shared/desktopBridgeTypes";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

interface AgentBoardStatus {
  ready: boolean;
  currentProject: DesktopCurrentProject | null;
}

interface AgentBoardSnapshot {
  elementCount: number;
  imageElementCount: number;
  textElementCount: number;
  fileCount: number;
  imageRecordCount: number;
  selectedElementIds: string[];
}

interface AgentBoardScene {
  project: {
    projectPath: string;
    name: string;
    updatedAt: string;
  };
  updatedAt: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  metrics: AgentBoardSnapshot;
  missingFileIds: string[];
}

interface AgentBoardSelection {
  selected: boolean;
}

const isEnvelope = <T,>(value: unknown): value is AgentEnvelope<T> =>
  typeof value === "object" && value !== null && "ok" in value;

const getAgentBoardConfig = () => {
  const url = new URL(window.location.href);
  const bridge = url.searchParams.get("bridge");
  const token =
    url.searchParams.get("projectToken") ?? url.searchParams.get("token");
  if (!bridge || !token) {
    return null;
  }
  return {
    bridge: bridge.replace(/\/+$/, ""),
    token,
  };
};

export const AgentBoard = () => {
  const config = useMemo(getAgentBoardConfig, []);
  const [status, setStatus] = useState<AgentBoardStatus | null>(null);
  const [board, setBoard] = useState<AgentBoardScene | null>(null);
  const [selection, setSelection] = useState<AgentBoardSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestBridge = async <T,>(
    route: string,
    init: RequestInit = {},
  ): Promise<T> => {
    if (!config) {
      throw new Error(copy.agentBoard.errors.missingConfig);
    }

    const response = await fetch(`${config.bridge}${route}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
    const json = (await response.json()) as unknown;
    if (!isEnvelope<T>(json)) {
      throw new Error(copy.agentBoard.errors.unrecognizedBridgeData);
    }
    if (!json.ok) {
      throw new Error(json.error.message);
    }
    return json.data;
  };

  const refresh = async () => {
    if (!config) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextStatus = await requestBridge<AgentBoardStatus>(
        AGENT_HTTP_ROUTES.status,
      );
      setStatus(nextStatus);
      if (!nextStatus.currentProject) {
        setBoard(null);
        setSelection(null);
        return;
      }

      const [nextBoard, nextSelection] = await Promise.all([
        requestBridge<AgentBoardScene>(AGENT_HTTP_ROUTES.sceneBoard),
        requestBridge<AgentBoardSelection>(AGENT_HTTP_ROUTES.sceneSelection),
      ]);
      setBoard(nextBoard);
      setSelection(nextSelection);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : copy.agentBoard.errors.refreshFailed,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const boardInitialData = useMemo<ExcalidrawInitialDataState | null>(() => {
    if (!board) {
      return null;
    }

    return {
      elements: board.elements,
      appState: {
        ...board.appState,
        viewModeEnabled: true,
        zenModeEnabled: true,
      },
      files: board.files,
      scrollToContent: true,
    };
  }, [board]);

  if (!config) {
    return (
      <div className="agent-board-page">
        <main className="agent-board-shell">
          <span className="welcome-pane__eyebrow">Agent Board</span>
          <h1>{copy.agentBoard.missingConnectionTitle}</h1>
          <p>{copy.agentBoard.missingConnectionDescription}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="agent-board-page agent-board-page--canvas">
      <main className="agent-board-workspace">
        <header className="agent-board-header">
          <div>
            <span className="welcome-pane__eyebrow">Agent Board</span>
            <h1>{board?.project.name ?? copy.agentBoard.defaultTitle}</h1>
            <p>{copy.agentBoard.description}</p>
          </div>
          <div className="agent-board-header__actions">
            <DesktopButton type="button" onClick={refresh} disabled={loading}>
              {loading ? copy.agentBoard.refreshing : copy.agentBoard.refresh}
            </DesktopButton>
          </div>
        </header>

        {error && <div className="dialog-card__error">{error}</div>}

        <section className="agent-board-content">
          <div className="agent-board-canvas-panel">
            {board && boardInitialData ? (
              <Excalidraw
                key={board.updatedAt}
                langCode={DESKTOP_LANG_CODE}
                initialData={boardInitialData}
                viewModeEnabled={true}
                zenModeEnabled={true}
              />
            ) : (
              <div className="agent-board-empty" role="status">
                {loading
                  ? copy.agentBoard.loadingBoard
                  : copy.agentBoard.waitingForBoard}
              </div>
            )}
          </div>

          <aside
            className="agent-board-side"
            aria-label={copy.agentBoard.boardStatus}
          >
            <section className="agent-board-card">
              <div>
                <span className="agent-board-label">
                  {copy.agentBoard.currentProject}
                </span>
                <strong>
                  {status?.currentProject?.name ?? copy.agentBoard.noProject}
                </strong>
              </div>
              {status?.currentProject?.projectPath && (
                <p>{status.currentProject.projectPath}</p>
              )}
              {board?.updatedAt && (
                <p>
                  {copy.agentBoard.boardSyncedAt(
                    new Date(board.updatedAt).toLocaleTimeString(
                      DESKTOP_LANG_CODE,
                    ),
                  )}
                </p>
              )}
            </section>

            <section
              className="agent-board-grid"
              aria-label={copy.agentBoard.boardSummary}
            >
              <div className="agent-board-metric">
                <span>{copy.agentBoard.elements}</span>
                <strong>{board?.metrics.elementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>{copy.agentBoard.images}</span>
                <strong>{board?.metrics.imageElementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>{copy.agentBoard.text}</span>
                <strong>{board?.metrics.textElementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>{copy.agentBoard.selection}</span>
                <strong>
                  {selection?.selected
                    ? copy.agentBoard.selectedCount(
                        board?.metrics.selectedElementIds?.length ?? 0,
                      )
                    : copy.agentBoard.noSelection}
                </strong>
              </div>
            </section>

            {board?.missingFileIds.length ? (
              <section className="agent-board-card agent-board-card--warning">
                <span className="agent-board-label">
                  {copy.agentBoard.imageLoading}
                </span>
                <strong>
                  {copy.agentBoard.missingImages(board.missingFileIds.length)}
                </strong>
                <p>{copy.agentBoard.missingImagesDescription}</p>
              </section>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  );
};
