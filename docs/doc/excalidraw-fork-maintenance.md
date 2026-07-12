# Excalidraw Fork 维护说明

**日期：** 2026-07-13
**状态：** Current

## 当前基线

本仓库把 Excalidraw monorepo 作为源码目录保存在 `excalidraw/`，CoreStudio 桌面端实现集中在 `excalidraw/apps/image-board-desktop/`。

当前已经通过 Git 历史和目录树复核出上游源码基线：

| 项目 | 当前记录 |
| --- | --- |
| CoreStudio 初始导入提交 | `0b6d56623aa6b9b2fb4c66a40921d4fffb134daf`（2026-04-17） |
| Excalidraw upstream 源码基线 | `1caec99b290c75cda05385e637138998807a65ae`（2026-04-13，`docs: change twitter label by X (#11158)`） |
| Excalidraw `v0.18.0` tag | `817d8c553c3389650f8b4503984a6d4a5d2f0c11`（2025-03-11，仅作版本历史参照） |
| Excalidraw `v0.18.1` tag | `a2ec2889babf7d2295469c6d90ebe77fae57df84`（2026-04-20，包含 Mermaid XSS backport） |
| `@excalidraw/excalidraw` | `0.18.0` |
| `@excalidraw/common` | `0.18.0` |
| `@excalidraw/element` | `0.18.0` |
| `@excalidraw/math` | `0.18.0` |
| `@excalidraw/utils` | `0.1.2` |

这里必须区分“源码基线”和“npm package version”：初始导入时，本地包仍标为 `0.18.0`，但源码已经来自 2026-04-13 的 upstream `master`，并不是 2025-03-11 的 `v0.18.0` tag。直接拿初始导入和 `v0.18.0` 比较会出现 993 个路径差异，不能把 tag 当成 fork 基线。

### 基线复核证据

把 `0b6d566:excalidraw` 与 upstream `1caec99` 展开后做 `diff -qr`：

- upstream 侧没有初始导入缺失的路径；
- 初始导入多出的 411 个路径主要是 CoreStudio 桌面应用 `apps/image-board-desktop/`，以及当时随源码一并导入的编译后 `.js` 文件；
- 两边共有文件只有 10 个内容不同：`dev-docs/docusaurus.config.js`、根 `package.json`、`packages/excalidraw/components/Actions.tsx`、`packages/excalidraw/components/Sidebar/Sidebar.test.tsx`、`packages/excalidraw/context/tunnels.ts`、`packages/excalidraw/index.tsx`、`packages/excalidraw/tests/excalidraw.test.tsx`、根 `tsconfig.json`、`vitest.config.mts` 和 `yarn.lock`。这些属于初始导入时已经存在的 CoreStudio 接入或构建改动，不是另一个 upstream tag 的证据。

可复核命令：

```sh
git fetch https://github.com/excalidraw/excalidraw.git \
  refs/heads/master:refs/upstream/excalidraw-master \
  refs/tags/v0.18.0:refs/upstream/excalidraw-v0.18.0 \
  refs/tags/v0.18.1:refs/upstream/excalidraw-v0.18.1

mkdir -p "$TMPDIR/corestudio-import" "$TMPDIR/excalidraw-upstream"
git archive 0b6d566:excalidraw | tar -x -C "$TMPDIR/corestudio-import"
git archive 1caec99b290c75cda05385e637138998807a65ae | \
  tar -x -C "$TMPDIR/excalidraw-upstream"
diff -qr "$TMPDIR/corestudio-import" "$TMPDIR/excalidraw-upstream"
```

## 已知上游包改动

截至 2026-07-07，`excalidraw/packages/` 下可从提交历史确认的 CoreStudio 侧改动包括：

| 提交 | 触及路径 | 目的 |
| --- | --- | --- |
| `98f4609 优化桌面端发布体积与剪贴板体验` | `packages/excalidraw/actions/actionClipboard.tsx`、`packages/excalidraw/components/App.tsx`、`packages/excalidraw/components/Toast.tsx` 及相关测试 | 桌面端发布体积和剪贴板体验 |
| `57bc000 完善 Agent 内置画板与图片缓存升级` | `packages/element/src/image.ts` 及相关测试 | Agent Board 图片缓存兼容 |
| `ffba093 修复桌面端日志断管与语言回退` | `packages/excalidraw/i18n.ts` / `i18n.js` 及相关测试 | 桌面端语言回退 |

除上述记录外，不要默认假设 `packages/` 与 Excalidraw upstream 完全一致。升级前应重新跑一次目录级 diff。

## 后续升级流程

1. 从 `1caec99b290c75cda05385e637138998807a65ae` 起计算 upstream 变更，不从 `v0.18.0` tag 起算。
2. 确认目标 Excalidraw upstream commit 和 package version，并记录在本文件。
3. 对比 `excalidraw/packages/` 和 upstream 的差异，先列出 CoreStudio 必须保留的初始接入改动及后续补丁。
4. 优先把 CoreStudio 逻辑留在 `excalidraw/apps/image-board-desktop/`，只有没有窄接入点时才修改 `packages/`。
5. 升级后至少运行：

```sh
cd excalidraw
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source
```

6. 如果 `packages/` 新增或删除 CoreStudio 补丁，同步更新本文件的“已知上游包改动”表。
