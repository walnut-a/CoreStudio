# CoreStudio 工作区围栏移除计划

> 状态：方向已确认，等待当前多项目 renderer 重构形成可作为基线的提交后实施
>
> 产品事实来源：`docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md` 第 11.5–11.6 节
> 日期：2026-07-26

## 目标

删除 CoreStudio 主编辑器中的自有工作区围栏，同时继续保证内置生成、图片导入和
Agent/Codex 写入的结果靠近有效语义锚点，以整批形式稳定排列，不因连续单图写入、
缺失上下文或粗粒度空位搜索而散落到画布远端。

围栏移除后仍保留 Excalidraw 无限画布语义，不接入全局 Viewport lock。

## 当前事实

当前“围栏”实际由三部分组成：

1. 根据场景内容计算并绘制工作区虚线。
2. 缩放越过工作区 fit zoom 时短暂停顿并显示脉冲。
3. `placeGeneratedImages` 搜索空位时优先选择 `workspaceBounds` 内的候选位置。

它不是硬安全边界：

- 找不到围栏内空位时仍会回退到围栏外；
- 已经位于远端的元素会被下一次边界计算自动包含；
- Agent writer 当前不传 `workspaceBounds`，但已通过批量布局、参考锚点和占用
  检测避免标准路径中的逐张发散；
- 现有 `viewportSize` 和 `zoomValue` 只属于放置上下文类型，尚未形成局部性
  后置条件；
- 缺少 Agent Board 视口时，Agent writer 仍可能回退到固定 `(0, 0)`。

因此，围栏本身不是“图片不能乱放”的可靠保证。真正需要固定的是批次、锚点和
最近空位语义。

## 目标行为

### 有参考元素

- 合并本轮全部参考元素的边界。
- 整批结果优先放在参考边界附近的最近合法区域。
- 参考元素位于当前内容边缘时，不能因为人工工作区边界而改向远端。

### 无参考元素

- 优先使用发起写入 participant 的有效视口中心。
- 项目已有内容但 participant 视口缺失时，必须从权威 scene 推导可解释的场景
  锚点；不得静默回退到固定原点。
- 空 scene 可以使用初始视口中心。

### 批量与避让

- 同一轮成功图片通过一个 `files[]` 请求进入一个房间 operation。
- 布局器按整批边界避让，不拆成逐图搜索。
- 候选位置按到语义锚点的实际距离稳定排序，返回最近的无重叠位置。
- selection 和 viewport 仍是 participant 本地状态，写入不能持久化或广播他人的
  视口。

## 实施范围

### 保留并收敛

- `placeGeneratedImages` 的尺寸归一化、整批网格、参考锚点和占用检测。
- 场景元素整体边界与单元素占用边界计算。
- 当前 participant 视口转换和显式 placement viewport。
- 内置生成占位框与完成后原位替换。

### 删除

- `workspaceBounds` 放置参数、`rectangleInside` 和围栏内候选优先级。
- `WorkspaceBoundsOverlay` 组件、样式、状态和脉冲。
- workspace fit zoom、zoom gate 和相关 scene-change 短路。
- 没有生产调用方的 viewport clamp、bounds expansion 等遗留接口。
- 对应过时测试和 App wiring。

通用几何函数应迁移到职责明确的小模块，不能因为删除围栏而复制到多个调用方。

## TDD 顺序

1. 在 `imagePlacement.test.ts` 增加失败测试：
   - 参考元素位于大型场景边缘时，结果仍留在参考附近；
   - 密集区域选择距离锚点最近的整批空位；
   - 多图保持一个稳定网格，不分别向不同方向避让。
2. 在 Agent writer 测试增加失败测试：
   - 远离原点的已有 scene 且缺失 participant 视口时不回退 `(0, 0)`；
   - 有参考 element IDs 时始终使用整体参考边界；
   - 一个 `files[]` 只形成一个布局批次和一个房间 operation。
3. 完成最小局部放置修复，确认新增测试通过。
4. 删除图片布局中的 `workspaceBounds`。
5. 删除围栏 Overlay、缩放软停顿、App 状态和 scene-change wiring。
6. 收敛通用几何函数并删除死代码。

## 验证

自动验证至少包括：

- 图片布局、内置生成、图片导入、Agent writer 和房间写入的直接测试；
- Canvas scene change、viewport change 和 App 组件测试；
- Desktop 全量测试、typecheck 和 build。

真实界面验证至少包括：

1. 空项目和已有大型项目。
2. 主画布与 Agent Board。
3. 有参考图、无参考图、参考图位于内容边缘和密集内容四种状态。
4. 单图、多图、连续多批和远离原点的项目。
5. 缩放和平移保持无限画布体验，不再出现虚线、软停顿或脉冲。
6. Agent 写入后台项目时不改变前台项目或其他 participant 的 viewport。

## Worktree 策略

这项工作适合独立 worktree，因为它会同时改动布局器、Agent writer、App wiring、
组件和测试，且需要保持一条可独立验证的删除链路。

当前不立即创建 worktree。主工作区正在进行未提交的多项目 renderer 重构，并且
已经大幅修改 `App.tsx` 和协作 Spec；从当前 `main` HEAD 新开会落在旧运行时上，
最终需要重新移植或解决无意义冲突。

创建时机：

1. 当前多项目 renderer 重构完成验证并形成明确提交。
2. 确认该提交包含项目级 renderer 结构和当前协作 Spec。
3. 从该提交创建 `walnut/remove-workspace-fence`。
4. worktree 建议路径为仓库同级的
   `/Users/zhaolixing/GitHub/工业设计助手-remove-workspace-fence`。

不得为了提前创建 worktree，把当前工作区的大量未提交改动打成临时混合提交，也
不得在新 worktree 中基于旧 `App.tsx` 实现后再反向移植。

## 完成标准

- 新增局部放置回归先失败、实现后通过。
- 标准和缺失上下文的 Agent 写入都不使用固定原点作为已有项目的静默兜底。
- 所有图片写入入口复用同一批量布局语义。
- 围栏视觉、缩放软停顿和落点边界代码被物理删除，没有兼容开关。
- 无限画布平移和缩放保持正常。
- 自动验证和真实界面验证全部取得当前证据。
