# CoreStudio Codex 集成安装指南

这份文档由 CoreStudio 随应用提供，阅读者是 Codex。用户不需要手动执行下面的命令，也不需要理解应用内部路径。

## 目标

安装或修复以下三项依赖：

- `~/.local/bin/corestudio`：CoreStudio CLI 入口。
- `~/.codex/skills/corestudio/SKILL.md`：CoreStudio Skill。
- `~/.codex/corestudio-integration.json`：版本与会话发现记录。

不要直接修改 CoreStudio 项目文件。安装器只应写入上面列出的用户级集成文件。

## 找到当前 CoreStudio

优先使用包含本指南的 CoreStudio 应用包。如果当前读到的是源码中的副本，则在 `/Applications` 中查找正式安装的 CoreStudio：

```bash
APP_PATH="$(mdfind "kMDItemCFBundleIdentifier == 'com.corestudio.desktop'" | head -n 1)"
```

如果没有找到应用，告诉用户先安装或重新安装 CoreStudio，不要猜测其他 Electron 应用的资源路径。

确认以下文件存在：

```text
<CoreStudio.app>/Contents/Resources/codex-integration/install.sh
<CoreStudio.app>/Contents/Resources/codex-integration/corestudio-skill/SKILL.md
<CoreStudio.app>/Contents/Resources/app.asar
```

## 执行安装

从应用包读取版本和可执行文件名，再调用随应用提供的安装器：

```bash
CONTENTS_DIR="$APP_PATH/Contents"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$CONTENTS_DIR/Info.plist")"
APP_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$CONTENTS_DIR/Info.plist")"
ELECTRON_BIN="$CONTENTS_DIR/MacOS/$APP_EXECUTABLE"

/bin/bash "$RESOURCES_DIR/codex-integration/install.sh" \
  --resources-dir "$RESOURCES_DIR" \
  --app-version "$APP_VERSION" \
  --electron-bin "$ELECTRON_BIN"
```

不要把 `node_modules/electron` 中的通用 `Electron.app` 当成 CoreStudio 正式应用；它不包含完整的安装资源。

## 验证

安装完成后检查：

```bash
test -x "$HOME/.local/bin/corestudio"
test -r "$HOME/.codex/skills/corestudio/SKILL.md"
test -r "$HOME/.codex/corestudio-integration.json"
```

读取安装记录，确认其中的版本与当前 CoreStudio 一致。随后告诉用户回到“应用设置 → Codex 集成”点击“重新检测”。如果检测仍未通过，报告具体缺失项，不要反复盲目执行安装器。
