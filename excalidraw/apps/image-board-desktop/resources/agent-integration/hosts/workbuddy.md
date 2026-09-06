## WorkBuddy 宿主连接

仅支持能访问本机终端与文件的 WorkBuddy 本地任务，安装位置为 `~/.workbuddy-ai/skills/corestudio`。在 CoreStudio 设置安装后无需再上传 Skill ZIP；新建任务才能确认是否加载。

使用当前任务已经提供的 agent-browser 或 playwright-cli 技能控制浏览器。仅通过 present_files 打开预览不等于读到真实页面 nonce。任务未提供浏览器控制能力时，报告尚未完成连接，不假设内置预览可自动操作。

安装后新建一个本地任务以加载 Skill。开始连接时运行：

```bash
corestudio agent connect --host workbuddy --label "WorkBuddy Agent" --json
```

保存返回的 `sessionRef`，只在当前任务复用；所有认领、项目读取、写入和生成命令均追加 `--agent-session <sessionRef>`。按共同流程从实际浏览器页面读取 nonce 并认领；未完成认领不得回退到桌面当前项目。

先检查当前任务实际暴露的图片工具。原生生图结果必须取得本机可读原图路径或可下载图片，再经 CLI 写回；聊天预览、网页链接或产品宣传不算生成回执。没有可用原生工具时，明确告知用户；只有用户授权且当前宿主 `allowImageGeneration` 与能力检查通过，才调用 CoreStudio 生图。不自动启用权限、不更换模型或新增服务商。

本次实测通过 agent-browser 读取真实页面 nonce、CLI 认领与提示词持久化；本次任务未提供原生生图工具，不能据此推断产品永远不支持。无浏览器工具时可使用用户从原 Agent Board 复制的完整连接引用，保留原页，不刷新或创建替代 nonce。只清理本任务新建的浏览器标签或实例，保留用户原有浏览器。
