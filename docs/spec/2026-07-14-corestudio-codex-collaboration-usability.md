# CoreStudio 与 Codex 协作边界

> 状态：当前有效

## 产品路径

- CoreStudio 内是单次生成：使用本地已配置的图像服务，一次提交可以并行生成多张图片。
- Codex 中是 Agent 工作流：由 Codex 分析、连续迭代、并行工作并调用工具。
- Agent Board 只提供画布上下文、选择、标注和结果确认。
- CLI / Local Bridge 是受控数据通道，不是独立调度者。

## 数据边界

- CoreStudio 是项目数据 owner。
- Agent 不直接修改项目文件。
- 图片写回必须生成资产、图片记录和画布元素，并通过严格 autosave 后提交事务。
- 场景已被其他会话更新时返回 `STALE_PROJECT_SNAPSHOT`，不覆盖新快照。
- 客户端升级只在 CLI、Skill 或 Bridge 契约变化时要求更新独立的 Codex 集成版本。

## 用户体验

- Codex 集成页提供应用内安装、检测和“打开当前项目”引导。
- 普通用户不需要复制 Bridge 地址、环境变量或 project token。
- Codex 无法直接控制内置浏览器时返回一键链接，不擅自改用外部浏览器。
- Agent 写回结果出现在普通生成记录中，并可定位到画布。
