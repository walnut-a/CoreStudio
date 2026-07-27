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
corepack yarn dev:desktop
corepack yarn test:desktop --run
corepack yarn build:desktop
```

`dev:desktop` 是桌面开发的固定入口。它会解析当前 workspace 的 Electron 绝对路径，并把应用绝对路径、独立 `.electron-dev-profile`、renderer 端口 `5174`、调试端口 `9331`、Agent Bridge 端口 `60910`、开发 session 文件和 `CoreStudio · DEV` 窗口标题绑定到同一次启动。模型 Key、Agent 开关、最近项目和主进程日志也写入这个 profile，不会读取或覆盖正式版配置。主进程会打印完整运行身份，便于核对启动路径、用户目录、Bridge 和 session。

正式版和开发版的默认运行身份如下：

| 项目 | 正式版 | 开发版 |
| --- | --- | --- |
| 应用名 | `CoreStudio` | `CoreStudio Dev` |
| Bundle ID | `com.corestudio.desktop` | `com.corestudio.desktop.dev` |
| Agent Bridge | `127.0.0.1:60909` | `127.0.0.1:60910` |
| session | 正式全局目录 | 开发 profile 内的 `agent-session.json` |
| 用户配置 | 正式全局目录 | `.electron-dev-profile` 或 `CoreStudio Dev` 用户目录 |

本地打包验收使用独立开发包：

```sh
corepack yarn --cwd apps/image-board-desktop package:dev:dir
corepack yarn --cwd apps/image-board-desktop open:dev:packaged
```

产物位于 `apps/image-board-desktop/release-dev/mac-arm64/CoreStudio Dev.app`。它即使被直接双击，也会按开发身份使用 `60910`、独立用户目录和独立 session。`release/mac-arm64/CoreStudio.app` 始终是正式身份，不用于本地开发验收。

`start:desktop` 保留为兼容别名。多项目并行开发时不要使用全局 `electron`、 `electron .`、`open -a Electron`、`killall Electron` 或 `pkill -f Electron`。

详细契约见：

- [Agent CLI Contract](docs/agent-cli-contract.md)
- [Codex 集成使用说明](docs/agent-integration-user-guide.md)
- [Agent 集成架构与迭代原则](docs/agent-integration-architecture-and-principles.md)
