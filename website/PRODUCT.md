# CoreStudio Website Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- 在本地整理工业设计参考、提示词、批注和生成结果的设计工作者。
- 已经使用 Codex 等 Agent，希望 Agent 能读取当前画布上下文并把结果写回项目的用户。
- 希望自由选择模型、服务商，并保有项目数据与工具可定制性的个人或团队。

## Product Purpose

CoreStudio 是一款基于 Excalidraw 的本地优先图片生成画布。官网需要让首次访问者迅速理解产品如何把画布、素材、图片生成和 Agent 协作放进同一个本地项目，并完成 macOS 版本下载。

## Positioning

CoreStudio 不重新发明画布或模型能力，而是在成熟的 Excalidraw 画布上连接本地项目、自选图片生成模型和 Agent 协作流程。画布及项目素材由本地客户端管理；在线模型是否本地推理不属于这一承诺。

## Operating Context

用户会在一个持续积累的画布中摆放参考图片、文字、图形和连线，通过自选模型或 Agent 生成图片，再继续整理、比较、批注和备份结果。

## Capabilities and Constraints

- 基于 Excalidraw，保留图形、文字、连线和自由布局能力。
- 项目、画布、参考素材和生成结果由本地客户端维护。
- 用户可以配置自己的服务商、API Key 与模型。
- Codex 等 Agent 可以通过 CLI / Local Bridge 使用当前画布与选区，并把结果写回项目。
- CoreStudio 本身免费、开源、可定制；第三方模型和 Agent 的费用与额度按各自规则计算。
- 官网主行动是下载 macOS 版本，下载地址始终指向 GitHub Latest Release。
- 官网为静态 HTML、CSS 和 JavaScript，并同时提供英文根路径与 `/zh/` 中文路径。

## Brand Commitments

- 产品名称固定为 CoreStudio。
- 应用图标以 `excalidraw/apps/image-board-desktop/build/icon.png` 为唯一原始素材，不重新绘制。
- 语气直接、具体、少形容词，不把通用生图能力包装成独家能力。
- 真实产品界面与工作过程优先于装饰和营销话术。

## Evidence on Hand

- 应用图标及官网衍生资源：`website/assets/corestudio-icon-*`。
- 真实产品截图：`website/assets/corestudio-product.jpeg` 及响应式 WebP。
- GitHub 仓库、Latest Release 与 MIT License 链接均可作为真实行动与开源证据。
- 当前没有客户案例、使用数据、性能基准或商业背书，官网不得自行虚构。

## Product Principles

- 让产品操作本身解释产品，而不是依赖长篇介绍。
- 本地项目是叙事起点，模型与 Agent 是两条可选生成路径。
- 下载动作始终清晰，不被实验性交互隐藏。
- 模拟演示必须忠于当前产品能力，并明确保持轻量，不伪装成完整网页版应用。

## Accessibility & Inclusion

核心信息、下载动作和语言入口必须在没有动画或精细指针操作时仍然可用；键盘焦点、减弱动态模式、颜色对比和移动端触控目标遵循 WCAG AA 基线。
