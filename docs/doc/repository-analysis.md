# CoreStudio 仓库说明

## 结构

CoreStudio 采用外层产品仓库加内层 Excalidraw monorepo：

| 路径 | 职责 |
| --- | --- |
| `docs/` | 当前需求、计划和稳定说明 |
| `excalidraw/apps/image-board-desktop/` | CoreStudio Electron 桌面端 |
| `excalidraw/packages/` | Excalidraw 上游 packages 与 CoreStudio 复用底座 |
| `review-packets/` | 本地审查材料，不是运行时代码 |

## 产品架构

- 桌面 renderer：Excalidraw 画布、项目 UI、单次生成、生成记录和设置。
- Electron main：项目文件、图片资产、provider、Local Bridge、菜单和应用生命周期。
- Agent Board：供 Codex 查看、选择和标注当前项目画布。
- CLI / Local Bridge：供 Codex 读取项目上下文并通过 CoreStudio 数据层写回。
- Codex 集成资源：CLI 包装器、Skill、安装器和独立集成版本检测。

项目数据由 CoreStudio 持有。Agent 不直接修改项目文件；写回图片必须同时维护资产、图片记录和画布元素，并经过场景保存事务。

## 主要数据

项目目录包含：

- `project.json`
- `scene.excalidraw.json`
- `image-records.json`
- `assets/`
- `cache/`
- `exports/`

升级与项目修复不得删除 `assets/` 中的图片。缓存可重建，生成记录和画布元素需要保持可解释关系。

## 常用验证

在 `excalidraw/` 目录运行：

```sh
corepack yarn test:desktop --run
corepack yarn build:desktop
corepack yarn check:desktop-secrets --source --package-inputs
```

当前 Agent 边界见 `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`。
