# CoreStudio Review 修复实施计划

> 日期：2026-09-05
> 状态：第一轮修复及生命周期治理已提交；原 L3 验收已补齐。依赖升级实现、完整回归和 ad-hoc 打包 smoke 均完成，升级代码尚未提交。发布签名、安装和发布不在本轮完成范围。
> 审查基线：本地 `f66234966`；实施基线：远端已合入的 `d3b394e02`（1.1.45）

## 目标与范围

让 Agent 的结果进入正确项目、明确保存，并在保存失败或回执丢失后安全重试；降低大画布局部编辑的房间处理开销。用户已授权制定计划并执行修复。

实施前发现本地 main 落后：PR #129 已交付 Agent 项目绑定、无标签写入及 Home 可见性。因此保留该实现，在最新基线上复核和补强，不重复重写项目路由，不将旧 review 当作最新版缺陷清单。

本轮不新增模型、不重做视觉系统、不整体拆分 App/main、不替换画布底座。架构调整限于目标解析和写入请求生命周期的明确归属。交付为本地源码、测试与验证证据；不自动提交、推送、安装替换正式版或发布。

## 阶段与依赖

### A. 目标绑定复核与补强

- [x] 更新远端引用，确认最新已合入源码和干净工作区，在独立修复分支实施。
- [x] 复核可信 session、兼容 Codex 身份、Board claim、桌面标签关闭及无标签写入链路。
- [x] 将绑定解析收敛为可独立测试的服务，每次核对稳定 Board 对应项目和房间身份，失效时明确失败，不回退桌面当前项目。
- [x] 先写失败测试：项目被替换、房间 epoch 改变、失效绑定、双任务隔离；再完成最小实现并运行定向回归。

### B. Agent 写入请求与保存回执

- [x] 为图片、提示词、图表写入提供可复用的 `requestId`，CLI 支持显式指定；重复调用同一 ID 不重新准备元素或资产。
- [x] 在 Project Room 生命周期内维护有界请求记录，统一处理并发同请求、内容冲突、已接受待保存、已保存回放。不能静默淘汰记录后把旧请求当成新写入。
- [x] 请求指纹排除 CLI 每次读取文件生成的 fileId/createdAt，保留图片内容与有意义的参数；同一 ID 改内容必须拒绝。
- [x] 保存失败返回已接受的 operationId、元素/资产 ID 和保存状态，重试只续存原操作；接受前失败可以重试。
- [x] 明确边界：请求记录随房间/进程结束失效，不承诺跨重启的持久幂等。重启后的未知结果先核对画布，禁止盲目自动重放；本轮不增加自动网络重试。
- [x] 先复现保存失败重试、回执丢失模拟、并发重复请求、不同 actor、内容冲突，再实现并通过 HTTP 到真实房间/临时项目文件的集成测试。

### C. 大画布局部编辑性能

- [x] 保留房间元素顺序不变量，位置、样式等不改变 index 的局部编辑跳过全场景克隆与排序。
- [x] 新增、层级变动、非法或重复 index 仍走现有规范化规则；保留冲突合并、软删除和广播语义。
- [x] 回归覆盖输入隔离、过期更新、排序修复、混合操作；用同一合成场景比较优化前后，不以脆弱的绝对耗时作为单测门禁。
- [x] 目标：5,000 元素单元素普通修改的房间处理中位耗时较同环境基线下降至少 50%，并报告测量边界。

### D. 集成验收与文档收尾

- [x] 更新 CLI contract 和 Agent 使用说明中的重试规则，测试契约与运行代码一致。
- [x] 所有定向测试通过后运行一次完整桌面测试、typecheck、源码/打包输入密钥扫描、构建及 bundle budget；不与同类高资源任务并发。
- [x] 采用固定 `corepack yarn dev:desktop` 完成一次 L3：校验运行身份，临时项目双目标隔离、无标签写入、重复请求及结果可见性；只操作开发版测试数据。证据见 G 阶段，早期阻塞记录保留为历史。
- [x] 核对本任务进程树，清理精确所属实例并复查；记录结果、已知边界与剩余事项。后续继续 L3 时仍需清理该次新启动实例。

### E/F. 追加范围：生命周期治理与纵向测试（用户于 2026-09-05 授权）

遵循 `docs/doc/excalidraw-fork-maintenance.md`：扩展逻辑和测试全部留在 CoreStudio workspace，禁止为本次治理修改 `excalidraw/packages/` 或升级依赖。上一轮 `194e3357e` 也未触碰上游底座。沿用当前计划，不整体重写 App/main，不引入第二套状态管理框架。

- [x] E1：先用失败测试覆盖同一 actor 并发重绑、Bridge 停止时仍在等待的 claim、房间关闭后清理绑定和订阅、重复启动/停止。
- [x] E2：新增 CoreStudio 自有 Agent 项目生命周期模块，集中管理绑定、异步 claim 代次和房间订阅；main 仅保留依赖装配。桌面标签关闭不等于 Agent 生命周期结束。
- [x] F1：新增真实 CLI → HTTP Bridge → 主进程写入准备 → Project Room → 临时磁盘项目的纵向 harness。复用生产模块，只对磁盘失败和网络回执丢失注入故障，不 mock 写入流程或使用用户项目。
- [x] F2：覆盖两个独立 session 的项目隔离、无 renderer 写入、并发同 ID、保存失败续存、已保存回执丢失、房间关闭/重新打开及 Bridge 停止期间的请求；检查最终资产、记录、scene 和房间参与者。
- [x] F3：定向测试、typecheck、完整桌面测试一次及构建；核对上游底座零改动。记录自动化证明范围，保留尚未完成的 L3 界面验收，不用纵向测试替代它。

## 完成标准

1. 可信请求不能因桌面切换、失效绑定或项目替换而落到另一个项目。
2. 同一房间内同一 actor 的同一请求至多准备/接受一次；保存失败后的重复请求不会插入第二份元素。
3. 成功回执与 `persistedSequence` 一致，失败回执能区分已接受和未接受。
4. 普通局部编辑显著降低房间处理开销，排序、冲突和软删除行为保持正确。
5. 自动化与 L3 证据分别记录，不把构建通过当作真实界面或正式版发布完成。

## 执行记录

- 初始复核：远端最新为 `d3b394e02`；工作分支 `walnut/review-reliability-20260905`。1.1.45 已有项目解耦；随机 operationId 和每次全量排序路径仍与审查基线相同。

### 实现与当前证据

- 新增 `agentTargetResolver`，每次请求验证当前项目清单的 projectId、stableBoardId 和权限，以及异步读取期间的绑定变化、房间路径、roomId、epoch 和关闭状态。
- CLI 普通写入自动携带 requestId，也可显式传入；HTTP 指纹忽略图片读取时的易变元数据。房间请求记录最多 4,096 条，满时拒绝新请求，已有回执独立于底层 operation 历史保留。
- 故障注入先复现、后修复：保存失败后重试只保存同一元素；HTTP 并发重试保留相同 operation、asset、element ID；已保存请求不因后续无关保存失败而报错。
- 源码集成合同更新为 Agent 2.1.2 / Skill 21；兼容 Codex 1.13.2 / Skill 20。未修改本机已安装 Skill，也未发布。
- 基准脚本：`excalidraw/apps/image-board-desktop/scripts/benchmark-project-room.mjs`。同一 Node 环境、5 次预热、40 次采样、每次仅改一个元素，未接入 IPC、监听者、磁盘或渲染。

| 元素数 | 修改前中位 / P95 (ms) | 修改后中位 / P95 (ms) |
| ------ | --------------------- | --------------------- |
| 500    | 1.146 / 1.435         | 0.026 / 0.144         |
| 2,000  | 4.672 / 5.600         | 0.081 / 0.202         |
| 5,000  | 12.878 / 15.510       | 0.247 / 0.493         |

5,000 元素的中位开销下降约 98.1%；不将该微基准解释为整个 UI 的帧率提升。

L3 前置检查：源码版和打包预览版 verifier 均报告无对应身份，但机器已有旧 `release-dev/mac-arm64/CoreStudio Dev.app` 进程（PID/PGID 35768）。按运行安全规范暂停 GUI，已询问用户是否允许正常退出这个精确旧实例。

### 自动化收尾结果

- `corepack yarn test:desktop`：完整运行一次，287 个文件、2,207 个测试通过，243.59 秒。测试 runner 报告 `cleanup=complete`、`remaining=0`、`lockReleased=true`，退出后核对 PID 42468 / 42507 均已结束。
- `corepack yarn test:typecheck`：最终检查通过，28.66 秒。
- `corepack yarn check:desktop-secrets --source --package-inputs`：通过，扫描 1,022 个文件。
- `corepack yarn build:desktop`：通过，22.72 秒。仍有 Excalidraw 分块循环依赖、混合静态/动态导入、大 chunk 和 CJS 中 import.meta 的构建警告，本轮没有扩展到这些未修改路径；不能据构建通过推断其全部运行行为已经验证。
- `corepack yarn --cwd apps/image-board-desktop check:bundle-budget`：全部 renderer chunk 在审核预算内。
- `corepack yarn --cwd apps/image-board-desktop check:bundle-paths --build`：通过。
- `git diff --check`：通过。本轮测试、类型检查、扫描和构建进程均已退出，未启动 GUI 或打包进程；旧开发版及其他既有进程保留。

### 尚待完成

L3 场景验收尚未完成，不能标记整轮验收通过。首次等待旧实例退出确认的阻塞已解除；当前阻塞和下一步见下节。未推送、安装替换正式版或发布。

### 提交与 L3 续跑（2026-09-05）

- 用户要求先提交再继续。源码提交为 `194e3357e`：`修复 Agent 写入重试与目标校验并优化房间局部更新`，27 个文件；提交前工作区只包含本轮改动，未推送。
- 按用户继续下一步的要求，再次核对旧 Dev PID/PGID 35768 及精确可执行文件，通过正常退出请求关闭；随后确认该进程组已经结束。
- 使用固定 `corepack yarn dev:desktop` 启动源码版，`verify:desktop:source` 通过。身份为 `source-dev`，提交 `194e3357e`、`gitDirty: false`，PID/PGID 83391，Bridge 60910，调试端口 9331；真实窗口显示 `SOURCE DEV · 194e3357e`。
- 将 CLI 连接到这个固定源码实例的 session 文件，未认领目标时 `read status` 返回 `AGENT_TARGET_REQUIRED`，未回退到桌面项目。没有连接正式版 Bridge。
- 尝试通过客户端原生新建项目流程，在 `/private/tmp/corestudio-review-194e3357e/验收甲` 和 `验收乙` 创建测试项目。Computer Use 可以读取窗口，但坐标动作反复返回 `noWindowsAvailable`，部分 AX 操作未产生预期选择；目录确认按钮持续显示禁用。一次错误目录选择被客户端以“目标项目文件夹已经存在且不为空”拒绝。测试项目尚未成功创建，不能据此认定新建项目功能本身存在缺陷。
- 因而双目标隔离、无桌面标签写入、重复请求及真实画布结果可见性仍未完成。下一步需要恢复原生窗口控制，或由人工通过客户端先创建这两个空测试项目，再继续 CLI / Bridge 与界面联合验收。不得手工构造项目文件替代该验收，也不需要重复全量测试。
- 已执行固定 `runtime:stop:source`，返回 `PGID=83391 remaining=0`；外层 Electron/Vite 启动任务也已退出。复查 83391、83326、83317、83311、82687 均不存在。Computer Use kernel reset 后，本次新增 84089、84090 已退出；既有服务及其他任务进程保留。

### 生命周期治理与纵向测试交付（2026-09-05）

- 生产模块 `electron/agent/agentProjectLifecycle.ts` 统一拥有绑定、在途 claim 和房间订阅，main 移除原先分散的 Map、订阅和清理代码。最新 claim 获胜，Bridge 停止时清除在途认领；即使重启后认领相同项目，旧的异步目标解析也会因生命周期代次失效而拒绝。房间关闭只清理其自身绑定，桌面标签和项目租约保持独立归属。
- 新增 6 个生命周期测试与 4 个纵向场景。纯 Node 纵向入口真实运行 CLI/session 文件发现、localhost HTTP、身份认领、主进程图片/提示词准备、房间协调和磁盘保存，不使用 renderer 或 DOM mock。验证资产字节、图片记录、scene 引用、持久化序号与临时 writer 释放。
- 纵向场景覆盖双 session 与桌面焦点隔离、无桌面项目写入、未绑定拒绝、同 ID 并发重试及内容冲突、磁盘失败续存、成功回执丢失、关闭重开、Bridge 停止时允许已接受保存完成并拒绝新写入。
- 新增 workspace 自有 `vitest.agent-integration.config.mts` 和 `test:agent-integration` 命令，并接入 GitHub Actions。该入口在无 DOM setup 的 Node 环境通过；现有完整桌面测试中的 jsdom 执行不能替代它。CI 配置已修改，本轮未推送，因此没有声称远端 CI 已运行。
- TDD 证据：生命周期模块缺失时测试先失败；之后额外测试复现“停止前的解析在同目标重新认领后错误成功”，添加生命周期代次后通过。初次定向命令误用了总入口，发现范围扩大后终止精确 runner，确认 `remaining=0`、锁释放，再改用直接 Vitest 定向入口。
- 最终定向验证：4 个文件、19 项通过；独立纯 Node 入口 4 项通过。类型检查通过，23.24 秒。完整桌面回归一次完成：289 个文件、2,217 项通过，129.28 秒；runner 报告 `cleanup=complete`、`remaining=0`、`lockReleased=true`，PID 5990 / 6026 已退出。
- 源码/打包输入密钥扫描通过，1,029 个文件；桌面构建通过，10.11 秒；bundle budget 与构建路径扫描通过。保留上一节已说明的上游分块与 CJS import.meta 构建警告，不以这次治理顺带修改底座。最终复查本次测试、构建和检查进程均已退出。
- 边界复核：本轮以及上一轮都没有修改 `excalidraw/packages/`；本轮也没有修改根 workspace package.json、yarn.lock 或上游 Vitest 配置。仅 CoreStudio 应用、仓库 CI 和文档发生变化。格式化脚本附带产生的一处无关 CSS 排版差异已撤销。
- 本轮没有启动新的 Electron GUI、打包、安装、发布或远端推送；原 D 阶段的 L3 验收仍明确未完成。新增工程治理经用户明确要求，于 2026-09-05 完成本地提交。

## G. 上游依赖分批升级（2026-09-05 用户授权）

目标：先补安全依赖，再更新 Electron，最后定向回补套索与取色器。保持现有 Excalidraw 整体基线，不整体 merge master，不顺带更新 React、Lexical、Vite、TypeScript 或箭头文字功能。用户明确选择 Electron 44.2.0，并接受最低 macOS 13 与剪贴板 API 迁移；兼容代码留在 CoreStudio workspace。

- [x] G1：DOMPurify 3.4.12 → 3.4.14、ws 8.21.0 → 8.21.3、Vitest/coverage 3.2.6 → 3.2.7；核验实际依赖链并运行定向回归。
- [x] G2：Electron 41.2.0 → 44.2.0；核对 42–44 破坏性变化，迁移剪贴板，更新 macOS 系统要求，完成类型和定向测试。
- [x] G3：按上游原始补丁回补套索 c5a50d2、取色器 cf212b2 及必要填色依赖 4872083；先运行对应失败测试，再应用实现。记录完整 SHA 与补丁组，不把部分回补标为整体基线前进。
- [x] G4：收尾运行一次完整桌面测试、纯 Node Agent 集成、类型检查、密钥扫描、构建、bundle 预算与路径检查；固定入口完成 L3 和打包 smoke，检查精确进程清理。打包采用 ad-hoc 验证签名，正式 Developer ID 签名未完成。

升级前：工作区干净，HEAD 3cfae05af。正式应用 PID 18230 已在运行，仅观察并保留。本轮不提交、推送、安装或发布正式版。上游维护 dry-run 确认既有 64 个差异路径均登记。最新上游 214cd6e 比基线多 16 个提交，143 个路径变化；整体同步会重叠 11 个本地补丁路径，模拟冲突 2 个测试文件，因此采用定向回补。

依据：[Electron 44 破坏性变化](https://www.electronjs.org/docs/latest/breaking-changes)、[DOMPurify 3.4.14](https://github.com/cure53/DOMPurify/releases/tag/3.4.14)、[ws 8.21.3](https://github.com/websockets/ws/releases/tag/8.21.3)、[Vitest 3.2.7](https://github.com/vitest-dev/vitest/releases/tag/v3.2.7)。

### 升级实现与定向验证

- 安全依赖先更新测试期望，旧安装实际失败 3 项，安装后 6 项通过；图表 renderer 另有 2 项通过。锁文件与实际依赖链一致。
- Electron npm 包及已下载二进制均为 44.2.0；新增 `electron/systemClipboard.ts` 适配异步 ClipboardItem API，原始可编辑文本和 PNG 预览在一次写入中提交，调用链等待异步完成。图片读取支持 PNG/JPEG/WebP 并归一为 PNG。底座没有因 Electron 迁移增加补丁。
- 剪贴板 TDD 先复现异步失败提前返回成功，增加 await 后通过；适配器、项目复制、运行身份和 Electron 下载入口共 4 个文件 25 项通过。根 Node 开发要求提升为 22.12.0，CI 已使用 Node 22；macOS 最低 13.0 写入打包配置。现有正式发布清单不改写。
- 上游测试先复现套索 7 项、取色/填色 15 项失败，再顺序应用三个原始提交的相关补丁。回归 6 个文件 165 项通过、1 项上游既有跳过。补丁组记录完整 SHA；基线仍为 85270fcc，当前 79 个差异路径全部登记。
- 最终类型检查通过；纯 Node Agent 纵向入口 4 项通过。详细日志在 `/tmp/corestudio-upgrade-*.log`，仅为本机临时证据。

### L3 真实界面结果（补齐原 D 阶段）

- 固定 `dev:desktop` 启动，source verifier 通过：PID/PGID 73868、Bridge 60910、调试端口 9331，窗口显示 `SOURCE DEV · 3cfae05af-dirty`。本次原生窗口控制可用，通过客户端原生目录选择流程创建 `/private/tmp/corestudio-upgrade-20260905/验收甲`、`验收乙`，未手工构造项目文件。
- 甲 Board 为 `cd3be109-86c3-48f1-839b-7f10d6f528da`，乙为 `91718914-7019-437c-9219-b0631fd4ebb7`。通过各自可见页面 nonce 认领，CLI 使用固定开发版 session；正式版 PID 18230 保留。
- 从甲真实复制图片，在乙真实粘贴后可见。通过乙 CLI 获取资产路径，原始文件与乙资产 SHA-256 完全一致，均为 `e42f75396f80745a73a06a0a81f14cbce4fbb160e05ecf09b539ebf2c6f61b35`，实际图片尺寸 2400×1600。画布记录中的 640×427 是展示尺寸，不能据此判断原图被缩小。
- 关闭甲的桌面标签并停留 Home，首页仍显示 Agent 使用甲。写入提示词成功落在甲 Room `cd5dc99b-d53c-430f-a07e-c5fe12fcf72d`，保存序号 3，Agent 浏览器画布立即可见该文字；乙未出现这条文字。
- 对原 `upgrade-image-a` 请求重试，operationId `a192a256-faaf-41d0-a49b-2c7a89535e2c`、元素及资产 ID 均未变化，房间序号仍为原操作的 2，持久化序号为当前 3，没有插入重复图片。
- 在真实画布深色主题中打开取色器，确认圆形预览呈现并可采样图像、更新背景色控件；套索工具可激活并正常呈现。套索包含/交叠语义以及颜色换算由上述定向自动化覆盖，不将工具外观检查描述为完整人工手势矩阵。
- 关闭本次两个浏览器画板，固定 `runtime:stop:source` 返回 `PGID=73868 remaining=0`，外层 Electron/Vite 命令退出；CUA reset 后本次 kernel 74493 / worker 74494 已退出，既有服务和其他任务进程保留。

### 最终回归与打包结果

- 完整桌面测试仅运行一次：290 个文件、2,223 项全部通过，213.48 秒；runner 报告 `cleanup=complete`、`remaining=0`、`lockReleased=true`，14435 / 14470 / 14471 已退出。上游维护合同另外 2 个文件、7 项通过；workspace scope 和安全合同已包含于完整桌面测试。
- 最终类型检查通过，29.89 秒。构建通过，源码与打包输入扫描通过（1,031 个文件），bundle budget、构建路径、打包路径与 release 扫描均通过。
- `package:dir:diagnostic` 的构建和扫描完成后，Developer ID 签名停留在 codesign，并启动系统 SecurityAgent；等待近三分钟仍未完成。核对后终止本轮 PGID 41864，确认其中 launcher/builder/codesign 均已退出。未读取钥匙串、输入凭据或修改正式签名配置。
- 复用已验证的构建，以 `corepack yarn electron-builder --dir --config.mac.identity=-` 完成本地 ad-hoc 签名包，6.02 秒。产物 `apps/image-board-desktop/release/mac-arm64/CoreStudio.app` 仅用于验证；包内 Electron Framework 为 44.2.0，Info.plist 的 LSMinimumSystemVersion 为 13.0。没有在 macOS 13 实机上复测，也没有完成发布签名/公证。
- 固定 `smoke:packaged` 通过：legacy 和多宿主 Agent 集成安装资源、临时用户目录中的 production 启动、QA 启动均通过，4.97 秒。production/QA smoke 使用端口 60912/60911 和独立临时目录，未连接正式版数据。50794 / 50800 及 PGID 50122 已退出，源码、smoke 和调试端口均不再监听。
- 保留现有上游 chunk/CJS import.meta 构建提示，以及未使用的 Lexical Yjs 协作入口 peer 依赖和重复依赖收集提示；没有因此扩展到 Lexical 重构。实际包已成功启动，但 smoke 不代表所有产品功能逐项人工验收。
- 交付边界：本轮源码升级及本地验收完成；没有提交升级代码、推送、合并 PR、安装替换正式版或发布。系统 SecurityAgent 为 macOS 服务，保留；正式 CoreStudio PID 18230 及其他任务进程保留。
