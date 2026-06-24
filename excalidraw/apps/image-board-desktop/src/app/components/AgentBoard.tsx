import { useEffect, useMemo, useState } from "react";

import { Excalidraw } from "@excalidraw/excalidraw";

import { AGENT_HTTP_ROUTES } from "../../shared/agentBridgeTypes";
import { DESKTOP_LANG_CODE } from "../copy";
import { DesktopButton } from "./DesktopButton";

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

interface AgentBoardGrant {
  taskId: string;
  writeToken: string;
  expiresAt: string;
}

const isEnvelope = <T,>(value: unknown): value is AgentEnvelope<T> =>
  typeof value === "object" && value !== null && "ok" in value;

const getAgentBoardConfig = () => {
  const url = new URL(window.location.href);
  const bridge = url.searchParams.get("bridge");
  const token = url.searchParams.get("token");
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
  const [grant, setGrant] = useState<AgentBoardGrant | null>(null);
  const [loading, setLoading] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestBridge = async <T,>(
    route: string,
    init: RequestInit = {},
  ): Promise<T> => {
    if (!config) {
      throw new Error("Agent Board 链接缺少 bridge 或 token。");
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
      throw new Error("Agent Bridge 返回了无法识别的数据。");
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
        setGrant(null);
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
          : "Agent Board 刷新失败。",
      );
    } finally {
      setLoading(false);
    }
  };

  const authorize = async () => {
    setAuthorizing(true);
    setError(null);
    try {
      const nextGrant = await requestBridge<AgentBoardGrant>(
        AGENT_HTTP_ROUTES.authorize,
        {
          method: "POST",
          body: JSON.stringify({
            permissions: ["write-board", "generate-image"],
            reason: "Agent Board 操作当前画板",
          }),
        },
      );
      setGrant(nextGrant);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Agent Board 授权失败。",
      );
    } finally {
      setAuthorizing(false);
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
          <h1>缺少连接信息</h1>
          <p>
            请从 CoreStudio 桌面端复制 Agent Board 链接，再在 Codex
            内置浏览器中打开。
          </p>
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
            <h1>{board?.project.name ?? "CoreStudio Agent Board"}</h1>
            <p>
              在 Codex 内置浏览器中查看当前 CoreStudio 画板；写回仍通过
              CLI / Local Bridge 授权完成。
            </p>
          </div>
          <div className="agent-board-header__actions">
            <DesktopButton type="button" onClick={refresh} disabled={loading}>
              {loading ? "刷新中" : "刷新"}
            </DesktopButton>
            <DesktopButton
              type="button"
              variant="primary"
              onClick={authorize}
              disabled={authorizing || !status?.ready}
            >
              {authorizing ? "等待确认" : "申请写入授权"}
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
                {loading ? "正在载入画板" : "等待当前项目画板"}
              </div>
            )}
          </div>

          <aside className="agent-board-side" aria-label="画板状态">
            <section className="agent-board-card">
              <div>
                <span className="agent-board-label">当前项目</span>
                <strong>
                  {status?.currentProject?.name ?? "未打开项目"}
                </strong>
              </div>
              {status?.currentProject?.projectPath && (
                <p>{status.currentProject.projectPath}</p>
              )}
              {board?.updatedAt && (
                <p>
                  Board 同步于{" "}
                  {new Date(board.updatedAt).toLocaleTimeString("zh-CN")}
                </p>
              )}
            </section>

            <section className="agent-board-grid" aria-label="画板摘要">
              <div className="agent-board-metric">
                <span>元素</span>
                <strong>{board?.metrics.elementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>图片</span>
                <strong>{board?.metrics.imageElementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>文字</span>
                <strong>{board?.metrics.textElementCount ?? "-"}</strong>
              </div>
              <div className="agent-board-metric">
                <span>选区</span>
                <strong>
                  {selection?.selected
                    ? `${board?.metrics.selectedElementIds?.length ?? 0} 个`
                    : "无"}
                </strong>
              </div>
            </section>

            {board?.missingFileIds.length ? (
              <section className="agent-board-card agent-board-card--warning">
                <span className="agent-board-label">图片加载</span>
                <strong>{board.missingFileIds.length} 张图片未载入</strong>
                <p>可刷新状态，或在桌面端确认项目资源是否完整。</p>
              </section>
            ) : null}

            {grant && (
              <section className="agent-board-card agent-board-card--grant">
                <div>
                  <span className="agent-board-label">写入授权</span>
                  <strong>{grant.taskId}</strong>
                </div>
                <p>
                  有效期至 {new Date(grant.expiresAt).toLocaleString("zh-CN")}
                </p>
              </section>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};
