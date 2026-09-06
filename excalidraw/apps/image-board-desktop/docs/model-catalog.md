# 远程模型预置目录

## 目标

CoreStudio 可以从公开 GitHub 仓库手动更新模型 ID、显示名称、能力参数和旧模型迁移关系，不必因为上游仅调整模型目录而重新发布客户端。

公开目录仓库： <https://github.com/walnut-a/CoreStudio-Model-Catalog>

## 边界

- 客户端只接受已经编译支持的服务商和请求适配器。
- 远程文件不能定义 API 地址、鉴权信息、脚本或请求实现。
- 新请求协议仍需发布客户端版本。
- 客户端不在启动时请求网络，只在设置页点击“检查更新”时下载。

## 数据与回退

远程文件使用 `schemaVersion: 1`。客户端检查字段白名单、最低客户端版本、模型唯一性、默认模型、能力数值范围、服务商与适配器组合，以及迁移目标是否存在。

1.1.48 及以前继续读取 `model-catalog.v1.json`；包含新接口的 1.1.49 源码开始读取
`model-catalog.current.v1.json`。旧入口保留 revision 3，新入口为 revision 4，
最低客户端版本为 1.1.49。两个入口沿用相同的数据校验和缓存流程，不增加
自动网络请求。已经缓存旧目录的用户，升级后需在设置里检查一次目录更新。

验证成功后，客户端原子写入本地缓存并立即启用。验证或下载失败时保留上一次有效缓存；缓存不存在时继续使用应用内置目录。远程文件只替换其中明确列出的服务商，其他服务仍使用内置目录。

`modelAliases` 用于迁移本机已保存的默认模型。迁移只修改匹配的模型 ID，不改 API Key、自定义模型或服务地址。

## 更新入口

“应用设置 → 图片集成 → 模型目录 → 检查更新”。

## ZenMux Muse / Grok 接口适配（2026-09-06）

- 在 CoreStudio 外层增加 `zenmux-openai-images` 接口类型；没有修改 Excalidraw
  基座、项目数据结构或上游依赖。模型元数据放在独立的 `zenmuxOpenAIModels.ts`。
- Muse Image 1.0 与 Grok Imagine Image 2.0 走固定的
  `https://zenmux.ai/api/v1/images/generations` 和 `/images/edits`，继续使用 ZenMux Key。
- 复用现有 OpenAI 图片请求实现：文本生成使用 JSON，参考图编辑使用 multipart；
  复用提示词引用处理、base64 / URL 结果解析、日志及取消信号。
- 新模型先开放单张生成、单张参考图编辑及现有的三种比例预置，不启用种子、
  负面提示词、批量或 GPT 专用的 `output_format`、quality 等参数。
- 返回记录的服务商保持 ZenMux；下载结果图片时不携带 ZenMux API Key。
- Gemini 与 GPT Image 的现有 ZenMux Vertex 路由不变；其他 OpenAI 服务的
  `output_format: png` 默认行为不变。

依据：[生成接口](https://zenmux.ai/docs/api/openai/generate-an-image.html)、
[编辑接口](https://zenmux.ai/docs/api/openai/create-image-edit.html)、
[Muse 模型](https://zenmux.ai/meta/muse-image-1.0)、
[Grok 模型](https://zenmux.ai/x-ai/grok-imagine-image-2.0)。

验证：先添加失败测试，再实现适配。50 项定向测试通过，覆盖两款模型的请求
路由、输出数量约束、编辑上传、链接结果下载、空结果、取消、目录版本边界和现有服务回归。
按锁文件安装依赖后，50 项定向测试及 `test:typecheck` 均通过。
SOURCE DEV（1.1.49）已实机验证新目录下载显示“已更新”，ZenMux 下拉列表为
22 个模型，包含 Muse 和 Grok；已选择 Muse 并保存界面截图。外部目录提交为
`0391e6d`，旧入口文件保持不变。
未发起付费请求，因此不把协议与界面验证当成实际模型生图质量验收。
