# CoreStudio Codex 集成安装指南

这份文档的阅读者是 Codex。用户不需要手动执行命令，也不需要理解 CoreStudio 的应用包结构。

请确认当前文档来自当前 CoreStudio 版本对应的 Git Tag，不要用 `main` 分支的新指南安装旧版应用。

## 安装目标

安装或修复以下三项用户级集成文件：

- `~/.local/bin/corestudio`：CoreStudio CLI 入口。
- `~/.codex/skills/corestudio/SKILL.md`：CoreStudio Skill。
- `~/.codex/corestudio-integration.json`：版本与会话发现记录。

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

读取 `~/.codex/corestudio-integration.json`，确认其中版本与当前 CoreStudio 一致。随后请用户回到“应用设置 → Codex 集成”点击“重新检测”。

如果检测仍未通过，报告具体缺失项，不要反复盲目执行安装器。
