# CoreStudio Codex 集成安装指南

这份文档的阅读者是 Codex。用户不需要手动执行命令，也不需要理解 CoreStudio 的应用包结构。

请确认当前文档来自当前 CoreStudio 版本对应的 Git Tag，不要用 `main` 分支的新指南安装旧版应用。

## 安装目标

安装或修复以下三项用户级集成文件：

- `~/.local/bin/corestudio`：CoreStudio CLI 入口。
- `~/.codex/skills/corestudio/SKILL.md`：CoreStudio Skill。
- `~/.codex/corestudio-integration.json`：独立的集成版本与兼容性记录。

Codex 集成版本独立于 CoreStudio 客户端版本。普通的客户端升级不会要求重新安装集成；只有 CLI 包装器、Skill、Local Bridge 协议或安装结构发生变化时，才提升对应的集成版本并提示更新。CoreStudio 1.1.19 内置的当前集成版本为 `1.0.1`，其中 Skill 会识别 Codex 网络沙箱限制，并通过安装版 Local Bridge 打开 Agent Board。

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

安装器会先自行启动 CLI 运行时做一次校验。它成功后，再确认三项安装结果：

```bash
test -x "$HOME/.local/bin/corestudio"
test -r "$HOME/.codex/skills/corestudio/SKILL.md"
test -r "$HOME/.codex/corestudio-integration.json"
```

读取 `~/.codex/corestudio-integration.json`，确认其中包含：

- `integrationVersion`：独立的 Codex 集成版本。
- `installedFromAppVersion`：执行安装时的 CoreStudio 客户端版本，仅用于追踪来源，不参与兼容判断。
- `bridgeProtocolVersion`、`skillVersion`、`cliWrapperVersion`：实际参与兼容判断的契约版本。

随后请用户回到“应用设置 → Codex 集成”点击“重新检测”。旧格式安装记录会映射为首个集成版本 `1.0.0`；它不会因为普通客户端升级失效，但在当前 `1.0.1` Skill 契约下会提示执行一次更新。

## Codex 沙箱与打开当前项目

CoreStudio CLI 先通过本机会话文件发现 Local Bridge。若 JSON 错误详情包含 `sessionDiscovered: true`，表示 CoreStudio 和项目会话已经找到，只是当前 Codex 命令运行环境无法访问 `127.0.0.1`。此时应在网络沙箱外重试原命令，不要把它误判为 Bridge 未启用。

读取上下文成功后，执行：

```bash
corestudio read board-url --json
```

CLI 会在安装版 CoreStudio 提供的 Agent Board 地址上补入当前项目 token。随后使用 Codex 内置浏览器打开 `boardUrl`，即可加载当前项目。

如果检测仍未通过，报告具体缺失项，不要反复盲目执行安装器。
