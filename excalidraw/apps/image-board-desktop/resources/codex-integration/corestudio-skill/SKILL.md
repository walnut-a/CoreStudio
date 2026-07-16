---
name: corestudio
description: 当用户要打开、读取或修改本机 CoreStudio 项目时使用。通过 CoreStudio CLI 发现当前会话并安全读写项目，不直接修改项目文件。
---

# CoreStudio

CoreStudio 是本机项目数据的唯一所有者。所有画布和图片读写都必须通过 `corestudio` CLI / Local Bridge 完成，不要直接编辑 `project.json`、`scene.excalidraw.json` 或图片记录文件。

## 开始

用户说“打开当前 CoreStudio 项目”时：

1. 运行 `corestudio read context --json` 发现当前 CoreStudio 会话和项目。
2. 如果错误详情包含 `sessionDiscovered: true`，说明会话已经找到，但当前执行环境无法连接本机 Local Bridge。若运行在 Codex 中，立即申请在网络沙箱外重试同一条命令；完成重试前，不要误报 CoreStudio 未运行或 Bridge 未启用。
3. 上下文读取成功后，运行 `corestudio read board-url --json`，并使用 Codex 内置浏览器打开返回的 `boardUrl`。该地址已包含当前项目 token，可直接加载当前项目。
4. 需要画布数据时运行 `corestudio read board --json`。
5. 需要选区、图片记录或健康状态时，分别使用 `corestudio read context --json`、`corestudio read records --json`、`corestudio read health --json`。
6. 只有在没有发现会话，或沙箱外重试仍失败时，才请用户检查 CoreStudio、目标项目和 Agent Bridge 状态。保留 CLI 的原始错误码、消息和详情。

## 写回

- 生成图片后使用 `corestudio write image` 写回，并保留 prompt、reference file ids、reference element ids 和 origin。
- 定位和选择已有元素使用 `corestudio edit locate` / `corestudio edit select`。
- 每次写回都向用户报告 CLI 返回的 imageId、elementId、frameId 或 prompt id。
- CLI 失败时保留原始错误码和消息，不绕过 Local Bridge 手工改文件。
