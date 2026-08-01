## Codex 宿主连接

Codex 会继续通过 `CODEX_THREAD_ID` 和 `CODEX_TASK_TITLE` 自动建立兼容身份。若命令显式返回 `agentSession`，同一对话内后续命令应复用它；不得把 session 写入项目、画布 URL 或回复正文。

Codex 具备适合任务的原生图片生成能力时优先使用 Codex 自身额度，再用 `corestudio write image` 写回。只有用户明确要求或 Codex 能力不适合时，才检查并调用 CoreStudio 图片生成。
