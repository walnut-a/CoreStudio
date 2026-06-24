import { useEffect, useMemo, useState } from "react";

import { AGENT_HTTP_ROUTES } from "../../shared/agentBridgeTypes";
import { DesktopButton } from "./DesktopButton";

import type { AgentEnvelope } from "../../shared/agentBridgeTypes";
import type { DesktopCurrentProject } from "../../shared/desktopBridgeTypes";

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
  const [snapshot, setSnapshot] = useState<AgentBoardSnapshot | null>(null);
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
        setSnapshot(null);
        setSelection(null);
        setGrant(null);
        return;
      }

      const [nextSnapshot, nextSelection] = await Promise.all([
        requestBridge<AgentBoardSnapshot>(AGENT_HTTP_ROUTES.sceneSnapshot),
        requestBridge<AgentBoardSelection>(AGENT_HTTP_ROUTES.sceneSelection),
      ]);
      setSnapshot(nextSnapshot);
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
    <div className="agent-board-page">
      <main className="agent-board-shell">
        <header className="agent-board-header">
          <div>
            <span className="welcome-pane__eyebrow">Agent Board</span>
            <h1>CoreStudio Agent Board</h1>
            <p>
              通过本地 Agent Bridge 查看当前项目状态，并向桌面端申请短期写入授权。
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

        <section className="agent-board-card">
          <div>
            <span className="agent-board-label">当前项目</span>
            <strong>{status?.currentProject?.name ?? "未打开项目"}</strong>
          </div>
          {status?.currentProject?.projectPath && (
            <p>{status.currentProject.projectPath}</p>
          )}
        </section>

        <section className="agent-board-grid" aria-label="画板摘要">
          <div className="agent-board-metric">
            <span>元素</span>
            <strong>{snapshot?.elementCount ?? "-"}</strong>
          </div>
          <div className="agent-board-metric">
            <span>图片元素</span>
            <strong>{snapshot?.imageElementCount ?? "-"}</strong>
          </div>
          <div className="agent-board-metric">
            <span>文字元素</span>
            <strong>{snapshot?.textElementCount ?? "-"}</strong>
          </div>
          <div className="agent-board-metric">
            <span>选区</span>
            <strong>
              {selection?.selected
                ? `${snapshot?.selectedElementIds?.length ?? 0} 个`
                : "无"}
            </strong>
          </div>
        </section>

        {grant && (
          <section className="agent-board-card agent-board-card--grant">
            <div>
              <span className="agent-board-label">写入授权</span>
              <strong>{grant.taskId}</strong>
            </div>
            <p>有效期至 {new Date(grant.expiresAt).toLocaleString("zh-CN")}</p>
          </section>
        )}
      </main>
    </div>
  );
};
