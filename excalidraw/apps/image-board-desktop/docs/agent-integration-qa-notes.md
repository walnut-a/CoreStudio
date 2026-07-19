# Agent Integration QA Notes

Status: needs-recheck

## Screenshot Checklist

| Surface | Status | 回归重点 |
| --- | --- | --- |
| 应用设置 · 图像生成 | pending | 服务、模型、API Key 和未保存确认正常 |
| 应用设置 · Codex 集成 | pending | 安装检测、独立集成版本、打开当前项目引导正常 |
| 应用设置 | pending | 只保留图像生成、Codex 集成、通用和关于页 |
| 底部单次生成 | pending | 候选 prompt 不可直接提交；正式编辑后可提交；提交后清空；多张并行生成 |
| 左侧生成记录 | pending | CoreStudio 与 Codex 写回图片都可查看和定位 |
| Agent Board | pending | 只提供画布上下文、选择、标注和结果确认 |
| 项目健康检查报告 | pending | 记录、资产、画布元素问题说明和修复建议正确 |
| 项目修复结果 | pending | 修复数量、跳过原因、备份与后续动作正确 |

每项必须在开发版中验证后才能标记为 checked，并记录日期、项目、截图或浏览器证据。

## Image Writeback Recovery Checklist

- 全部引用：所有 `fileId` 都在未删除 image element 中；重启后 commit，保留记录、资产和 scene，删除 journal。
- 全部未引用：所有 `fileId` 都不在 scene 中；重启后 rollback，仅恢复本事务改动并删除本事务资产。
- 部分引用（mixed）：返回 `WRITEBACK_CONFLICT`，journal、记录和资产保持不动。
- 后续写入冲突：同一 `fileId` 已指向新 `assetPath` 时，旧事务不得覆盖新记录。
- 正常链路：Agent 图片和内置生成都必须在 strict autosave 成功后 commit；失败时恢复 renderer 快照并 rollback。

## Data Integrity Checklist

- CoreStudio 单次生成只使用 `corestudio` 来源。
- Codex 写回只使用 `agent-board` 来源。
- 项目修复不删除仍被画布引用的图片资产。
