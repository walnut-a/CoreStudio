# CoreStudio Agent 工作规范

## Electron UI 验收（强制）

CoreStudio 已经为正式版和开发版建立固定的应用身份、端口、Session 和用户数据隔离。任何需要真实界面的开发或验收都必须复用这套隔离，不得临时创建第三套 Electron 身份。

从 `excalidraw/` 目录使用以下固定入口：

- 源码开发与交互验收：`corepack yarn dev:desktop`
- 打包后的开发版验收：`corepack yarn preview:desktop`
- 无界面的打包 smoke：`corepack yarn --cwd apps/image-board-desktop smoke:packaged`

禁止：

- 直接执行 `node_modules/electron/.../Electron`、`electron .` 或 `open -a Electron`
- 手工注入 `CORESTUDIO_RUNTIME_MODE`、Bridge 端口、Session 路径、设置目录或自定义应用名来启动额外实例
- 把 `qa` runtime 用于人工界面验收；它只属于自动化 packaged smoke
- 为了绕过正在运行的开发版而创建临时 Electron profile、端口或窗口身份
- 使用正式版 `CoreStudio.app` 或正式用户数据做开发验收

如果 `CoreStudio Dev` 已经运行：

1. 先判断当前实例能否直接复用。
2. 若必须加载新代码，先关闭精确的 `CoreStudio Dev` 实例，再通过固定入口重启。
3. 不得保留旧 Dev 的同时另开自定义 Electron 实例。

验收结束后，只清理本次通过固定入口启动的精确进程。不得使用 `killall Electron`、宽泛 `pkill`，也不得触碰正式版进程和数据。

主进程会对上述边界执行 fail-closed 校验：裸启动源码、人工 `qa` runtime、开发版自定义 Bridge/profile/session 都应直接启动失败。相关测试位于 `excalidraw/apps/image-board-desktop/electron/desktopRuntimeConfig.test.ts`。
