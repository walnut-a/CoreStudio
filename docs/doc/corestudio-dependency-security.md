# CoreStudio 桌面依赖安全边界

## 结论

CoreStudio 桌面依赖安全不能直接用全仓 `yarn audit --groups dependencies` 的总数判断。

原因是 `excalidraw/apps/image-board-desktop/package.json` 把 renderer 和 Electron 运行依赖放在 `devDependencies`，随后由 Vite 和 esbuild 打入 `dist/`、`dist-electron/`；`--groups dependencies` 会排除这些真正进入桌面产物的依赖。反过来，全量 `yarn audit` 又会混入 `excalidraw-app`、`examples/` 和构建工具的重复路径。

因此本项目使用两层口径：

1. `desktopDependencySecurity.test.ts` 检查 CoreStudio 实际安装图和固定安全版本，属于产品门禁。
2. 全仓 `yarn audit` 用来维护上游 web app、示例和工具链 backlog，不把总数伪装成桌面产品结论。

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

GitHub Actions 在 frozen install 后、typecheck 前单独运行该 contract。这样锁文件漂移或 Yarn hoist 变化会直接让远端门禁失败。

## 已回补但仍可能被版本型 audit 标记

本地 fork 的 `@excalidraw/excalidraw` 版本仍为 `0.18.0`，但其 `@excalidraw/mermaid-to-excalidraw` 已是 `2.2.2`。Excalidraw 官方 [v0.18.1 release](https://github.com/excalidraw/excalidraw/releases/tag/v0.18.1) 明确说明该安全版的核心回补就是把 adapter 提升到 `2.2.2`，用于缓解 Mermaid XSS。上游对应的 [Mermaid advisory](https://github.com/advisories/GHSA-7rqq-prvp-x9jh) 说明了受影响版本和 `innerHTML` 注入路径。

因此全仓 audit 仍可能仅按 `@excalidraw/excalidraw@0.18.0` 版本号报告 moderate；本项目不通过修改 fork 的 package version 假装升级了整份上游源码，而是用真实 adapter 和安装图 contract 证明回补状态。

## 接受风险与剩余治理面

### `nanoid 4.0.2`

最新 `@excalidraw/mermaid-to-excalidraw 2.2.2` 仍固定 `nanoid 4.0.2`。相关 advisory 针对向长度参数传入非整数值时的可预测结果；CoreStudio 没有把该参数暴露给用户或外部 Agent。本轮不通过 Yarn resolution 强制跨到纯 ESM 的 5.x，避免制造未经上游验证的兼容风险。

### 不属于 CoreStudio 桌面产物的告警

以下内容保留为独立 backlog，不计作本轮已修复：

- `examples/with-nextjs` 的 Next.js critical/high advisory。
- `vitest 3.0.6` 的 UI server critical advisory。升级到已修复的 3.2.6 会暴露现有 App 测试把 `vi.mock` 放在普通 helper 文件中的不兼容；本轮已移除 `@vitest/ui` 和 `test:ui` 脚本并加入 contract，关闭当前 UI server 入口，但 Vitest 本体升级仍是下一条高优任务。
- `excalidraw-app` 的 Firebase、Socket.IO 与 web-only 依赖链。
- Vite、Rollup、Babel、minimatch/picomatch 等其余开发工具 advisory。
- 旧示例、测试和 size-limit/Puppeteer 工具链中的重复路径。
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

2026-07-12 候选分支复核时，全仓 critical 剩余 `with-nextjs → next` 和根 `vitest` 两条路径。前者属于上游示例；后者属于开发测试 UI，不进入 CoreStudio 桌面产物，但必须作为下一条高优治理任务，而不是从报告中隐藏。全仓 moderate/high 总数仍不能作为桌面 bundle 的风险数量使用。
