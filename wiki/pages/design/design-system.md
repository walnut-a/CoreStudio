---
title: 设计系统与交互原则
type: design
updated: 2026-07-30
source_count: 4
---

# 设计系统与交互原则

本页记录 CoreStudio 的视觉北极星、组件边界和可访问性要求。

## 视觉北极星

- `confirmed`：CoreStudio 的视觉方向是 “Excalidraw Native Workbench”。
- `confirmed`：界面应该像从 Excalidraw 底座自然生长出来，而不是覆盖一层独立产品皮肤。
- `confirmed`：画布、图片和标注是主体；项目、生成、Agent 和状态能力保持克制。
- `confirmed`：默认语言是白色 island、浅灰紫表面、细边框、短过渡、小半径和少量紫色强调。

## 复用原则

新增 UI 优先复用：

- `MainMenu`；
- `DefaultSidebar`；
- `ToolIcon`；
- `Island`；
- Excalidraw button、popover、dialog 和 token。

- `confirmed`：只有底座没有承载点时才新增组件。
- `confirmed`：Agent Board 和桌面端共用产品视觉语汇，不分叉成两套交互规则。
- `confirmed`：底部生成输入框、侧栏和状态浮层应尽量复用真实生产组件进行验证。

## 信息与交互

- 内容优先，状态和设置靠边、可关闭。
- 标准按钮、下拉、开关、菜单、tab 和侧栏优先于新奇控件。
- 紫色只用于选择、焦点、主动作和必要状态。
- 普通容器主要靠背景、边框和布局区分，浮层才使用 island shadow。
- 同一操作区按钮尺寸一致，不能依赖文案 padding 让高度漂移。
- 窄宽度优先隐藏低优先级工具，不挤压主要文字和动作。

以上为 `confirmed` 的设计约束。

## 可访问性

- `confirmed`：以 WCAG AA 为默认基线。
- `confirmed`：交互控件应有可读文字或 `aria-label`、键盘焦点、Escape 关闭和完整状态。
- `confirmed`：不能只依赖颜色传达状态。
- `confirmed`：动效用于状态反馈，通常为短过渡，并遵守 `prefers-reduced-motion`。
- `confirmed`：中文路径、项目名和提示词可截断，但不能遮挡邻近控件。

## 反例

- 独立于 Excalidraw 的新视觉系统；
- SaaS hero、装饰卡片堆叠和营销式界面；
- 玻璃拟态、紫蓝渐变、装饰光斑和过重阴影；
- 为 Agent 能力重造菜单、工具栏或侧栏；
- 只做截图观感而缺少 hover、focus、disabled、键盘和主题状态。

## 验证边界

- `confirmed`：设计文档描述目标系统，不能单独证明当前所有组件已完全符合。
- `confirmed`：视觉和交互变更必须在对应 L2、L3 或 L4 真实界面中验收。
- `observation`：单次截图只证明当时场景，不证明所有宽度、主题和交互状态。

## 主要来源

- [产品原则](../../../excalidraw/apps/image-board-desktop/PRODUCT.md)
- [设计系统](../../../excalidraw/apps/image-board-desktop/DESIGN.md)
- [仓库规则](../../../AGENTS.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
