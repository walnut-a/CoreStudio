#!/bin/bash

set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "CoreStudio Codex 集成安装器不需要参数。" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTENTS_DIR="$(cd "$RESOURCES_DIR/.." && pwd)"
INFO_PLIST="$CONTENTS_DIR/Info.plist"
SOURCE_SKILL="$RESOURCES_DIR/codex-integration/corestudio-skill/SKILL.md"
APP_ASAR="$RESOURCES_DIR/app.asar"
CLI_RUNTIME="$RESOURCES_DIR/app.asar/bin/corestudio.cjs"
CLI_DIR="$HOME/.local/bin"
CLI_PATH="$CLI_DIR/corestudio"
SKILL_DIR="$HOME/.codex/skills/corestudio"
SKILL_PATH="$SKILL_DIR/SKILL.md"
MANIFEST_PATH="$HOME/.codex/corestudio-integration.json"
INTEGRATION_VERSION="1.3.0"
MANIFEST_SCHEMA_VERSION=1
BRIDGE_PROTOCOL_VERSION=2
SKILL_VERSION=5
CLI_WRAPPER_VERSION=1

if [[ ! -f "$SOURCE_SKILL" ]]; then
  echo "CoreStudio Skill 安装源缺失：$SOURCE_SKILL" >&2
  exit 1
fi
if [[ ! -f "$APP_ASAR" ]]; then
  echo "CoreStudio 应用资源缺失：$APP_ASAR" >&2
  exit 1
fi
if [[ ! -f "$INFO_PLIST" ]]; then
  echo "CoreStudio 应用信息缺失：$INFO_PLIST" >&2
  exit 1
fi

APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$INFO_PLIST")"
APP_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$INFO_PLIST")"
ELECTRON_BIN="$CONTENTS_DIR/MacOS/$APP_EXECUTABLE"

if [[ -z "$APP_VERSION" ]]; then
  echo "无法读取 CoreStudio 版本。" >&2
  exit 1
fi
if [[ ! -x "$ELECTRON_BIN" ]]; then
  echo "CoreStudio 可执行文件缺失：$ELECTRON_BIN" >&2
  exit 1
fi

mkdir -p "$CLI_DIR" "$SKILL_DIR" "$(dirname "$MANIFEST_PATH")"

cat > "$CLI_PATH" <<EOF
#!/bin/sh
ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON_BIN" "$CLI_RUNTIME" "\$@"
EOF
chmod 755 "$CLI_PATH"
cp "$SOURCE_SKILL" "$SKILL_PATH"
chmod 644 "$SKILL_PATH"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > "$MANIFEST_PATH" <<EOF
{
  "schemaVersion": $MANIFEST_SCHEMA_VERSION,
  "integrationVersion": "$INTEGRATION_VERSION",
  "installedFromAppVersion": "$(json_escape "$APP_VERSION")",
  "bridgeProtocolVersion": $BRIDGE_PROTOCOL_VERSION,
  "skillVersion": $SKILL_VERSION,
  "cliWrapperVersion": $CLI_WRAPPER_VERSION,
  "cliPath": "$(json_escape "$CLI_PATH")",
  "skillPath": "$(json_escape "$SKILL_PATH")",
  "supportsSessionDiscovery": true
}
EOF
chmod 644 "$MANIFEST_PATH"

set +e
CLI_CHECK_STDERR="$(mktemp)"
CLI_CHECK_OUTPUT="$("$CLI_PATH" --version --json 2>"$CLI_CHECK_STDERR")"
CLI_CHECK_STATUS=$?
set -e
CLI_CHECK_ERROR="$(cat "$CLI_CHECK_STDERR")"
rm -f "$CLI_CHECK_STDERR"
EXPECTED_CLI_OUTPUT="{\"ok\":true,\"data\":{\"appVersion\":\"$(json_escape "$APP_VERSION")\",\"integrationVersion\":\"$INTEGRATION_VERSION\",\"bridgeProtocolVersion\":$BRIDGE_PROTOCOL_VERSION}}"
if [[ $CLI_CHECK_STATUS -ne 0 || "$CLI_CHECK_OUTPUT" != "$EXPECTED_CLI_OUTPUT" ]]; then
  echo "CoreStudio CLI 验证失败：${CLI_CHECK_ERROR:-$CLI_CHECK_OUTPUT}" >&2
  exit 1
fi

echo "CoreStudio Codex 集成已准备好。"
echo "CoreStudio：$APP_VERSION"
echo "集成：$INTEGRATION_VERSION"
echo "CLI：$CLI_PATH"
echo "Skill：$SKILL_PATH"
