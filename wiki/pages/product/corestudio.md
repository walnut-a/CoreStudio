---
title: CoreStudio 产品
type: product
updated: 2026-07-30
source_count: 4
---

# CoreStudio 产品

本页回答 CoreStudio 是什么、为谁服务、解决什么问题，以及哪些能力不属于它。

## 定位

- `confirmed`：CoreStudio 是基于 Excalidraw 的本地优先工业设计图像画板。
- `confirmed`：产品把项目管理、自由画布、图片素材、提示词、生图结果、生成记录和 Agent 协作组织到同一个桌面工作空间。
- `confirmed`：成功体验不是重造一套设计工具，而是让能力自然生长在 Excalidraw 的画布、菜单、侧栏、按钮和浮层体系中。

## 用户与任务

- `confirmed`：主要用户是在本地整理工业设计参考、标注图、提示词和生成结果的设计工作者，以及协助他们操作项目的自动化 Agent。
- `confirmed`：典型任务围绕一个真实本地项目展开：打开项目、整理素材、选择参考图、生成或写回图片、继续在画布上编辑。
- `confirmed`：用户关注画布和内容本身，Agent、Bridge 和模型配置应该服务工作流，而不是成为主要界面。

## 核心能力

- Excalidraw 的图形、文字、图片、分组和自由编排。
- 本地项目文件夹与图片资产、场景和记录的统一维护。
- CoreStudio 内的单次图片生成与多 provider 配置。
- 当前选区和项目图片作为生成或 Agent 上下文。
- 图片详情、生成记录、错误信息和结果定位。
- Agent Board 浏览器画布。
- CLI / Local Bridge 的受控读取、选择、定位和图片写回。
- 项目健康检查、修复和数据完整性保护。

以上均为 `confirmed`，但具体 provider、命令和界面状态会随版本变化，当前问题需查看实现或 contract。

## 产品边界

- `confirmed`：CoreStudio 内只调度本地单次生成。
- `confirmed`：复杂、连续或并行的 Agent 工作由 Codex 调度。
- `confirmed`：Agent Board 提供上下文、选择、标注和确认，不是第三个调度器。
- `confirmed`：CoreStudio 不内置 Agent runtime，也不保存外部 Agent 会话、thread、任务包或运行日志。
- `confirmed`：项目数据由 CoreStudio 持有，外部 Agent 不能绕过 CLI / Local Bridge 直接改项目文件。
- `confirmed`：当前产品是本地协作工具，不是互联网多人协作服务、账号系统或云端项目平台。

## 品牌与体验

- `confirmed`：品牌性格是克制、专业、底座一致。
- `confirmed`：界面以画布和内容为主角，状态与设置轻量、靠边、可关闭。
- `confirmed`：避免 SaaS 官网式包装、玻璃拟态、装饰渐变和过重“AI 工具感”。

详见 [设计系统与交互原则](../design/design-system.md)。

## 主要来源

- [仓库 README](../../../README.md)
- [产品原则](../../../excalidraw/apps/image-board-desktop/PRODUCT.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
