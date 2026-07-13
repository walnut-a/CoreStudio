# CoreStudio 桌面依赖安全边界

## 结论

CoreStudio 桌面依赖安全不能直接用全仓 `yarn audit --groups dependencies` 的总数判断。

原因是 `excalidraw/apps/image-board-desktop/package.json` 把 renderer 和 Electron 运行依赖放在 `devDependencies`，随后由 Vite 和 esbuild 打入 `dist/`、`dist-electron/`；`--groups dependencies` 会排除这些真正进入桌面产物的依赖。全量 `yarn audit` 还会混入构建工具和共享包开发依赖，仍不能直接当作桌面 bundle 的攻击面数量。

因此本项目使用两层口径：

1. `desktopDependencySecurity.test.ts` 检查 CoreStudio 实际安装图和固定安全版本，属于产品门禁。
2. 活动 workspace 的 `yarn audit` 用来维护工具链和共享包开发依赖 backlog，不把总数伪装成桌面产品结论。

## 2026-07-12 已修复链路

| 入口 | 实际链路 | 修复后版本 | 说明 |
| --- | --- | --- | --- |
| Electron Gemini provider | `@google/genai → protobufjs` | `7.6.3` | 修复代码执行、代码注入和 DoS 等 advisory 对应版本 |
| Electron Gemini provider | `@google/genai → ws` | `8.21.0` | 修复内存泄露/耗尽类 advisory 对应版本 |
| Renderer Excalidraw | `@excalidraw/mermaid-to-excalidraw → mermaid` | `11.16.0` | 提升到当前已修复 Mermaid 安全问题的版本 |
| Renderer Excalidraw | `mermaid → dompurify` | `3.4.12` | 修复多条 sanitization bypass advisory |
| Renderer Excalidraw | Mermaid/parser 链路 → `lodash-es` | `4.18.1` | 修复 code injection 和 prototype pollution advisory |
| Excalidraw 直接依赖 | `nanoid` | `3.3.8` | 提升 3.x 安全下限，不跨 major |
| Excalidraw 构建依赖 | `sass → immutable` | `sass 1.85.1`、`immutable 5.1.9` | 移除旧 `immutable 4.3.7/5.0.3` 高危路径 |
| 测试/打包工具链 | `jsdom` 等路径 → `form-data` | `4.0.6` | 消除旧 multipart boundary 与 CRLF injection 路径 |
| 测试基础设施 | `vitest` / `@vitest/coverage-v8` | `3.2.6` | 关闭旧 Vitest UI server critical advisory，并保持配对版本 |

根 `resolutions` 对 `ws` 和 `lodash-es` 是有意的安全覆盖：部分旧上游包仍声明 `~8.17.1`、`8.5.0` 或精确 `4.17.21`，Yarn 会提示范围不兼容。它们保持同一 major，且必须经过完整 desktop tests、typecheck 和 production build 才能进入候选分支。

## 持续门禁

安全 contract 位于：

```text
excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts
```

它同时验证：

- 根 `resolutions` 和 Excalidraw 直接依赖声明。
- 从 `@google/genai` 入口实际解析到的 `protobufjs/ws`。
- 从 Mermaid adapter 入口实际解析到的 `mermaid/DOMPurify/lodash-es`。
- 从 Excalidraw 入口实际解析到的 `nanoid/sass/immutable`。
- 测试基础设施从 `jsdom` 实际解析到的 `form-data`。
- `vitest` 与 `@vitest/coverage-v8` 保持在 `3.2.6`，不恢复 `@vitest/ui` 或 `test:ui`。
- App 大型 mock 只位于专用 `App.testSetup.tsx`，并通过 `corestudio-app` Vitest project 与其他测试隔离。

GitHub Actions 在 frozen install 后、typecheck 前单独运行该 contract。这样锁文件漂移或 Yarn hoist 变化会直接让远端门禁失败。

## 已回补但仍可能被版本型 audit 标记

本地 fork 的 `@excalidraw/excalidraw` 版本仍为 `0.18.0`，但其 `@excalidraw/mermaid-to-excalidraw` 已是 `2.2.2`。Excalidraw 官方 [v0.18.1 release](https://github.com/excalidraw/excalidraw/releases/tag/v0.18.1) 明确说明该安全版的核心回补就是把 adapter 提升到 `2.2.2`，用于缓解 Mermaid XSS。上游对应的 [Mermaid advisory](https://github.com/advisories/GHSA-7rqq-prvp-x9jh) 说明了受影响版本和 `innerHTML` 注入路径。

因此全仓 audit 仍可能仅按 `@excalidraw/excalidraw@0.18.0` 版本号报告 moderate；本项目不通过修改 fork 的 package version 假装升级了整份上游源码，而是用真实 adapter 和安装图 contract 证明回补状态。

## 2026-07-13 工作区收口

根 workspace 现在只包含 `apps/image-board-desktop` 和 `packages/*`。`excalidraw-app/` 与 `examples/` 源码仍保留用于上游对照，但不再参与 CoreStudio 的安装、审计、测试或发布；根脚本也不再暴露这些未维护入口。

对应 contract 位于 `apps/image-board-desktop/scripts/workspaceScope.test.ts`。收口、移除只服务上游 Web 的根工具、删除实际不可执行的历史 ESLint/size-limit 链路并升级 Vite 后，活动安装图从 1529 个依赖降到 725 个，critical 从 1 降到 0，high 从 78 降到 0，moderate 从 77 降到 2，low 从 22 降到 0；原来的 `with-nextjs → next`、Firebase、web-only Socket.IO、PWA、旧 Babel build、Vite 5、旧 Rollup、Puppeteer/size-limit 和失效 lint 链路不再进入 CoreStudio 锁文件。

桌面构建工具现在固定为 Vite `7.3.6`、`@vitejs/plugin-react 5.2.0` 和直接声明的 esbuild `0.28.1`，Node 下限为 `20.19.0`。TypeScript 使用与 Vite ESM exports 匹配的 `moduleResolution: bundler`。production build 已确认不再出现 Sass legacy JS API 弃用告警。

## 接受风险与剩余治理面

### 依赖告警治理规范

本节是后续开发和发布必须遵守的规则，不只是本次审计结论。

#### 阻断门槛

- 活动 workspace 出现 `critical` 或 `high` advisory 时，禁止合并和正式发布；必须修复、移除依赖，或证明告警不在当前安装图中。
- `moderate` 不能靠统一忽略、隐藏 audit 输出或随意改本地 package version 消除。每一项都必须记录依赖链、实际可达性、现有缓解措施、不立即升级的原因和下次复核期限。
- `low` 和开发工具告警可以进入 backlog，但仍须保留完整 audit 输出，不能把“非运行时风险”表述成“没有风险”。
- 禁止仅为消除告警而强制跨 major resolution。任何 resolution 都必须说明兼容边界，并通过 frozen install、依赖安全 contract、typecheck、完整桌面测试和 production build。

#### 复核节奏

- 每次正式发布前必须重新运行安装图 contract 和活动 workspace audit。
- 活跃开发期间至少每月复核一次；如果一个月内没有开发或发布，可以顺延到下一次开发恢复时，但必须早于下一次正式发布。
- 依赖声明、`yarn.lock`、workspace 范围、打包入口或 Electron/renderer 边界发生变化时，必须立即复核，不能等到月度检查。
- GitHub advisory 的等级、受影响版本或利用条件变化，或者上游发布兼容修复时，必须重新判断原有接受结论。

#### 接受风险的有效期

接受风险不是永久豁免。记录至少要包含：

1. advisory 和完整依赖链；
2. 是否进入 renderer、Electron main/preload 或最终安装包；
3. CoreStudio 是否向用户、文件、Agent 或外部请求暴露了触发条件；
4. 当前 contract 或运行时缓解措施；
5. 不立即修复的兼容性代价；
6. 复核日期和解除接受的触发条件。

当前两个 moderate 的下次强制复核点为：`2026-08-13` 或下一次正式发布前，以较早者为准。若兼容上游版本提前发布，则立即复核，不等待该日期。

### `nanoid 4.0.2`

最新 `@excalidraw/mermaid-to-excalidraw 2.2.2` 仍固定 `nanoid 4.0.2`。相关 advisory 针对向长度参数传入非整数值时的可预测结果；CoreStudio 没有把该参数暴露给用户或外部 Agent。本轮不通过 Yarn resolution 强制跨到纯 ESM 的 5.x，避免制造未经上游验证的兼容风险。

### 不属于 CoreStudio 桌面产物的告警

以下内容保留为独立 backlog，不计作桌面运行时风险：

- 安装日志中的 peer-dependency 警告；它们需要单独做工具链兼容治理，不能与安全 advisory 混为一谈。

## 复核命令

```bash
cd excalidraw
corepack yarn install --frozen-lockfile
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source --package-inputs
corepack yarn build:desktop
```

全仓 audit 只用于归因：

```bash
corepack yarn audit --json
```

复核时必须展开唯一包、patched version 和 workspace path，不能只引用总数。

2026-07-13 总收口复核时，活动安装图 audit 为 `critical 0 / high 0 / moderate 2 / low 0`。两个 moderate 分别是本地 fork 的 `@excalidraw/excalidraw@0.18.0` 版本型标记，以及上文已接受的 adapter 内 `nanoid 4.0.2`；实际 Mermaid 安全回补仍由安装图 contract 验证。
