---
title: 项目数据与一致性
type: architecture
updated: 2026-07-30
source_count: 6
---

# 项目数据与一致性

本页说明 CoreStudio 项目包含什么、谁可以写、写回如何保持一致，以及故障时应保留什么。

## 项目数据

`confirmed`：项目目录的核心内容包括：

- `project.json`：项目元数据；
- `scene.excalidraw.json`：画布场景；
- `image-records.json`：图片与生成记录；
- `assets/`：项目图片资产；
- `cache/`：可重建缓存和写回恢复材料；
- `exports/`：导出内容。

具体 schema 以当前实现和共享类型为准。

## 所有权原则

- `confirmed`：CoreStudio 项目层是数据所有者。
- `confirmed`：Agent 不直接修改项目目录中的 JSON 或资产。
- `confirmed`：外部写入通过 CLI / Local Bridge 进入 CoreStudio 的校验、资产登记、房间操作和持久化流程。
- `confirmed`：升级与修复不得把 `assets/` 当缓存清理；生成记录和画布元素要保持可解释关系。

## 图片写回事务

1. CLI 在本地验证参数和图片路径。
2. Local Bridge 验证可信参与者、项目和能力。
3. 主进程准备并登记项目资产。
4. Agent Writer 通过 renderer 中的 Excalidraw 元素工厂准备语义元素。
5. 带 `operationId` 的批量操作提交给 Project Room。
6. 房间协调并广播 scene 变化。
7. 主进程统一持久化最终状态。

这条链路为 `confirmed`。一轮生成的多张图片应作为一个批次写回，而不是逐张形成多次独立调用。

## 失败与恢复

- `confirmed`：房间接受操作后，磁盘持久化失败不会倒放 renderer 快照或删除已经被房间引用的资产。
- `confirmed`：磁盘基线和房间不一致时返回 `PROJECT_STORAGE_DIVERGED`，暂停自动持久化并要求先查明房间外写入来源。
- `confirmed`：写回 journal 只处理提交前中断；全部引用、全部未引用和部分引用采用不同恢复策略。
- `confirmed`：`mixed` 状态保留现场并返回冲突，不自动猜测清理。
- `confirmed`：普通删除使用 Excalidraw 的 `isDeleted` 墓碑，不自动物理删除图片资产和记录。

## 读取、健康和修复

- `confirmed`：读取项目应先确认项目所有权和必要的完整性边界，不能把只读发现隐式变成迁移或修复。
- `confirmed`：`read health` 用于检查资产、记录和画布元素关系。
- `confirmed`：诊断记录可区分直接画布元素、被结果引用和缺失画布元素。
- `confirmed`：修复应通过 CoreStudio 项目服务执行，不能由 Agent 手改 JSON。

## 不变量

- 图片资产、图片记录、生成记录和 scene 元素关系可解释。
- 同一项目只有一个 Electron 磁盘持久化者。
- 房间操作有稳定 `operationId`，同步和持久化状态可区分。
- 失败优先保留用户资产和可诊断现场。
- 外部命令根据结构化 `error.code` 分支，不解析本地化错误文案。

## 冲突与未知

- `unknown`：某个具体用户项目当前是否健康，必须通过活动 CoreStudio 实例和 CLI 实时读取。
- `unknown`：历史项目经过哪些旧版本迁移，不能只从当前 schema 推断。
- `proposal`：历史计划中的额外恢复或维护能力，若当前 contract 未列出，不视为已经开放。

## 主要来源

- [仓库分析](../../../docs/doc/repository-analysis.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [Agent CLI Contract](../../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [项目读取完整性计划](../../../docs/plan/2026-07-20-project-read-integrity.md)
- [项目服务实现](../../../excalidraw/apps/image-board-desktop/electron/project/)
- [共享项目类型](../../../excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts)
