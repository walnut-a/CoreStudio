# CoreStudio Agent 工作规范

## 验证分级（强制）

验证必须从最低充分层级开始；只有当前证据不足以覆盖风险时才升级。开发过程中的同类小调整合并验证，禁止每次编辑后重复启动 Electron、完整测试或打包流程。

- L1 定向验证：文案、简单样式、局部逻辑和小范围重构。默认只运行相关单测、静态检查和必要的 `corepack yarn test:typecheck`。
- L2 组件验收：复杂组件结构、输入行为、响应式或主题改动。使用 Composer Lab 等复用生产组件的浏览器入口，并运行对应定向测试。
- L3 源码 Electron 验收：真实窗口、字体、系统缩放、跨层级 CSS、桌面菜单、IPC、文件选择或 Electron 行为。使用固定的 `corepack yarn dev:desktop`。
- L4 打包验收：构建、资源装载、签名、安装包行为或打包/发版准备。按风险使用 `corepack yarn preview:desktop`、packaged smoke 或正式打包链路。

补充约束：

- 定向测试优先于完整测试；完整 `test:desktop` 只在收尾或高风险改动时运行一次。
- 普通 UI 修改不默认触发打包。已经取得更高层级的充分证据时，不机械重复低价值的同类流程。
- 视觉改动最终必须取得对应层级的真实界面证据；连续的小幅视觉调整先合并，再做一次相应验收。
- 涉及真实桌面交互、打包或发版的改动不得用低层级验证替代其原有正式链路。

## 生成输入框验收

复杂输入框结构、样式、交互或编辑器行为属于 L2。先从 `excalidraw/` 目录运行 `corepack yarn dev:composer`，在浏览器 Composer Lab 中使用真实生产组件完成合并后的快速调试和回归。

- 覆盖空内容、长文字、一张参考图、三张参考图混排、参考图上限提示和待确认参考图。
- 检查 `360px`、`480px`、`640px` 三种宽度以及浅色、深色主题。
- 检查光标、粘贴、撤销、重做、退格删除和连续增删引用图。
- 禁止为了 Lab 复制或仿制输入框；Lab 必须引用客户端真实组件、CSS 和设计 token。
- 只有改动同时涉及真实窗口、字体、系统缩放、跨层级 CSS 或 Electron 事件边界时，才升级到 L3，并在 `CoreStudio Dev` 中验收一次。

## Electron 运行身份与 UI 验收（强制）

CoreStudio 为正式版、源码开发版和打包预览版建立固定身份。任何 L3/L4 GUI 验收都必须复用固定入口和机器身份，不得按 `Electron`、`CoreStudio Dev` 等显示名称猜测实例。

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

1. 先运行 `corepack yarn verify:desktop:source` 或 `corepack yarn verify:desktop:preview`，校验调试端口、身份文件、PID/PGID、精确可执行文件和命令行。
2. 若必须加载新代码，先关闭精确的 `CoreStudio Dev` 实例，再通过固定入口重启。
3. 不得保留旧 Dev 的同时另开自定义 Electron 实例。

源码开发版和打包预览版同时存在时，自动化必须显式声明预期身份；未声明时快速失败，不允许自动选择。任一关键字段不匹配时必须停止操作，并报告冲突 PID、PGID、命令行和精确退出方法。

验收结束后，只清理本次固定入口记录的精确进程组并复查残留。不得使用 `killall Electron`、宽泛 `pkill`，也不得触碰正式版进程和数据。

主进程会对上述边界执行 fail-closed 校验。源码开发版和打包预览版在窗口内显示 `SOURCE DEV` 或 `PACKAGED PREVIEW` 及构建标识；正式版的运行身份只写入身份文件和日志，不在产品界面显示常驻徽标。裸启动源码、人工 `qa` runtime、开发版自定义 Bridge/profile/session 都应直接启动失败。相关测试位于 `excalidraw/apps/image-board-desktop/electron/desktopRuntimeConfig.test.ts`。
