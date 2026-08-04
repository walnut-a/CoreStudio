# Seedream API Key 接入说明

更新日期：2026-08-04

## 结论

CoreStudio 只提供一个 `火山方舟 / Seedream` 服务，通过火山方舟图片数据面调用 Seedream：

`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`

鉴权头为：

`Authorization: Bearer <API Key Secret>`

CoreStudio 不提供 Access Key（AK/SK）鉴权配置，也不再调用旧版 `visual.volcengineapi.com` 即梦任务接口。

## 支持范围

CoreStudio 当前只支持并承诺兼容在**火山方舟控制台**创建的 API Key。配置时填写创建时显示的 **API Key Secret**：

- 不需要填写 `API Key ID`；它只是控制台中的管理标识，不能放入 Authorization 头。
- 主账号密钥列表中直接创建的 API Key 暂不支持。
- IAM 用户创建的 API Key 暂不支持。

不同来源的 API Key 在数据面都表现为 Bearer Secret，客户端无法根据字符串可靠识别来源。因此这里的“暂不支持”表示产品不提供配置引导、兼容承诺和问题排查支持；服务端仍会按照方舟自身规则完成最终鉴权。

## 模型与迁移

默认模型为 `doubao-seedream-5-0-pro-260628`，内置目录包含 Seedream 5.0 Pro、5.0 Lite、5.0、4.5、4.0 和 3.0 T2I。

请求参数按模型能力收敛：Seedream 5.0 Pro 当前不接受 `sequential_image_generation`，CoreStudio 对该模型不发送此参数；支持组图控制的其他 Seedream 模型在单图模式下发送 `sequential_image_generation: "disabled"`。

迁移规则：

- 之前被错存到 `jimeng-direct` API Key 模式的凭证，在当前 Seedream 服务尚未配置时，会无损迁移到唯一的 `火山方舟 / Seedream` 入口。
- 旧的 Access Key 服务不再展示，也不会被选为生图服务。
- 迁移不会用 AK/SK 交换或创建 API Key。

## 错误提示

方舟返回 401/403 时，CoreStudio 会保留原始状态码、错误体和 request id，同时明确提示当前支持边界：

- 只填写火山方舟控制台创建的 API Key Secret；
- 无需填写 API Key ID；
- 主账号密钥列表或 IAM 用户创建的 API Key 暂不支持。

方舟返回 `ModelNotOpen` 时，CoreStudio 会明确提示先在火山方舟控制台的开通管理中开通当前模型，不再将其误报为模型 ID 不存在。

## 官方资料

- [方舟 API Key 与 IAM 关系 FAQ](https://docs.volcengine.com/docs/6257/2607681?lang=zh)
- [方舟 Base URL 与 API Key 鉴权](https://docs.volcengine.com/docs/82379/1298459?lang=zh)
- [方舟图片生成 API](https://docs.volcengine.com/docs/82379/1541523?lang=zh)
- [API Key 说明](https://docs.volcengine.com/docs/6257/64983?lang=zh)
- [方舟模型列表](https://docs.volcengine.com/docs/82379/1330310?lang=zh)
