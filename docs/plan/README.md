# 计划类文档

本目录用于存放后续由用户或维护者主导补充的计划类文档，例如阶段计划、迁移计划、重构计划、测试计划或路线图。

本次初始化只建立入口，不默认创建具体计划文档，也不默认制定下一步计划。

## 当前计划文档

- [2026-07-19-generation-record-robustness.md](2026-07-19-generation-record-robustness.md)：收紧图片来源与记录读取边界，并修复引用链定位和生成记录 reveal。
- [2026-07-19-agent-runtime-removal.md](2026-07-19-agent-runtime-removal.md)：移除 CoreStudio 内置 Agent runtime，保留单次生成与 Codex Agent 两条清晰路径。
- [2026-07-16-corestudio-codex-integration-reliability.md](2026-07-16-corestudio-codex-integration-reliability.md)：一次性修复 Codex 集成安装、打开当前项目、Agent Board 错误保存和旧快照恢复问题。
- [2026-07-16-excalidraw-host-api-adoption.md](2026-07-16-excalidraw-host-api-adoption.md)：在新基线上接入 Excalidraw 的宿主交互、UI、视口和本地字体资产能力。
- [2026-07-16-excalidraw-baseline-upgrade.md](2026-07-16-excalidraw-baseline-upgrade.md)：保留 CoreStudio 定制、升级 Excalidraw 上游基线并建立可重复同步机制的执行计划。

## 既有历史计划

仓库已有历史计划文档保留在 `docs/superpowers/plans/`：

- `docs/superpowers/plans/2026-04-12-image-board-desktop.md`
- `docs/superpowers/plans/2026-06-24-corestudio-agent-board-browser-canvas.md`
- `docs/superpowers/plans/2026-06-24-corestudio-agent-cli-local-bridge.md`
- `docs/superpowers/plans/2026-06-25-corestudio-agent-board-client-parity.md`
- `docs/superpowers/plans/2026-06-26-corestudio-project-agent-token.md`
- `docs/superpowers/plans/2026-06-26-corestudio-project-menu.md`

这些文档不在本次初始化中迁移或改写。

## 更新规则

- 后续新增计划文档时，先由用户或维护者确认计划方向。
- 新增、删除或移动计划文档后，同步更新本 README。
- 不确定或尚未确认的计划不要写成既定路线。
- 仓库内路径使用相对路径。
