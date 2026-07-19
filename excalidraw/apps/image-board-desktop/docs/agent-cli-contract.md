# CoreStudio Agent CLI Contract

CoreStudio CLI 是 Codex 与 Agent Board 使用的自动化入口，也是 Local Bridge 的薄客户端。CLI 不直接读取或修改项目文件。

## Tool Shape

- `read`：读取当前状态和项目证据。
- `write`：通过 CoreStudio 校验创建项目变更。
- `edit`：只改变选区、定位等临时画布状态。
- `bash`：输出当前会话环境与示例。

## Read Commands

- `read status --json`
- `read capabilities --json`
- `read context --json`
- `read project --json`
- `read records --json`
- `read health --json`
- `read board --json`
- `read scene --json`
- `read selection --json`
- `read image-paths --selection|--file-ids <ids>|--all --json`
- `read board-url --json`
- `read browser-state --json`

## Write Commands

- `write image <path> --origin agent-board --prompt <prompt> --reference-file-ids <ids> --reference-element-ids <ids> --json`
- `write prompt --text <text> --json`
- `write generation --prompt <prompt> --use-selection --json`

`write image` 必须显式提供有效 `--origin`，否则 CLI 在读取本地图片前拒绝命令。Agent 图片统一使用 `agent-board`。

引用元数据必须是非空有效 id。`--reference-file-ids` 和 `--reference-element-ids` 接受逗号分隔列表；空列表或无效值在读取图片和调用 Bridge 前被拒绝。

## Record Diagnostics

`read records` 为每条记录返回 `boardPresence`：

- `locateKind: "direct"`：记录有自己的画布元素。
- `locateKind: "referenced-by-result"`：原图已不在画布，但后续结果引用它，可定位到该结果。
- `locateKind: "missing-board-element"`：没有可解释记录的画布元素；若 `needsBoardRepair` 为 true，应提示用户运行项目修复。

## Edit Commands

- `edit locate --file-id <fileId> --json`
- `edit locate --element-id <elementId> --json`
- `edit select --file-ids <ids> --json`
- `edit select --element-ids <ids> --json`

`locate` 会选择并滚动到目标。找不到直接元素时，会尝试定位引用该文件的结果图；仍找不到时返回 `located: false`、`reason: "missing-board-element"` 和 `repairable: true`。

## Structured Errors

```json
{
  "ok": false,
  "error": {
    "code": "PROJECT_REQUIRED",
    "message": "当前没有打开 CoreStudio 项目。"
  }
}
```

Agent 应根据 `error.code` 分支，不解析本地化 `message`：

- `PROJECT_REQUIRED`：没有当前项目。
- `COMMAND_FAILED`：Bridge、renderer 或本地准备阶段失败。
- `CAPABILITY_UNAVAILABLE`：当前运行时缺少对应能力。
- `BAD_REQUEST`：参数无效。
- `BRIDGE_UNAVAILABLE`：CoreStudio 未运行或会话不可达。
- `STALE_PROJECT_SNAPSHOT`：写入前场景已被其他会话更新，需要重新读取上下文。

## Bash Commands

- `bash env`
- `bash examples --json`

## CLI Examples

### Read Current Selection

```bash
corestudio read selection --json
```

### Resolve Original Image Paths

```bash
corestudio read image-paths --selection --json
```

或指定记录：

```bash
corestudio read image-paths --file-ids image-file-1,image-file-2 --json
```

### Write An Agent Image Result

```bash
corestudio write image /absolute/path/to/result.png \
  --origin agent-board \
  --prompt "Make the selected desktop CNC more minimal and Apple-like." \
  --reference-file-ids image-file-1 \
  --reference-element-ids element-1 \
  --json
```

CoreStudio 会复制图片、创建图片与生成记录、插入画布元素，并返回可定位的 id。

### Locate A Written Result

```bash
corestudio edit locate --file-id generated-file-1 --json
```

### Read Project Health Report

```bash
corestudio read health --json
```

当记录、资产和画布元素不一致时，先读取健康报告，避免重复写入已有资产。

## Writeback Consistency

图片写回由 CoreStudio 执行事务：`begin → scene → strict autosave → commit`。发生 `STALE_PROJECT_SNAPSHOT` 或 `WRITEBACK_CONFLICT` 时，Agent 必须重新读取项目状态，不能盲目重试或直接修改项目文件。
