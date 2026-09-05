# 规范类文档

本目录用于存放后续由用户或维护者主导补充的项目规范，例如接口规范、数据格式规范、测试规范、分支规范、提交规范或 Agent 协作规范。

本次初始化只建立入口，不默认制定具体规范。

## 当前规范文档

- [2026-09-05-corestudio-external-image-intake.md](2026-09-05-corestudio-external-image-intake.md)：外部新增图片自动接纳与项目维护一致性需求草案，包含根目录／可选 inbox、状态恢复、去重、软删除保护及待定产品取舍。
- [2026-07-14-corestudio-application-settings-redesign.md](2026-07-14-corestudio-application-settings-redesign.md)：CoreStudio 统一应用设置重构设计。
- [2026-07-14-corestudio-codex-collaboration-usability.md](2026-07-14-corestudio-codex-collaboration-usability.md)：CoreStudio 与 Codex 当前协作边界。
- [2026-07-14-corestudio-usability-improvement-backlog.md](2026-07-14-corestudio-usability-improvement-backlog.md)：易用性优化清单。
- [2026-07-23-corestudio-canvas-selection-context-and-codex-reference.md](2026-07-23-corestudio-canvas-selection-context-and-codex-reference.md)：画布选区状态、复制引用与 Codex 主动读取规则。
- [2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md](2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md)：Agent Board 画布编辑、软删除、资产保留与元素级增量写回规则。
- [2026-07-31-corestudio-agent-image-generation-authorization.md](2026-07-31-corestudio-agent-image-generation-authorization.md)：按 Agent 集成授权调用 CoreStudio 当前图片生成服务的权限、CLI、Skill 与验收规则。
- [2026-07-31-corestudio-cli-diagram-write.md](2026-07-31-corestudio-cli-diagram-write.md)：CoreStudio CLI 使用 Mermaid 创建原生可编辑图表的契约、边界与验收标准。
- [2026-08-03-corestudio-seedream-dual-access.md](2026-08-03-corestudio-seedream-dual-access.md)：火山方舟 Seedream 与即梦 AI AK/SK 双通道接入、迁移和验收规则。
- [2026-08-19-corestudio-canvas-minimap.md](2026-08-19-corestudio-canvas-minimap.md)：大画布迷你地图的产品边界、导航交互、几何渲染、性能与验收方案。
- [2026-08-31-corestudio-website-agent-integration-webmcp.md](2026-08-31-corestudio-website-agent-integration-webmcp.md)：官网 Agent 集成中心、Skill / CLI 安装教程、WebMCP 只读工具与 GitHub 文档 fallback 设计方案。
- [2026-09-01-corestudio-update-notification.md](2026-09-01-corestudio-update-notification.md)：稳定版清单、静默更新检查、设置红点与关于页手动检查方案。
- [2026-09-04-corestudio-agent-project-routing.md](2026-09-04-corestudio-agent-project-routing.md)：Agent Board 认领后的项目无感路由、Agent session 与人类标签解耦、Home 活跃状态，以及 CLI / Skill / 官网同步发版规范。

## 既有历史规格

仓库已有历史规格文档保留在 `docs/superpowers/specs/`：

- `docs/superpowers/specs/2026-04-24-corestudio-modification-boundary.md`
- `docs/superpowers/specs/2026-06-26-corestudio-project-agent-token-design.md`

这些文档不在本次初始化中迁移或改写。

## 更新规则

- 后续新增规范文档时，先由用户或维护者确认规范内容。
- 新增、删除或移动规范文档后，同步更新本 README。
- 不要把临时实现偏好写成项目规范。
- 仓库内路径使用相对路径。
