# CoreStudio Agent 图片生成授权需求整理

> 所属项目：CoreStudio
>
> 状态：已实现，待完成发布验收
>
> 本文是“Agent 调用 CoreStudio 图片生成能力”需求的唯一规格来源。实现范围变化时先更新本文，不再平行创建同类规格。
>
> 当前运行合同已同步到 `apps/image-board-desktop/docs/agent-cli-contract.md`；本文继续作为产品规则和验收范围的唯一规格来源。

## 需求背景

CoreStudio 已允许用户配置自己的图片生成服务、模型和 API Key；Codex 等外部
Agent 则可以读取画布上下文、使用自身能力生成内容，并把结果写回项目。

不同 Agent 的图片生成能力和额度差异很大：

- Codex 自身的图片生成能力较强、额度较宽松，搭配 Codex 使用时通常优先消耗
  Codex 自身额度更合理。
- 后续接入的其他 Agent 可能不具备图片生成能力，但仍需要完成涉及生图的画布任务。
- 用户可能愿意让某个 Agent 使用 CoreStudio 中已经配置好的服务，但这会消耗用户
  在对应服务商处的额度。
- “允许 Agent 向项目写入数据”和“允许 Agent 使用用户凭证产生费用”是两种风险
  不同的权限，不能共用一个开关。

因此，CoreStudio 需要增加一项按 Agent 集成单独授权、默认关闭的图片生成权限。

## 当前理解

- 目标用户/角色：
  - 使用 Codex 操作 CoreStudio 项目的用户。
  - 后续使用其他 Agent 集成、且该 Agent 本身没有合适生图能力的用户。
- 使用场景：
  - Agent 自身不具备图片生成能力。
  - Agent 自身能力不支持当前任务。
  - 用户明确要求使用 CoreStudio 当前配置的图片服务。
- 需求目标：
  - 用户可以明确控制某个 Agent 集成是否能消耗自己的图片生成额度。
  - Codex 默认继续优先使用自身图片生成能力。
  - 获得授权的 Agent 只能使用用户当前选定的服务和模型，不能获得配置管理权。
  - 生成结果仍由 CoreStudio 负责创建记录、写入画布并持久化。

## 产品原则

### 发起方负责调度

- 任务从 Codex 发起时，Codex 是调度者，默认优先使用 Codex 自身生图能力。
- CoreStudio 图片生成是用户授权后的补充能力，不因权限开启而自动成为默认路线。
- 外部 Agent 自行生成的结果继续通过 `corestudio write image` 写回。
- Agent 调用 CoreStudio 生图时，生成、记录、画布放置和持久化由 CoreStudio 完成。

### 授权与配置分离

- 用户授予的是“允许当前 Agent 集成使用当前配置”的权限。
- 用户没有把服务选择、模型选择、凭证读取或图片集成配置权交给 Agent。
- 权限开关只控制 Agent 调用，不影响 CoreStudio 内置生成输入框和用户直接生图。

### 按集成授权

- 第一版在“Codex 集成”中授权 Codex，不提供放行所有 Agent 的全局开关。
- 后续新增其他 Agent 时，每个集成都必须拥有独立权限。
- 集成身份必须由 CoreStudio 的安装与可信身份签发链路确定，不能接受调用方通过
  CLI 参数或请求字段自报集成身份。

## 第一版范围

### 包含

- 在“应用设置 → Codex 集成”中增加 Codex 图片生成权限开关。
- 权限按集成持久化，新安装和旧版本升级后均默认关闭。
- CLI 增加独立的 CoreStudio 图片生成命令。
- Local Bridge 增加受权限保护的 Agent 图片生成路由。
- `read capabilities` 返回当前集成的授权、配置和当前模型非敏感能力。
- Agent 只能使用请求开始时用户当前选定的服务和模型。
- 生成结果自动创建图片资产、图片记录和画布元素，并等待严格持久化。
- 图片记录区分“由哪套能力生成”和“由谁发起”。
- CoreStudio Skill 增加能力选择、权限检查、禁止切换模型和结果验证规则。
- 中英文设置文案、错误提示、CLI 合同和集成版本同步更新。

### 不包含

- 不允许 Agent 切换服务或模型。
- 不允许 Agent 查看完整服务列表或模型列表。
- 不允许 Agent 读取、写入或修改 API Key、Base URL 和图片集成配置。
- 不提供一次授权所有 Agent 的全局开关。
- 不在每次生成前弹出确认框。
- 不统计额度，不估算费用，不设置预算上限。
- 不在当前模型失败后自动切换其他服务或模型。
- 第一版不增加独立后台任务中心。
- 第一版不做云端权限同步。

## 关键规则

### 三项设置互相独立

| 设置                                | 控制内容                           | 关闭后的行为                                        |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------- |
| Agent Bridge                        | 是否允许外部 Agent 连接 CoreStudio | Agent 无法读写项目；其他设置值保留                  |
| 显示生成输入框                      | 是否显示画布底部的内置生成输入框   | 只隐藏输入框；服务、模型、API Key 和 Agent 权限保留 |
| 允许 Codex 使用 CoreStudio 图片生成 | Codex 是否可以消耗当前服务额度     | Codex 仍可读取画布并写回自身生成或导入的内容        |

上述设置不得互相自动开启、关闭或重置。

### 默认状态

- 新用户：Codex 图片生成权限默认关闭。
- 旧版本升级用户：迁移后默认关闭。
- 关闭 Agent Bridge：保留 Codex 图片生成权限值，但运行时不可调用。
- 隐藏生成输入框：不得改变 Codex 图片生成权限。

### 当前服务和模型

“当前服务和模型”定义为用户在 CoreStudio 图片集成中选定的：

1. 当前默认服务。
2. 该服务当前选定的默认模型。

必须遵守：

- CLI 和 Local Bridge 请求不得接受 `provider`、`model`、`apiKey` 或 `baseUrl`。
- Agent 不得通过其他命令修改当前默认服务或模型。
- 请求被接受时，CoreStudio 锁定本次使用的服务、模型和能力快照。
- 生成进行中用户切换服务或模型，只影响下一次调用。
- 当前模型调用失败时，不自动改用任何其他已配置模型。
- 当前模型不支持请求参数时，返回结构化错误，不静默删除参数、降低数量或换模型。
- Agent 可以读取本次实际使用的服务和模型名称，但它们只是只读结果。

### 权限关闭与进行中的任务

- 权限关闭后，新请求必须在访问服务商之前被拒绝。
- 已经被 CoreStudio 接受并向服务商发出的请求继续完成，避免用户已经产生费用却
  丢失结果。
- 权限关闭不取消、删除或隐藏已完成的生成记录。

## 设置页面

### 入口

`应用设置 → Codex 集成 → Agent 权限`

### 开关

标题：

> 允许 Codex 使用 CoreStudio 图片生成

说明：

> 开启后，Codex 可以通过 CoreStudio CLI，使用你当前在“图片集成”中选定的服务、模型和 API Key。生成会消耗对应服务商的额度。Codex 不能查看凭证、切换模型或修改图片集成配置。关闭后不影响 Codex 读取画布或向项目写入内容。Codex 自身提供较宽松的图片生成额度，通常建议保持关闭。

### 未配置状态

用户没有可用的当前服务或模型时，开关仍可保存，但页面显示：

> 尚未配置图片生成服务。开启权限后仍需前往“图片集成”配置并选定服务和模型。

页面提供“前往图片集成”入口，不自动创建配置，也不自动修改权限。

### 状态反馈

- 保存成功：开关立即反映持久化后的真实状态。
- 保存失败：恢复原状态并显示明确错误。
- Agent Bridge 关闭：显示“权限已保存，开启 Agent Bridge 后生效”，不重置开关。
- Codex 集成缺失或过期：权限可以保存，但页面同时保留原有安装或更新提示。

## Agent 能力选择规则

CoreStudio Skill 必须按以下顺序指导 Agent：

1. Agent 自身具备适合当前任务的图片生成能力时，默认优先使用自身能力。
2. 用户明确要求使用 CoreStudio 时，先读取 CoreStudio capabilities。
3. Agent 自身没有生图能力、能力不支持当前任务或调用失败时，可以检查 CoreStudio
   是否提供已授权能力。
4. 只有 `supported=true`、`authorized=true` 且 `configured=true` 时才允许调用。
5. 权限已经开启时，Agent 可以在需要时自动回退到 CoreStudio，不再逐次请求确认。
6. Agent 调用 CoreStudio 后必须告诉用户本次使用了 CoreStudio 当前配置的服务，
   会消耗对应服务商额度。
7. 权限关闭时不得重试、绕过 Local Bridge，也不得要求用户直接提供 API Key。
8. 用户要求其他模型时，提示用户先在 CoreStudio 图片集成中切换；Agent 不得代为
   切换。
9. CoreStudio 生图命令成功后已经完成项目写入，Agent 不得再次运行
   `corestudio write image`。
10. Agent 必须检查返回的结果 ID 和 `persisted`，不能把服务商返回成功等同于项目
    已经保存。

## CLI 合同

### 命令形态

第一版新增：

```sh
corestudio generate image \
  --prompt "继续细化当前工业设计方案" \
  --count 2 \
  --reference-file-ids image-file-1 \
  --reference-element-ids element-1 \
  --json
```

参数：

- `--prompt`：必填，非空文本。
- `--count`：可选，默认 1；必须符合当前模型的数量能力。
- `--reference-file-ids`：可选，引用当前项目中的图片资产。
- `--reference-element-ids`：可选，用于保存参考关系和确定画布放置位置。
- `--json`：Agent 调用必须使用。

第一版不提供：

- `--provider`
- `--model`
- `--api-key`
- `--base-url`
- 任何修改图片集成配置的参数

调用方传入上述禁止字段时返回 `BAD_REQUEST`，不得静默忽略。

### 成功响应

命令只在结果进入当前项目并完成持久化后返回成功。响应至少包含：

```json
{
  "jobId": "generation-job-id",
  "provider": "当前服务",
  "model": "当前模型",
  "generationSource": "agent",
  "images": [
    {
      "fileId": "image-file-id",
      "elementId": "image-element-id",
      "frameId": "generation-placeholder-frame-id"
    }
  ],
  "operationId": "room-operation-id",
  "roomSequence": 12,
  "persistedSequence": 12,
  "persisted": true
}
```

第一版 Agent 生图在访问服务商之前会创建画布占位框；成功后原位替换为最终图片。
`frameId` 是本次占位框 ID，`elementId` 是结果图片在画布上的真实可定位 ID。

只有 `persisted=true` 才表示任务完成。

### 连接中断

- 请求被 CoreStudio 接受并已经访问服务商后，即使 CLI 连接中断，CoreStudio 也继续
  完成生成和保存。
- 连接中断不得导致已产生费用的结果被主动丢弃。
- Agent 后续可以通过项目记录和画布读取确认是否已有结果。

## Local Bridge 合同

### 路由

新增明确命名的 Agent 路由，例如：

```text
POST /v1/agent/image-generation
```

现有废弃的 `/v1/generate` 继续保持 404，不能复活旧合同。

### 校验顺序

1. Agent Bridge 已开启。
2. 调用者具有 CoreStudio 签发的可信集成身份。
3. 当前项目存在，调用身份与项目匹配。
4. 当前集成的图片生成权限已开启。
5. 当前服务和模型已经配置。
6. 请求参数符合当前模型能力。
7. 锁定当前服务、模型和能力快照。
8. 调用 CoreStudio 现有内置生成管线。
9. 创建资产、记录和画布元素并完成项目持久化。
10. 返回结构化结果。

### Capabilities

`corestudio read capabilities --json` 增加只读信息：

```json
{
  "imageGeneration": {
    "supported": true,
    "authorized": false,
    "configured": true,
    "currentProvider": "当前服务",
    "currentModel": "当前模型",
    "capabilities": {
      "supportsReferenceImages": true,
      "supportsImageCount": true,
      "maxImageCount": 4
    }
  }
}
```

Capabilities 不得返回：

- API Key。
- 含敏感参数的 Base URL。
- 其他已配置服务和模型。
- 可用于修改配置的内部凭证。

## 生成、放置与持久化

Agent 调用必须复用 CoreStudio 已有的内置生成和项目房间管线：

1. 读取当前可信 Agent Board 参与者的选区和视口。
2. 在参考内容附近创建与内置生成一致的占位状态。
3. 使用请求开始时锁定的服务和模型调用服务商。
4. 成功后创建图片资产和图片记录。
5. 使用现有批量布局规则放入画布。
6. 通过 Project Room 提交场景 operation。
7. 等待严格持久化完成。
8. 返回结果 ID 和持久化状态。

失败占位、取消和完成状态沿用 CoreStudio 内置生成规则，不另建一套 Agent 专用生成
状态。

## 数据与来源记录

图片来源需要区分两个维度：

- `generationOrigin`：图片由哪套能力生成。
- `generationSource`：任务由谁发起。

| 场景                       | `generationOrigin` | `generationSource` |
| -------------------------- | ------------------ | ------------------ |
| CoreStudio 输入框生图      | `corestudio`       | `builtin`          |
| Codex 自身生图后写回       | `agent-board`      | `agent`            |
| Codex 调用 CoreStudio 生图 | `corestudio`       | `agent`            |

由 Agent 发起、CoreStudio 生成的记录应可以显示为：

> CoreStudio 图片生成 · 由 Codex 发起

旧记录没有 `generationSource` 时按现有兼容规则读取，不要求批量迁移历史项目。

## 状态与错误处理

| 状态                   | 预期行为                         |
| ---------------------- | -------------------------------- |
| Agent Bridge 关闭      | Agent 无法调用；权限设置值保留   |
| 图片生成权限关闭       | 在访问服务商前拒绝               |
| 没有当前服务或模型     | 提示用户前往图片集成配置         |
| 当前模型不支持参考图   | 返回能力错误，不切换模型         |
| 当前模型不支持请求数量 | 返回有效范围，不自动减少数量     |
| 服务商调用失败         | 返回脱敏错误，不尝试其他模型     |
| 生成期间用户切换模型   | 当前任务继续使用已锁定模型       |
| 生成期间用户关闭权限   | 阻止新请求，已开始任务继续完成   |
| 项目切换或关闭         | 停止向错误项目写入并返回项目错误 |
| 生成成功但持久化失败   | 返回保存失败，不报告任务完成     |

新增或复用的结构化错误至少覆盖：

- `IMAGE_GENERATION_DISABLED`
- `IMAGE_PROVIDER_NOT_CONFIGURED`
- `IMAGE_MODEL_CAPABILITY_UNSUPPORTED`
- `IMAGE_GENERATION_FAILED`
- `PROJECT_MISMATCH`
- `PERSISTENCE_FAILED`

Agent 必须根据错误码分支，不能解析本地化错误文案。服务商错误、日志和 CLI 响应
都不得包含 API Key、认证请求头或完整供应商配置。

## 设置存储与兼容

- Agent 接入设置按集成保存，例如：

  ```json
  {
    "enabled": true,
    "integrations": {
      "codex": {
        "allowImageGeneration": false
      }
    }
  }
  ```

- 旧设置没有 `integrations` 时按空映射读取，Codex 权限为 false。
- 未知集成默认没有图片生成权限。
- 图片生成权限不应存入 provider 配置，避免与输入框显示和服务配置耦合。
- 设置保存失败时保留磁盘上的上一个有效值。

## 集成与版本

本需求同时改变 CLI、Local Bridge 和 CoreStudio Skill 合同，因此实现时必须：

- 提升 `AGENT_BRIDGE_PROTOCOL_VERSION`。
- 提升 `CODEX_INTEGRATION_VERSION`；这是新增能力，使用功能版本而不是小修复版本。
- 让已安装旧集成的用户看到“需要更新集成”。
- 更新安装包中的 CLI、Skill、manifest 和集成文档。
- 保持旧版 `corestudio write image` 行为不变。
- 保持旧版 `/v1/generate` 不可用。

## 验收口径

### 设置与迁移

- [ ] 新用户的 Codex 图片生成权限默认关闭。
- [ ] 旧设置迁移后权限默认关闭，原 Agent Bridge 状态保持不变。
- [ ] 隐藏生成输入框不改变 Agent 图片生成权限。
- [ ] 关闭 Agent Bridge 不清除已经保存的图片生成权限。
- [ ] 中英文设置文案、状态和错误提示一致。

### 权限与安全

- [ ] 权限关闭时，请求在调用服务商前被拒绝。
- [ ] 未知或不可信集成身份不能使用 Codex 的授权。
- [ ] CLI、capabilities、日志和错误响应不暴露 API Key 或完整配置。
- [ ] Agent 无法通过 CLI 或 Local Bridge 修改图片集成配置。

### 当前模型约束

- [ ] CLI 不接受 provider、model 和凭证参数。
- [ ] 每次调用使用请求开始时的当前服务和模型。
- [ ] 生成过程中切换模型不影响当前任务。
- [ ] 当前模型失败后不调用其他已配置模型。
- [ ] 当前模型能力不足时返回结构化错误，不静默降级。

### 生成与项目写入

- [ ] 授权开启且当前模型可用时，CLI 可以生成图片。
- [ ] 结果自动创建图片资产、记录和画布元素。
- [ ] 多张结果使用现有批量布局规则放在参考内容附近。
- [ ] 成功响应包含可定位的 fileId、elementId、frameId 和 operationId。
- [ ] 只有 `persisted=true` 时 CLI 才返回成功。
- [ ] 记录能区分“CoreStudio 生成”和“Codex 发起”。
- [ ] CLI 连接中断不会主动丢弃已经产生费用的结果。

### Agent 行为

- [ ] Skill 默认指导 Codex 优先使用自身图片生成能力。
- [ ] Skill 只在授权和配置均可用时调用 CoreStudio。
- [ ] Skill 不允许 Agent 切换模型或索要 API Key。
- [ ] CoreStudio 生图成功后 Skill 不重复运行 `write image`。
- [ ] Skill 检查持久化状态和结果 ID 后才报告完成。

### 版本与真实验收

- [ ] CLI、Local Bridge、renderer、项目房间和设置存储定向测试通过。
- [ ] `corepack yarn test:typecheck` 通过。
- [ ] 在真实 Codex 集成设置页验收默认、开启、关闭、未配置和保存失败状态。
- [ ] 在源码开发版验证权限关闭与开启时的真实 CLI 行为。
- [ ] 在真实 CoreStudio / Agent Board 中确认结果可见、可定位且刷新后仍存在。
- [ ] 发版阶段完成集成安装更新、打包预览和 packaged smoke。

## 实现顺序

1. 先用失败测试定义设置默认值、迁移、持久化和中英文文案。
2. 定义 capabilities、CLI 参数、Bridge 路由和结构化错误合同。
3. 实现按集成授权和可信身份校验。
4. 接入现有 CoreStudio 内置生成与项目房间写入管线。
5. 持久化 `generationSource` 并更新生成记录展示。
6. 更新 Codex 集成设置页面。
7. 更新 CoreStudio Skill、CLI 合同和协作边界文档。
8. 提升 Bridge 与 Codex 集成版本。
9. 运行定向测试、类型检查和真实源码开发版验收。
10. 发版时再执行打包预览、安装流程和 packaged smoke。

## 待确认问题

暂无。第一版按本文边界实现；出现需要开放模型选择、费用控制、异步任务管理或
其他 Agent 集成的新证据时，先更新本文并取得确认。
