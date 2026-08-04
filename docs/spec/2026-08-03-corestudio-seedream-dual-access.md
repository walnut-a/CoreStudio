# CoreStudio Seedream 双通道接入需求整理

> 所属项目：CoreStudio

## 需求背景

CoreStudio 当前把火山方舟的 Seedream 模型接口显示为「即梦 / Seedream」，但运行时固定调用火山方舟 `images/generations`，只接受方舟专用 API Key。火山引擎「即梦 AI」产品的数据面接口属于另一套异步任务协议，并同时接受 API Key Bearer 与 Access Key 签名鉴权；把这两类凭证保存到现有方舟入口后会被拒绝为 401。

本需求需要把两套官方接入方式作为两个独立服务展示和运行，避免继续把同一模型家族误解成同一种 Key。

## 当前理解

- 目标用户：已经在火山方舟或即梦 AI 中开通图片生成能力的 CoreStudio 用户。
- 使用场景：在应用设置中按凭证来源添加服务，并在画布输入框中选择对应服务和模型生成图片。
- 需求目标：方舟专用 API Key，以及即梦 API 的 API Key、AK/SK，都能按各自协议使用，互不覆盖、互不误判。

## 第一版范围

### 包含

- 将现有 `jimeng` 服务显示名调整为「火山方舟 / Seedream」，继续使用方舟 API Key、方舟模型 ID 和现有同步图片生成协议。
- 新增独立服务 `jimeng-direct`，显示名为「即梦 API」，在同一服务内支持两种鉴权方式：API Key Bearer 与 Access Key（AK/SK）签名。
- API Key 模式填写控制台生成的 API Key Secret，并以 Bearer token 请求；API Key ID 只用于控制台识别和管理。
- Access Key 模式配置 Access Key ID（AK）与 Secret Access Key（SK），使用 `visual.volcengineapi.com`、`cn-north-1`、`cv` 的 HMAC-SHA256 OpenAPI 签名。
- 第一版内置即梦图片生成 4.0，通过提交任务和轮询结果完成单图生成；保留自定义 `req_key` 的扩展能力。
- 第一版即梦直连仅开放文生图。官方 4.0 的参考图输入字段要求公网 `image_urls`，CoreStudio 当前只持有本地图片数据，因此在没有明确上传链路前不把本地参考图伪装成兼容输入。
- API Key、AK 与 SK 只保存在 Electron 主进程设置文件中，公开配置只暴露“是否已配置”，不把凭证明文传入渲染层。
- 旧 `jimeng` 配置继续解释为火山方舟配置，不自动迁移到即梦 API，也不覆盖用户现有 Key。
- 错误信息明确区分方舟 API Key 无效、即梦 AK/SK 缺失、签名失败、权限未开通、任务超时和生成失败。

### 不包含

- 不在本轮接入即梦视频生成、数字人或其他视觉 OpenAPI。
- 不在本轮为即梦直连增加参考图公网托管；选择本地参考图时按“不支持参考图”处理。
- 不猜测或拆分用户已经误填在旧 `jimeng.apiKey` 中的任意组合凭证。
- 不承诺方舟与即梦 AI 的套餐、配额或模型目录互通。
- 不在 renderer 中实现签名，也不在日志中记录 AK、SK 或 Authorization。

## 关键规则

- 即梦 API 默认选择 API Key 模式；API Key Secret 存在即视为已配置。切换到 Access Key 模式后，只有 AK 与 SK 同时存在才视为已配置。
- 两种鉴权的凭证分别保存，切换模式不会覆盖另一种凭证；编辑已配置模式时凭证字段可留空以保留原值。
- 保存新凭证时去除首尾空白，避免复制换行造成不可见的鉴权失败。
- 即梦 API 的模型 ID 表示官方 `req_key`；内置 4.0 使用 `t2i_v40_jimeng`。
- 生成请求固定强制单图，保持与 CoreStudio 当前单次图片生成结果语义一致。
- 轮询必须响应取消信号，并设定有限超时；终止或超时后不得继续后台请求。
- 请求日志可以记录 endpoint、模型、尺寸、任务状态和脱敏载荷，但不能记录签名头或任何凭证。

## 验收口径

- [x] 设置服务列表同时出现「火山方舟 / Seedream」和「即梦 API」。
- [x] 方舟服务只显示一个方舟 API Key；即梦服务可在 API Key Bearer 与 AK/SK 签名之间切换。
- [x] 旧 `jimeng` 配置升级后仍然可见且默认模型不变。
- [x] 即梦 API Key 模式缺少 API Key Secret 时不能保存；Access Key 模式缺少 AK 或 SK 时不能保存。
- [x] 公开配置与 renderer 状态中不含 API Key、AK、SK 或 Authorization。
- [x] 即梦请求签名、任务提交、轮询中间态、结果下载、业务错误、超时与取消均有定向测试。
- [x] 相关单测、类型检查和设置页真实界面验收通过。

## 事实来源

- 火山方舟图片生成接口：`https://ark.cn-beijing.volces.com/api/v3/images/generations`
- 即梦图片生成 4.0 接口：`https://www.volcengine.com/docs/85621/1863351`
- 火山引擎 OpenAPI 签名规则：`https://www.volcengine.com/docs/6454/70435`
- 用户提供的火山引擎访问控制「密钥列表」截图（2026-08-03）：确认 Access Key 与 API Key 并存，且 API Key 通过 Bearer token 请求。

## 待确认问题

- 即梦图片生成 4.6 的公开参数与 `req_key` 在当前官方页面中未完整暴露给静态文档抓取，暂不作为内置模型；后续取得可核验的完整契约后再加入目录。
- 用户截图未展示 API Key 请求示例。当前按控制台的凭证语义，将 API Key Secret 作为 Bearer token，API Key ID 仅用于管理；发布前应以官方 curl 示例或一次非计费鉴权请求确认该字段映射。
