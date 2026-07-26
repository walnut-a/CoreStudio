# CoreStudio Codex 集成安装指南

这份文档的阅读者是 Codex。用户不需要手动执行命令，也不需要理解 CoreStudio 的应用包结构。

安装代码必须来自本机 CoreStudio 应用包。GitHub 上对应版本的文档只用于阅读说明，不作为安装脚本来源。

## 安装目标

安装或修复以下三项用户级集成文件：

- `~/.local/bin/corestudio`：CoreStudio CLI 入口。
- `~/.codex/skills/corestudio/SKILL.md`：CoreStudio Skill。
- `~/.codex/corestudio-integration.json`：独立的集成版本与兼容性记录。

Codex 集成版本独立于 CoreStudio 客户端版本。普通的客户端升级不会要求重新安装集成；只有 CLI 包装器、Skill、Local Bridge 协议或安装结构发生变化时，才提升对应的集成版本并提示更新。当前开发版内置的集成版本为 `1.9.0`。当用户只说“打开 CoreStudio”而没有点明入口时，Skill 会先确认是打开 Codex 内置画布还是桌面客户端；进入画布任务后，会打开 `http://127.0.0.1:60909/board/<stableBoardId>` 形式的项目稳定地址，从页面读取一次性 nonce，再通过 CLI 在 URL 外认领当前 Codex 任务身份。画布地址不包含开发服务器地址、Bridge 查询参数、房间票据或恢复 token。

不要直接修改 CoreStudio 项目文件，不要从网络下载或执行其他安装脚本。安装代码必须来自本机已签名的 CoreStudio 应用包。

## 找到正式 CoreStudio

通过 Bundle ID 查找已安装的正式应用：

```bash
APP_PATH="$(mdfind "kMDItemCFBundleIdentifier == 'com.corestudio.desktop'" | head -n 1)"
```

如果没有找到，请用户先安装或重新安装 CoreStudio。不要使用 `node_modules/electron` 中的通用 `Electron.app`，也不要猜测其他 Electron 应用的资源路径。

确认安装器存在：

```bash
INSTALLER="$APP_PATH/Contents/Resources/codex-integration/install.sh"
test -f "$INSTALLER"
```

## 执行安装

安装器会从自身位置识别 CoreStudio 应用、版本和可执行文件，不需要任何参数：

```bash
/bin/bash "$INSTALLER"
```

不要复制或重写安装器的内部步骤。如果安装器失败，请向用户报告它输出的具体缺失项。

## 验证

安装器会先使用不依赖项目和 Local Bridge 的版本命令校验 CLI：

```bash
corestudio --version --json
```

它成功后，再确认三项安装结果：

```bash
test -x "$HOME/.local/bin/corestudio"
test -r "$HOME/.codex/skills/corestudio/SKILL.md"
test -r "$HOME/.codex/corestudio-integration.json"
```

读取 `~/.codex/corestudio-integration.json`，确认其中包含：

- `integrationVersion`：独立的 Codex 集成版本。
- `installedFromAppVersion`：执行安装时的 CoreStudio 客户端版本，仅用于追踪来源，不参与兼容判断。
- `bridgeProtocolVersion`、`skillVersion`、`cliWrapperVersion`：实际参与兼容判断的契约版本。

如果安装由 CoreStudio 设置页发起，应用会在安装完成后自动重新检测。若由 Codex 或终端执行，可回到“应用设置 → Codex 集成”查看结果，窗口重新获得焦点时也会自动检测。旧格式安装记录会映射为首个集成版本 `1.0.0`；它不会因为普通客户端升级失效，但在当前 `1.9.0` Skill 契约下会提示执行一次更新。

## 图片生成与写回边界

Codex 工作流不调用 CoreStudio 配置的内置生图模型。需要图片时，由 Codex 自己搜索、下载、生成或处理，然后通过 `corestudio write image` 把本地图片写入当前项目：

- Codex 生成的图片：`corestudio write image <path...> --source-type generated --origin agent-board --json`。同一轮生成多张时一次提交所有成功结果，不逐张写回。
- Codex 搜索或下载的图片：`corestudio write image <path> --source-type imported --json`

CoreStudio 只负责校验图片、保存项目资产并插入画布。CLI、Local Bridge 和 Agent Board 不提供调用 CoreStudio 内置模型的入口。

## Codex 沙箱与打开当前项目

安装验证不要运行 `read context`、`read health`、`read board-url` 或签名检查。这些操作与 CLI、Skill 和兼容性记录是否安装完整无关。

首次使用时，CoreStudio CLI 先通过本机会话文件发现 Local Bridge。先运行：

```bash
corestudio read status --json
```

若 JSON 错误详情包含 `sessionDiscovered: true`，表示 CoreStudio 和项目会话已经找到，只是当前 Codex 命令运行环境无法访问 `127.0.0.1`。此时应在网络沙箱外只重试一次原命令，不要把它误判为 Bridge 未启用。

如果已经有当前项目，执行：

```bash
corestudio read board-url --json
```

如果没有当前项目，可先运行 `corestudio read projects --json` 查看最近项目。目标唯一时使用 `corestudio read board-url --project <projectPath> --json` 取得该项目的稳定地址；目标不明确时仍运行 `corestudio read board-url --json`，它会返回带短期选择令牌的项目候选页。选择完成后，候选页跳转到 `http://127.0.0.1:60909/board/<stableBoardId>` 形式的目标项目稳定地址。`5174` 只属于源码开发服务器，不会出现在复制地址或 CLI 输出中。

有内置浏览器控制能力时打开稳定地址，读取页面根节点上的 `data-corestudio-stable-board-id` 与 `data-corestudio-page-nonce`，然后执行：

```bash
corestudio board claim --stable-board-id <stableBoardId> --page-nonce <pageNonce> --json
```

页面会在身份认领后自动换取短期房间会话。nonce、Codex thread id、launch ticket 和 resume token 都不得进入稳定 URL。旧 token URL 不迁移、不兼容，直接重新取得稳定地址。没有实际浏览器控制工具时只提供稳定链接，并明确尚不能替用户完成页面身份认领；不要擅自改用 Chrome 或系统默认浏览器。

如果检测仍未通过，报告具体缺失项，不要反复盲目执行安装器。
