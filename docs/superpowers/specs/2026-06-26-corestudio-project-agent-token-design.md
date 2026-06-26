# CoreStudio 项目级 Agent Token 设计

## 背景

当前 Agent Bridge 使用应用启动时生成的本地 session token。这个方式能保证一次会话内可读写，但每次重启都会变化，导致 Codex 内置浏览器、CLI/CRI 和用户手动复制链接都需要重新发现和替换地址。

现在的产品定位更适合项目级身份：CoreStudio 仍然是本地项目和数据的 owner，Agent 只是本机协作者。Token 不应该表达“本次启动”，而应该表达“这个本地项目允许被 Agent 指向”。

## 目标

- 每个 CoreStudio 项目拥有一个固定的 Agent token。
- token 跟随项目文件保存，除非用户重置或另存为新项目，否则保持不变。
- Agent 连接只有“开启”和“未开启”两种状态。
- 应用启动后优先使用固定本地端口；端口冲突时允许 fallback 到动态端口。
- CLI/CRI 可以稳定地通过项目 token 找到当前运行中的项目和 Agent Board 链接。

## 非目标

- 不引入公网账号授权。
- 不恢复单独写入授权；本地 token + 项目开关即代表读写许可。
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
- `enabled` 表示是否允许 Agent 连接。关闭时 token 保留，但 bridge 拒绝访问。
- token 不绑定端口，不绑定某次启动，不绑定某个 Agent。

## 运行模型

CoreStudio 启动并开启 Agent Bridge 后：

1. 本地 bridge 优先监听固定端口。
2. 如果固定端口被占用，fallback 到系统分配的动态端口。
3. session descriptor 写入当前 bridge 地址、端口和当前项目的 token/enabled 状态。
4. Agent Board URL 使用 `projectToken`，不再使用一次性 `token`。

示例：

```txt
http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909&projectToken=...
```

## 访问规则

所有 Agent Bridge 请求都必须满足：

- Authorization Bearer token 等于当前项目 `agentAccess.token`。
- 当前项目存在。
- 当前项目 `agentAccess.enabled === true`。

如果没有打开项目，返回 `PROJECT_REQUIRED`。
如果项目未开启协作，返回 `FORBIDDEN`。
如果 token 不匹配，返回 `AUTH_REQUIRED`。

## CLI/CRI 语义

CLI/CRI 不需要追踪每次启动的动态 token。它只需要：

- 读取 session descriptor，获得当前 bridge 地址。
- 使用项目固定 token 访问 bridge。
- 根据 `agentAccess.enabled` 判断当前项目是否可连接。

后续可以扩展：

```txt
corestudio projects
corestudio board-url --project-token <token>
corestudio open --project-token <token>
```

第一阶段要求现有 CLI 兼容 session descriptor 中的 `projectToken`，并提供 `agent board-url` 直接返回当前内置画板链接。

## 项目复制和迁移

- 移动项目文件夹：token 保持不变。
- 复制项目文件夹：token 会跟随复制结果；这是本地文件语义，第一阶段接受。
- 另存为新项目：后续应生成新 token。
- 旧项目：打开时如果缺少 `agentAccess`，自动写入 token 和 `enabled: false`。

## UI 规则

- 右下角 Agent Bridge 开关控制当前项目的 `enabled`。
- 开启后显示项目名、项目路径、bridge 地址和可复制的 Board 链接。
- 关闭后仍可显示项目 token 已存在，但明确提示“未开启协作”。

## 测试要求

- 新项目创建时写入固定 token 和关闭状态。
- 旧项目打开时补齐 token，且不会覆盖已有 token。
- bridge 仅接受当前项目 token。
- bridge 在项目未开启时拒绝访问。
- Agent Board 支持 `projectToken` 参数。
- session descriptor 写入项目 token，并保留旧字段兼容。
