---
name: corestudio
description: 当用户要打开、读取或修改本机 CoreStudio 项目时使用。通过 CoreStudio CLI 发现当前会话并安全读写项目，不直接修改项目文件。
---

# CoreStudio

CoreStudio 是本机项目数据的唯一所有者。所有画布和图片读写都必须通过 `corestudio` CLI / Local Bridge 完成，不要直接编辑 `project.json`、`scene.excalidraw.json` 或图片记录文件。

## 开始

用户说“打开当前 CoreStudio 项目”时：

1. 运行 `corestudio read status --json`，用轻量状态发现当前 CoreStudio 会话、项目和 Agent Board 基址。不要用完整 `read context` 作为打开项目的前置检查。
2. 如果错误详情包含 `sessionDiscovered: true`，说明会话已经找到，但当前执行环境无法连接本机 Local Bridge。若运行在 Codex 中，立即申请在网络沙箱外重试同一条命令，并且只重试一次；完成重试前，不要误报 CoreStudio 未运行或 Bridge 未启用。
3. 状态读取成功后运行 `corestudio read board-url --json`，取得包含当前项目 token 的最终 `boardUrl`。
4. 如果当前 Codex 任务具备内置浏览器控制能力，直接在内置浏览器打开 `boardUrl`。
5. 如果当前任务没有实际浏览器控制工具，向用户提供语义清楚的一键链接，并说明限制来自当前 Codex 任务能力，不是 CoreStudio 或 Bridge 故障。不要在正文中重复展示项目 token。
6. 不要擅自改用 Chrome 或系统默认浏览器。只有用户明确允许时，才使用其他浏览器。
7. 需要完整画布、选区、图片记录或健康状态时，再分别使用 `corestudio read board --json`、`corestudio read selection --json`、`corestudio read records --json`、`corestudio read health --json`。
8. 只有在没有发现会话，或沙箱外单次重试仍失败时，才请用户检查 CoreStudio、目标项目和 Agent Bridge 状态。保留 CLI 的原始错误码、消息和详情。

## 写回

- 生成图片后使用 `corestudio write image` 写回，并保留 prompt、reference file ids、reference element ids 和 origin。
- 定位和选择已有元素使用 `corestudio edit locate` / `corestudio edit select`。
- 每次写回都向用户报告 CLI 返回的 imageId、elementId、frameId 或 prompt id。
- CLI 失败时保留原始错误码和消息，不绕过 Local Bridge 手工改文件。
