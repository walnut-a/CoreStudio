## Cursor 宿主连接

开始需要可信身份的画布任务时，先运行：

```bash
corestudio agent connect --host cursor --label "Cursor Agent" --json
```

保存返回的 `sessionRef`，在当前对话后续的写入、图片生成和画布认领命令中追加 `--agent-session <sessionRef>`。session 只在当前 CoreStudio 进程内有效；失效后重新连接，不得猜测或复用其他对话的引用。

Cursor 具备适合任务的原生图片生成能力时优先使用 Cursor 自身能力。需要 CoreStudio 图片生成时，必须先检查当前宿主权限与能力，且不能指定或切换服务、模型、API Key 或 Base URL。
