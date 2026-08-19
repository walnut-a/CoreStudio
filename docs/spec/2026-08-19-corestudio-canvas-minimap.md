# CoreStudio 画布迷你地图需求与技术方案

> 所属项目：CoreStudio
> 文档类型：需求整理稿 + 技术方案
> 文档状态：方案已收敛，待确认进入实现
> 日期：2026-08-19

## 1. 文档定位

本文档用于收敛 CoreStudio 大画布迷你地图的第一版产品与技术方案，不包含实现代码。

需求来自真实的画布使用问题：当图片、标注和生成结果在无限画布上逐渐铺开后，用户大幅度缩放或平移时容易失去对当前方位的感知。用户需要一个靠近缩放控件、随时可开关的轻量全局视图，用来判断自己正在整张画布的什么位置，并快速回到目标区域。

本需求不改变 CoreStudio 的无限画布语义，不引入新的项目数据，也不把迷你地图扩展成导航历史、缩略图浏览器或协作雷达。

## 2. 当前事实与参考

### 2.1 CoreStudio 当前接入点

- CoreStudio 当前的缩放组件来自 Excalidraw `ZoomActions`，顺序为缩小、当前比例和放大。
- 左下角 footer 由 Excalidraw `Footer` 管理，CoreStudio 尚无左下角宿主挂载点。
- CoreStudio 已经有 `FooterRight` tunnel，用于把生图输入框开关放在原生帮助按钮旁边，避免坐标型悬浮层。迷你地图应沿用这一接入思路。
- Excalidraw 公开 API 已提供 `onChange`、`onScrollChange`、`getSceneElements`、`getAppState`、`getViewportOffsets` 和 `setViewport`，不需要为迷你地图开放画布内部状态。
- CoreStudio 左右 `SideDock` 和底部生图输入框是 Excalidraw 容器外的 fixed 浮层，`getViewportOffsets()` 无法自动发现它们。迷你地图需要一个很薄的 CoreStudio 遮挡适配层，不能把侧栏宽度写死在地图里。
- CoreStudio 产品层已经有 `sceneGeometry.ts`，包含画布内容边界、视口中心和缩放比例的基础计算，可作为新几何函数的归属位置。
- CoreStudio 对大工作区保留了 1% 最小缩放比例，这使“大幅缩放后失去方位”成为比一般 Excalidraw 场景更明显的产品问题。

### 2.2 tldraw 参考结论

tldraw 将缩放操作和迷你地图开关统一放在左下角 `NavigationPanel`。迷你地图不是主画布的截图，而是一个独立 Canvas2D：

- 用简化的元素边界表示画布内容；
- 合并“全部内容边界”和“当前视口边界”，保证视口移出内容区时仍能在地图上看见；
- 缓存每个元素的简化几何，平移和缩放时主要更新坐标变换和视口框；
- 使用 DPR backing store 和 `ResizeObserver`，保证 Retina 显示和尺寸变化后的清晰度；
- 支持点击定位、拖拽视口和 pointer capture，不通过改变场景元素实现导航。

参考资料：

- [tldraw UI components](https://tldraw.dev/sdk-features/ui-components)
- [DefaultNavigationPanel](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/ui/components/NavigationPanel/DefaultNavigationPanel.tsx)
- [DefaultMinimap](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/ui/components/Minimap/DefaultMinimap.tsx)
- [MinimapManager](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/ui/components/Minimap/MinimapManager.ts)

CoreStudio 只借鉴这些产品和算法思路，不引入 tldraw 依赖，不复制其 Editor 状态系统。

## 3. 需求边界

### 3.1 目标用户

使用 CoreStudio 整理工业设计参考、生成结果和标注，并已经形成较大画布工作区的设计工作者。桌面客户端和 Agent Board 是同一画布体验的两个入口，迷你地图不应因入口不同而产生两套行为。

### 3.2 第一版目标

1. 用户可以从左下角缩放区打开和关闭迷你地图。
2. 迷你地图能够表达全部非删除画布元素、当前选中元素和当前可用视口。
3. 用户可以通过点击和拖拽快速定位，定位过程保持当前缩放比例。
4. 画布元素、选区、侧栏和视口变化后，迷你地图在下一渲染帧内跟进。
5. 在大画布中不解码或缩放原始图片，不显著放大主画布的渲染成本。

### 3.3 第一版不做

- 不在迷你地图中渲染真实图片缩略图、文字内容或手绘路径细节。
- 不提供页面、分区、书签、历史记录或“上一个位置”。
- 不提供迷你地图内的元素选择、编辑、删除或拖动。
- 不把协作者光标、Agent 头像或在线状态纳入第一版。
- 不增加项目字段、画布 schema 或项目迁移。
- 不把迷你地图开关或交互记录写入 Excalidraw undo/redo 历史。
- 不在第一版中增加地图滚轮缩放、双击或 Shift 轴向锁定。

## 4. 产品交互方案

### 4.1 入口和布局

- 左下角默认使用紧凑态，只显示当前倍率；点击倍率后打开迷你地图，并展开为 `− / 100% / ＋`，关闭后重新收起加减按钮。
- 倍率是这组导航控件的统一入口：它始终显示实时缩放比例，点击只负责展开或收起迷你地图，不在同一位置混入“恢复 100%”语义。
- `Cmd/Ctrl+0` 继续保留为恢复 100% 缩放的标准快捷键；迷你地图不会改变原生缩放动作本身。
- 迷你地图从倍率按钮上方展开，使用 Excalidraw island 的背景、边框、阴影和圆角。
- 默认宽高暂定为 `224 × 144px`；窄窗口下使用 `min(224px, calc(100vw - 32px))`，高度按相同比例缩放。
- 底部生图输入框是居中的局部遮挡，不会被折算成整条底部 viewport offset。窄窗口下若它与地图面板相交，地图面板通过实测输入框边界向上避让，不用固定高度猜测。
- 面板常驻直到用户再次点击倍率或按 `Escape`，点击画布不自动关闭，避免导航过程中面板反复消失。

### 4.2 显示层级

迷你地图从低到高绘制：

1. **背景**：使用当前主题的低层表面色。
2. **普通元素**：统一使用低对比度的中性填充，按每个元素的轴对齐外包围盒绘制。
3. **图片和 Frame**：可使用稍深的中性色区分大块视觉内容，但不加载真实图片。
4. **当前选区**：使用 CoreStudio primary color，保留对应元素的外包围盒。
5. **当前可用视口**：使用半透明表面色和 1.5px 对比边框，始终置于最上层。

当视口在地图上小于 6px 时，视觉边框仍按真实比例绘制，但拖拽命中区域至少扩展到 8px，避免大画布中无法抓取视口。

### 4.3 开关状态

- 关闭：倍率按钮 `aria-pressed="false"`；缩放组隐藏加减按钮，只保留实时倍率。
- 打开：倍率按钮使用和其他持续开启功能一致的 primary tint，`aria-pressed="true"`；缩放组同时显示减号、当前倍率和加号。
- 空画布：倍率入口仍可用；面板中只显示当前视口轮廓和“画布中还没有内容”的轻量提示，不把空画布当成错误。
- 编辑器未初始化或正在换项目：不渲染宿主倍率入口，不显示一个不可用的空壳。

### 4.4 定位与拖拽

#### 点击地图

- 点击视口框外的位置时，将对应场景坐标移到主画布的可用视口中心。
- 使用 `setViewport({ fit: "none", offsets })` 保持当前缩放比例，传入和视口框相同的合并 offsets，并让 Excalidraw 继续处理可能存在的 viewport constraint。
- 单次点击使用 150–200ms 的短动画；用户开启 `prefers-reduced-motion` 时直接定位。

#### 拖拽视口

- 在视口框内按下时，记录指针相对视口中心的抓取偏移，拖拽期间保持该偏移，避免视口突然跳到指针中心。
- 在视口框外按下并开始拖拽时，先把视口中心移到指针位置，再继续平移。
- 使用 pointer capture，并在 `pointerup`、`pointercancel`、组件卸载和项目切换时精确清理。
- 拖拽期间关闭动画，每一帧最多提交一次 viewport 更新。
- 地图交互不请求元素选中，不写入房间操作，不触发场景持久化。

### 4.5 键盘和无障碍

- 开关按钮可通过 Tab 获取焦点，包含完整的中英文 `aria-label` 和 tooltip。
- 面板打开后不抢占主画布焦点；用户可以再次 Tab 进入地图。
- 地图获得焦点后，方向键按可用视口宽/高的 10% 平移，`Shift + 方向键` 按 50% 平移。
- `Escape` 关闭面板并把焦点还给开关按钮。
- 颜色不是唯一状态信号；选区和视口保留独立的边框。
- 地图 Canvas 提供“画布迷你地图，使用方向键平移画布”的可读说明。

### 4.6 开关偏好

- 默认关闭。
- 用户打开或关闭后，在当前入口的本机 UI 偏好中记忆状态。
- 该偏好不属于项目、场景或协作房间，不写入 `scene.excalidraw.json` 或 shared scene config。
- 第一版不要求桌面客户端和 Agent Board 共享同一个开关值；两个入口分别记忆用户选择，但功能行为必须一致。

## 5. 几何与坐标方案

### 5.1 输入数据

迷你地图渲染模型只需要：

- 非删除元素及其 `id`、`version`、`type`和轴对齐外包围盒；
- `selectedElementIds`；
- `scrollX`、`scrollY`、`zoom`、`width`、`height`；
- Excalidraw 内部 UI 的 viewport offsets；
- CoreStudio 边缘停靠浮层的实测 offsets；
- 主题和 device pixel ratio。

它不读取 BinaryFiles、图片原图、图片记录、生成记录或项目路径。

### 5.2 可用视口边界

`getVisibleSceneBounds(appState)` 只表示整个 Excalidraw 容器的可见区域。迷你地图使用两部分数据合成一个矩形可用视口：

1. `getViewportOffsets({ padding: 0 })` 提供 Excalidraw 容器内已标记 UI 的偏移。
2. CoreStudio 的 `CanvasViewportOcclusionAdapter` 通过显式 ref 或表面注册表，测量画布容器与左右 `SideDock` 的交集。只有贴住画布边缘的遮挡才转换为对应的 left/right offset。

同一侧的内部偏移和外部遮挡取最大值，不相加，避免重复扣除。最终用合并后的 offsets 修正场景视口：

```text
left   = -scrollX + offsetLeft / zoom
top    = -scrollY + offsetTop / zoom
right  = -scrollX + (width  - offsetRight)  / zoom
bottom = -scrollY + (height - offsetBottom) / zoom
```

合并后的同一份 offsets 也传给地图点击/拖拽所调用的 `setViewport`，使“视口框显示的中心”和“实际导航到的中心”一致。`ResizeObserver` 负责侧栏展开、窗口缩放和宽度 token 变化后的重测，地图不读取 `--corestudio-*-sidebar-width` 猜测几何。

底部生图输入框是居中的非矩形局部遮挡。第一版不把它冒充成全宽 bottom offset，否则会系统性缩小地图上的视口框。它只参与迷你地图弹层的碰撞避让；如果未来要精确表达非矩形可见区，应单独设计遮挡 mask，而不污染 viewport offset 合同。

### 5.3 地图范围

1. 使用 `getCommonBounds(nonDeletedElements)` 得到全部内容边界。
2. 将内容边界与当前可用视口边界取并集；空画布时只使用视口边界。
3. 以并集中心为锚点，把范围扩展到和地图内容区一致的宽高比。
4. 在最终范围四周保留 8px 的地图屏幕内边距，再计算场景坐标到地图坐标的统一 scale。
5. 对单点、零宽/高元素和非有限数值使用最小范围与降级规则，不允许产生 `Infinity`、`NaN` 或除零。

### 5.4 坐标变换

场景到地图：

```text
mapX = innerLeft + (sceneX - mapSceneLeft) * scale
mapY = innerTop  + (sceneY - mapSceneTop)  * scale
```

地图到场景：

```text
sceneX = mapSceneLeft + (mapX - innerLeft) / scale
sceneY = mapSceneTop  + (mapY - innerTop)  / scale
```

所有点击和拖拽必须先从 `clientX/clientY` 减去 Canvas `getBoundingClientRect()` 偏移，不假设编辑器占据整个窗口。

## 6. 渲染与性能方案

### 6.1 为什么使用 Canvas2D

- 元素多时，批量绘制外包围盒比创建大量 DOM/SVG 节点更稳定。
- 地图只需要简化几何，不需要 React 节点级的命中与样式。
- 可以使用 `Path2D` 将普通元素、图片/Frame 和选区各自批量绘制。
- 能以较小成本处理 Retina DPR，且不依赖主画布的 rough.js 渲染管线。

### 6.2 边界缓存

使用 `Map<elementId, { version, bounds, category }>` 缓存简化几何：

- `id` 和 `version` 不变时复用 bounds；
- 元素修改时只重算该元素；
- 元素删除或切换项目时移除对应项；
- 选区变化不重算 bounds，只重建选区 Path2D；
- 纯平移或缩放不重算元素边界。

第一版不构建四叉树或额外空间索引。迷你地图每次仍需要绘制所有简化矩形，但避免了图片解码和主画布几何重算。只有真实性能数据表明批量矩形本身成为瓶颈时，再评估更复杂的索引。

### 6.3 渲染调度

- `onChange` 标记元素路径和选区需要更新。
- `onScrollChange` 只标记视口需要更新。
- `ResizeObserver`、主题变化和 DPR 变化标记整体需要更新。
- 所有信号进入同一个 `requestAnimationFrame` 调度器，同一帧只渲染一次。
- 面板关闭时保留开关偏好，但停止 Canvas 渲染和 ResizeObserver；重新打开后从 API 读取当前完整状态。

### 6.4 性能底线

第一版的性能目标不用绝对机型 FPS 作为产品合同，而使用可检查的实现约束：

- 迷你地图不读取、解码或临时缩放 BinaryFiles；
- 同一浏览器帧最多一次地图渲染和一次拖拽 viewport 提交；
- 纯视口变化不重算全部元素边界；
- 地图关闭时不保留活跃渲染循环、全局指针监听或 ResizeObserver；
- 用 1,000 和 5,000 个简化元素的固定场景进行回归观察，不把小空画布的流畅度当成大项目证据。

## 7. 组件与代码边界

### 7.1 推荐分层

```text
Excalidraw 共享层
└─ 一个左下角宿主 tunnel / exported wrapper
   ├─ 允许宿主 React 内容替换缩放组的中间控件
   └─ 接收宿主的明确展开状态，按需显示原生缩放加减按钮

CoreStudio 产品层
├─ CanvasMinimapZoomControl
├─ CanvasMinimapPopover
├─ CanvasMinimapCanvas
├─ CanvasViewportOcclusionAdapter
├─ canvasMinimapGeometry
└─ canvasMinimapRenderer / controller
```

Excalidraw 共享层不知道“迷你地图”，只知道宿主可在左下角导航区替换缩放组的中间控件。迷你地图的状态、文案、渲染和交互全部保留在 `apps/image-board-desktop` 自有层。

### 7.2 宿主接入点

推荐将当前 `footer-right-host-actions` 补丁组泛化为 `footer-host-actions`，新增一个与 `FooterRight` 对称的左下角宿主 wrapper：

- 在 `tunnels.ts` 中增加一个 tunnel；
- 在 `Footer.tsx` 中把专用 tunnel output 放入 `ZoomActions` 的中间位置；未启用替换时仍渲染原生 reset zoom；
- 导出一个名称明确的 wrapper，供 CoreStudio 通过 Excalidraw children 挂载；
- 用合同测试锁定输出位置、多编辑器隔离和卸载清理。

具体名称在实现时可在 `FooterLeft` 和 `FooterNavigation` 之间选择；优先使用表达布局责任而不是单一功能的名称。

不接受以下替代实现：

- 查询 `.zoom-actions` 后手工创建 portal；
- 使用固定 `left/bottom` 坐标模仿缩放区位置；
- 在 CoreStudio CSS 中修改 Excalidraw 内部子节点顺序；
- 把整个迷你地图下沉到 Excalidraw 包，使上游补丁承担产品文案和 CoreStudio 特有行为。

### 7.3 订阅边界

组件打开时从 `ExcalidrawImperativeAPI` 初始化快照，然后分别订阅：

- `onChange`：元素、选区和主题的最新状态；
- `onScrollChange`：高频视口变化；
- `ResizeObserver`：地图 Canvas、Excalidraw 容器、已注册边缘遮挡和需要避让的生图输入框尺寸变化。

关闭或切换项目时调用所有 unsubscribe，取消待执行 RAF，释放 pointer capture 和 ResizeObserver。不在 `App.tsx` 的主状态中每帧 `setState`；高频渲染状态保留在迷你地图 controller/ref 中。

## 8. 与现有系统的关系

### 8.1 项目持久化

迷你地图是纯视图和导航功能：

- 不修改元素；
- 不生成 durable increment；
- 不增加 shared scene config；
- 不触发项目 autosave；
- 不进入 undo/redo。

如果点击或拖拽迷你地图导致项目文件改动，应视为实现缺陷。

### 8.2 Project Room 与 Agent Board

- 场景元素仍由现有房间权威状态更新，迷你地图只消费当前 editor 已经接受的状态。
- 迷你地图不订阅房间 WebSocket，不建立第二条协作数据管线。
- 桌面端和 Agent Board 都通过各自的 Excalidraw API 使用同一个迷你地图组件。
- 当 Agent Board 的权限只允许导航时，迷你地图仍可用；它不依赖元素编辑权限。

### 8.3 视口恢复

迷你地图不参与编辑器初始视口的选择和恢复：

- 只在 editor 完成初始化且当前项目已就绪后挂载；
- 打开面板时从 API 读取最终视口，不保留初始化中的临时值；
- 不在打开面板时自动调用 `setViewport`；
- 不用迷你地图开关的 localStorage 保存 `scrollX`、`scrollY` 或 `zoom`；
- 恢复验收仍以真实浏览器 reload 和源码 Electron 重启为准，不用组件重渲染代替。

## 9. 文案与多语言

迷你地图位于 CoreStudio 产品层，文案进入 CoreStudio 共享 copy catalog，不直接向 Excalidraw locale 文件增加产品专用文案。

第一版至少包含：

| 语义     | 简体中文                         | 英文                                              |
| -------- | -------------------------------- | ------------------------------------------------- |
| 打开倍率 | 打开迷你地图，当前缩放 100%      | Open minimap, current zoom 100%                   |
| 关闭倍率 | 关闭迷你地图，当前缩放 100%      | Close minimap, current zoom 100%                  |
| 地图说明 | 画布迷你地图，使用方向键平移画布 | Canvas minimap. Use arrow keys to pan the canvas. |
| 空状态   | 画布中还没有内容                 | The canvas is empty                               |

## 10. 测试与验收方案

### 10.1 TDD 实现顺序

1. **宿主接入合同**：先增加失败测试，固定左下角宿主内容的渲染位置、实例隔离和卸载。
2. **纯几何函数**：固定边界并集、宽高比扩展、内外 offsets 合并、边缘遮挡判定、双向坐标转换、零尺寸和非有限值。
3. **渲染 controller**：固定缓存复用、删除失效、RAF 合帧、DPR 尺寸和关闭清理。
4. **交互**：固定点击保持 zoom、拖拽抓取偏移、pointer cancel、Escape、方向键和减少动画。
5. **CoreStudio 集成**：将组件挂入桌面端和 Agent Board，添加 copy catalog 与主题测试。

### 10.2 定向自动化验收

- 默认关闭，点击开关后显示面板，再次点击或 Escape 关闭。
- 普通元素、图片、Frame、选中元素和删除元素的地图分类正确。
- 单元素、负坐标、跨象限、超大坐标和空画布不产生无效几何。
- 当前 zoom 为 1%、100% 和 400% 时，点击定位后 zoom 保持不变。
- 打开左侧素材栏或右侧 Inspector 后，视口框使用实测的边缘遮挡缩小；关闭后恢复，不依赖写死宽度。
- 底部生图输入框不改变矩形视口计算；窄窗口下它与地图面板不重叠，收起或尺寸改变后避让重新计算。
- 拖拽时连续平移，移出 Canvas 仍能收到 pointerup；`pointercancel` 后不再平移。
- 地图打开时房间元素变化能够跟进；关闭后不保留活跃订阅和观察器。
- 导航不产生场景修改、项目保存、房间 operation 或 undo 记录。

### 10.3 真实界面验收

这一功能改变 Excalidraw 底部导航区、跨宿主层 CSS 和真实 viewport，最终按 L3 验收：

1. 从 `excalidraw/` 运行定向测试和 `corepack yarn test:typecheck`。
2. 用固定入口 `corepack yarn dev:desktop` 启动 `CoreStudio Dev`。
3. 覆盖浅色/深色、空画布、真实大图片画布、1%/100%/400% 缩放、左右侧栏和底部输入框，特别检查小窗口下的弹层避让。
4. 在 Agent Board 真实页面中验证相同功能，并点击真实浏览器 reload，确认迷你地图不干扰已有视口恢复。
5. 验收结束后只清理本次固定入口记录的精确进程组。

普通 UI 修改不触发打包。只有迷你地图引入了打包资源、Electron 行为或发版需求时，才升级到 L4。

## 11. 分阶段实施建议

### Phase 1：基础导航地图

- 增加左下角宿主挂载点；
- 完成纯几何、Canvas2D 渲染和开关面板；
- 完成 Excalidraw 内部 offsets 与 CoreStudio 边缘遮挡的实测合并；
- 支持普通元素、选区和视口框；
- 支持点击定位、拖拽平移、键盘平移和 Escape；
- 桌面端和 Agent Board 同时接入。

### Phase 2：真实大画布优化

Phase 1 真实验收后再根据证据决定：

- 是否需要区分图片、Frame、普通图形和标注的地图颜色；
- 极远离群元素是否真的让地图失去可用性，以及是否需要离群提示；
- 5,000+ 元素时是否需要更强的渲染降采样或空间索引；
- 是否需要在迷你地图中显示协作者位置。

上述项目都不应在没有真实画布证据时预先扩张 Phase 1。

## 12. 完成标准

第一版只有同时满足以下条件才算完成：

1. 用户可直接点击缩放区的当前倍率打开和关闭迷你地图，不存在第二个含义重叠的入口。
2. 地图能在大幅缩放和平移后清楚表达当前方位。
3. 点击、拖拽和键盘导航保持 zoom，并和合并内部 UI、左右边缘遮挡后的矩形可用视口一致。
4. 桌面端和 Agent Board 行为一致，没有两套组件。
5. 迷你地图不加载原图，不修改项目，不扩大协作协议。
6. 空画布、超大坐标、极端 zoom、主题切换、侧栏和项目切换都有当前验证证据。
7. 真实 `CoreStudio Dev` 和 Agent Board reload 验收通过，本次启动的进程已精确清理。

## 13. 待实现时确认

以下问题不改变方案主体，可以在实现阶段由快速样式试验确认：

- 宿主 wrapper 继续使用 `FooterNavigation`，内部以专用 zoom-control tunnel 实现中间控件替换；
- 224 × 144px 在真实图片画布上是否需要微调为 240 × 152px。

这些选择不允许改变已确认的功能边界：倍率仍是缩放区的唯一迷你地图入口，地图仍是简化几何，导航仍保持当前 zoom，功能仍保留在 CoreStudio 产品层。
