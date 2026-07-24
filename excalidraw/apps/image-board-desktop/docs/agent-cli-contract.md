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

`read project --json` 返回当前项目的 `projectId`、名称、创建时间、更新时间和本地路径。`projectId` 是固定选区引用使用的非敏感稳定身份；不得用项目名或创建时间代替它进行项目匹配。

## Write Commands

- `write image <path...> --source-type generated --origin agent-board --prompt <prompt> --reference-file-ids <ids> --reference-element-ids <ids> --json`
- `write image <path> --source-type imported --json`
- `write prompt --text <text> --json`

Codex 生成的图片使用 `--source-type generated --origin agent-board`；搜索或下载的外部图片使用 `--source-type imported`。生成图必须显式提供有效 `--origin`，否则 CLI 在读取本地图片前拒绝命令。

同一轮生成得到多张成功图片时，在同一条命令中依次提供全部路径。CLI 会读取全部图片并以一个 `files[]` 请求提交，CoreStudio 使用同一组参考元素和现有批量布局算法创建一个房间操作；不要逐张调用命令。

CLI 和 Local Bridge 只负责把已存在的本地图片写入项目，不暴露 CoreStudio 内置生成模型。

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
- `PROJECT_STORAGE_DIVERGED`：磁盘项目与房间持有的持久化基线不一致；本次持久化已停止，需要检查项目文件为何被房间之外的写入者修改。

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

### Write An Agent Image Batch

```bash
corestudio write image \
  /absolute/path/to/result-1.png \
  /absolute/path/to/result-2.png \
  --source-type generated \
  --origin agent-board \
  --prompt "Make the selected desktop CNC more minimal and Apple-like." \
  --reference-file-ids image-file-1 \
  --reference-element-ids element-1 \
  --json
```

CoreStudio 会复制图片、创建图片与生成记录，并把整批结果有序放到参考图附近，随后返回可定位的 id。

搜索或下载的外部图片需要先保存到本地，再按导入资产写回：

```bash
corestudio write image /absolute/path/to/searched.png \
  --source-type imported \
  --json
```

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

图片写回仍由 CoreStudio 复制和登记资产，但画布元素只通过当前项目房间提交。主进程先准备资产，再把一个带 `operationId` 的场景操作应用到房间；房间立即协调并广播元素，磁盘持久化由主进程统一完成。

房间已经接受操作后，即使磁盘持久化失败，也不会撤销双方已经看到的元素或删除对应资产。Agent 应根据结构化错误处理：普通持久化失败可以稍后重试；`PROJECT_STORAGE_DIVERGED` 表示房间之外出现了磁盘写入，必须先查明来源，不能绕过 CoreStudio 直接修改项目文件。
