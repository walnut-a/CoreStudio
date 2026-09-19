# Product

## Register

product

## Users

CoreStudio 面向在本地整理工业设计参考、标注图、提示词和生成结果的设计工作者，以及在 Codex、Cursor 等 Agent 环境里协助用户操作项目的自动化 Agent。

典型用户正在围绕一个真实项目工作：打开本地项目、整理画板素材、选择参考图、生成或写回新图片、继续在 Excalidraw 画布上编辑。用户关注的是画布和内容本身，不希望额外的产品包装、营销式页面或不熟悉的控件打断工作流。

## Product Purpose

CoreStudio 是一个基于 Excalidraw 底座的本地优先图像画板。它把项目管理、图片素材、提示词、生图记录和 Agent 协作组织到同一个桌面工作空间里。数据仍由本地客户端维护；本地 Agent 中的画布和 CLI / Local Bridge 只是查看、读取与写回本地数据的协作入口。

成功的体验不是让 CoreStudio 看起来像一个全新的设计工具，而是让新增能力自然长在 Excalidraw 的既有画布、菜单、侧栏、按钮和浮层体系里。

## Brand Personality

克制、专业、底座一致。

语气应该像一个可靠的桌面生产力工具：清楚、直接、安静。新功能可以有明确状态和反馈，但不能因为 Agent、生图或自动化而变成另一套风格。

## Anti-references

- 不要做成独立于 Excalidraw 的新视觉系统。
- 不要使用 SaaS 官网式 hero、装饰性卡片堆叠、营销文案和大面积视觉包装。
- 不要使用玻璃拟态、紫蓝渐变、装饰光斑、过重阴影或“AI 工具感”的炫技界面。
- 不要重造 Excalidraw 已经提供的菜单、工具栏、侧栏、按钮语汇。
- 不要让 Agent Board 和桌面客户端分叉成两套交互规则。

## Design Principles

1. **底座优先。** 新组件先寻找 Excalidraw 已有的 MainMenu、DefaultSidebar、ToolIcon、Island、按钮和浮层模式；只有底座没有承载点时才新增组件。
2. **内容优先。** 画布、图片和标注是主角。状态、设置、Agent 入口都应该轻量、靠边、可关闭，不抢画布注意力。
3. **同数据层，入口边界清楚。** 桌面客户端和 Agent 内置画板共享同一套项目数据与画布体验，但任务入口由所在环境决定，不在 Codex 画布里复制 CoreStudio 的生成调度器。
4. **本地优先清晰可见。** Bridge、项目、token、生成方式等状态要让用户知道当前连接到哪里，但不要把安全或协议细节放大成主要界面。
5. **标准控件胜过新奇控件。** 下拉、按钮、开关、菜单、tab、侧栏都应使用熟悉结构和完整交互状态。除非有明确收益，不发明新 affordance。

## Open Project Data Principles

项目文件夹内的原图是素材存在与内容的事实来源。CoreStudio 负责核对和维护数据关系；索引、整理结果、原生场景及其他附加信息都可能被外部修改或丢失。局部异常不得带崩应用或阻断整个项目的维护，能读取的有效内容继续可用，无法安全写回的部分单独暂停，不能用降级结果覆盖原件。

整理结果随项目保存、公开可读且不加密。原生 Excalidraw 场景继续完整保存，由 CoreStudio 项目适配桥接纳外部整理结果；不另建排布历史系统。图片可以帮助重建基础记录，但不能凭空恢复手动坐标、标注或生成信息。

这些是已确认的演进原则，不表示当前版本支持任意文件的完整双向同步。完整合同、现状差距与验收要求见[开放项目数据协议](../../../docs/doc/corestudio-open-project-contract.md)。

## Agent Integration Principles

**任务发起位置决定调度者。** 在 CoreStudio 发起的直接生成由 CoreStudio 调度，并使用 CoreStudio 已配置的模型 API；在 Codex 发起的任务由 Codex 调度，默认使用 Codex 自身的生图能力。Codex 通过 CLI / Local Bridge 读取和写回 CoreStudio 数据，内置画布只承担查看、选择、标注和结果确认。

CoreStudio 不内置 Agent runtime，也不承担多 Agent 调度。应用内输入框只负责单次生成；需要分析、连续迭代或并行工作的任务从 Codex 发起，由 Codex 调度。

Agent 的正式项目操作默认经过 CoreStudio CLI / Local Bridge，使桌面客户端、CLI 和 Agent Board 共享同一套项目格式、事务和校验规则。用户通过文件管理器新增图片，以及后续通过公开整理文件修改排布，是独立的产品入口，由同一项目数据层核对接纳；这不构成 Agent 绕过授权直接改写内部事务文件的许可。

## Accessibility & Inclusion

以 WCAG AA 作为产品 UI 的默认基线。新增控件必须有可读文字或 `aria-label`，支持键盘焦点和 Escape 关闭浮层，不能只靠颜色传达状态。动效只用于状态反馈，保持 120-250ms 的短过渡，并遵守 `prefers-reduced-motion`。中文界面优先保证字号、行高和长路径/长项目名的可读性。
