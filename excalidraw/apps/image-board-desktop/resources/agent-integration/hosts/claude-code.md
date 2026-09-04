## Claude Code 宿主连接

如果安装后当前 Claude Code 对话尚未发现这个 Skill，请新建一个本地对话再试；首次创建顶层 Skill 目录时也可以重启 Claude Code。不要重复安装。

开始需要可信身份的画布任务时，先运行：

```bash
corestudio agent connect --host claude-code --label "Claude Code" --json
```

保存返回的 `sessionRef`，在当前对话后续的读取、写入、图片生成和画布认领命令中追加 `--agent-session <sessionRef>`。目标项目由认领的 Board 绑定决定，与桌面标签无关；不得通过浏览器粘贴图片。session 只在当前 CoreStudio 进程内有效；失效后重新连接，不得猜测或复用其他对话的引用。

Claude Code 具备适合任务的原生图片生成能力时优先使用自身能力。需要 CoreStudio 图片生成时，必须先检查当前宿主权限与能力，且不能指定或切换服务、模型、API Key 或 Base URL。
