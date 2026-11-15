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

## 2026-08-05 增量升级执行记录

本轮在 `walnut/update-excalidraw-baseline-20260805` 分支继续沿用既有同步合同，将源码基线从 `5ca083436d44a51a0705d43ea22d323839d5fe8e` 推进到当日 upstream `master` 的 `85270fcc8db26f98d119e2d2752b0c0139e86e16`。该范围包含 24 个上游提交、196 个变更路径；npm 最新稳定版虽为 `0.18.1`，但不能覆盖这一范围内 2026-08-04 的嵌套分组修复，因此本轮继续升级 vendored source baseline，不改用 npm 包替代。

同步前 dry-run 预测 4 个文本冲突，实际冲突与预测一致：

1. `packages/element/src/index.ts`：同时导出 CoreStudio `arrange` 与上游 `arrowEndpointText`。
2. `packages/excalidraw/actions/actionNavigate.tsx`：保留 presence-only 协作者的 `canFollow` 限制，同时接入上游宿主持有的跟随状态。
3. `packages/excalidraw/actions/manager.tsx`：保留 CoreStudio 动作 predicate 过滤，同时接入上游 viewport 过渡期间的导航动作保护。
4. `packages/excalidraw/components/App.tsx`：保留图片替换、Inspector、剪贴板和滚轮曲线等接入；删除已被上游 `AppViewport` 取代的旧 viewport 实现，并把 CoreStudio 滚轮曲线接到新的 scroll constraint 管线。

上游删除了 `scene/zoom.ts`，本轮仅保留其中 CoreStudio 自有的 `getWheelZoomValue`；焦点缩放、动画、锁定和回弹全部采用上游新 `AppViewport`/`viewport.ts` 实现。补丁合同新增 `host-action-integration` 分组，把动作 predicate 与 presence-only 协作者控制从图片替换职责中独立出来。

升级前，`supports nested groups` 回归用例稳定失败，内层选中元素仍只有 1 层 `groupIds`；同步后该用例已转绿，说明上游的“在正在编辑的组内再次编组”修复已生效。1% 最小缩放、CoreStudio 滚轮曲线、Inspector 回调、文件替换、禁用默认 Sidebar、presence-only 协作者和旧 `scrollToContent` 不暴露等合同继续保留。

本轮最终验证结果：

- 上游新增能力与 CoreStudio 受影响合同：12 个文件、295 项测试通过。
- TypeScript：`corepack yarn test:typecheck` 通过。
- CoreStudio 桌面测试：261 个测试文件、2,038 项通过；测试进程和锁均清理完成，残留为 0。
- Excalidraw/CoreStudio 完整测试：386 个测试文件、3,894 项通过、47 项跳过、1 项 todo，无失败。
- Secret scan：源码和打包输入共检查 961 个文件，通过。
- Desktop renderer 与 Electron 构建：`corepack yarn build:desktop` 通过；bundle budget 通过。
- 打包预览：固定 `PACKAGED PREVIEW` 身份、构建标识和欢迎页真实渲染通过，验收后精确清理对应进程组，残留为 0。
- Packaged smoke：production、qa 和多宿主 Agent 集成 smoke 通过，隔离进程与临时数据均已退出。

源码 Dev 的固定端口 `5174` 当时被另一个仓库的 Electron Forge 进程占用（PID 31938，`CNC-Desktop-Studio`），本轮没有终止该无关进程，也没有创建自定义端口或临时源码实例；真实界面验收改走项目规定的 `preview:desktop` 固定入口。macOS Computer Use 服务未能启动，因此预览界面通过该固定实例的只读调试端口核对 DOM 与截图，不影响应用自身启动和打包证据。

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

## 2026-11-13 增量升级

目标固定为 `82d5847e57dcb6fb5982833ea9ec2137fe0b2bd5`（11 月 12 日），相较当前基线新增 90 个提交、425 个变更路径；三方合并预检发现 19 个冲突。保留任务开始前的 README、性能分析文档、App.css、App.tsx、GenerateImageDialog.tsx 修改及 tools 目录；恢复补丁位于本机 `/tmp/corestudio-update-20261113/original-changes.patch`。

迁移剪贴板优先级至 `App.clipboard.ts`，滚轮灵敏度与焦点恢复锚点至 `App.wheel.ts`，导出适配新 `exportScene` API。采用上游已经包含的套索与取色修复；依赖保持 CoreStudio 工作区和安全 resolutions，不恢复上游 Web 安装图。

用户追加要求：比较上游小地图，满足需求则删除自定义实现。结论是采用上游：点击定位、拖动视口、滚轮缩放、边缘自动平移、按需加载与 Worker/OffscreenCanvas 已覆盖主要需求。删除自定义组件、几何计算、渲染器及 FooterNavigation 专用隧道；保留仍用于生成框开关的 FooterRight。

实机发现侧栏会覆盖原生底栏，因此只在宿主 SideDock.css 增加侧栏与生成框避让，不修改上游小地图。补齐小地图、缩放和便签的中文文案。原自定义版的方向键导航、独立 localStorage 开关记忆不再保留；上游视口框对应整个画布，没有扣除覆盖在画布上的侧栏，这不影响点击和拖动导航。

模型目录同期更新 revision 6，并将源码最低适配版本设置为 1.1.61；这不是发布记录。外置目录仓库仅本地编辑，不提交、不推送。模型目录详情和验证记录维护在桌面端 `docs/model-catalog.md`。

验证与交付记录：

- 上游补丁登记检查：65 个本地补丁路径全部有分组，无遗漏或冲突标记。
- `test:typecheck` 通过；桌面测试 27 个文件、105 项通过。定向测试覆盖新小地图、缩放菜单、剪贴板、文件替换、导出和模型目录。
- `build:desktop` 通过，源码及打包输入 secret scan 检查 800 个文件通过。Mermaid 3.6 的拆包不再产生 cynefin，因此预算删除失效项，新增桌面 main 入口 760 KB；新版核心实际 627,126 bytes，预算由 615 KB 调整到 635 KB。其余预算不变，检查通过。构建仍有 import.meta / CJS 与 chunk 大小提示，无构建错误。
- 固定 SOURCE DEV / 1.1.61 / b9403708c-dirty 实机检查：1000 元素场景，点击定位、拖拽和滚轮缩放；1470×879 浅色、1000×700 深色、双侧栏与展开的生成设置。确认仅有上游小地图且实际创建 Worker；PNG 导出返回有效图片。
- 模型设置中确认 ZenMux 34 个预置，并选择 GPT Image 2.6 Flare 检查；未保存测试凭证或发起付费请求。截图与命令日志在本机 `/tmp/corestudio-update-20261113/`。
- 原有 README、性能分析文档、App.css 和 GenerateImageDialog.tsx 的 diff 与任务前逐字相同；App.tsx 在保留既有改动的基础上删除小地图接入。
- 验收后通过固定停止入口关闭 PGID 8298，再检查启动器 PGID 7935；剩余进程为 0，5174 / 9331 / 60910 无监听。正式 CoreStudio 未触碰。
- 本次仅修改工作区和外置目录仓库的本地文件；没有 Git 提交、推送、PR、打包发布或生产安装。

全量回归覆盖 185 个文件：首轮 184 个文件、2,810 项通过，47 项跳过、1 项 todo。
仅上游新增的两个 frame 剪切用例失败，原因是测试同步断言，而 CoreStudio 会等待
剪贴板成功后才删除。给测试补齐异步等待后，剪切、剪贴板及补丁登记共 3 个文件、
15 项定向复测通过；未修改产品剪切行为，未重复运行已通过的全量测试。

## 2026-11-13 新功能专项实机验收

结论：主要新增画布交互在 CoreStudio 中可用；发现常用字体/颜色偏好未持久保存、输入设备偏好缺少入口，以及中文说明未同步三项接入问题。本轮仅验收并记录，没有修复产品代码。

### 环境与方法

- L3 固定入口 `corepack yarn dev:desktop`；启动和收尾均通过 `verify:desktop:source` 核验 SOURCE DEV / 1.1.61 / b9403708c-dirty。
- 使用专用临时项目 `/private/tmp/corestudio-update-20261113/上游小地图验收`，不操作正式项目、不配置凭证、不发起付费生成。
- 在真实 Electron 项目窗口，通过生产界面执行键鼠操作；生产 API 仅布置测试夹具。以截图、元素状态与刷新前后数据交叉核对，不把直接调用 API 算作交互通过。
- 原始证据保存在本机 `/tmp/corestudio-feature-qa-20261113/`：`evidence.json`、`mermaid-fixtures.json`、截图、身份核验和进程收尾日志。临时目录不是长期归档。

### 功能结果

| 功能 | 实机结果 | 关键证据 |
| --- | --- | --- |
| 便签 | N 创建、中文多行编辑、详情面板、复制编号递增通过；与流程图一起刷新恢复后，内容和绑定关系一致 | `01-sticky-inspector.png`、`21-restored-content.png` |
| W 包裹/拆包 | 文本生成矩形容器，再按 W 解除容器，原文保留 | `02-wrap.png`、`wrap/unwrap` |
| Option 重叠轮选 | 同一位置重复 Option 点击，在两个重叠元素之间轮选 | `03-overlap-selection.png`、`overlap` |
| 箭头标签拖动 | 标签沿箭头移动，labelPosition 从 0.5 到 0.825，箭头位置和尺寸未改变 | `04-arrow-label.png`、`arrowLabel` |
| 编辑中文字拖拽复制 | Option 拖拽生成副本，编号从 1 自动变 2，原文保留 | `05-text-alt-duplicate.png`、`textAltDrag` |
| 生成框与文字焦点 | 输入 n/w 不切换画布工具、不新增元素；便签文字编辑同样正常 | `composerFocus`、`contentBeforeReload` |
| 图片裁剪 | 导入 600×400 PNG；拖手柄裁剪、双击手柄恢复、Option 对称裁剪、Option+Shift 保持比例通过；宿主详情和图片引用正常 | `08-crop-editor.png`、`09-cropped.png`、`10-crop-modifiers.png` |
| 常用字体与颜色 | 拖排、从字体列表固定字体、点击应用正常；刷新后收藏顺序丢失，见 F1 | `11-custom-picks.png`、`19-font-pinned.png` |
| Mermaid | 流程图、甘特图、象限图、时间线均通过真实预览和插入；分别新增 11、21、17、20 个可编辑图元，无图片替代；时间线刷新恢复正常 | `14-mermaid-flow-preview.png`、`15-mermaid-*-preview.png`、`16-mermaid-*-canvas.png` |
| 画布导航 | 右键拖动平移通过；按住中键滚轮缩放从 1 到 1.116836；Option+方向键沿连接关系选择下一节点 | `navigation`、`middleWheel`、`17-flowchart-navigation.png` |
| 撤销/重做 | 界面按钮撤销复制后元素数 3→2，重做恢复 3；原生菜单快捷键补验受阻，见限制 | `undoRedo` |
| 深色与窄窗 | 1000×700、双侧栏下交互可用；本轮截图处于侧栏动画中，不据此判定静态布局问题；稳定布局证据复用前一轮 `minimap-narrow-dark.png` | `20-narrow-dark-docks.png`、前轮小地图证据 |

### 接入问题

**F1 · P2：常用字体和颜色收藏刷新后恢复默认。** 在样式面板把常用字体拖为 `[8,5,6]`，把蓝色拖到常用描边色首位，然后刷新项目。`fontTopPicks` 从该数组变为 `null`，`colorTopPicks.elementStroke` 从自定义数组变为 `null`。已经应用到图元的样式不受此问题影响。

源码核对：`apps/image-board-desktop/src/app/project/sceneSerialization.ts` 的项目序列化使用 `serializeAsJSON(..., "local")`，共享配置使用 `cleanAppStateForExport`；`packages/excalidraw/data/json.ts` 的 local 分支也清理导出状态。`packages/excalidraw/appState.ts` 将这两个偏好字段标为仅 browser 保存，export/server 均不保存，宿主未接入对应的独立偏好持久化。后续应在桌面用户偏好层保存/恢复，避免把个人收藏写进共享项目。复现数据见 `prefsBeforeReload` / `prefsAfterReload`。

**F2 · P3：输入设备偏好缺少产品入口。** 实机主菜单仅有项目操作、关于与更新、帮助、主题；上游输入设备选择未接入。`apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx` 自定义菜单没有上游偏好入口。因此默认导航交互可用，但用户无法从界面选择鼠标/触控板等模式。此项是接入缺口，不是中键缩放或右键平移失效。截图见 `06-main-menu.png`。

**F3 · P3：新增能力的中文说明过时或缺失。** `packages/excalidraw/locales/zh-CN.json` 的 Mermaid 说明仍声称其他图表只能以图片呈现，与甘特图、象限图、时间线实际生成可编辑图元相矛盾。便签样式面板还显示英文 `Text color`，常用颜色相关提示翻译未完整补齐。截图见 `14-mermaid-flow-preview.png`、`01-sticky-inspector.png`。此项不阻断功能，但会误导使用者。

### 验证限制与收尾

- 未发现本轮测试场景的画布内容丢失，未捕获的 renderer 异常为 0。日志中的两次 data URL CSP 拒绝来自测试夹具脚本；改用 File 导入后通过，不计为产品错误。
- macOS 原生菜单 Cmd+Z / Cmd+D 补验未完成：Computer Use 读取窗口和截图成功，发送原生输入前报 `noWindowsAvailable`。这是工具阻塞，不能据此认定产品快捷键有缺陷。画布快捷键及撤销/重做按钮的通过证据也不替代该原生菜单补验。
- 箭头变形后标签跟随未取得本轮有效交互证据；本轮确认的是沿路径拖动标签。没有开展发布包、真实付费生成或性能量化验收。
- 本轮未改产品实现，复用前轮类型、定向测试与构建结果，没有重复全量测试或打包。
- 已断开本轮 CDP 连接，通过固定 `runtime:stop:source` 停止 SOURCE DEV。Electron PGID 20548 与启动器 PGID 19867 均无残留，5174 / 9331 / 60910 无监听；正式 CoreStudio 和宿主管理的共享运行时未清理。日志见 `stop.log`、`cleanup-final.txt`。
- 本轮交付为本节验收记录与本机证据，没有 Git 提交、推送、发布或生产安装。

## 2026-11-13 三项接入问题修复与复验

用户授权修复上述 F1、F2、F3。三项均已在工作区完成，SOURCE DEV 实机复验通过。

### 修复结果

- **F1：收藏持久化。** 常用字体、五类常用颜色和输入设备选择通过现有桌面设置 IPC 保存到开发版 profile 的 `canvas-interaction-settings.json`。项目窗口使用临时 Chromium partition，浏览器存储只能覆盖刷新，不能覆盖完整退出；因此最终实现不依赖 localStorage，也不改变项目窗口隔离策略。主进程串行执行原子写入，保留已有滚轮速度配置，并通过现有设置事件同步其他项目窗口。加载期间的用户选择不会被较晚返回的设置覆盖，偏好恢复不进入画布撤销记录，也不写进共享项目。
- **F2：输入设备入口。** 项目主菜单增加“首选项 → 输入设备”，直接复用上游鼠标/触控板选项。宿主样式为中文选项保留足够宽度，避免文字竖排；没有开放其他未经本轮验收的上游首选项。
- **F3：中文说明。** Mermaid 说明与当前支持范围一致，明确甘特图、象限图、时间线等转换为可编辑图元；补齐便签“文字颜色”、字体/颜色收藏提示、恢复默认及重置按钮、输入设备选项的中文。

主要实现位于桌面端 `src/app/canvasInteraction/canvasPreferences.ts`、`electron/canvasInteractionSettingsStore.ts`、`electron/canvasInteractionSettingsController.ts`、`ProjectMainMenu.tsx/css`，通过 `desktopBridgeTypes.ts`、`preload.ts` 和 `main.ts` 接入现有设置通道。上游内核仅补充 `locales/zh-CN.json` 文案。

### 验证结果

| 检查 | 结果 |
| --- | --- |
| 新增定向测试 | 3 个文件、9 项通过；覆盖实际设置文件重建后恢复、旧配置兼容、并行保存不丢滚轮速度、刷新恢复、恢复默认、共享项目排除偏好、初始化竞态、跨窗口事件和卸载清理 |
| 上游字体交互回归 | 6 项通过 |
| 上游补丁登记 | 2 项通过；扫描耗时约 10 秒，首次触及 Vitest 默认 5 秒超时，单独用 30 秒限时重跑通过；未修改测试逻辑 |
| 类型与格式 | `corepack yarn test:typecheck` 通过；相关新增/独立修改文件的 Prettier 检查通过 |
| 收藏自定义与刷新 | 真实拖拽字体为 `[8,5,6]`，将蓝色移到描边收藏首位；刷新后顺序保持，并核对实际设置文件 |
| 恢复默认 | 点击中文恢复默认入口后，字体/颜色偏好恢复 `null`；刷新后仍为默认值 |
| 完整退出再启动 | 固定停止入口关闭整个开发版及 renderer 后，通过 `dev:desktop` 重启；字体 `[8,5,6]`、蓝色首位和鼠标模式全部恢复 |
| 画布数据 | 冷启动前后 76 个图元按 ID 比较，类型和文字内容一致 |
| 输入设备实际行为 | 鼠标模式普通滚轮使缩放从 1 变为 0.895386；触控板模式相同滚轮输入保持缩放、改变视口位置 |
| 中文与布局 | 便签、字体/颜色收藏提示和 Mermaid 说明实机确认；1400×880 浅色、1000×700 深色菜单文字完整且可操作 |
| Mermaid 回归 | 流程图、甘特图、象限图、时间线重新预览和插入，分别新增 11、21、17、20 个可编辑图元，无图片替代 |
| 生成框焦点 | 输入 n/w 文本未触发画布工具切换 |

本轮采用 L1 定向验证和 L3 固定源码 Electron 验收，没有重复全量测试、打包或生产安装。其他未受影响的新功能复用上一节验收证据；上一轮 macOS 原生菜单快捷键补验的工具限制仍保留，不把它混入本次三项修复的通过结论。

本机证据目录：`/tmp/corestudio-fixes-20261113/`。以 `durable-evidence.json`、`14-cold-start-restored.png`、`15-cold-start-menu.png` 和 `identity-final-start.log` 为最终持久化证据；`06-font-tip-zh.png`、`08-mermaid-zh.png`、`09-*-preview.png`、`12-dark-narrow-stable.png` 为界面证据。目录内较早的 `evidence.json` 记录了排查过程，其中浏览器存储方案在冷重启失败，已被最终桌面设置实现替代。

收尾：本轮四次固定入口启动均已停止，对应 Electron/启动器进程组 `64685/64052`、`68331/67742`、`72208/71611`、`74194/73598` 残留为 0，5174 / 9331 / 60910 无监听；最终结果在 `cleanup-final.json`。未操作正式版项目或设置，未提交、推送或发布。

### 本地提交交付范围

用户随后授权将上游更新、模型清单与接入修复一起提交，提交说明使用中文。主仓库合并为一个本地提交；独立的 `CoreStudio-Model-Catalog` 仓库同步提交 revision 6 及说明，两个目录 JSON 内容一致。此授权不包含推送或发布。

小地图与底栏避让依赖生成框高度上报，因此将已有的 `GenerateImageDialog.tsx` 高度上报及 `App.tsx` 接线一并纳入，确保提交可独立还原已验收的布局。主仓库 README、性能分析文档、`App.css` 浮动状态提示避让和 `tools/` 的无关改动不纳入，继续留在工作区。
