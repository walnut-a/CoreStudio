# Agent Integration QA Notes

This file records visual QA for the Agent integration surfaces. It is intentionally separate from the implementation plan: the plan says what to build, while this file records what was actually checked in the running app.

Status: checked

## Screenshot Checklist

Each item should be verified in the development build before the F-stage screenshot task is marked complete. Record the date, viewport, route, and any screenshot path or browser evidence used for the check.

| Surface | Status | Evidence | Notes |
| --- | --- | --- | --- |
| 应用设置 Agent 集成首屏 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/agent-settings-overview-cdp.png`, `/tmp/corestudio-agent-qa/agent-settings-overview.json` | Shows the global Agent switch, Bridge / project / board / CLI / ACP status grid, and the three usage path cards. Advanced debug content is not mounted while collapsed. |
| 设置高级调试折叠和展开 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/agent-settings-advanced-expanded-cdp.png`, `/tmp/corestudio-agent-qa/agent-settings-advanced-expanded.json` | Collapsed settings do not mount run history; expanded state mounts ACP debug records and refresh control inside settings only. |
| 右下角 Agent 状态浮层 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/status-dock-element.png`, `/tmp/corestudio-agent-qa/status-dock.json` | Popover shows connected state, current project, bridge endpoint, CLI / board availability, ACP status, and shortcut actions. |
| 底部直接输入模式 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/direct-input-clean-element.png` | Direct input reads as a compact single-run composer and does not expose run-log debug controls. |
| 底部 ACP Agent 模式 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/acp-mode-element.png` | ACP mode is visually distinct from direct input and keeps raw protocol/debug controls out of the composer. |
| 左侧生成记录列表 | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/generation-records-sidebar-after-thumbnail-fix.png` | After fixing direct record thumbnails from loaded canvas files, DOM evidence shows 119 record thumbnails and 0 placeholders in the open project. |
| 左侧 ACP thread | checked | 2026-07-06, Electron CDP, `/tmp/corestudio-agent-qa/acp-thread-sidebar-element.png`, `/tmp/corestudio-agent-qa/acp-thread-populated-timeline-final.png`, `/tmp/corestudio-agent-qa/acp-thread-populated-timeline-final.txt` | Sidebar layout and 300px side-panel width were checked in the running app. A temporary ACP thread fixture then verified the populated timeline with user prompt, Agent text, interleaved tool calls, and an ACP image result card. |
| 项目健康检查报告 | checked | 2026-07-06, Electron CDP + macOS menu on `/tmp/corestudio-agent-qa/project-health-fixture`, `/tmp/corestudio-agent-qa/project-health-report-fixture.png`, `/tmp/corestudio-agent-qa/project-health-report-fixture.txt` | Running-app report grouped one missing file error and one missing board-element warning; it showed repairable/manual counts, File IDs, paths, and suggested next actions instead of only warning totals. |
| 项目修复结果 | checked | 2026-07-06, Electron CDP + macOS menu on `/tmp/corestudio-agent-qa/project-repair-fixture-fresh`, `/tmp/corestudio-agent-qa/project-repair-report-fresh.png`, `/tmp/corestudio-agent-qa/project-repair-report-fresh.txt` | Toast stayed concise (`项目数据修复完成。`). Details showed `补回画板 1`, skipped/failed detail rows, backup path, and next actions. File evidence confirmed the repaired scene contains `visible-file` and `orphan-generated-file`. |

## Evidence Rules

- Do not mark an item as checked without a running-app screenshot or browser evidence.
- If a screenshot reveals a regression, keep the status `blocked` or `needs-fix` and link the follow-up task.
- If an item is impossible to inspect because the project or Bridge is unavailable, leave it `pending` and record the blocker instead of guessing.
- Screenshot evidence should validate the same design-system notes recorded in `agent-conversation-sidebar-reference.md`.
