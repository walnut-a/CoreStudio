## 豆包工作 宿主连接

仅支持“本地电脑”任务。使用当前任务的“操作浏览器”能力打开并检查页面。云端任务不能假设能访问本机 CLI、输出文件或 127.0.0.1。托管技能只安装到已存在的默认本地 workspace/.user_skills；其他环境路径不猜测。

安装前先登录并运行一次“本地电脑”任务，让客户端建立默认技能目录；若目录未初始化，提示先完成该步骤，不手动创建另一套 workspace。托管路径为 `~/Library/Application Support/DoubaoWork/Default/.doubaowork/agent_mode/workspace/.user_skills/corestudio`。

安装后新建一个本地电脑任务以加载 Skill。开始连接时运行：

```bash
corestudio agent connect --host doubaowork --label "豆包工作 Agent" --json
```

保存返回的 `sessionRef`，只在当前任务复用；所有认领、项目读取、写入和生成命令均追加 `--agent-session <sessionRef>`。按共同流程从实际浏览器页面读取 nonce 并认领；未完成认领不得回退到桌面当前项目。

先检查当前任务实际暴露的图片工具。原生生图结果必须取得本机可读原图路径或可下载图片，再经 CLI 写回；聊天预览、网页链接或产品宣传不算生成回执。没有可用原生工具时，明确告知用户；只有用户授权且当前宿主 `allowImageGeneration` 与能力检查通过，才调用 CoreStudio 生图。不自动启用权限、不更换模型或新增服务商。

本次实测通过内置浏览器读取 nonce、CLI 认领、提示词保存、可见参考图导出和图片写回。原生图片工具可发现但未做生图验收，以当前账号和任务实际能力为准。云端生成结果必须先下载为本地电脑任务可读取的文件，再按共同写回协议导入；不要把云端路径或聊天预览交给本机 CLI。
