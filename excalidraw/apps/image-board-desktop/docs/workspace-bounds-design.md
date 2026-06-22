# CoreStudio 动态工作区边界方案

## 背景

CoreStudio 现在沿用 Excalidraw 的无限画布模型。这个模型适合承载不断扩展的设计过程，但在图片较多、自动生图占位不断追加、用户频繁缩放查看全局时，会出现两个体验问题：

- 缩到当前最小倍率后，仍然看不到当前项目的整体范围。
- 画布可以被平移到很远的空白区域，用户容易迷路。

这里不希望取消无限画布能力，也不希望深改 Excalidraw 的元素坐标、渲染、序列化机制。因此方案应只在 CoreStudio 桌面端交互层增加一个可开关、可移除的“工作区边界”模块。

## 目标

1. 保留 Excalidraw 无限画布的能力：用户仍然可以把元素拖到很远的位置，项目仍然能容纳任意扩展的内容。
2. 给 CoreStudio 增加一个软性的“当前工作区”概念，让用户能看到主要工作范围。
3. 当元素靠近或越过边界时，工作区自动扩展，而不是阻止用户操作。
4. 缩放到全局或最小倍率时，优先展示当前工作区，而不是理论上的无限空白。
5. 自动生图、导入图片、占位 frame 的摆放优先在当前工作区附近找空位，避免内容无意义地一路横向铺远。
6. 模块化接入，尽量减少和上游 Excalidraw 的冲突，方便以后关闭或移除。

## 非目标

- 不把 Excalidraw 改成真正的有限画布。
- 不限制用户手动拖拽元素到边界外。
- 不改变 `.excalidraw` 场景文件的元素数据格式。
- 不把工作区边界作为导出裁剪范围。
- 不在第一版做复杂的工作区设置面板。

## 核心概念

### 工作区边界

工作区边界是一个运行时计算出来的矩形范围：

```ts
interface WorkspaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

它不是画布真实尺寸，也不是项目文件格式的一部分。第一版可以只保存在前端运行时，由当前场景元素和默认尺寸动态计算。

### 默认工作区

新项目或空项目没有元素时，工作区应有一个默认范围。默认范围以视口中心为基准，但不要给得太大，否则用户会感觉它只是另一种无限画布。第一版应先覆盖“当前工作区 + 几张常规参考图”的尺度，内容真正靠近边界时再自动扩展。

推荐默认值：

- `DEFAULT_WORKSPACE_WIDTH = 3600`
- `DEFAULT_WORKSPACE_HEIGHT = 2400`
- 默认中心放在当前视口中心附近。

这个范围足够放下几张常规图片和生成占位，但不会让空项目一开始就失去边界感。

### 动态扩展

工作区边界按场景状态分两种口径：

- 空项目：以当前视口中心生成默认工作区。
- 有内容的项目：以所有非删除元素的 bounds 为核心，加安全边距；如果结果小于默认尺寸，就围绕元素簇补足到默认尺寸。

安全边距建议：

- 普通边距：`360px`
- 生成/导入图片摆放时额外边距：`1200px`

有内容时不要再把保存的视口中心并入工作区。旧项目可能保存过很远的 `scrollX/scrollY`，如果把远处空白视口和真实内容取并集，会让安全区被历史导航位置撑得特别大。

当用户把元素拖到边界外，下一次场景变化时工作区会自然扩大。它不会把元素拉回来，也不会阻止保存。

## 模块设计

### 新增模块

建议新增：

```text
apps/image-board-desktop/src/app/workspaceBounds.ts
apps/image-board-desktop/src/app/workspaceBounds.test.ts
```

职责：

- 根据视口、当前元素、默认配置计算 `WorkspaceBounds`。
- 判断元素是否接近边界。
- 给自动摆放提供首选搜索范围。
- 给视图导航提供软性 clamp 方法。

建议 API：

```ts
export interface WorkspaceBoundsOptions {
  viewportCenter: { x: number; y: number };
  defaultWidth?: number;
  defaultHeight?: number;
  padding?: number;
}

export const getWorkspaceBounds = (
  elements: readonly ExcalidrawElement[],
  options: WorkspaceBoundsOptions,
): WorkspaceBounds;

export const expandWorkspaceBoundsForRect = (
  bounds: WorkspaceBounds,
  rect: SceneBounds,
  padding?: number,
): WorkspaceBounds;

export const clampViewportToWorkspace = (
  appState: Pick<AppState, "width" | "height" | "zoom" | "scrollX" | "scrollY">,
  bounds: WorkspaceBounds,
): { scrollX: number; scrollY: number };
```

### Excalidraw 核心接入

第一版尽量不改 Excalidraw 核心包。如果需要接入，也只做小而可选的能力。

优先方案是在 `apps/image-board-desktop/src/app/App.tsx` 做桌面端包装：

- `onChange` 时更新当前工作区 bounds。
- 自动生图/导入图时把 bounds 传给摆放逻辑。
- 需要“全局查看”时，桌面端调用现有 `scrollToContent` 或新增局部 helper，而不是改全局 zoom 逻辑。

如果后续必须限制平移，才考虑给 Excalidraw 增加一个可选 prop：

```ts
navigationBounds?: WorkspaceBounds | null;
```

默认值为 `null`，上游行为完全不变。CoreStudio 传入时才启用软性平移约束。

## UI 表达

第一版不做明显的重型 UI，只做轻量可感知提示：

1. 在工作区边界画一条很淡的虚线或细线。
2. 边界附近可以有轻微阴影/淡色提示，表达“主要工作区到这里”。
3. 当元素越过边界后，边界自动扩展，提示线随之移动。

实现位置建议：

- 第一版先用 CoreStudio 自己的 overlay DOM 或 canvas overlay 试验。
- 如果 overlay 和 Excalidraw 坐标同步成本过高，再考虑最小侵入地接入 Excalidraw render 层。

第一版可以先不提供设置入口，只通过常量启用。确认体验后再加开关。

## 自动摆放策略

当前 `placeGeneratedImages` 已经支持 `occupiedBounds`，可以继续扩展它：

新增输入：

```ts
workspaceBounds?: SceneBounds | null;
```

调整策略：

1. 优先在引用元素右侧、当前指针位置、或当前视口中心附近摆放。
2. 如果候选位置会超出工作区，先尝试工作区内最近空位。
3. 如果工作区内没有合理空位，则允许越界摆放，并返回扩展后的工作区。
4. 不再默认把下一批永远接在上一批最右侧，而是优先回到当前视口/引用元素附近搜索。

这样可以减少内容一路向右铺开，也能保留真的需要扩展时继续扩展的能力。

## 缩放和导航策略

### 触摸板缩放

触摸板缩放手感应单独处理，不和工作区边界混在一起。

当前缩放近似是固定差值：

```ts
newZoom = currentZoom - deltaY / 100;
```

低倍率时这个变化太猛。建议改为相对缩放：

```ts
nextZoom = currentZoom * Math.exp(-deltaY * sensitivity);
```

第一版建议 `sensitivity = 0.0025` 到 `0.004` 之间试。这样低倍率时变化更细，高倍率时仍能自然缩放。

### 全局查看

“缩到最小”不应只理解为 `MIN_ZOOM = 0.01`，还应有一个“查看当前工作区”的行为：

- 如果工作区比视口小，保持正常倍率。
- 如果工作区很大，计算能容纳工作区的 zoom。
- zoom 仍受 `MIN_ZOOM` 和 `MAX_ZOOM` 限制。

第一版保留现有最小 zoom，但增加一个“工作区全貌软停”：

1. 根据当前 `WorkspaceBounds` 和视口计算 `workspaceFitZoom`，让边界在视口内留一点余量。
2. 用户从更高倍率快速缩小并越过 `workspaceFitZoom` 时，先把 zoom 拉回 `workspaceFitZoom`。
3. 边界短暂变蓝，提示“已经到当前工作区全貌”。
4. 如果用户继续缩小，下一次越过时放行，允许进入 `1%` 的超远视角。
5. 用户重新放大到 `workspaceFitZoom` 以上一段距离后，软停状态重置。

这个逻辑是 CoreStudio 桌面端的交互补丁，不改变 Excalidraw 的无限画布和最小缩放能力。它解决的是“快速缩放时先停在有意义的全貌层级”，而不是把画布硬限制住。

## 回退策略

该功能必须能低成本回退。

建议保留一个集中开关：

```ts
const ENABLE_WORKSPACE_BOUNDS = true;
```

关闭后：

- 不计算工作区 bounds。
- 不显示边界 overlay。
- 自动摆放回到当前逻辑。
- 不对平移/缩放做任何边界参考。

如果后续接入 Excalidraw prop，默认也必须是关闭状态。

## 风险

### 风险 1：边界 overlay 和真实坐标不同步

缓解：

- 第一版只用已有 `scrollX/scrollY/zoom/width/height` 做转换。
- 写单元测试覆盖 scene 坐标到 viewport 坐标的计算。
- 手动验证缩放、平移、窗口 resize。

### 风险 2：自动扩展太频繁导致边界跳动

缓解：

- 使用 padding 和最小扩展单位。
- 只有元素 bounds 超出当前边界一定阈值时才扩展。
- 边界只扩大，不因元素删除立即剧烈收缩。第一版可以根据当前元素实时计算，若体验跳动，再改成会话级记忆。

### 风险 3：平移限制影响用户找远处元素

缓解：

- 第一版先不做硬平移限制。
- 后续如果做，也只做软 clamp，并允许用户通过滚动到元素、拖拽元素、搜索等动作扩展边界。

### 风险 4：上游升级冲突

缓解：

- 第一版优先在 `apps/image-board-desktop` 内实现。
- 如果必须改 `packages/excalidraw`，只增加可选 prop，不改变默认行为。
- 核心逻辑集中在 `workspaceBounds.ts`，避免散在多个上游文件里。

## 第一版开发计划

1. 新增 `workspaceBounds.ts` 和测试。
2. 在 CoreStudio App 中计算当前工作区 bounds。
3. 修改 `placeGeneratedImages`，让自动生图/导入图参考工作区和当前视口，不无限向右铺。
4. 增加一个非常轻的边界 overlay。
5. 单独调整触摸板缩放灵敏度，使用相对缩放公式。
6. 增加工作区全貌软停：第一次越过时吸附并高亮，第二次继续缩小时放行。
7. 跑现有桌面端测试、`fitToContent` 测试、类型检查。
8. 手动验证：
   - 空项目缩放和平移。
   - 多图生图占位。
   - 引用元素生图。
   - 手动拖远元素后边界扩展。
   - 关闭开关后回到原行为。

## 建议验收标准

- 空项目不会让用户感觉处在无限空白里。
- 生图占位优先出现在用户当前关注区域附近。
- 元素越过边界后边界会扩展，不会阻止用户操作。
- 缩放手感比当前更慢、更可控，尤其在 1% 到 20% 之间。
- 快速缩小时会先停在工作区全貌，继续缩才进入更远的 1% 视角。
- 关闭功能开关后，行为退回到当前版本。
- 不改变项目保存格式。
