# CoreStudio 项目级 Agent Token 设计

## 背景

当前 Agent Bridge 使用应用启动时生成的本地 session token。这个方式能保证一次会话内可读写，但每次重启都会变化，导致 Codex 内置浏览器、CLI/CRI 和用户手动复制链接都需要重新发现和替换地址。

现在的产品定位更适合项目级身份 + 软件级总开关：CoreStudio 仍然是本地项目和数据的 owner，Agent 只是本机协作者。Token 不应该表达“本次启动”，而应该表达“这个本地项目可以被稳定指向”；是否允许 Agent 调用则由应用级开关统一控制。

## 目标

- 每个 CoreStudio 项目拥有一个固定的 Agent token。
- token 跟随项目文件保存，除非用户重置或另存为新项目，否则保持不变。
- Agent 调用只有软件级“开启”和“未开启”两种状态，不再做项目级开放开关。
- 应用启动后优先使用固定本地端口；端口冲突时允许 fallback 到动态端口。
- CLI/CRI 可以稳定地通过项目 token 找到当前运行中的项目和 Agent Board 链接。

## 非目标

- 不引入公网账号授权。
- 不恢复单独写入授权；软件级总开关 + 本地项目 token 即代表读写许可。
- 不把 CoreStudio 变成内置 Agent 调度器。

## 数据模型

项目 `project.json` 增加：

```ts
agentAccess: {
  token: string;
  enabled: boolean;
}
```

语义：

- `token` 是项目固定身份。新项目创建时生成；旧项目第一次打开时自动补齐。
- `enabled` 是兼容旧数据结构的遗留字段，运行时不再用它判断是否开放。新写入和迁移时统一归一为 `true`。
- token 不绑定端口，不绑定某次启动，不绑定某个 Agent。
- 应用级设置保存 `enabled: boolean`，表示是否允许 Agent 调用 CoreStudio。

## 运行模型

CoreStudio 启动并开启软件级 Agent 调用后：

1. 本地 bridge 优先监听固定端口。
2. 如果固定端口被占用，fallback 到系统分配的动态端口。
3. session descriptor 写入当前 bridge 地址、端口和当前桌面项目 token（如果桌面端已经打开项目）。
4. Agent Board URL 使用固定入口，不再把项目 token 放进复制链接。
5. 访问 Agent Board 后，内置画布通过 bridge 列出可用项目，并在内置浏览器里独立选择项目；这个打开状态不要求和桌面窗口当前项目一致。
6. 如果暂未选择项目，bridge 可以处于“已连接，等待项目选择”状态。

示例：

```txt
http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909
```

## 访问规则

所有 Agent Bridge 请求都必须满足软件级 Agent 调用开关处于开启状态。

公共探测/选择请求：

- `GET /v1/status` 可以无 token 返回 bridge ready 状态。
- `POST /v1/desktop-bridge` 中的 `loadRecentProjects`、`openRecentProject`、`loadAppInfo`、`loadProviderSettings`、`loadPromptLibrary` 可以无 token 调用，用于内置画布初始化和项目选择。

项目读写请求：

- Authorization Bearer token 必须等于某个已知项目的 `agentAccess.token`。
- token 可以匹配桌面窗口当前项目，也可以匹配最近项目列表中的项目。
- 请求写入时使用 token 对应项目的路径，不使用桌面窗口当前项目作为隐式目标。

如果软件级开关未开启，返回 `FORBIDDEN`。
如果 token 不匹配，返回 `AUTH_REQUIRED`。

## CLI/CRI 语义

CLI/CRI 不需要追踪每次启动的动态 token。它只需要：

- 读取 session descriptor，获得当前 bridge 地址。
- 使用项目固定 token 访问 bridge。
- 根据软件级开关状态判断当前应用是否允许 Agent 调用。
- 使用固定 Agent Board 链接打开内置画布；项目选择由内置画布通过 bridge 完成。

后续可以扩展：

```txt
corestudio projects
corestudio board-url --project-token <token>
corestudio open --project-token <token>
```

第一阶段要求现有 CLI 兼容 session descriptor 中的 `projectToken`，并提供 `agent board-url` 直接返回固定内置画板链接。

## 项目复制和迁移

- 移动项目文件夹：token 保持不变。
- 复制项目文件夹：token 会跟随复制结果；这是本地文件语义，第一阶段接受。
- 另存为新项目：后续应生成新 token。
- 旧项目：打开时如果缺少 `agentAccess`，自动写入 token 和兼容字段 `enabled: true`。

## UI 规则

- 应用设置和初始项目选择页控制软件级 Agent 调用状态。
- 右下角 Agent Bridge 图标只显示连接状态和快捷操作，不再承载软件级开关。
- 开启后显示桌面当前项目（如有）、bridge 地址和可复制的固定 Board 链接。
- Agent Board 打开后可在内置浏览器里选择项目；内置画布的项目状态可以和桌面窗口不同。
- 关闭后明确提示“Agent 调用已关闭”，不再显示成某个项目未开启。

## 测试要求

- 新项目创建时写入固定 token。
- 旧项目打开时补齐 token，且不会覆盖已有 token。
- bridge 接受任意已知项目 token。
- bridge 在软件级开关关闭时拒绝访问。
- Agent Board 支持无 `projectToken` 的固定入口；带 `projectToken` 的旧链接继续兼容并可自动进入对应项目。
- session descriptor 写入项目 token，并保留旧字段兼容。
