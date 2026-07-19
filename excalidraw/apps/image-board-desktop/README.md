# CoreStudio Desktop

CoreStudio 是基于 Excalidraw 的本地优先图像画板。本目录包含 Electron 桌面端、renderer、Local Bridge、CLI 和 Codex 集成资源。

## 产品路径

- CoreStudio 内使用底部输入框进行单次生成。
- Codex 负责复杂、连续或并行的 Agent 工作流。
- Agent Board 提供画布查看、选择、标注和结果确认。
- CLI / Local Bridge 负责受控读取和写回，不直接修改项目文件。

## CLI

CLI 分为四组：

- `read`：状态、项目、记录、健康报告、场景、选区、图片路径和 Board URL。
- `write`：图片、prompt 和 CoreStudio 生成请求。
- `edit`：定位和选择现有画布元素。
- `bash`：当前会话环境和示例。

源码运行示例：

```sh
node bin/corestudio.cjs read status --json
node bin/corestudio.cjs read selection --json
node bin/corestudio.cjs read image-paths --selection --json
node bin/corestudio.cjs write image ./result.png --origin agent-board --json
node bin/corestudio.cjs edit locate --file-id <fileId> --json
```

CLI 是 Local Bridge 的薄客户端。所有项目写入由 CoreStudio 校验并通过事务保存。

## 开发

从仓库 `excalidraw/` 目录运行：

```sh
corepack yarn start:desktop
corepack yarn test:desktop --run
corepack yarn build:desktop
```

详细契约见：

- [Agent CLI Contract](docs/agent-cli-contract.md)
- [Codex 集成使用说明](docs/agent-integration-user-guide.md)
- [Agent 集成架构与迭代原则](docs/agent-integration-architecture-and-principles.md)
