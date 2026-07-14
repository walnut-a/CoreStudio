#!/bin/bash

set -euo pipefail

RESOURCES_DIR=""
APP_VERSION=""
ELECTRON_BIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --resources-dir)
      RESOURCES_DIR="$2"
      shift 2
      ;;
    --app-version)
      APP_VERSION="$2"
      shift 2
      ;;
    --electron-bin)
      ELECTRON_BIN="$2"
      shift 2
      ;;
    *)
      echo "未知参数：$1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$RESOURCES_DIR" || -z "$APP_VERSION" || -z "$ELECTRON_BIN" ]]; then
  echo "缺少安装参数，请从 CoreStudio 的 Codex 集成设置重新复制指令。" >&2
  exit 2
fi

SOURCE_SKILL="$RESOURCES_DIR/codex-integration/corestudio-skill/SKILL.md"
CLI_RUNTIME="$RESOURCES_DIR/app.asar/bin/corestudio.cjs"
CLI_DIR="$HOME/.local/bin"
CLI_PATH="$CLI_DIR/corestudio"
SKILL_DIR="$HOME/.codex/skills/corestudio"
SKILL_PATH="$SKILL_DIR/SKILL.md"
MANIFEST_PATH="$HOME/.codex/corestudio-integration.json"

if [[ ! -f "$SOURCE_SKILL" || ! -f "$CLI_RUNTIME" || ! -x "$ELECTRON_BIN" ]]; then
  echo "CoreStudio 安装资源不完整，请重新安装 CoreStudio 后再试。" >&2
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
  "version": "$(json_escape "$APP_VERSION")",
  "cliPath": "$(json_escape "$CLI_PATH")",
  "skillPath": "$(json_escape "$SKILL_PATH")",
  "supportsSessionDiscovery": true
}
EOF
chmod 644 "$MANIFEST_PATH"

echo "CoreStudio Codex 集成已准备好。"
echo "CLI：$CLI_PATH"
echo "Skill：$SKILL_PATH"
