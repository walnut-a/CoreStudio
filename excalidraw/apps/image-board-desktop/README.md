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
corepack yarn test:desktop
corepack yarn build:desktop
```

桌面测试入口分为：

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 定向回归 | `corepack yarn vitest <test-files> --run` | 开发过程默认优先使用，不获取全量测试锁 |
| 输入框 Lab | `corepack yarn dev:composer` | 只启动 renderer，在浏览器中复用真实输入框组件 |
| 全量一次性 | `corepack yarn test:desktop` | 固定使用 Vitest `run`，默认最多 2 个 worker |
| 交互式 watch | `corepack yarn test:desktop:watch` | 唯一明确的全量 watch 入口 |
| CI | `corepack yarn test:desktop:ci` | 与本地全量入口共用 runner、锁和 worker 边界 |

全量入口由统一 Node runner 管理。`CORESTUDIO_TEST_MAX_WORKERS=<正整数>` 可显式覆盖 worker 上限，`CORESTUDIO_TEST_TIMEOUT_MS=<毫秒>` 可覆盖默认 30 分钟超时；watch 默认不设置超时。同一 Git 仓库默认只允许一套全量桌面测试，活跃锁会报告已有 runner 的 PID、启动时间和退出命令。只有经过明确判断的特殊场景才可使用 `CORESTUDIO_TEST_ALLOW_CONCURRENT=1` 绕过互斥。

### Composer Lab

生成输入框的结构、样式或编辑行为优先在 Composer Lab 中调试：

```sh
corepack yarn dev:composer
```

该命令只启动 Vite renderer，并打开 `http://127.0.0.1:5174/composer-lab.html`，不启动 Electron、Bridge 或项目房间。Lab 直接引用客户端的 `GenerateDialogComposerSection`、Lexical 输入框、`GenerateImageDialog.css`、`App.css` 和设计 token，不维护第二套输入框实现。

Lab 内置空内容、短文字、长文字、一张参考图、三张参考图混排、参考图上限提示和待确认参考图场景，可切换 `360px`、`480px`、`640px` 宽度和浅色、深色主题。选图、发送和配置状态由浏览器内的薄 mock 提供，不读取正式版配置或项目数据。当前场景、主题和宽度会写入 URL 查询参数，可直接保存成稳定的截图地址。

输入框改动的固定验收顺序为：

1. 在 Composer Lab 中完成布局和编辑行为调试。
2. 运行输入框与 Lab 的定向自动化测试。
3. 使用 `corepack yarn dev:desktop` 在 `CoreStudio Dev` 中检查真实窗口字体、缩放和 Electron 事件边界。

`composer-lab.html` 是 Vite 开发入口，不属于正式 renderer 的 `index.html` 构建入口，也不会进入 Electron 安装包。

## 长任务执行协议

- session、cell 或 job ID 代表任务仍在运行。暂时没有输出时必须继续轮询原任务，不能重新执行同一条命令。
- 启动全量测试、构建或打包前，先检查同一仓库是否已有等价任务。
- 定向测试优先于全量测试；开发过程中不要反复运行全量套件。
- 不并行运行两套全量 Vitest，也不默认把全量 Vitest、多个 Vite build 和 packaging 同时启动。
- 取消或放弃任务前，必须等待 runner 完成进程树清理和残留复查。复查应使用当前仓库 cwd、已记录的 PID/PPID/PGID 和完整命令行，禁止使用 `killall node` 或宽泛 `pkill`。

`dev:desktop` 是桌面开发的固定入口。它会解析当前 workspace 的 Electron 绝对路径，并把应用绝对路径、独立 `.electron-dev-profile`、renderer 端口 `5174`、调试端口 `9331`、Agent Bridge 端口 `60910`、开发 session 文件和 `CoreStudio · DEV` 窗口标题绑定到同一次启动。模型 Key、Agent 开关、最近项目和主进程日志也写入这个 profile，不会读取或覆盖正式版配置。主进程会打印完整运行身份，便于核对启动路径、用户目录、Bridge 和 session。

这些边界由主进程强制执行，而不只是文档约定：源码被裸 Electron 启动、人工使用 `qa` runtime，或给开发版注入其他 Bridge、设置目录、profile/session 时都会直接启动失败。`smoke:packaged` 会先在隔离目录中验证无 runtime 覆盖的正式包身份，再验证仅供自动化检查使用的 `qa` runtime；人工 UI 验收必须使用 `CoreStudio Dev`。若已有开发版实例，复用它，或者精确关闭后通过固定入口重启，不能另建临时应用名、端口或 profile。

正式版和开发版的默认运行身份如下：

| 项目 | 正式版 | 开发版 |
| --- | --- | --- |
| 应用名 | `CoreStudio` | `CoreStudio Dev` |
| Bundle ID | `com.corestudio.desktop` | `com.corestudio.desktop.dev` |
| Agent Bridge | `127.0.0.1:60909` | `127.0.0.1:60910` |
| session | 正式全局目录 | 开发 profile 内的 `agent-session.json` |
| 用户配置 | 正式全局目录 | `.electron-dev-profile` 或 `CoreStudio Dev` 用户目录 |

这些运行身份彼此隔离，但项目所有权不会隔离：同一个项目路径同时只能由一个 Electron 进程打开。另一个 Electron 若尝试打开同一项目会被明确拦截；需要多端协作时，保留一个 Electron 作为房间宿主，其余参与者通过浏览器 Agent Board 加入。

本地打包验收使用独立开发包：

```sh
corepack yarn --cwd apps/image-board-desktop package:dev:dir
corepack yarn --cwd apps/image-board-desktop open:dev:packaged
```

产物位于 `apps/image-board-desktop/release-dev/mac-arm64/CoreStudio Dev.app`。它即使被直接双击，也会按开发身份使用 `60910`、独立用户目录和独立 session。`release/mac-arm64/CoreStudio.app` 始终是正式身份，不用于本地开发验收。

Electron UI、项目读写和退出流程验收必须使用临时项目，不能把正式用户项目同时交给正式版与开发版。需要验证房间协作时，启动一个 Electron 宿主，并用一个或多个浏览器 Agent Board 连接该宿主。

`start:desktop` 保留为兼容别名。多项目并行开发时不要使用全局 `electron`、 `electron .`、`open -a Electron`、`killall Electron` 或 `pkill -f Electron`。

详细契约见：

- [Agent CLI Contract](docs/agent-cli-contract.md)
- [Codex 集成使用说明](docs/agent-integration-user-guide.md)
- [Agent 集成架构与迭代原则](docs/agent-integration-architecture-and-principles.md)
