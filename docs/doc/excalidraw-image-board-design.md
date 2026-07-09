# Excalidraw 本地生图画布设计方案

**日期：** 2026-04-12  
**状态：** Draft  
**适用范围：** 第一版产品设计，仅包含方案，不包含实现代码

## 1. 项目定义

这是一个基于 `Electron + Excalidraw` 的本地桌面工具。

产品核心不是重做一个新的白板系统，而是在 `Excalidraw` 的基础上增加一个轻量的生图能力，让用户可以：

- 在应用内直接调用图像生成服务
- 把生成结果直接放到画布上
- 通过空间排布对比不同版本
- 选中某张生成图时查看它的生成参数

第一版强调“轻、顺手、低侵入”：

- 不大改 Excalidraw 原有布局
- 不做复杂版本树
- 不做图库或历史中心
- 不做云同步和协作

一句话定义：

> 一个会生图的 Excalidraw 本地增强版，用画布排布来完成版本对比。

## 2. 目标与非目标

### 2.1 目标

第一版需要完成这些能力：

- 以 `Electron` 形式运行在本地桌面
- 以 `Excalidraw` 作为主画布
- 增加一个轻量的 `Generate Image` 入口
- 支持 `BYOK` 多 provider
- 将生成出的图片直接插入到当前画布
- 为每张生成图保存参数元数据
- 选中图片时查看参数信息
- 以“项目文件夹”的方式保存画布、图片和元数据
- 自动保存项目状态

### 2.2 非目标

第一版明确不做：

- 复杂版本树和分支管理
- 历史记录列表或任务中心
- 图库、素材区、收藏夹
- 局部重绘、蒙版、修图工作流
- 在线协作、云同步、账号体系
- 大改 Excalidraw 主界面
- 通用 AI 工作流编排

## 3. 用户场景

目标用户是本地自用场景下的图像探索者，主要工作方式是：

1. 打开本地项目
2. 在 Excalidraw 中看到空白或已有画布
3. 点击 `Generate Image`
4. 填写 prompt、provider、model、尺寸、seed 等参数
5. 生成图片
6. 图片自动落到画布中
7. 将不同结果在画布上手动排布、比较、标注
8. 选中某张图片时查看它的参数信息
9. 关闭应用后再次打开，项目状态保持不变

这个产品的核心体验不是“管理”，而是“铺开看”。

## 4. 产品形态与交互

### 4.1 总体原则

- 主体界面仍保持为 Excalidraw
- 生图能力作为附加入口存在
- 不新增常驻重布局
- 图片保持为普通图片元素
- 参数信息以轻量 inspector 形式出现

### 4.2 主要交互

#### Generate Image

在顶部工具栏或应用菜单中增加 `Generate Image`。

点击后打开轻量 modal 或 popover，字段包括：

- provider
- model
- prompt
- negative prompt
- width
- height
- seed
- image count

动作包括：

- `Generate`
- `Cancel`

可选增加：

- `Generate and keep open`

#### 图片进入画布

生成成功后，图片作为普通图片元素插入画布。

插入规则：

- 单图：放到当前视口中心附近
- 多图：在当前视口附近按简单网格排布
- 连续生成：优先落在最近一批结果旁边，形成自然分组

#### 参数查看

当选中的是一张由应用生成的图片时，显示轻量参数信息区。

展示内容：

- provider
- model
- prompt
- negative prompt
- seed
- width / height
- created at

附加动作：

- `Copy prompt`
- `Reuse settings`

`Reuse settings` 表示把该图片的参数重新带回生成面板，以便继续迭代。

### 4.3 第一版不改变的交互

- 不改变 Excalidraw 主画布逻辑
- 不重做画布工具栏
- 不增加版本树面板
- 不增加固定三栏工作台

## 5. 数据模型

### 5.1 设计原则

- Excalidraw 继续负责“画布元素”
- 应用自己负责“图片资源与生成元数据”
- 两者通过资源标识关联

不建议把完整业务数据直接塞进 Excalidraw 内部结构作为主存储。

### 5.2 项目文件夹结构

一个项目对应一个本地文件夹，例如：

```text
My Prompt Board/
  project.json
  scene.excalidraw.json
  image-records.json
  assets/
    20260412_153201_a1b2c3.png
    20260412_153208_d4e5f6.png
  exports/
```

各文件职责：

- `project.json`
  - 项目名
  - 创建时间
  - 修改时间
  - 应用版本
  - 项目格式版本

- `scene.excalidraw.json`
  - Excalidraw 场景数据
  - 元素
  - 视图状态

- `image-records.json`
  - 图片资源和元数据映射

- `assets/`
  - 实际图片文件

- `exports/`
  - 导出产物

### 5.3 图片记录模型

建议以图片资源为主键，不以单个画布元素为主键。

推荐字段：

- `fileId`
- `assetPath`
- `sourceType`
  - `generated`
  - `imported`
- `provider`
- `model`
- `prompt`
- `negativePrompt`
- `seed`
- `width`
- `height`
- `createdAt`
- `mimeType`
- `notes`
- `parentFileId`（预留）

### 5.4 为什么按资源而不是按元素存

因为同一张图片可能：

- 被复制多次
- 出现在画布多个位置
- 被缩放或移动

如果元数据绑定在图片资源上，而不是绑定在某个元素上：

- 复制行为更自然
- 参数卡更稳定
- 数据结构更简单

## 6. 项目保存与恢复

### 6.1 保存原则

项目采用自动保存。

建议区分：

- 画布保存：防抖写入 `scene.excalidraw.json`
- 项目数据保存：在关键事件后立即写入

关键事件包括：

- 新图生成成功
- 图片导入成功
- 元数据变化
- 项目初始化

### 6.2 写入顺序

生成成功后的建议顺序：

1. 将图片写入 `assets/`
2. 更新 `image-records.json`
3. 把图片元素插入画布
4. 保存 `scene.excalidraw.json`

这个顺序的目标是尽量避免“画布里出现了图，但底层资源没写好”的情况。

### 6.3 删除策略

第一版删除策略应保守：

- 删除画布元素时，只删除元素
- 不立即删除图片文件
- 不立即删除元数据记录

未来可增加单独的 `Clean unused assets` 工具。

### 6.4 导入图片

导入外部图片时：

- 将文件复制到项目的 `assets/`
- 画布引用项目内副本
- `sourceType` 标记为 `imported`

这样项目文件夹是完整可移动的。

## 7. Provider 与 BYOK 设计

### 7.1 产品原则

- 对用户表现为支持多来源
- 对内部保持统一输入/输出接口
- 不强行把所有 provider 做成完全相同的体验

### 7.2 第一版统一输入字段

- provider
- model
- prompt
- negative prompt
- width
- height
- seed
- image count

如果某个 provider 不支持某项参数：

- UI 中隐藏或禁用
- 不做假的统一

### 7.3 Provider 设置

应用中提供轻量 `Providers` 设置弹窗。

每个 provider 卡片包含：

- 是否已配置 key
- 默认模型
- 最近连通状态
- 编辑 key 入口

### 7.4 Key 存储

API Key 不放在项目文件夹中。

应存储在本机应用配置或系统安全存储中。

这样可以保证：

- 项目可复制、可分享
- key 不随项目走
- 安全边界更清楚

### 7.5 Adapter 抽象

每个 provider 实现两类能力：

1. `getCapabilities`
   - 支持哪些模型
   - 支持哪些字段
   - 支持哪些尺寸策略

2. `generateImage`
   - 接收统一输入
   - 返回统一结果

统一结果应至少包含：

- 图片二进制或临时文件
- 实际 provider
- 实际 model
- 最终 seed
- 创建时间

### 7.6 第一版 provider 建议

第一版设计上支持多 provider，但实际优先级建议为：

1. `Gemini`
2. `fal.ai`

`Replicate`、`OpenAI Images` 可以在架构中预留，但不必在第一批做深。

## 8. 技术架构

### 8.1 模块划分

建议拆成以下模块：

#### Desktop Shell

负责：

- Electron 窗口
- 本地文件选择
- 菜单栏
- 文件系统能力
- 安全存储 API Key

#### Canvas Host

负责：

- 挂载 Excalidraw
- 恢复/保存场景
- 监听选中元素
- 插入生成后的图片
- 提供画布侧轻量扩展入口

#### Generation Module

负责：

- 生成面板状态
- 参数整理
- 请求状态
- 调用 provider adapter

#### Provider Adapter Layer

负责：

- provider 能力查询
- key 使用
- 请求适配
- 响应归一化

#### Project Store

负责：

- 读写项目文件
- 管理 `assets/`
- 管理 `image-records.json`
- 提供图片资源与元数据查询

### 8.2 模块边界原则

- Electron 主进程保持薄
- 业务逻辑尽量在 renderer 侧
- Excalidraw 当作画布宿主，不当作业务数据库
- provider 通过统一 adapter 接入
- 项目存储和 UI 解耦

## 9. 风险与边界情况

### 9.1 不要把项目做成重平台

第一版最大的风险，是在实现中不断添加：

- 新页面
- 常驻侧栏
- 历史中心
- 素材库
- 版本树

这些都会让项目从“轻工具”变成“重产品”，偏离初衷。

### 9.2 Excalidraw 不是资产管理系统

它适合：

- 自由摆图
- 标注
- 比较

它不适合：

- 大型图库管理
- 复杂元数据系统
- 强结构化历史关系

### 9.3 大图与多图的性能

第一版要预防：

- 大图过多导致画布卡顿
- 项目打开变慢
- 频繁写场景文件

可在后续阶段考虑：

- 缩略图策略
- 受控初始尺寸
- 更细的保存节奏

### 9.4 删除误伤

删除画布元素时，如果同时删除资源文件，会让撤销逻辑和重复引用变复杂。

所以第一版应坚持保守删除策略。

## 10. 分阶段落地顺序

### 阶段 1：基础桌面壳

目标：

- 建立 `Electron + React + Excalidraw`
- 支持新建/打开项目
- 支持保存/恢复 `scene.excalidraw.json`

### 阶段 2：项目资源层

目标：

- 建立 `assets/`
- 建立 `image-records.json`
- 支持导入图片
- 选中图片时读取关联记录

### 阶段 3：接入第一批生图 provider

目标：

- 增加 `Generate Image`
- 打通 `Gemini`
- 打通 `fal.ai`
- 将生成结果直接进入画布

### 阶段 4：体验补齐

目标：

- `Copy prompt`
- `Reuse settings`
- 多图自动排布
- 更稳定的保存和错误提示

## 11. 最终建议

第一版最重要的不是做全，而是做稳。

推荐的最终产品定义是：

> 在 `Electron` 中嵌入 `Excalidraw`，增加 `BYOK` 生图弹窗，把生成图片直接插入画布，并为每张生成图保存可查看的参数信息；版本对比先通过画布排布完成，不引入复杂管理系统。

如果后续扩展，建议按照以下优先级推进：

1. 图片参数复用
2. 更好的多图排布
3. 更多 provider
4. 资源清理工具
5. 轻量历史补充

不建议过早引入：

- 复杂版本树
- 图库系统
- 项目首页
- 协作能力
