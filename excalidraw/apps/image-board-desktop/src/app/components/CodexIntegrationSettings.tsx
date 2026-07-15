import { useState } from "react";

import type { CodexIntegrationStatus } from "../../shared/desktopBridgeTypes";
import { useCodexIntegrationStatus } from "../useCodexIntegrationStatus";
import { DesktopButton } from "./DesktopButton";

export interface CodexIntegrationSettingsProps {
  open: boolean;
  inspect: () => Promise<CodexIntegrationStatus>;
  copyText: (text: string) => Promise<boolean | void>;
}

const STATE_COPY: Record<
  CodexIntegrationStatus["state"],
  { title: string; action: string }
> = {
  install: { title: "安装 Codex 集成", action: "复制给 Codex" },
  update: { title: "更新 Codex 集成", action: "复制给 Codex" },
  repair: { title: "修复 Codex 集成", action: "复制给 Codex" },
  ready: { title: "环境已准备好", action: "复制给 Codex" },
  error: { title: "无法完成检测", action: "复制给 Codex" },
};

export const CODEX_INSTALL_PROMPT = ({
  appVersion,
  guideUrl,
}: Pick<CodexIntegrationStatus, "appVersion" | "guideUrl">) =>
  `请按照 CoreStudio ${appVersion} 的 Codex 集成安装指南帮我完成安装：${guideUrl}\n请使用本机已安装的正式 CoreStudio，完成后验证 CLI、Skill 和版本记录。`;

const CHECK_STATUS_LABEL = {
  ready: "正常",
  missing: "缺失",
  outdated: "需要更新",
  broken: "需要修复",
} as const;

export const CodexIntegrationSettings = ({
  open,
  inspect,
  copyText,
}: CodexIntegrationSettingsProps) => {
  const { status, loading, error, refresh } = useCodexIntegrationStatus({
    open,
    inspect,
  });
  const [copied, setCopied] = useState<"install" | "prompt" | null>(null);
  const installPrompt = status ? CODEX_INSTALL_PROMPT(status) : "";

  return (
    <section className="settings-page settings-codex-page">
      <header className="settings-page__header">
        <div>
          <h3>Codex 集成</h3>
          <p>安装一次后，Codex 就能发现并操作本机 CoreStudio 项目。</p>
        </div>
        <DesktopButton
          type="button"
          size="small"
          disabled={loading}
          onClick={() => void refresh()}
        >
          重新检测
        </DesktopButton>
      </header>

      {loading && !status ? (
        <div className="settings-detection-loading">正在检测 Codex 集成...</div>
      ) : error ? (
        <section className="settings-callout settings-callout--error">
          <strong>无法完成检测</strong>
          <p>{error}</p>
        </section>
      ) : status ? (
        <>
          <section className="settings-install-card">
            <div>
              <span className="settings-section-label">交给 Codex</span>
              <h4>{STATE_COPY[status.state].title}</h4>
              <p>
                {status.state === "ready"
                  ? "当前依赖齐全。需要重装或修复时，把这句话发给 Codex。"
                  : "复制这句话发给 Codex，它会读取当前版本的安装指南并完成后续步骤。"}
              </p>
            </div>
            <div className="settings-agent-prompt">
              <p>{installPrompt}</p>
            </div>
            <DesktopButton
              type="button"
              size="small"
              variant={status.state === "ready" ? "default" : "primary"}
              onClick={async () => {
                await copyText(installPrompt);
                setCopied("install");
              }}
            >
              {copied === "install"
                ? "已复制"
                : STATE_COPY[status.state].action}
            </DesktopButton>
          </section>

          <section>
            <div className="settings-list-header">
              <div>
                <h4>环境检测</h4>
                <p>三项检查互不遮盖，便于直接看出缺少什么。</p>
              </div>
            </div>
            <div className="settings-check-list">
              {status.checks.map((check) => (
                <div className="settings-check-row" key={check.id}>
                  <span
                    className={`settings-check-row__icon settings-check-row__icon--${check.status}`}
                    aria-hidden="true"
                  >
                    {check.status === "ready" ? "✓" : "!"}
                  </span>
                  <span>
                    <strong>{check.label}</strong>
                    <small>{check.detail}</small>
                  </span>
                  <em>{CHECK_STATUS_LABEL[check.status]}</em>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="settings-start-card">
        <div>
          <span className="settings-section-label">在 Codex 中开始</span>
          <h4>打开当前 CoreStudio 项目</h4>
          <p>复制这句话，粘贴到任意 Codex 对话中。</p>
        </div>
        <DesktopButton
          type="button"
          size="small"
          onClick={async () => {
            await copyText("打开当前 CoreStudio 项目");
            setCopied("prompt");
          }}
        >
          {copied === "prompt" ? "已复制" : "复制使用指令"}
        </DesktopButton>
      </section>
    </section>
  );
};
