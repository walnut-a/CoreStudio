#!/bin/bash
# 无窗口入口；复用设置中的安装服务，包括兼容性记录与用户修改保护。
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTENTS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$CONTENTS_DIR/Info.plist")"
ENTRY="$CONTENTS_DIR/Resources/app.asar/bin/setup-agent.cjs"
exec env ELECTRON_RUN_AS_NODE=1 "$CONTENTS_DIR/MacOS/$EXECUTABLE" "$ENTRY" "$@"
