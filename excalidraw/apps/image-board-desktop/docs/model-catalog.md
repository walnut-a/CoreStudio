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
`model-catalog.current.v1.json`。旧入口保留 revision 3；本次本地准备的新入口为
revision 6，最低客户端版本为 1.1.61。旧版客户端会拒绝这个版本，继续使用原有
缓存或内置目录。源码 1.1.61 已内置同一份 revision 6，不必先下载才能看到新模型。
本次以客户端与外置目录的本地 Git 提交交付，不推送远端，也不发布目录或客户端。

验证成功后，客户端原子写入本地缓存并立即启用。验证或下载失败时保留上一次有效缓存；缓存不存在时继续使用应用内置目录。远程文件只替换其中明确列出的服务商，其他服务仍使用内置目录。

低于当前有效版本的目录不会启用或写回缓存，避免旧远端覆盖新版内置预置。

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

## 2026-11-13：目录 revision 6 与内置清单统一

内置清单改为 `src/shared/builtinModelCatalog.json`，使用与远程目录相同的严格解析，
不再维护另一份硬编码模型表。外置仓库的 `model-catalog.current.v1.json` 与此文件
内容一致；旧 `model-catalog.v1.json` 保持不动。上文 9 月的记录是历史结果，
`zenmuxOpenAIModels.ts` 已合并到统一清单，GPT Image 2 经实时列表核实改走 OpenAI Images。

| 服务商 | 预置数 | 本轮主要更新 |
| --- | ---: | --- |
| Gemini | 9 | Nano Banana 2.1、3.1 Flash Lite Image、3.1 Flash Image / 3 Pro Image 正式版 |
| ZenMux | 34 | Nano Banana 2.1、Seedream 5 Flash、FLUX.3、HY 3.5、MiniMax H3、LLaDA、Ming Design、GPT Image 2.6；移除列表已无的 Kling v2 |
| fal.ai | 4 | `google/nano-banana-2.1` 及其 `/edit` 路由 |
| 火山方舟 / Seedream | 8 | 补齐 5 Pro，加入 5 Flash 和 5.5 |
| OpenAI | 8 | GPT Image 2.6 Flare / Sunburst |
| OpenRouter | 10 | 对齐实时图像输出模型；移除该接口列表中不存在的 GPT Image / FLUX 条目 |

合计 73 个服务商模型预置（相同模型通过不同服务接入分别计数）。保留已存在的
别名迁移，不新增免费到付费的自动迁移。即梦默认模型统一为此前客户端已有的 5 Pro，
避免旧远端清单重新覆盖成 Lite。

适配边界：

- Gemini 新模型走原生 `generateContent`；Nano Banana 2.1 最多开放 14 张参考图。
- fal Nano Banana 2.1 使用 Google 命名空间，编辑发送 `image_urls`；只发送
  1K / 2K / 4K，不沿用旧模型的 0.5K。
- Seedream 5 Flash / 5.5 最多开放 10 张参考图、单张输出，不发送不支持的组图字段。
- GPT Image 2.6 复用已有 Images 适配，支持扩展质量档位、透明背景、最多 10 张
  输出和 16 张参考图；本轮未接入新增的 SVG / GIF 等输出协议。
- 未确认的批量及参考图能力从保守上限开放；Ming Design 为文生图，未收录
  需要独立图层语义的 Design Layer 模型。fal 其他新模型需要新的参数适配，暂未加入。
- 模型能力表表示客户端当前开放范围，不等于各供应商全部能力。

核对来源（2026-11-13 实时读取）：

- [ZenMux OpenAI 列表](https://zenmux.ai/api/v1/models)、[Vertex 列表](https://zenmux.ai/api/vertex-ai/v1beta/models)、[Vertex 图片参数](https://zenmux.ai/docs/api/vertexai/generate-images.html)
- [OpenRouter 模型列表](https://openrouter.ai/api/v1/models)
- [Gemini 图片生成](https://aistudio.google.com/docs/image-generation)
- [GPT Image 2.6 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare)、[OpenAI 图片生成](https://developers.openai.com/api/docs/guides/image-generation)
- [火山方舟图片生成](https://docs.volcengine.com/docs/ark/image-generation-tutorial?lang=zh&redirect=1)
- [fal Nano Banana 2.1](https://fal.ai/models/google/nano-banana-2.1)

验证：目录加载、旧版本拒绝、新版本移除预置、失败保留缓存，以及 Gemini / fal /
Seedream 新模型请求参数均有自动化回归。全部桌面测试 27 个文件、105 项通过；
类型检查和 renderer / Electron 构建通过。未发起付费生成，不能据此确认每款模型的
服务可用性、生成质量及所有尺寸组合。

SOURCE DEV 设置页确认 ZenMux 34 个模型并可选择 GPT Image 2.6 Flare；未保存测试凭证。
