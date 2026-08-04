# CoreStudio 来源地图

本页是来源路由表。它说明重要文件适合回答什么问题，以及常见的误读边界。

## 项目入口与稳定说明

| 来源 | 类型 | 主要用途 | 不能单独证明 |
| --- | --- | --- | --- |
| [根 README](../../README.md) | stable-doc | 产品概览、目录、主要能力、常用入口 | 当前安装包、运行进程或远端发布状态 |
| [文档入口](../../docs/README.md) | stable-doc | 文档分层和阅读入口 | 具体功能已实现 |
| [仓库分析](../../docs/doc/repository-analysis.md) | stable-doc | 代码结构、数据边界、维护入口 | 文档生成后的所有代码变化 |
| [桌面端 README](../../excalidraw/apps/image-board-desktop/README.md) | stable-doc | CLI、开发验证、运行身份和桌面端入口 | 用户机器上的实时进程身份 |
| [产品原则](../../excalidraw/apps/image-board-desktop/PRODUCT.md) | stable-doc | 用户、目的、产品边界和 Agent 原则 | 某个 UI 或协议细节已经实现 |
| [设计系统](../../excalidraw/apps/image-board-desktop/DESIGN.md) | stable-doc | 视觉 token、组件和交互原则 | 当前每个页面均已完全符合 |

## 当前 contract 与实现入口

| 来源 | 类型 | 主要用途 | 不能单独证明 |
| --- | --- | --- | --- |
| [Agent 集成架构](../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md) | contract | 调度边界、分层、项目房间、所有权和写回 | 当前进程、端口或安装状态 |
| [Agent CLI Contract](../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md) | contract | CLI 命令、结构化错误、批量写回和诊断 | CLI 已连接到某个当前项目 |
| [Agent 用户指南](../../excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md) | stable-doc | 用户侧协作流程 | 所有底层异常和协议细节 |
| [项目服务](../../excalidraw/apps/image-board-desktop/electron/project/) | implementation | 资产、记录、健康、修复、读取完整性和写回 | renderer 交互的完整行为 |
| [Agent 服务](../../excalidraw/apps/image-board-desktop/electron/agent/) | implementation | Bridge、会话、授权、Board URL 和 CLI runtime | 产品层是否应该新增能力 |
| [共享 contract](../../excalidraw/apps/image-board-desktop/src/shared/) | implementation | IPC / Bridge 类型、数据完整性和协议 | main 与 renderer 的完整 wiring |
| [renderer 应用](../../excalidraw/apps/image-board-desktop/src/app/) | implementation | UI、controller、项目状态和生成流程 | Electron main 的磁盘与进程行为 |

## 计划、规格和历史

| 来源 | 类型 | 主要用途 | 使用注意 |
| --- | --- | --- | --- |
| [计划索引](../../docs/plan/README.md) | plan | 查找当前计划及其状态 | 标题中的目标不等于已经实现 |
| [规格索引](../../docs/spec/README.md) | spec | 查找确认的产品与架构需求 | 必须读文档状态和当前代码 |
| [项目读取完整性计划](../../docs/plan/2026-07-20-project-read-integrity.md) | plan | 项目读取、迁移、修复和只读边界 | 以当前实现和状态段为准 |
| [测试进程生命周期计划](../../docs/plan/2026-07-27-corestudio-test-process-lifecycle.md) | plan | 测试互斥、取消和孤儿进程治理 | 实机范围与文档限制不能省略 |
| [项目房间与增量写回规格](../../docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md) | spec | 房间架构、同步语义、多项目演进 | 大量目标与历史描述并存，需读状态 |
| [发布清单](../../excalidraw/apps/image-board-desktop/RELEASE.md) | stable-doc | 打包、签名、公证和发布检查 | 不能证明当前 release 已完成 |
| [Git 历史](../../.git/) | history | 追踪实际提交和演进 | 版本号相同不能证明安装包内容相同 |

## 外部方法来源

| 来源 | 类型 | 主要用途 |
| --- | --- | --- |
| [Karpathy LLM Wiki](karpathy-llm-wiki.md) | external | 三层架构、ingest/query/lint、索引与日志模式 |

## 主题路由

- 产品定位：根 README、`PRODUCT.md`。
- 系统分层：仓库分析、Agent 集成架构、当前实现目录。
- 数据一致性：项目服务、共享 contract、项目完整性计划。
- 图片生成：桌面端 README、provider 与 renderer 生成 controller、记录完整性实现。
- Agent 协作：Agent 集成架构、CLI contract、Agent 服务。
- 设计：`PRODUCT.md`、`DESIGN.md`、renderer 组件和样式测试。
- 开发验证：根 `AGENTS.md`、桌面端 README、package scripts、测试生命周期计划。
- 发布安全：`RELEASE.md`、package scripts、GitHub workflow；当前外部状态需实时查询。
