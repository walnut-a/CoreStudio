#!/bin/bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "用法：install.sh <codex|cursor|claude-code|workbuddy|qwenwork|doubaowork>" >&2
  exit 2
fi

HOST="$1"
case "$HOST" in
  codex)
    HOST_LABEL="Codex"
    SKILL_DIR="$HOME/.codex/skills/corestudio"
    ;;
  cursor)
    HOST_LABEL="Cursor"
    SKILL_DIR="$HOME/.cursor/skills/corestudio"
    ;;
  claude-code)
    HOST_LABEL="Claude Code"
    SKILL_DIR="$HOME/.claude/skills/corestudio"
    ;;
  workbuddy)
    HOST_LABEL="WorkBuddy"
    SKILL_DIR="$HOME/.workbuddy-ai/skills/corestudio"
    ;;
  qwenwork)
    HOST_LABEL="千问办公"
    SKILL_DIR="$HOME/.qwenworkcn/skills/corestudio"
    ;;
  doubaowork)
    HOST_LABEL="豆包工作"
    SKILL_DIR="$HOME/Library/Application Support/DoubaoWork/Default/.doubaowork/agent_mode/workspace/.user_skills/corestudio"
    if [[ ! -d "$(dirname "$SKILL_DIR")" ]]; then
      echo "尚未找到豆包工作的本机技能目录，请先打开豆包工作并启用本地电脑任务。" >&2
      exit 2
    fi
    ;;
  *)
    echo "不支持的 Agent 宿主：$HOST" >&2
    exit 2
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTENTS_DIR="$(cd "$RESOURCES_DIR/.." && pwd)"
INFO_PLIST="$CONTENTS_DIR/Info.plist"
COMMON_SKILL="$RESOURCES_DIR/codex-integration/corestudio-skill/SKILL.md"
HOST_ADDENDUM="$SCRIPT_DIR/hosts/$HOST.md"
CONTRACT="$SCRIPT_DIR/contract.json"
APP_ASAR="$RESOURCES_DIR/app.asar"
CLI_RUNTIME="$RESOURCES_DIR/app.asar/bin/corestudio.cjs"
CLI_DIR="$HOME/.local/bin"
CLI_PATH="$CLI_DIR/corestudio"
SKILL_PATH="$SKILL_DIR/SKILL.md"
MANAGED_MARKER="<!-- corestudio-managed-agent-skill host=$HOST -->"

for required in "$COMMON_SKILL" "$HOST_ADDENDUM" "$CONTRACT" "$APP_ASAR" "$INFO_PLIST"; do
  if [[ ! -f "$required" ]]; then
    echo "CoreStudio Agent 集成资源缺失：$required" >&2
    exit 1
  fi
done

APP_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$INFO_PLIST")"
ELECTRON_BIN="$CONTENTS_DIR/MacOS/$APP_EXECUTABLE"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  echo "CoreStudio 可执行文件缺失：$ELECTRON_BIN" >&2
  exit 1
fi

mkdir -p "$CLI_DIR" "$SKILL_DIR"

if [[ -f "$SKILL_PATH" ]] && ! grep -Fq "$MANAGED_MARKER" "$SKILL_PATH"; then
  if [[ "$HOST" != "codex" ]] || { ! cmp -s "$SKILL_PATH" "$COMMON_SKILL" && [[ "${CORESTUDIO_ALLOW_LEGACY_CODEX_SKILL:-0}" != "1" ]]; }; then
    echo "检测到未由 CoreStudio 管理的 Skill，已停止以避免覆盖：$SKILL_PATH" >&2
    exit 3
  fi
fi

CLI_TEMP="$(mktemp "$CLI_DIR/.corestudio.XXXXXX")"
SKILL_TEMP="$(mktemp "$SKILL_DIR/.SKILL.md.XXXXXX")"
cleanup() {
  rm -f "$CLI_TEMP" "$SKILL_TEMP"
}
trap cleanup EXIT

cat > "$CLI_TEMP" <<EOF
#!/bin/sh
ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON_BIN" "$CLI_RUNTIME" "\$@"
EOF
chmod 755 "$CLI_TEMP"
mv -f "$CLI_TEMP" "$CLI_PATH"

{
  cat "$COMMON_SKILL"
  printf '\n\n%s\n' "$MANAGED_MARKER"
  printf '\n## 本机 CLI 入口\n\n'
  printf '本机安装器已确认 CLI 位于：`%s`\n\n' "$CLI_PATH"
  printf '下文所有 `corestudio` 命令都表示这个可执行文件。先尝试直接运行 `corestudio`；如果当前 Agent 的 PATH 无法发现它，必须改用上述绝对路径，不要重复安装或自行改写 CLI。\n\n'
  case "$HOST" in
    workbuddy|qwenwork|doubaowork)
      printf '\n## 当前宿主：%s\n\n' "$HOST_LABEL"
      printf '首次接入或遇到宿主工具、浏览器、登录和权限问题时，先读取本 Skill 目录下的 [宿主接入说明](references/host.md)。只读取当前宿主文档，按当前实际工具执行；不要要求用户预先完成整套准备清单。\n'
      ;;
    *) cat "$HOST_ADDENDUM" ;;
  esac
} > "$SKILL_TEMP"
case "$HOST" in
  workbuddy|qwenwork|doubaowork)
    mkdir -p "$SKILL_DIR/references"
    cp "$HOST_ADDENDUM" "$SKILL_DIR/references/host.md"
    chmod 644 "$SKILL_DIR/references/host.md"
    ;;
esac
chmod 644 "$SKILL_TEMP"
mv -f "$SKILL_TEMP" "$SKILL_PATH"

"$CLI_PATH" --version --json >/dev/null

echo "CoreStudio $HOST_LABEL 集成已准备好。"
echo "CLI：$CLI_PATH"
echo "Skill：$SKILL_PATH"
