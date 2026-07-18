# CoreStudio Codex 集成安装指南

这份文档的阅读者是 Codex。用户不需要手动执行命令，也不需要理解 CoreStudio 的应用包结构。

安装代码必须来自本机 CoreStudio 应用包。GitHub 上对应版本的文档只用于阅读说明，不作为安装脚本来源。

## 安装目标

安装或修复以下三项用户级集成文件：

- `~/.local/bin/corestudio`：CoreStudio CLI 入口。
- `~/.codex/skills/corestudio/SKILL.md`：CoreStudio Skill。
- `~/.codex/corestudio-integration.json`：独立的集成版本与兼容性记录。

Codex 集成版本独立于 CoreStudio 客户端版本。普通的客户端升级不会要求重新安装集成；只有 CLI 包装器、Skill、Local Bridge 协议或安装结构发生变化时，才提升对应的集成版本并提示更新。CoreStudio 1.1.21 内置的当前集成版本为 `1.1.0`，其中 Skill 会使用轻量状态发现项目、识别 Codex 网络沙箱限制，并根据实际浏览器控制能力打开或链接到 Agent Board。

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

如果安装由 CoreStudio 设置页发起，应用会在安装完成后自动重新检测。若由 Codex 或终端执行，可回到“应用设置 → Codex 集成”查看结果，窗口重新获得焦点时也会自动检测。旧格式安装记录会映射为首个集成版本 `1.0.0`；它不会因为普通客户端升级失效，但在当前 `1.1.0` Skill 契约下会提示执行一次更新。

## Codex 沙箱与打开当前项目

安装验证不要运行 `read context`、`read health`、`read board-url` 或签名检查。这些操作与 CLI、Skill 和兼容性记录是否安装完整无关。

首次使用时，CoreStudio CLI 先通过本机会话文件发现 Local Bridge。先运行：

```bash
corestudio read status --json
```

若 JSON 错误详情包含 `sessionDiscovered: true`，表示 CoreStudio 和项目会话已经找到，只是当前 Codex 命令运行环境无法访问 `127.0.0.1`。此时应在网络沙箱外只重试一次原命令，不要把它误判为 Bridge 未启用。

读取上下文成功后，执行：

```bash
corestudio read board-url --json
```

CLI 会在安装版 CoreStudio 提供的 Agent Board 地址上补入当前项目 token。有内置浏览器控制能力时直接打开；没有实际控制工具时提供一键链接，并明确这是当前 Codex 任务的能力限制。不要擅自改用 Chrome 或系统默认浏览器。

如果检测仍未通过，报告具体缺失项，不要反复盲目执行安装器。
