# 说明类文档

本目录存放相对稳定的说明类文档，用来帮助维护者和 Agent 理解仓库现状、代码结构、架构边界、运行入口、交接信息和已确认事实。

这里放：

- 仓库分析。
- 架构说明。
- 接口和运行说明。
- 交接和维护边界说明。

这里不放：

- 尚未确认的计划。
- 团队尚未确认的规范。
- 临时调试日志。
- 需要频繁重写的任务清单。

## 文档索引

- [corestudio-dependency-security.md](corestudio-dependency-security.md)：CoreStudio 桌面 bundle 的依赖安全口径、已修复链路、Vitest mock 隔离、持续门禁和剩余上游风险。
- [generation-record-robustness-audit.md](generation-record-robustness-audit.md)：图片来源、生成记录展示、画布定位与项目记录读取边界的健壮性审计。
- [excalidraw-fork-maintenance.md](excalidraw-fork-maintenance.md)：Excalidraw 源码 fork 的当前基线、已知上游包改动和后续升级流程。
- [excalidraw-image-board-design.md](excalidraw-image-board-design.md)：2026-04-12 的本地生图画布第一版产品设计草案归档。
- [repository-analysis.md](repository-analysis.md)：当前仓库、分支、技术栈、代码结构、已实现能力和维护注意事项。

## 更新规则

- 仓库结构、主要入口、推荐阅读基准分支或维护边界发生变化时，更新相关说明文档。
- 新增说明类文档后，同步更新本 README 索引。
- 仓库内路径使用相对路径。
