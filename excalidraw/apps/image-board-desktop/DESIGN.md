---
name: CoreStudio
description: 基于 Excalidraw 的本地优先工业设计图像画板
colors:
  primary: "#6965db"
  primary-hover: "#5753d0"
  primary-darkest: "#4a47b1"
  ink: "#1b1b1f"
  island: "#ffffff"
  app-bg: "#f6f6f9"
  surface-high: "#f1f0ff"
  surface-low: "#ececf4"
  surface-primary-container: "#e0dfff"
  border-default: "#f1f0ff"
  border-outline: "#c5c5d0"
  gray-60: "#7a7a7a"
  gray-70: "#5c5c5c"
  danger-bg: "#fff0f0"
  danger: "#700000"
  warning-bg: "#fceeca"
typography:
  body:
    fontFamily: "\"Assistant\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: "\"Assistant\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  label:
    fontFamily: "\"Assistant\", \"Noto Sans SC\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-default:
    backgroundColor: "{colors.island}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.875rem"
    height: "2.5rem"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.island}"
    rounded: "{rounded.lg}"
    padding: "0.625rem 0.875rem"
    height: "2.5rem"
  footer-icon-button:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "2.5rem"
    height: "2.5rem"
  compact-menu-trigger:
    backgroundColor: "{colors.island}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
---

# Design System: CoreStudio

## 1. Overview

**Creative North Star: "Excalidraw Native Workbench"**

CoreStudio 的界面应该像 Excalidraw 底座自然生长出来的桌面工作台，而不是覆盖在画布上方的新产品皮肤。画布、图片和标注始终是主体；新增的项目管理、生图、Agent Bridge、输入框和状态浮层都应保持克制，使用 Excalidraw 已有的按钮、菜单、侧栏和岛状浮层语汇。

视觉系统是产品型、任务型、低装饰的。浅色画布、白色 island、细边框、短过渡和小半径构成默认语言；紫色主色只用于当前选择、主动作、焦点和必要状态，不做大面积品牌铺色。

**Key Characteristics:**

- 继承 Excalidraw，而不是重做一套 UI。
- 画布优先，控制项靠边、轻量、可关闭。
- 桌面客户端和 Agent Board 共用同一套视觉语汇。
- 状态明确，但不要把 bridge/token/agent 细节包装成主界面。
- 产品控件保持熟悉：按钮、下拉、tab、switch、popover、sidebar 都必须有完整交互状态。

## 2. Colors

CoreStudio 使用 Excalidraw 风格的 restrained palette：白色 island、浅灰紫表面、深色文字和少量紫色强调。

### Primary

- **Excalidraw Purple** (`primary`): 用于主按钮、选中态、焦点 ring、当前模式和少量状态强调。它的占比应很低，不能铺满面板。
- **Pressed Purple** (`primary-hover`, `primary-darkest`): 只用于 hover / active，不创建新的品牌色阶。

### Neutral

- **Canvas White** (`island`): 浮层、菜单、输入框、popover 的默认背景。
- **Soft Board Gray** (`app-bg`, `surface-low`, `surface-high`): 欢迎页、按钮 hover、底部控制区域和低层级状态背景。
- **Ink Black** (`ink`): 主文字、图标和可操作标签。不要用更浅灰色承载主要操作文字。
- **Outline Lavender** (`border-default`, `border-outline`): 默认边框和分割线。边框要细、轻，优先服务结构而不是装饰。
- **Muted Gray** (`gray-60`, `gray-70`): 说明文字、路径、次级标签。仅用于辅助内容。

### Semantic

- **Quiet Danger** (`danger-bg`, `danger`): 本地错误、bridge 失败、不可恢复操作。错误提示应独立成 toast 或面板，不要插进 Excalidraw 原生工具栏层。
- **Quiet Warning** (`warning-bg`): 警告和配置缺失。背景可轻微着色，但文字仍要保持高对比。

### Named Rules

**The Base Palette Rule.** 新组件必须先使用 `--island-bg-color`、`--text-primary-color`、`--default-border-color`、`--shadow-island`、`--color-primary` 这些既有 token；除非是新语义状态，不新增颜色。

**The Low Accent Rule.** 紫色只用于选择、焦点、主动作和状态，不用于装饰性标题、渐变背景或大面积面板。

## 3. Typography

**Display Font:** 不使用独立 display 字体。  
**Body Font:** `"Assistant", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`。  
**Label/Mono Font:** 默认沿用 body 字体；没有单独 mono 体系。

**Character:** 字体系统服务产品密度和中文可读性。标题不做品牌化夸张，正文和标签保持清楚、稳定、工具感。

### Hierarchy

- **Headline** (700, 24px, 1.2): 欢迎页标题、对话框大标题。不要在紧凑面板里使用 hero 级文字。
- **Title** (700, 1rem, 1.25-1.3): inspector 小节标题、popover 主状态、面板标题。
- **Body** (400, 0.875-0.9375rem, 1.45-1.6): 说明文字、路径、提示词、列表内容。
- **Label** (600-700, 0.75rem, 1.2): eyebrow、小标签、badge、菜单辅助文字。
- **Caption** (400-650, 0.75rem, 1.25-1.35): 次级状态、路径、时间、计数。

### Named Rules

**The Product Type Rule.** 不使用流体字号、display 字体或大标题营销感。控件内文字必须跟容器尺寸匹配。

**The Chinese Readability Rule.** 中文路径、项目名、提示词和图像 ID 允许截断，但不能挤压按钮或遮挡邻近控件。

## 4. Elevation

CoreStudio 使用 Excalidraw 的 island shadow 作为唯一常规浮层深度。默认界面靠白色表面、浅边框和布局层级区分；阴影只用于 floating panel、popover、dialog、菜单和欢迎卡片。

### Shadow Vocabulary

- **Island Shadow** (`--shadow-island`): 工具栏、popover、菜单、欢迎卡片和底部输入框。它是默认浮层阴影。
- **Modal Shadow** (`--modal-shadow`): 仅用于真正阻塞式 dialog。
- **Focus Ring** (`2px solid color-mix(in srgb, var(--color-primary) 24%, transparent)`): 用于键盘焦点和输入框 focus-within，不用阴影冒充焦点。

### Named Rules

**The One Elevation Rule.** 除 dialog 外，新浮层使用 `--shadow-island`。不要发明更重、更软、更玻璃的阴影。

**The Layer Contract Rule.** 下拉、popover、side dock、floating panel、toast 必须进入既有 z-index 语义，不使用 `999` 或 `9999`。

## 5. Components

### Buttons

- **Shape:** 小半径桌面按钮，默认 `--border-radius-lg` (0.5rem)。只有 badge、switch knob、状态点允许 pill。
- **Default:** 白色 island 背景、细边框、深色文字，hover 进入 `--color-surface-high`。
- **Primary:** `--color-primary` 背景、白色文字，hover / active 使用已有 primary hover / darkest。
- **Icon buttons:** 尺寸必须跟 Excalidraw footer/help 按钮一致；右下角固定按钮使用 2.5rem 盒子和 1.25rem 图标。

### Chips

- **Style:** 图片引用、选区元素和状态 badge 都使用小尺寸 chip。chip 可以有缩略图、序号和短标签，但不要直接暴露长 ID。
- **State:** 选中态可以轻微使用 primary tint；禁用态降低透明度和使用 muted text，不使用大面积灰底。

### Cards / Containers

- **Corner Style:** 常规容器 `--border-radius-lg`，紧凑控件 `--border-radius-md`。不要超过 16px，除非是 Excalidraw 原生组件已有样式。
- **Background:** 默认 `--island-bg-color`，辅助层使用 `--color-surface-mid` 或 `color-mix`。
- **Shadow Strategy:** 浮层用 `--shadow-island`；普通列表项优先用边框和背景，不加阴影。
- **Internal Padding:** 紧凑控件 4-8px，popover/卡片 10-16px，大欢迎卡片可以到 24-28px。

### Inputs / Fields

- **Style:** 输入框尽量像画布底部 composer：白色 island、无重边框、轻阴影、内部控件贴底部控制行。
- **Focus:** 使用 primary focus ring，不改变布局尺寸。
- **Modes:** 输入模式切换是顶层 tab；生成方式是输入区的子参数，使用轻量下拉，不和输入模式同级。

### Navigation

- **Main Menu:** 项目切换、最近项目、复制 Agent Board 链接都进入 Excalidraw 原生 `MainMenu`。不要新增左上角项目按钮。
- **Sidebars:** 右侧详情和左侧信息使用 Excalidraw `DefaultSidebar` / dock 语汇。新面板优先接入既有侧栏，而不是浮在画布中央。
- **Agent Dock:** 右下角状态按钮必须和帮助按钮同尺寸、同 hover、同层级。popover 可以覆盖输入框，不需要避让。

### Agent Board

Agent Board 是同一产品的浏览器入口，不是另一个 app。默认可以启用 Agent 操作模式、项目切换和 bridge 状态，但视觉上仍沿用桌面画板的按钮、菜单、floating composer 和 canvas 控件。

## 6. Do's and Don'ts

### Do:

- **Do** 优先复用 Excalidraw 原生 `MainMenu`、`DefaultSidebar`、`ToolIcon`、`Island`、`excalidraw-button` 和现有 icon style。
- **Do** 使用 `App.css` 顶部 token；新增 token 必须是语义缺口，不是为了局部好看。
- **Do** 让 Agent 能力通过配置启用，在桌面端和 Agent Board 共用组件。
- **Do** 保持底部 composer 紧凑：顶部只放输入模式，下方控制行放提示词库、设置、生成方式和发送。
- **Do** 为所有新增交互补齐 hover、focus-visible、active、disabled、Escape 关闭和 aria label。
- **Do** 在宽度不足时隐藏低优先级工具，而不是挤压文字或制造特殊浮动按钮。

### Don't:

- **Don't** 做成独立于 Excalidraw 的新视觉系统。
- **Don't** 使用 SaaS 官网式 hero、装饰性卡片堆叠、营销文案和大面积视觉包装。
- **Don't** 使用玻璃拟态、紫蓝渐变、装饰光斑、过重阴影或“AI 工具感”的炫技界面。
- **Don't** 重造 Excalidraw 已经提供的菜单、工具栏、侧栏、按钮语汇。
- **Don't** 让 Agent Board 和桌面客户端分叉成两套交互规则。
- **Don't** 使用原生下拉的不可控展开态来承载关键 UI；如果展开态需要和底座一致，使用自绘 listbox/popover。
- **Don't** 把图片 ID、bridge token、长路径等技术细节直接铺在主要画布界面上；需要时放在详情或 CLI 输出里。
