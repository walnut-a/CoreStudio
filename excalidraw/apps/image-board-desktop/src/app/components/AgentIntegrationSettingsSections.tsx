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

const agentUsagePaths = [
  {
    title: "网页画布",
    when: "在 Codex、Cursor 等 Agent 内置浏览器里查看和操作当前画板。",
    requires: "需要桌面端运行，且 Agent 集成已开启。",
    result: "结果：画布、生成记录、右下角状态浮层",
    writeBack: "结果仍通过 Local Bridge / CLI 写回项目。",
  },
  {
    title: "CLI",
    when: "让 Agent 自动读取选区、查原图路径、写入图片或定位元素。",
    requires: "需要复制当前项目的 CLI 环境变量，或由 Agent 自动发现。",
    result: "结果：画布、生成记录、项目健康报告",
    writeBack: "所有写入都经过 CoreStudio 校验，不直接改项目文件。",
  },
  {
    title: "ACP Agent",
    when: "从 CoreStudio 主动发起复杂任务，并在左侧栏继续对话。",
    requires: "需要配置外部 ACP Agent 命令。",
    result: "结果：左侧 Agent 对话、画布、生成记录",
    writeBack: "Agent 产出的图片和结果仍要求走 CLI / Local Bridge。",
  },
];

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
          <strong>Agent 集成</strong>
          <p>
            开启后，CoreStudio 会在本机提供 Local Bridge，让 Agent
            可以通过网页画布或 CLI 访问当前项目。项目写回仍由 CoreStudio
            校验和保存。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-label="启用 Agent 集成"
          aria-checked={integration.enabled}
          disabled={!canToggleIntegration}
          className="app-settings-section__switch"
          onClick={() => onIntegrationEnabledChange(!integration.enabled)}
        />
      </div>

      <div className="app-settings-status-grid" aria-label="Agent 集成状态">
        <div className="app-settings-status-grid__item">
          <span>Bridge</span>
          <strong>{integration.bridge.ready ? "已启动" : "未启动"}</strong>
        </div>
        <div className="app-settings-status-grid__item">
          <span>当前项目</span>
          <strong>{integration.project.name ?? "未打开"}</strong>
        </div>
        <div className="app-settings-status-grid__item">
          <span>网页画布</span>
          <strong>{integration.board.statusText}</strong>
        </div>
        <div className="app-settings-status-grid__item">
          <span>CLI</span>
          <strong>{integration.cli.statusText}</strong>
        </div>
        <div className="app-settings-status-grid__item">
          <span>ACP</span>
          <strong>{integration.acp.statusText}</strong>
        </div>
      </div>

      <div className="app-settings-use-paths" aria-label="Agent 使用路径">
        {agentUsagePaths.map((path) => (
          <article className="app-settings-use-path" key={path.title}>
            <strong>{path.title}</strong>
            <p>{path.when}</p>
            <span>{path.requires}</span>
            <span>{path.result}</span>
            <span>{path.writeBack}</span>
          </article>
        ))}
      </div>
    </section>

    <section className="app-settings-section app-settings-section--stacked">
      <div className="app-settings-section__copy">
        <strong>网页画布</strong>
        <p>
          用于在 Codex、Cursor 或其他 Agent 的内置浏览器中打开 CoreStudio
          画板。它依赖桌面端运行，不能脱离本机客户端独立工作。
        </p>
      </div>
      <div className="app-settings-action-row">
        <span>{integration.board.statusText}</span>
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
      </div>
    </section>

    <section className="app-settings-section app-settings-section--stacked">
      <div className="app-settings-section__copy">
        <strong>CLI</strong>
        <p>
          CLI 是 Agent
          自动读取选区、查询原图路径、写入生成图片和定位画布内容的标准接口。外部
          Agent 不应该直接修改项目文件。
        </p>
      </div>
      <div className="app-settings-cli-list" aria-label="CLI 能力">
        <span>
          <strong>read</strong> 查询项目、选区、图片路径和健康报告
        </span>
        <span>
          <strong>write</strong> 创建图片、提示词和生成记录
        </span>
        <span>
          <strong>edit</strong> 定位和选择画布元素
        </span>
        <span>
          <strong>bash</strong> 输出环境变量和示例
        </span>
      </div>
      <div className="app-settings-action-row">
        <span>{integration.cli.statusText}</span>
        <DesktopButton
          type="button"
          disabled={!integration.cli.envCopyable}
          onClick={onCopyCliEnvironment}
        >
          复制 CLI 环境变量
        </DesktopButton>
      </div>
    </section>
  </>
);
