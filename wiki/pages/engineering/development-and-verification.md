---
title: 开发与验证
type: engineering
updated: 2026-07-30
source_count: 5
---

# 开发与验证

本页汇总 CoreStudio 开发入口、验证分级、运行身份和长任务安全规则。具体任务仍以根 `AGENTS.md` 为最高项目规则。

## 工作目录

- `confirmed`：大多数 CoreStudio 开发命令从 `excalidraw/` 运行。
- `confirmed`：定向测试优先于完整测试。
- `confirmed`：文案、简单样式和局部逻辑默认从 L1 开始；复杂组件交互走 L2；真实 Electron 行为走 L3；打包与安装包行为走 L4。

## 验证分级

| 层级 | 适用范围 | 典型入口 |
| --- | --- | --- |
| L1 | 文案、简单样式、局部逻辑、小重构 | 定向 Vitest、静态检查、必要的 `test:typecheck` |
| L2 | 复杂组件、输入行为、响应式、主题 | Composer Lab 与定向测试 |
| L3 | 窗口、字体、缩放、菜单、IPC、文件选择 | `corepack yarn dev:desktop` |
| L4 | 构建、资源、签名、安装包和发版准备 | `preview:desktop`、packaged smoke、正式打包 |

以上为 `confirmed`。视觉和交互改动最终需要对应层级的真实界面证据。

## 桌面运行身份

- `confirmed`：源码验收固定使用 `corepack yarn dev:desktop`。
- `confirmed`：打包预览固定使用 `corepack yarn preview:desktop`。
- `confirmed`：自动化操作前使用 `verify:desktop:source` 或 `verify:desktop:preview` 核对身份文件、PID/PGID、可执行文件、profile 和调试端口。
- `confirmed`：源码开发版、打包预览版和正式版是不同身份，不能按窗口标题或“Electron”显示名猜测。
- `confirmed`：人工界面验收不得使用 `qa` runtime，也不得注入临时 Bridge、profile 或 session 绕过已有实例。

端口和路径可能随项目治理变化；执行前以当前 scripts 和身份文件为准。

## 测试生命周期

- `confirmed`：一次性完整桌面测试入口是 `corepack yarn test:desktop`，watch 有独立入口。
- `confirmed`：完整测试由有界 runner 管理 worker、超时、互斥锁和进程树清理。
- `confirmed`：session、cell 或 job ID 表示原任务仍在运行，应继续轮询，不得重复启动同一命令。
- `confirmed`：启动高资源任务前先检查等价任务，不并发运行多套完整 Vitest。
- `confirmed`：中断时按 cwd、PID/PPID/PGID 和命令行识别精确进程树，禁止 `killall node`、`killall Electron` 和宽泛 `pkill`。

## Composer Lab

- `confirmed`：复杂生成输入框改动属于 L2，优先使用 `corepack yarn dev:composer`。
- `confirmed`：Lab 直接复用生产组件、CSS 和 token，不维护仿制输入框。
- `confirmed`：验收覆盖空内容、长文本、引用图数量、上限提示、待确认引用、三种宽度和浅深主题。
- `confirmed`：只有涉及真实窗口或 Electron 边界时才升级到 L3。

## 主要来源

- [仓库规则](../../../AGENTS.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [测试生命周期计划](../../../docs/plan/2026-07-27-corestudio-test-process-lifecycle.md)
- [根 package scripts](../../../excalidraw/package.json)
- [桌面端 package scripts](../../../excalidraw/apps/image-board-desktop/package.json)
