# Agent Integration QA Notes

Status: needs-recheck

## Screenshot Checklist

| Surface | Status | 回归重点 |
| --- | --- | --- |
| 应用设置 · 图片集成 | pending | 输入框展示、服务、模型、API Key 和未保存确认正常 |
| 应用设置 · Agent 集成 | pending | Codex、Cursor、Claude Code 独立安装检测、权限与打开当前项目引导正常 |
| 应用设置 | pending | 只保留图片集成、Agent 集成、通用和关于页 |
| 底部单次生成 | pending | 候选 prompt 不可直接提交；正式编辑后可提交；提交后清空；多张并行生成 |
| 左侧生成记录 | pending | CoreStudio 与 Codex 写回图片都可查看和定位 |
| Agent Board | pending | 只提供画布上下文、选择、标注和结果确认 |
| 项目健康检查报告 | pending | 记录、资产、画布元素问题说明和修复建议正确 |
| 项目修复结果 | pending | 修复数量、跳过原因、备份与后续动作正确 |

每项必须在开发版中验证后才能标记为 checked，并记录日期、项目、截图或浏览器证据。

## Multi-host Installation Checklist

- 在隔离 HOME 中分别安装 Codex、Cursor 和 Claude Code，确认只生成所选宿主的 Skill。
- 三套 Skill 都包含对应 managed marker，以及安装器确认过的 `~/.local/bin/corestudio` 绝对路径。
- 模拟 Agent 的 `PATH` 中没有 `~/.local/bin`，确认仍能按 Skill 记录的绝对路径执行 `--version --json`。
- 新建本地 Cursor / Claude Code 对话后能发现 Skill；不得用重复安装掩盖当前对话未重新扫描的问题。
- packaged smoke 从应用包内运行三宿主安装器，并执行最终共享 CLI；不得引用开发仓库文件。
- packaged smoke 读取包内 `agent-integration/contract.json`，并确认共享 CLI 返回的集成版本和 Bridge 协议完全一致。

## Multi-session Isolation Checklist

- Cursor 与 Claude Code 各自连接同一项目，获得不同的 `sessionRef` 和 `actorId`。
- 两个 session 交替写入时，Project Room 收到各自的 `threadId`、`actorId`、`host` 和 `displayLabel`，不得串线。
- 关闭并重新启动 CoreStudio 后，旧 `sessionRef` 必须返回明确错误，不能自动映射到新会话。

## Image Writeback Recovery Checklist

- 全部引用：所有 `fileId` 都在未删除 image element 中；重启后 commit，保留记录、资产和 scene，删除 journal。
- 全部未引用：所有 `fileId` 都不在 scene 中；重启后 rollback，仅恢复本事务改动并删除本事务资产。
- 部分引用（mixed）：返回 `WRITEBACK_CONFLICT`，journal、记录和资产保持不动。
- 后续写入冲突：同一 `fileId` 已指向新 `assetPath` 时，旧事务不得覆盖新记录。
- 提交前失败：未进入房间的写入可以按 journal 回滚本事务新增资产。
- 房间已接受：双方已看到的 scene 和资产必须保留；持久化失败只进入可重试的存储错误状态，不恢复旧 renderer 快照。
- 磁盘分叉：返回 `PROJECT_STORAGE_DIVERGED`，房间停止继续覆盖磁盘，并保留结构化 details 供定位外部写入来源。
- 重连：未确认操作用原 `operationId` 重发；先接收权威 snapshot，再处理后续增量。

## Data Integrity Checklist

- CoreStudio 单次生成只使用 `corestudio` 来源。
- 外部 Agent 写回只使用 `agent-board` 来源。
- 项目修复不删除仍被画布引用的图片资产。
