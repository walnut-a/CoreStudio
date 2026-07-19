# 文档入口

本目录是 CoreStudio 仓库的文档总入口。文档采用渐进式披露：根目录 `README.md` 只放项目级摘要；本文件说明文档组织方式；具体细节进入对应子目录或功能目录。

每一层 README 同时承担两个职责：

1. 说明这一层目录放什么、不放什么、什么时候更新。
2. 索引这一层下面最重要的文档入口。

## 目录职责

| 路径                      | 职责                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `docs/doc/`               | 稳定说明类文档，例如仓库分析、架构说明、接口说明、运行说明、交接说明 |
| `docs/plan/`              | 后续由用户或维护者主导补充的计划类文档入口                           |
| `docs/spec/`              | 后续由用户或维护者主导补充的规范类文档入口                           |
| `docs/superpowers/plans/` | 已存在的历史计划文档目录，当前保留原位置                             |
| `docs/superpowers/specs/` | 已存在的历史规格文档目录，当前保留原位置                             |

`docs/plan/` 和 `docs/spec/` 是新的通用入口。现有 `docs/superpowers/` 不迁移、不删除、不改写；它们作为历史计划和规格文档继续被索引。

## 重要文档

- [doc/README.md](doc/README.md)：说明类文档入口。
- [doc/excalidraw-fork-maintenance.md](doc/excalidraw-fork-maintenance.md)：Excalidraw 源码 fork 维护说明。
- [doc/excalidraw-image-board-design.md](doc/excalidraw-image-board-design.md)：本地生图画布第一版产品设计草案归档。
- [doc/repository-analysis.md](doc/repository-analysis.md)：仓库现状、分支、结构、能力和维护边界分析。
- [plan/README.md](plan/README.md)：计划类文档入口。
- [spec/README.md](spec/README.md)：规范类文档入口。

功能级文档：

- [../excalidraw/apps/image-board-desktop/README.md](../excalidraw/apps/image-board-desktop/README.md)：CoreStudio CLI / Agent Bridge 说明。
- [../excalidraw/apps/image-board-desktop/PRODUCT.md](../excalidraw/apps/image-board-desktop/PRODUCT.md)：产品定位和 Agent 集成原则。
- [../excalidraw/apps/image-board-desktop/DESIGN.md](../excalidraw/apps/image-board-desktop/DESIGN.md)：设计系统和界面约束。
- [../excalidraw/apps/image-board-desktop/docs/localization.md](../excalidraw/apps/image-board-desktop/docs/localization.md)：新增 CoreStudio 功能时的多语言底座与文案约定。
- [../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md](../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)：CoreStudio CLI contract。
- [../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md](../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)：当前 Agent 集成架构边界。

## 更新规则

- 新增、删除或移动文档后，同步更新对应层级 README 索引。
- 仓库内路径使用相对路径，不写本机绝对路径、临时路径或 Agent 运行路径。
- 说明类文档放入 `docs/doc/` 或功能目录下的 `docs/`。
- 本次初始化只建立计划类入口，不默认创建具体计划文档。
- 本次初始化只建立规范类入口，不默认制定具体规范。
- 如果后续用户或维护者明确制定计划或规范，再放入对应目录并更新索引。
