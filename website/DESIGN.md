---
name: CoreStudio Website
description: A local-first image-generation canvas arranged as an industrial-design editorial desk.
colors:
  ink: "#1b1b1f"
  primary: "#6965db"
  primary-hover: "#5753d0"
  muted: "#5c5c5c"
  quiet: "#7a7a7a"
  paper: "#f6f6f9"
  surface: "#ffffff"
  surface-high: "#f1f0ff"
  surface-low: "#ececf4"
  line: "#f1f0ff"
  success: "#2d9b59"
  material-paper: "#eeede9"
  material-warm: "#f4f0e9"
  generation-pending-stroke: "#6d5efc"
  generation-pending-fill: "#f4f2ff"
typography:
  display:
    fontFamily: '"Smiley Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: "4rem"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  display-latin:
    fontFamily: '"Assistant", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  body:
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.5
  interface:
    fontFamily: '"Assistant", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
  canvas:
    fontFamily: '"Excalifont", "Xiaolai", sans-serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  handle: "2px"
  compact: "0.375rem"
  control: "0.5rem"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.interface}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  floating-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  image-result:
    backgroundColor: "{colors.surface}"
    rounded: "0"
---

# Design System: CoreStudio Website

## Overview

**Creative North Star: "The Industrial Design Editorial Desk"**

CoreStudio 的官网不是套着产品截图的营销页面，而是一张已经打开的本地设计画布。视觉语言来自工业设计编辑部的工作桌：冷白点阵纸面、压缩而有个性的标题、真实参考素材拼贴、大幅产品裁切和细节检查带。页面必须先像一件设计作品，再自然暴露它可以平移、缩放、生成与写回。

产品界面与编辑内容承担不同角色。倍率、输入框、选区和生成占位严格沿用 CoreStudio / Excalidraw 的真实几何与状态；标题、图片比例和空间编排则形成网站自己的编辑感。紫色只表示真实交互状态，艺术感主要由排版、留白、裁切和实体材料图像产生。

**Key Characteristics:**

- 一张 1680 × 960 的连续编辑画布，不拆成常规网页区块。
- 左侧 560 × 336 的双排参考组与右侧 560 × 373 的 3:2 生成舞台并列，输入与输出拥有相同列宽；初始、生成中与最终结果只在同一框内切换，结果按原图比例完整缩放。
- 工具与网站导航退到视口边缘，让内容像正在被编辑，而不是被包装。
- 只有一次明确的参考到结果关系箭头；不使用伪流程线、装饰图形或技术测量。
- 下载始终是唯一主行动，生成演示只在用户提交后发生。

## Colors

基础色保持 CoreStudio 的冷白、近黑与灰紫体系；暖白和铝灰来自产品图像，不由页面渐变伪造。

### Primary

- **CoreStudio Violet:** 仅用于下载按钮、选中工具、选区、焦点和生成状态。
- **Writeback Green:** 只标识真实的完成或写回状态，不承担装饰作用。

### Neutral

- **Cool Canvas Paper:** 点阵画布与网页背景，保持接近编辑软件的低对比冷白。
- **Clean Surface:** 倍率、输入框等浮动界面岛。
- **Editorial Ink:** 标题、重要说明和高优先级界面文字。
- **Working Gray:** 辅助文案、被动控件和非当前状态。
- **Warm Material Paper:** 只作为真实素材或生成结果的底色语境，不扩散成装饰卡片。

### Named Rules

**The State Color Rule.** 紫色只属于真实的选中、焦点、提交和生成状态；静态内容不借它制造品牌装饰。

**The Material Carries Color Rule.** 网站的暖度和色彩来自 Dieter Rams 素材与生成结果，背景和容器保持克制。

## Typography

**Display Font:** Smiley Sans，中文首页使用本地托管的倾斜字形。

**Body Font:** 以 PingFang SC 为首的系统 CJK 无衬线栈。

**Label/Interface Font:** Assistant 配合 CJK 系统字体；画布标注使用 Excalifont / Xiaolai。

**Character:** 中文标题要像一本工业设计刊物的封面标题：窄、重心前倾、字面占满，但不靠额外描边或阴影制造戏剧性。正文和控件保持软件界面的清晰与中性，让显示字体只出现一次。

### Hierarchy

- **Display**（400，4rem，1.06 行高）：中文 Slogan；保留封面张力，同时让两行字面拥有明确呼吸。
- **Display Latin**（700，3rem，0.98 行高）：英文 Slogan，保持 Assistant 的紧凑几何感，但不与生成舞台争夺主视觉。
- **Body**（400，1.05rem，1.5 行高）：标题下唯一一段产品解释。
- **Interface**（600，0.8125rem）：导航、工具、状态和元信息。
- **Canvas**（400，20px）：画布内真实标注，尺寸随场景缩放。

### Named Rules

**The One Display Voice Rule.** 每个视口只允许一个显示字体主命题；其余信息回到产品字体或画布字体。

**The Unselected Opening Rule.** 首页首次出现时不默认选中标题；选区只响应用户点击或生成后的真实对象状态。

**The Cover Contrast Rule.** 首屏只允许标题场使用大面积近黑底与白字，形成明确封面焦点；其他画布对象保持原生白底与材料色。

## Layout

桌面场景是一张固定的 1680 × 960 编辑平面。左侧 560 × 336 的四图参考组与右侧 560 × 373 的生成舞台垂直对齐，形成清楚的输入—输出双列关系；参考图以两行不等宽拼贴呈现，不再压成单行缩略带。两列之间保留 184px 场景通道，以一枚约 171px、连续缓升的 Excalidraw 原生双线箭头连接，让关系在响应式缩放后仍然舒展。生成舞台沿用素材原始 3:2 比例，以 `contain` 完整显示，不做额外放大裁切。Slogan 与基于 Excalidraw、本地项目、模型自由、Agent 协作的说明共同收进左下近黑标题场，右下依次放置本地项目、模型自由、Agent 协作三个利益点；这些产品事实从首次进入就可见，不再依赖生成完成后披露。固定于视口的品牌、下载、倍率和 composer 构成真实应用外壳。

镜头以当前视口的安全区计算构图倍率。90% 是常规桌面镜头的上限参考，不再作为所有桌面窗口的固定下限；普通桌面与 471–820px 紧凑窗口优先完整展示标题、参考带和主结果，超宽或高分辨率屏幕再提高倍率并向上收紧空白。初始、生成中与完成态始终沿用同一响应式镜头，不因状态变化自动放大结果；470px 以下按实际内容边界完整适配参考带、标题和生成舞台，不再用固定 40% 镜头裁掉结果。画布继续支持单指平移、双指以手势中心缩放和点击选中。最小倍率以完整场景适配视口为准，并受生产级缩放下限约束。

界面内部使用 4、8、12、16、20px 节奏；主画布点阵每 22px 重复。

## Elevation & Depth

画布内容默认扁平，物理深度来自照片中的真实材料与光线。只有视口级应用控件使用产品的 island shadow；大图、标题、注释和细节带不获得营销卡片式悬浮阴影。

### Shadow Vocabulary

- **Island Shadow**（`0 0 1px rgba(0,0,0,.17), 0 0 3px rgba(0,0,0,.08), 0 7px 14px rgba(0,0,0,.05)`）：composer 与紧凑移动端控制。
- **Selection Edge:** 一像素 Excalidraw 选框、四个视觉恒定的 8px 控点和旋转手柄。

### Named Rules

**The Flat Canvas Rule.** 阴影用于浮动应用控件，不用于把内容包装成网页卡片。

## Shapes

应用控件沿用产品的 6px 紧凑圆角与 8px 常规圆角。选择几何更锐利：细紫线、2px 控点圆角和方形角手柄。图片本身保持直角并通过容器裁切；箭头必须由仓库内 Excalidraw 原生箭头元素导出，保留导出器生成的 Rough.js 开放笔触与箭头几何，不再手写近似路径。不得增加与内容无关的圆、线框、波浪或假测量标记。

## Components

### Buttons

- **Primary:** CoreStudio violet、白色界面文字、8px 圆角、40px 高度；只用于下载等唯一主行动。
- **Hover / Focus:** hover 使用生产 primary-hover；键盘焦点使用 2px 混合紫色环。
- **Composer Action:** 28px 图标按钮，使用真实发送图标、轻紫底与生产禁用状态。

### Canvas Objects

- **Text:** 普通 Excalidraw 文本对象，不加圆点、标题胶囊或网页标签。
- **Images:** 真实图片元素；选中后只叠加生产选框，不在图片内部增加状态徽章。
- **Reference Sheet:** 四张授权参考图以两行不等宽拼贴排列，不加卡片底与单张阴影；首次进入时用每张图片的独立细选框和一组共用控制点表达真实多选。
- **Generated Result:** 结果图只出现一次，使用素材原始 3:2 比例完整缩放；图片与生成占位位于独立裁切层，选中框位于其外侧并始终完整显示，不增加裁切细节副本。

### Inputs / Fields

- **Style:** 一个白色浮动 composer 包含无边框 prompt 与 28px 发送动作，不添加无功能的设置或模型控件。
- **Focus:** composer 获得柔和的两像素紫色 halo，同时保留可访问的元素焦点。
- **Disabled:** 生成期间只禁用发送动作，live region 报告进度和完成。

### Navigation

品牌位于顶部左侧，语言和下载位于右侧；移动端保留品牌、语言、下载、倍率与 composer，不增加第二层标签导航。所有图标取自软件现有图标体系，不自行绘制替代符号。

### Generation Status

提交后先用 260ms 确认四张参考图的多选输入，再由真实生产占位符接管结果区：Excalidraw 矩形、紫色虚线、浅紫填充和居中画布字体。完成时以一次 520ms 裁切揭示恢复图片并选中结果；参考拼贴和细节带只降低透明度表达上下文。整个流程只由用户提交触发，减弱动态模式直接显示稳定结果。

## Do's and Don'ts

### Do:

- **Do** 用排版、裁切、留白和真实材料图像建立艺术感。
- **Do** 让所有可交互组件继承软件中的图标、尺寸、状态和无障碍行为。
- **Do** 保持下载动作可见且是唯一主 CTA。
- **Do** 在桌面、超宽屏与 390px 移动端检查真实镜头和触摸行为。
- **Do** 保留 reduced-motion、键盘焦点和 live status。

### Don't:

- **Don't** 把官网改回堆叠区块、SaaS 卡片网格或功能说明长页。
- **Don't** 用装饰圆圈、三条流程线、网页徽章或假技术图形填空。
- **Don't** 用 CSS 渐变或阴影伪造金属、玻璃和实体产品。
- **Don't** 模拟与桌面产品不同的工具、选区或图片状态。
- **Don't** 暗示第三方推理在本地完成，也不添加未经证明的性能、客户或模型承诺。
