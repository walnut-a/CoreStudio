---
name: corestudio
description: 当用户要打开、读取或修改本机 CoreStudio 项目时使用。通过 CoreStudio CLI 发现当前会话并安全读写项目，不直接修改项目文件。
---

# CoreStudio

CoreStudio 是本机项目数据的唯一所有者。所有画布和图片读写都必须通过 `corestudio` CLI / Local Bridge 完成，不要直接编辑 `project.json`、`scene.excalidraw.json` 或图片记录文件。

## 开始

用户说“打开当前 CoreStudio 项目”时：

1. 运行 `corestudio read context --json` 发现当前 CoreStudio 会话和项目。
2. 需要画布数据时运行 `corestudio read board --json`。
3. 需要选区、图片记录或健康状态时，分别使用 `corestudio read context --json`、`corestudio read records --json`、`corestudio read health --json`。
4. 如果 CLI 报告 CoreStudio 未运行或没有可发现会话，直接请用户打开 CoreStudio 和目标项目，不要猜测路径。

## 写回

- 生成图片后使用 `corestudio write image` 写回，并保留 prompt、reference file ids、reference element ids 和 origin。
- 定位和选择已有元素使用 `corestudio edit locate` / `corestudio edit select`。
- 每次写回都向用户报告 CLI 返回的 imageId、elementId、frameId 或 prompt id。
- CLI 失败时保留原始错误码和消息，不绕过 Local Bridge 手工改文件。
