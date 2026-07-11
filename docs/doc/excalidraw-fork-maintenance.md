# Excalidraw Fork 维护说明

**日期：** 2026-07-07  
**状态：** Current

## 当前基线

本仓库把 Excalidraw monorepo 作为源码目录保存在 `excalidraw/`，CoreStudio 桌面端实现集中在 `excalidraw/apps/image-board-desktop/`。

当前可从仓库确认的上游版本信息：

| 项目 | 当前记录 |
| --- | --- |
| CoreStudio 初始导入提交 | `0b6d566 Initial import` |
| `@excalidraw/excalidraw` | `0.18.0` |
| `@excalidraw/common` | `0.18.0` |
| `@excalidraw/element` | `0.18.0` |
| `@excalidraw/math` | `0.18.0` |
| `@excalidraw/utils` | `0.1.2` |

当前仓库没有单独记录对应的 Excalidraw upstream commit SHA。后续升级前，需要先补一次 upstream 对照记录，避免只靠 package version 判断代码差异。

## 已知上游包改动

截至 2026-07-07，`excalidraw/packages/` 下可从提交历史确认的 CoreStudio 侧改动包括：

| 提交 | 触及路径 | 目的 |
| --- | --- | --- |
| `98f4609 优化桌面端发布体积与剪贴板体验` | `packages/excalidraw/actions/actionClipboard.tsx`、`packages/excalidraw/components/App.tsx`、`packages/excalidraw/components/Toast.tsx` 及相关测试 | 桌面端发布体积和剪贴板体验 |
| `57bc000 完善 Agent 内置画板与图片缓存升级` | `packages/element/src/image.ts` 及相关测试 | Agent Board 图片缓存兼容 |
| `ffba093 修复桌面端日志断管与语言回退` | `packages/excalidraw/i18n.ts` / `i18n.js` 及相关测试 | 桌面端语言回退 |

除上述记录外，不要默认假设 `packages/` 与 Excalidraw upstream 完全一致。升级前应重新跑一次目录级 diff。

## 后续升级流程

1. 先确认目标 Excalidraw upstream commit 和版本号，并记录在本文件。
2. 对比 `excalidraw/packages/` 和 upstream 的差异，先列出 CoreStudio 必须保留的补丁。
3. 优先把 CoreStudio 逻辑留在 `excalidraw/apps/image-board-desktop/`，只有没有窄接入点时才修改 `packages/`。
4. 升级后至少运行：

```sh
cd excalidraw
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source
```

5. 如果 `packages/` 新增或删除 CoreStudio 补丁，同步更新本文件的“已知上游包改动”表。
