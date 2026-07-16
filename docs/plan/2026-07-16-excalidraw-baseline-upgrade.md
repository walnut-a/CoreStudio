# Excalidraw 上游基线升级计划

**日期：** 2026-07-16  
**状态：** 已完成

## 背景

CoreStudio 当前版本为 `1.1.18`，仓库提交为 `1a5bdcfad`。当前 Excalidraw 源码最初从上游 `1caec99b`（2026-04-13）导入，之后 CoreStudio 在画布、图片、选中工具栏、侧栏、缩放和排列能力上增加了自己的定制。

本轮已核验的上游候选基线为 `5ca08343`（2026-07-15）。从当前导入基线到该提交，上游包含 60 个提交和 348 个变化文件。CoreStudio 自导入后修改了 44 个 Excalidraw 核心文件；三方试合并显示，上游与 CoreStudio 同时修改了 23 个文件，其中 8 个存在明确文本冲突。

当前仓库并不是保留完整 Git 血缘的标准 Excalidraw fork，桌面应用也通过 Vite alias 直接引用 Excalidraw 源码。因此本次任务不能只按普通依赖升级处理，需要同时建立可重复的上游同步和 CoreStudio 补丁维护方式。

## 目标

1. 完整保留 CoreStudio 现有定制能力，不以删除功能换取合并简单。
2. 将 Excalidraw 更新到执行前重新核验并固定的上游 SHA。
3. 把 CoreStudio 对 Excalidraw 内核的修改收敛成少量、明确、可验证的补丁分组。
4. 建立可预览、可回滚、可重复执行的后续升级机制。
5. 让正常的后续基线升级尽量控制在 1～2 人日；遇到上游核心重构时控制在 2～3 人日。

## 非目标

- 不在本任务中修改 CoreStudio 版本号。
- 不在本任务中制作、签名、公证或发布 DMG。
- 不依赖上游接受 CoreStudio 的适配改动。
- 不为追求架构纯度一次性改写所有 `@excalidraw/*` 引用。
- 不顺手处理与上游升级无关的产品需求和历史重构。

## 工作原则

- 上游目标固定到 commit SHA，不在执行过程中追逐浮动的 `master`。
- 先用测试锁定 CoreStudio 行为，再更新上游源码。
- `excalidraw/apps/image-board-desktop/` 属于 CoreStudio 自有代码，不被上游同步覆盖。
- 同步工具默认只做 dry-run，实际写入必须显式执行。
- 不长期重复维护“已修改源码”和静态补丁文件两份事实来源。
- 新增或保留的内核补丁必须有明确用途和对应验证。
- 遇到故障先确认上游行为变化和根因，不连续叠加临时补丁。

## 需要保留的 CoreStudio 兼容契约

升级前先确认现有测试是否覆盖以下行为；缺失的测试先补充并确认能够约束当前实现。

1. `replaceFiles` 能替换已有图片文件和缓存，不产生错误的重复记录。
2. 选中元素工具栏能够渲染到 CoreStudio Inspector。
3. CoreStudio 不显示 Excalidraw 默认 Sidebar。
4. 画布最小缩放支持 1%，滚轮缩放保持当前曲线。
5. Arrange Into Grid 的排列结果和快捷键保持可用。
6. 选区、视口变化和 `scrollToContent` 行为稳定。
7. 旧项目打开、图片恢复和高清图切换保持兼容。
8. 剪贴板、图片粘贴和系统剪贴板失败处理保持兼容。
9. Agent、CLI 和 Local Bridge 写回画布的行为不变。
10. 项目保存、重开和图片文件 ID 关系不被破坏。

## Phase 0：执行前确认

1. 确认工作分支为 `walnut/update-excalidraw-baseline`。
2. 确认 CoreStudio 起点仍为 `1.1.18` / `1a5bdcfad`，或记录执行时的新起点。
3. 获取 Excalidraw 上游最新状态。
4. 重新比较已核验候选 `5ca08343` 与执行时最新上游，固定最终目标 SHA。
5. 确认工作区没有与任务范围重叠的未提交修改。
6. 保留 `.superpowers/` 等无关未跟踪内容，不纳入任务。

完成条件：起点、目标 SHA、仓库状态和任务边界都有当前证据。

## Phase 1：盘点定制并锁定行为

把当前 Excalidraw 差异分成四类：

1. 必须保留的内核补丁。
2. 可以移回 CoreStudio 产品层的功能。
3. 配置、测试、多语言和 lockfile 等配套变化。
4. 导入时遗留的编译 `.js` 文件和无效差异。

优先复用现有测试。对缺少回归护栏的核心定制，先新增失败测试，再进入升级。测试应描述用户可见行为或稳定接口，不锁死上游内部实现细节。

完成条件：每项 CoreStudio 定制都有自动化测试或明确的人工验收项。

## Phase 2：建立上游同步机制

建立一个机器可读的基线记录，至少包含：

- 上游仓库地址；
- 当前基线 SHA；
- 目标基线 SHA；
- 上游管理路径；
- CoreStudio 自有路径；
- CoreStudio 补丁分组。

同步工具需要支持：

1. 默认 dry-run，输出预计新增、修改、删除和冲突文件。
2. 只检查和修改 Excalidraw 管理范围，不因无关未跟踪文件阻塞。
3. 从当前基线和工作树动态生成 CoreStudio 内核差异。
4. 从固定目标 SHA 生成新的上游源码树。
5. 保留 `apps/image-board-desktop/` 及其他明确的 CoreStudio 自有路径。
6. 尝试三方重放 CoreStudio 差异。
7. 冲突时停止并输出冲突清单，不留下难以判断的半完成状态。
8. 更新成功后写入新的基线 SHA。

完成条件：同步过程可预览、可中止、失败可回滚，并能明确指出需要人工处理的补丁。

## Phase 3：同步目标上游源码

1. 从固定目标 SHA 生成干净的上游树。
2. 同步新增和调整的 workspace package、构建脚本和依赖。
3. 保留 CoreStudio 桌面应用、Electron、Agent、项目和图片系统。
4. 更新 package、TypeScript、Vitest 和 lockfile。
5. 删除不应继续保留的编译产物和无效导入差异。
6. 将上游同步和 CoreStudio 行为恢复分开处理，避免问题来源混淆。

已知重点冲突路径包括：

- `excalidraw/package.json`
- `excalidraw/packages/excalidraw/components/Actions.tsx`
- `excalidraw/packages/excalidraw/components/App.tsx`
- `excalidraw/packages/excalidraw/components/LayerUI.tsx`
- `excalidraw/packages/excalidraw/tests/fitToContent.test.tsx`
- `excalidraw/tsconfig.json`
- `excalidraw/vitest.config.mts`
- `excalidraw/yarn.lock`

完成条件：目标上游源码完整进入工作区，剩余问题能够归入明确的 CoreStudio 补丁分组。

## Phase 4：恢复并收敛 CoreStudio 补丁

按以下分组逐项恢复，每组恢复后立即运行对应测试：

1. 图片和文件缓存：`replaceFiles`。
2. Inspector 集成：选中元素工具栏和默认 Sidebar 控制。
3. 视口策略：1% 最小缩放和滚轮缩放。
4. Arrange Into Grid。
5. 剪贴板和图片处理。
6. 配置、类型、多语言和测试适配。

Arrange Into Grid 优先评估移到 CoreStudio Inspector，通过画布 API 读取选区并调用 `updateScene` 完成。若行为能够完整保留，就删除其对 Excalidraw Action 注册、Help、Command Palette 和内部工具栏的修改；若无法安全外移，则继续作为独立内核补丁保留。

补丁范围目标：

- 核心补丁控制在 5～8 组；
- 直接修改的上游核心源码尽量控制在约 10 个文件；
- 不把配置、测试、locales 和 lockfile 机械计入核心源码预算；
- 每个补丁只有一个职责，并能独立说明和验证。

完成条件：CoreStudio 定制行为全部恢复，内核补丁边界比升级前更清楚且没有功能缩水。

## Phase 5：验证

按以下顺序执行自动化验证：

```sh
cd excalidraw

# 定制能力和受影响模块的目标测试
corepack yarn vitest <target-tests> --run

# 类型检查
corepack yarn test:typecheck

# CoreStudio 桌面测试
corepack yarn test:desktop --run

# Excalidraw 可执行的完整测试集
corepack yarn test:app --watch=false

# Desktop renderer 和 Electron 构建
corepack yarn build:desktop
```

当前升级前基线为：

- TypeScript 检查通过；
- 258 个桌面测试文件通过；
- 1,985 个桌面测试通过。

自动化验证通过后，再进行必要的界面回归：

1. 打开现有旧项目。
2. 画布缩放到 1%。
3. 选中元素并操作 Inspector 中的形状工具。
4. 执行 Arrange Into Grid。
5. 替换图片并切换高清图。
6. 粘贴图片和其他剪贴板内容。
7. 通过 Agent 或 Local Bridge 写回画布。
8. 保存、关闭并重新打开项目。

除非自动化验证无法覆盖关键交互，否则不提前启动额外 Electron 开发实例。

完成条件：类型、测试、构建和关键交互全部通过，没有已知 CoreStudio 功能倒退。

## Phase 6：提交与交付

建议按边界拆分中文提交：

1. `测试：锁定 CoreStudio 画布定制行为`
2. `工具：建立 Excalidraw 上游同步机制`
3. `升级：更新 Excalidraw 上游基线到 <SHA>`
4. `重构：收敛 CoreStudio Excalidraw 补丁边界`

最终交付需要记录：

- 旧基线和新基线；
- 上游新增的重要能力和行为变化；
- 保留的 CoreStudio 定制；
- 最终补丁分组和涉及路径；
- 自动化与人工验证结果；
- 下一次升级的标准操作；
- 尚未解决但已明确边界的风险。

## 执行结果

本轮已在 `walnut/update-excalidraw-baseline` 分支完成升级，最终目标固定为上游 `5ca083436d44a51a0705d43ea22d323839d5fe8e`。基线从 `1caec99b290c75cda05385e637138998807a65ae` 前进 60 个上游提交，三方重放实际产生 8 个冲突文件，与执行前预判一致。

升级过程完成了以下收敛：

1. 合入新的上游源码、workspace 构建脚本和依赖，并保留 CoreStudio 桌面应用工作区。
2. 删除 409 个带 TypeScript 同名源文件的历史编译 `.js` 产物，减少后续无效差异。
3. 保留 `replaceFiles`、Inspector 选中工具栏、默认 Sidebar 控制、1% 最小缩放、CoreStudio 滚轮缩放、Arrange Into Grid、剪贴板与图片处理等定制。
4. 为上游移除的 `scrollToContent` 补充兼容适配层，由新 `setViewport` 能力承接旧调用契约。
5. 恢复 CoreStudio 工具栏 tunnel，并为新的 `fractional-indexing`、`laser-pointer` workspace package 补齐桌面 Vite alias。
6. 调整 Vitest 3.2 hook 顺序，并将未纳入 CoreStudio workspace 的 `excalidraw-app` 从 Core 项目测试范围中排除。
7. 修复编辑器卸载时视口动画未取消的问题，避免测试环境和实际生命周期中的卸载后更新。

Arrange Into Grid 本轮没有外移到 CoreStudio 产品层。它依赖 Excalidraw Action Manager、历史记录捕获、绑定元素和 Frame 归属处理；现在外移会暴露更多内部接口并扩大升级面，因此继续作为单一、独立、有测试覆盖的内核补丁保留。

最终仍按基线记录中的 6 个补丁分组维护：图片替换、Inspector 集成、视口策略、网格排列、剪贴板与图片、构建和测试集成。

## 验证结果

以下验证均在目标基线上通过：

- 定制能力与受影响模块目标测试：7 个文件、88 项测试通过；后续新增卸载契约后，完整测试中一并验证。
- TypeScript：`corepack yarn test:typecheck` 通过。
- CoreStudio 桌面测试：258 个测试文件、1,985 项测试通过。
- Excalidraw/CoreStudio 完整测试：371 个测试文件、3,578 项通过、47 项跳过、1 项 todo，无未处理异步异常。
- Desktop renderer 与 Electron 构建：`corepack yarn build:desktop` 通过。

本轮没有额外启动 Electron 开发实例。旧项目、图片恢复、Inspector、Agent/CLI/Local Bridge、保存重开等关键路径已有桌面自动化覆盖；1% 缩放、`scrollToContent`、Arrange Into Grid 和编辑器卸载行为已有专项契约测试。

## 后续升级标准操作

1. 将 `upstream-baseline.json` 的 `targetSha` 更新为已审核的固定上游提交。
2. 执行 `corepack yarn upstream:check`，检查提交跨度、变更文件、预计冲突和补丁分组命中情况。
3. 确认 CoreStudio 自有路径和无关工作区修改不会被覆盖。
4. 执行 `corepack yarn upstream:apply`，只处理工具报告的冲突。
5. 按 6 个补丁分组运行契约测试，再依次执行类型检查、桌面测试、完整测试和桌面构建。
6. 验证通过后将 `currentSha` 更新为目标 SHA，并在本节追加本轮差异和风险记录。

后续主要风险仍集中在上游对 `App.tsx`、`LayerUI.tsx`、Action 系统和 viewport API 的重构。同步工具能够提前报告交叉修改和冲突，但语义兼容仍需由对应契约测试确认。

## 工作量预估

| 阶段 | 预计工作量 |
| --- | ---: |
| 基线确认、差异盘点和测试补齐 | 0.5～1 天 |
| 同步工具和基线记录 | 0.5～1 天 |
| 上游同步和冲突处理 | 1～1.5 天 |
| CoreStudio 定制恢复与收敛 | 1～1.5 天 |
| 自动化验证、构建和交互回归 | 1～1.5 天 |

本轮按 4～6 人日安排。完成同步机制和补丁收敛后，正常的后续升级目标为 1～2 人日；若上游再次大幅重构 `App.tsx` 或 `LayerUI.tsx`，目标为 2～3 人日。

## 停止和复核条件

出现以下情况时暂停继续叠加修改，先重新评估：

- 目标上游 SHA 在执行前发生重大安全或兼容变化；
- 某项 CoreStudio 功能只能通过大范围复制或重写上游内核才能恢复；
- 旧项目数据格式或图片文件关系需要迁移；
- 补丁范围明显超过 5～8 组，且无法说明每组职责；
- 自动化测试通过但关键交互出现无法解释的行为变化；
- 工作区出现与本任务范围重叠的并发修改。
