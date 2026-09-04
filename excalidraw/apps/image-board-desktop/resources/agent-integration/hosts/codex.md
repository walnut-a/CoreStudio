## Codex 宿主连接

开始画布任务时先运行：

```bash
corestudio agent connect --host codex --label "当前任务" --json
```

保存返回的 `sessionRef`。完成 Board 认领后，同一对话内所有项目级读取、写入、图片生成和画布命令都追加 `--agent-session <sessionRef>`；这使目标只由该对话的 Board 绑定决定，与桌面当前标签无关。`CODEX_THREAD_ID` 和 `CODEX_TASK_TITLE` 只保留为兼容身份，不作为新流程的目标路由。不得把 session 写入项目、画布 URL 或回复正文。

Codex 具备适合任务的原生图片生成能力时优先使用 Codex 自身额度，再用带该 session 的 `corestudio write image` 写回。不能通过 Agent Board 页面粘贴图片。只有用户明确要求或 Codex 能力不适合时，才检查并调用 CoreStudio 图片生成。
