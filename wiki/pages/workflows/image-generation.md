---
title: 图片生成与素材流转
type: workflow
updated: 2026-07-30
source_count: 6
---

# 图片生成与素材流转

本页区分 CoreStudio 内生成、Codex 生成和外部图片导入，说明它们如何进入项目。

## 三类来源

| 来源 | 发起者 | 写入语义 | 状态 |
| --- | --- | --- | --- |
| CoreStudio 内生成 | CoreStudio | `sourceType: generated`、`generationOrigin: corestudio` | `confirmed` |
| Codex 生成 | Codex，经 CLI / Bridge | `sourceType: generated`、`generationOrigin: agent-board` | `confirmed` |
| 搜索或下载的外部图片 | 用户或 Agent，经导入 | `sourceType: imported` | `confirmed` |

生成来源必须显式，不能把下载图伪装成生成结果，也不能把 Agent 生成图记为 CoreStudio 本地生成。

## CoreStudio 内生成

- `confirmed`：由桌面端生成输入框发起，CoreStudio 使用本地配置的 provider 和模型。
- `confirmed`：当前选区和引用图片可以形成生成上下文。
- `confirmed`：生成成功后由项目层登记资产、记录和画布元素。
- `confirmed`：应用内输入框只承担单次生成，不承担连续 Agent 工作流。

## Codex 生成

1. Codex 通过 CLI 读取当前项目、选区和原图路径。
2. Codex 使用自身可用能力分析或生成图片。
3. 成功图片先落为本地文件。
4. Codex 用一条 `write image` 命令提交同一轮的全部结果，并提供生成来源、prompt 和引用 id。
5. CoreStudio 复制资产、创建记录、批量布局并返回可定位 id。

以上为 `confirmed`。Codex 不调用 CoreStudio 内置 provider，也不直接把图片复制进项目 `assets/`。

## 引用与记录

- `confirmed`：引用元数据使用有效的 file id 和 element id，不使用项目名或 UI 序号代替。
- `confirmed`：结果记录保留 prompt、模型或来源、尺寸、时间和参考关系等可用元数据。
- `confirmed`：原图离开画布后，如果后续结果仍引用它，记录诊断可以定位到引用结果。
- `confirmed`：找不到直接或引用元素时，CLI 返回结构化缺失信息，而不是伪造定位成功。

## Provider 与模型

- `confirmed`：当前代码具有多个图片生成 provider 和独立模型目录。
- `unknown`：当前版本具体支持哪些 provider、模型、尺寸和参数；这些由实现、模型目录和外部服务共同决定，回答前应读取当前 catalog。
- `unknown`：用户本机配置了哪些 Key、模型和默认项；不得从仓库推断或读取敏感值。

## 主要来源

- [仓库 README](../../../README.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [Agent CLI Contract](../../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [模型目录说明](../../../excalidraw/apps/image-board-desktop/docs/model-catalog.md)
- [provider 实现](../../../excalidraw/apps/image-board-desktop/electron/providers/)
