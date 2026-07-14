import type { AgentIntegrationViewModel } from "../agent/agentIntegrationViewModel";
import { DesktopButton } from "./DesktopButton";
import "./AgentSettings.css";

export interface AgentIntegrationSettingsSectionsProps {
  integration: AgentIntegrationViewModel;
  canToggleIntegration: boolean;
  onIntegrationEnabledChange: (enabled: boolean) => void;
  onCopyBoardUrl: () => void;
  onOpenBoardUrl: () => void;
  onCopyCliEnvironment: () => void;
}

export const AgentIntegrationSettingsSections = ({
  integration,
  canToggleIntegration,
  onIntegrationEnabledChange,
  onCopyBoardUrl,
  onOpenBoardUrl,
  onCopyCliEnvironment,
}: AgentIntegrationSettingsSectionsProps) => (
  <>
    <section className="app-settings-section app-settings-section--stacked app-settings-section--overview">
      <div className="app-settings-section__top">
        <div className="app-settings-section__copy">
          <strong>Codex 协作</strong>
          <p>让 Codex 查看当前画布，并将图片和画布修改安全写回 CoreStudio。</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="启用 Codex 协作"
          aria-checked={integration.enabled}
          disabled={!canToggleIntegration}
          className="app-settings-section__switch"
          onClick={() => onIntegrationEnabledChange(!integration.enabled)}
        />
      </div>

      <div className="app-settings-collaboration-status">
        <span
          className={`app-settings-collaboration-status__badge app-settings-collaboration-status__badge--${integration.collaboration.status}`}
        >
          {integration.collaboration.statusText}
        </span>
        <div>
          <p>{integration.collaboration.description}</p>
          {integration.collaboration.projectName ? (
            <span>当前项目：{integration.collaboration.projectName}</span>
          ) : null}
        </div>
      </div>

      <details className="app-settings-advanced app-settings-connection-details">
        <summary>
          <span>
            <strong>连接详情</strong>
            <em>仅在排查连接或手动接入时使用</em>
          </span>
        </summary>
        <div className="app-settings-connection-details__body">
          <dl className="app-settings-connection-list">
            <div>
              <dt>当前项目</dt>
              <dd>{integration.project.name ?? "未打开"}</dd>
            </div>
            <div>
              <dt>本地连接</dt>
              <dd>{integration.bridge.ready ? "已连接" : "未连接"}</dd>
            </div>
            <div>
              <dt>网页画布</dt>
              <dd>{integration.board.statusText}</dd>
            </div>
            <div>
              <dt>CLI</dt>
              <dd>{integration.cli.statusText}</dd>
            </div>
          </dl>
          <div className="app-settings-connection-actions">
            <DesktopButton
              type="button"
              disabled={!integration.board.available}
              onClick={onCopyBoardUrl}
            >
              复制网页画布链接
            </DesktopButton>
            <DesktopButton
              type="button"
              disabled={!integration.bridge.boardUrl}
              onClick={onOpenBoardUrl}
            >
              打开网页画布
            </DesktopButton>
            <DesktopButton
              type="button"
              disabled={!integration.cli.envCopyable}
              onClick={onCopyCliEnvironment}
            >
              复制 CLI 环境变量
            </DesktopButton>
          </div>
        </div>
      </details>
    </section>
  </>
);
