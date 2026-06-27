# Product

## Register

product

## Users

CoreStudio 面向在本地整理工业设计参考、标注图、提示词和生成结果的设计工作者，以及在 Codex、Cursor 等 Agent 环境里协助用户操作项目的自动化 Agent。

典型用户正在围绕一个真实项目工作：打开本地项目、整理画板素材、选择参考图、生成或写回新图片、继续在 Excalidraw 画布上编辑。用户关注的是画布和内容本身，不希望额外的产品包装、营销式页面或不熟悉的控件打断工作流。

## Product Purpose

CoreStudio 是一个基于 Excalidraw 底座的本地优先图像画板。它把项目管理、图片素材、提示词、生图记录和 Agent Bridge 组织到同一个桌面工作空间里。数据仍由本地客户端维护；Agent Board 和 CLI 只是连接到本地 bridge 的操作入口。

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
3. **同能力同外观。** 桌面客户端和 Agent 内置画板共享同一套能力配置。Agent 特有视图只能通过配置启用，不做长期分叉的专用交互。
4. **本地优先清晰可见。** Bridge、项目、token、生成方式等状态要让用户知道当前连接到哪里，但不要把安全或协议细节放大成主要界面。
5. **标准控件胜过新奇控件。** 下拉、按钮、开关、菜单、tab、侧栏都应使用熟悉结构和完整交互状态。除非有明确收益，不发明新 affordance。

## Agent Integration Principles

CoreStudio 可以通过 ACP 向外部 Agent 发起任务，但 CoreStudio 不做内置 Agent runtime，也不做多 Agent 调度平台。ACP 只负责任务发起、上下文传递和过程状态展示。

项目写回必须继续走 CoreStudio CLI / Local Bridge。ACP 返回的文本、计划、工具状态或结果描述只能作为过程信息展示，不能绕过本地数据层直接修改项目。这样可以保证桌面客户端、CLI 和 Agent Board 共享同一套项目格式和校验规则。

Agent Board 或其他 Agent 场景需要特殊体验时，先在客户端能力层做可配置支持，再由对应入口按配置启用。不要只为了 Agent Board 增加桌面客户端不能理解的专用能力。

## Accessibility & Inclusion

以 WCAG AA 作为产品 UI 的默认基线。新增控件必须有可读文字或 `aria-label`，支持键盘焦点和 Escape 关闭浮层，不能只靠颜色传达状态。动效只用于状态反馈，保持 120-250ms 的短过渡，并遵守 `prefers-reduced-motion`。中文界面优先保证字号、行高和长路径/长项目名的可读性。
