# Agent Integration QA Notes

Status: needs-recheck

## Screenshot Checklist

| Surface | Status | 回归重点 |
| --- | --- | --- |
| 应用设置 · 图片集成 | pending | 输入框展示、服务、模型、API Key 和未保存确认正常 |
| 应用设置 · Agent 集成 | pending | 六宿主独立安装检测、权限和首次使用指令；三款新增宿主须按专属浏览器入口验收 |
| 应用设置 | pending | 只保留图片集成、Agent 集成、通用和关于页 |
| 底部单次生成 | pending | 候选 prompt 不可直接提交；正式编辑后可提交；提交后清空；多张并行生成 |
| 左侧生成记录 | pending | CoreStudio 与 Codex 写回图片都可查看和定位 |
| Agent Board | pending | 只提供画布上下文、选择、标注和结果确认 |
| 项目健康检查报告 | pending | 记录、资产、画布元素问题说明和修复建议正确 |
| 项目修复结果 | pending | 修复数量、跳过原因、备份与后续动作正确 |

每项必须在开发版中验证后才能标记为 checked，并记录日期、项目、截图或浏览器证据。

## Multi-host Installation Checklist

- 在隔离 HOME 中分别安装 Codex、Cursor、Claude Code、WorkBuddy、千问办公和豆包工作，确认只生成所选宿主的 Skill。
- 六套 Skill 都包含对应 managed marker，以及安装器确认过的 `~/.local/bin/corestudio` 绝对路径。
- 模拟 Agent 的 `PATH` 中没有 `~/.local/bin`，确认仍能按 Skill 记录的绝对路径执行 `--version --json`。
- 各宿主安装后新建本地任务后能发现 Skill；不得用重复安装掩盖当前对话未重新扫描的问题。
- packaged smoke 从应用包内运行六宿主安装器（豆包须准备默认本地目录），并执行最终共享 CLI；不得引用开发仓库文件。
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

## 2026-09-07 三款新增宿主验收记录

本轮仅更新与验证 Agent 接入相关范围，不把上表其他历史 pending 项目改为通过。

- 三款实际宿主的浏览器连接、会话认领和提示词持久化已验证。千问复用官方扩展已连接的外部 Chrome 标签页，自行新开标签未单独验收；豆包额外通过可见参考图导出和图片写回。
- 本轮说明同步后，32 项设置、文档、安装器、服务与 smoke 合同单测通过，TypeScript 类型检查通过，Skill 格式校验通过。全量桌面基线曾运行 2335 项，其中新加接入说明测试按 TDD 预期失败、其余 2334 项通过；实现后使用上述定向验证收尾，不重复全量。
- 固定 SOURCE DEV 中实看 WorkBuddy、千问办公、豆包工作三套说明与六宿主按钮并截图；官网实看中文千问、英文六宿主切换，以及 390px 豆包页面，长路径没有横向溢出。截图随本任务交付。
- 中英文官网内容和 WebMCP 六宿主枚举一致；含浏览器缺失、本地目录未初始化和原图不可用的恢复说明。WebMCP 是只读教程，不报告本机安装成功。
- 未进行正式打包、签名安装、在线部署或收费生图；应用安装资源的最终分发仍需后续正式交付验证。
