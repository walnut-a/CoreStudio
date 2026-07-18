# CoreStudio 桌面端发布清单

这份文件用于桌面端发布检查。源码保存在仓库中，生成的安装包不要提交到 git，统一上传到 GitHub Releases。

## 版本

桌面端版本号在：

```text
excalidraw/apps/image-board-desktop/package.json
```

当前发布版本以 `package.json` 为准，发布时不要在本文档里写死版本快照。

## 平台范围

当前已验证并正式发布的桌面包只有 macOS。`package.json` 的 electron-builder 配置只保留 macOS / DMG 目标；Windows NSIS 和 Linux AppImage 不再作为声明性目标保留。

如果后续要恢复 Windows 或 Linux 包，需要先在对应平台补齐构建、启动冒烟测试和发布说明，再把目标加回配置。

## 本地打包

从代码工作区执行：

```sh
cd excalidraw
```

正式打包：

```sh
CSC_KEYCHAIN="$HOME/Library/Keychains/mylogin.keychain-db" corepack yarn package:desktop
```

正式发布不要在这个命令前额外运行 `build:desktop`；`package:desktop` 已经包含唯一一次生产构建。

这个命令会执行：

- renderer build
- Electron main / preload build
- 源码密钥扫描
- 打包输入密钥扫描
- electron-builder 生成签名 App 与 DMG（不预生成 ZIP）
- DMG 签名
- Apple 公证
- DMG / App 写入公证票据
- Gatekeeper 校验
- App 写入公证票据后单次生成最终 ZIP
- DMG / ZIP blockmap 重新生成
- release 输出密钥扫描

生成文件位于：

```text
excalidraw/apps/image-board-desktop/release/
```

`release/` 已被 git 忽略。

打包后先跑一次最小冒烟：

```sh
corepack yarn --cwd apps/image-board-desktop smoke:packaged
```

这个脚本会启动最新的 macOS `.app` 产物，等待 renderer 完成加载后自动退出。也可以用 `CORESTUDIO_APP_PATH=/path/to/CoreStudio.app` 指定待测包。

DMG 安装窗口布局由 `apps/image-board-desktop/package.json` 里的 `build.dmg` 固定，包括窗口尺寸、背景色、图标尺寸以及 `CoreStudio.app` / `Applications` 两个图标的位置。调整安装窗口视觉时，需要重新生成 DMG。

## 签名

当前配置使用这个 Developer ID：

```text
Developer ID Application: junyan liu (CUP682RD2S)
```

如果 macOS 询问是否允许 `codesign` 使用私钥，请允许后继续打包。

验证 app 签名：

```sh
codesign -dv --verbose=4 apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

预期能看到：

```text
Developer ID Application: junyan liu (CUP682RD2S)
TeamIdentifier=CUP682RD2S
```

## Apple 公证脚本

这台开发机已有 FileBox 共用的 `notarytool` profile：

```text
filebox-notary
```

正式打包时会自动运行：

```sh
corepack yarn --cwd apps/image-board-desktop notarize:release
```

这个脚本会使用：

- `CORESTUDIO_NOTARY_PROFILE`：默认 `filebox-notary`
- `CORESTUDIO_CODESIGN_IDENTITY`：默认 `Developer ID Application: junyan liu (CUP682RD2S)`
- `CSC_KEYCHAIN`：默认 `$HOME/Library/Keychains/login.keychain-db`

如果只是临时打一个不公证的内部包，可以显式跳过：

```sh
CORESTUDIO_SKIP_NOTARIZE=1 corepack yarn --cwd apps/image-board-desktop notarize:release
```

单独重跑公证：

```sh
cd excalidraw
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" \
  corepack yarn --cwd apps/image-board-desktop notarize:release
```

脚本成功后，预期校验结果应包含：

```text
accepted
source=Notarized Developer ID
```

## ZIP 处理

`electron-builder` 不生成公证前的 ZIP；`notarize:release` 会在 `CoreStudio.app` 写入票据后单次压缩最终 ZIP，并重新生成 `.blockmap`。发布 ZIP 前可以再抽检一次：

```sh
cd excalidraw
TMP_DIR="$(mktemp -d /tmp/corestudio-zip-check.XXXXXX)"
unzip -q apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip -d "$TMP_DIR"
xcrun stapler validate "$TMP_DIR/CoreStudio.app"
spctl -a -vvv -t exec "$TMP_DIR/CoreStudio.app"
codesign --verify --deep --strict --verbose=2 "$TMP_DIR/CoreStudio.app"
```

也可以直接校验发布目录里的 app：

```sh
xcrun stapler validate apps/image-board-desktop/release/mac-arm64/CoreStudio.app
spctl -a -vvv -t exec apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

## 密钥检查

发布前运行：

```sh
corepack yarn check:desktop-secrets --source --package-inputs --release
```

扫描会拦截常见 API Key、Bearer Token，以及本地 `image-board-settings.json` 配置文件。

模型服务 Key 只保存在用户本地应用数据目录，不应该进入源码或安装包。

## GitHub Release

提交并推送源码后，从仓库顶层上传安装包：

```text
excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64.dmg
excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip
```

示例：

```sh
gh release create v1.1.0 \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64.dmg \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip \
  --title "CoreStudio 1.1.0" \
  --notes-file release-notes.md \
  --repo OWNER/REPO
```

如果后续加入自动更新，再同时上传对应的 `.blockmap` 文件。

## 1.1.21 发布说明

1.1.21 修复生成输入状态和任务并发行为：

- 画布预选内容不再自动视为已输入提示词，需要先点击输入框确认引用
- 只有引用、没有额外指令时不允许提交，避免误触发生成
- 单次生成提交后立即清空输入内容，并允许继续提交多个并发任务
- ACP 任务运行期间保持单任务约束；启动成功后清空输入，启动失败时保留草稿
- 移除输入区全局“停止全部”操作，保留任务级取消能力

本次客户端升级不会要求重新安装 Codex 集成；Codex 集成版本继续保持独立的 `1.1.0`。

本次发布通过了这些检查：

- 264 个测试文件通过，2012 项测试通过、1 项跳过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- 包内 Codex 安装器与 CLI 版本契约 smoke 通过
- 使用隔离用户数据目录的安装态 renderer smoke 通过，未干扰正在运行的 CoreStudio
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `3f267988-3548-4ebe-94fc-74585258b35c`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper 和 codesign 校验通过

校验值：

```text
CoreStudio-1.1.21-arm64.dmg
sha256: 6633ef5fc4fb5373517c707e7d5431e4477e7e9f0774b077f8378ad23cb93dec

CoreStudio-1.1.21-arm64-mac.zip
sha256: 98a68ccf20450c6f267db2fc3d653e81c57460fcd0ceeb7e09274a2ef714246b

CoreStudio-1.1.21-arm64.dmg.blockmap
sha256: fdfb1886fb581104d10ae67f87b2e628c6c45db87e3a0e14959ed9d5007a939c

CoreStudio-1.1.21-arm64-mac.zip.blockmap
sha256: f0bd062592cb704982dad94e49670c2cd9d1a0461d3635aa1d2d645aa0a147ca
```

## 1.1.20 发布说明

1.1.20 集中修复 Codex 集成安装、Agent Board 持久化边界和项目并发恢复：

- Codex 集成版本提升至 `1.1.0`，Skill contract version 提升至 `3`
- CoreStudio 设置页可以直接执行当前应用包内的固定安装器，并在完成后自动重新检测
- 安装器改用 `corestudio --version --json` 做离线自检，不再依赖当前项目、Local Bridge 或 Codex 网络沙箱
- “打开当前 CoreStudio 项目”改用轻量 `read status`，避免读取完整项目记录
- 当前 Codex 任务缺少浏览器控制能力时，明确降级为一键链接，不再误报 CoreStudio 或 Bridge 故障
- Agent Board 只同步选择、视口和运行态画布，不再自动保存项目场景，也不再暴露 `writeProjectScene`
- 桌面端遇到旧项目快照时会停止重复排队和自动保存，改为显示“加载最新版本”恢复操作
- 旧快照冲突不再直接显示 Electron IPC 原始错误文案

本次客户端升级不会要求重新安装已经兼容的 Codex 集成；Codex 集成版本继续保持独立的 `1.1.0`。

本次发布通过了这些检查：

- 263 个测试文件、2010 项测试全部通过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- 包内 Codex 安装器与 CLI 版本契约 smoke 通过
- 使用隔离 `--user-data-dir` 的安装态 renderer smoke 通过，未干扰正在运行的 CoreStudio
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `2f8343ca-5c1d-4114-962a-7ffde563948b`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper 和 codesign 校验通过

校验值：

```text
CoreStudio-1.1.20-arm64.dmg
sha256: fbca184addfe32809ff5e5129acee01e11b1a675fa298d253fbccba12c64c3a4

CoreStudio-1.1.20-arm64-mac.zip
sha256: dfdc7bd40e15ef04b8536bce518eb0685b261c7929818c4e6cc0fc9970d9e8bd

CoreStudio-1.1.20-arm64.dmg.blockmap
sha256: 834604604d3ebcb5e83a1c8c5e84dd29566bb9b7a98c49675c8c63a15e64d01b

CoreStudio-1.1.20-arm64-mac.zip.blockmap
sha256: d13c620aad701b3a75c9dd6ec1b20da51ccb3b19fc37ec1aa5f90078d208d9e6
```

## 1.1.19 发布说明

1.1.19 升级 Excalidraw 上游基线，并收口 CoreStudio 的长期兼容边界：

- 在保留 CoreStudio 项目、图片生成、Agent、检查器和桌面工作流的基础上升级 Excalidraw 基线
- 增加“应用设置 → 关于”，展示 CoreStudio 版本、代码仓库和主要开源依赖版本
- 修复打开项目时 CoreStudio 加载动画底部短暂闪现 Excalidraw 英文加载提示的问题
- 将 Codex 集成版本从客户端版本中解耦，当前独立集成版本为 `1.0.1`
- Codex 集成兼容性改为检查 Local Bridge 协议、Skill 和 CLI 包装器版本，普通客户端升级不再要求重装
- 修复 Codex 网络沙箱阻断 localhost 时被误报为 CoreStudio 或 Bridge 未启动的问题
- 安装版通过 Local Bridge 托管 Agent Board，并由 CLI 安全补入当前项目 token，使“打开当前 CoreStudio 项目”可以真正打开画布
- CLI 增加 `--version` / `-v` 和 `--help` / `-h`，版本输出同时支持 `--json` 与 `--jsonl`
- 旧格式和 `1.0.0` 集成需要执行一次更新以获得新版 Skill；后续普通客户端升级仍不要求重装

本次发布通过了这些检查：

- 262 个测试文件、2001 项测试全部通过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `5dee160a-bc84-45ac-8d1f-6d797335c500`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper、codesign 和 DMG 完整性校验通过

校验值：

```text
CoreStudio-1.1.19-arm64.dmg
sha256: c992390f0a98df30e813a04688c069ca26785b6942179129bab36f8436e8d67a

CoreStudio-1.1.19-arm64-mac.zip
sha256: 4c0ee980350dd660a2434cddd6e8677b38a7b4b4e445ee04483e19f297687c3e

CoreStudio-1.1.19-arm64.dmg.blockmap
sha256: 3e6b2f413567e92a2108ef398926546ff28ba8e9eb8a96b896ade47db1888ba6

CoreStudio-1.1.19-arm64-mac.zip.blockmap
sha256: 5fee8df9fc3b4660d88ac06c3afd44b2913c463d0481991e7b7ff04ce13fa8d7
```

## 1.1.18 发布说明

1.1.18 增加 CoreStudio 桌面界面的多语言支持：

- 增加统一的桌面端多语言底座，并支持跟随系统、简体中文和英文
- 补齐应用设置、项目数据、生成记录、Agent Board、画布状态和界面错误提示的中英文文案
- Agent 对话内容、项目名称、文件路径、模型与 API 原始错误继续保持原文，不参与 UI 翻译
- 环境检测改为返回结构化状态，由 UI 按当前语言展示 CLI、Skill、版本与会话发现结果
- 统一语言选择器与设置页其他控件的视觉样式

本次发布通过了这些检查：

- 258 个测试文件、1985 项测试全部通过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `08ca6d58-47c5-4a1b-af7b-0cda0b05a159`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper 和 codesign 校验通过
- DMG `hdiutil verify` 与独立用户目录下的 packaged smoke 通过

校验值：

```text
CoreStudio-1.1.18-arm64.dmg
sha256: 2303d768e1719b75ebe2c4686323bd09a9181c86404d14314640fa5d2de7dab1

CoreStudio-1.1.18-arm64-mac.zip
sha256: dddb74fbe601c2670eedb458736cbcf3a8d71e0749af18e701dd50bbc6466ce2

CoreStudio-1.1.18-arm64.dmg.blockmap
sha256: 17e28fb3531b6abc69975370a09ac691bb623e8041b37b8cb702878d7c788370

CoreStudio-1.1.18-arm64-mac.zip.blockmap
sha256: b77b12a6ba7c21dd1318d7e29cc64197295a36db283f5c03a90abcaa8f33d522
```

## 1.1.17 已验证信息

1.1.17 聚焦 CoreStudio 的易用性和设置体验：

- ACP 收入实验性功能，默认不再打扰普通用户
- Codex 集成改为自然语言安装引导、环境检测和明确的使用入口
- 图像服务统一由设置页配置，画布输入区只读取已经配置好的服务
- 支持 OpenAI 兼容图像服务，并彻底移除已退役的常用提示词功能
- 统一设置弹窗的排版、按钮尺寸、导航层级和 Excalidraw 视觉语言

本次发布通过了这些检查：

- `main` 远端 CI：245 个测试文件、1906 项测试全部通过
- workspace scope、依赖安全、TypeScript typecheck、source/package-input/release secret scan、production build 和 bundle budget 全部通过
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `93819ad9-8d06-40f1-b45f-294ec248603a`，状态 `Accepted`
- App、DMG 和 ZIP 内 App 的 stapler validate、Gatekeeper 与 codesign 校验通过
- DMG `hdiutil verify` 与 packaged smoke 通过

校验值：

```text
CoreStudio-1.1.17-arm64.dmg
sha256: 399fb4a60f7a9993bca952475e51a09b2b463cc71bbc1c68da876259361e8e99

CoreStudio-1.1.17-arm64-mac.zip
sha256: e2d2f86317df58ac9ac5767efedf65723e0fdab05bd2f80d1e284705e6be70aa

CoreStudio-1.1.17-arm64.dmg.blockmap
sha256: 90a136b935c7774969cc8d5ee46cd81538d75df721f0429d0bd8bd68639ed554

CoreStudio-1.1.17-arm64-mac.zip.blockmap
sha256: 690b7160981f3b347404e077e6630b5c456e5ca277be358d9dc860231bf4588d
```

## 1.1.16 已验证信息

1.1.16 完成仓库健康治理收口，产品的三种发现模式保持不变。本次发布通过了这些检查：

- 活动 workspace 只包含 CoreStudio Desktop 与 `packages/*`
- Vite `7.3.6`、`@vitejs/plugin-react` `5.2.0`、esbuild `0.28.1`
- 251 个测试文件、1932 项测试全部通过
- workspace scope、依赖安全、TypeScript typecheck、source/package-input/release secret scan、production build 和 bundle budget 全部通过
- PR `#8`、发布 PR `#9` 及两次合并后 `main` CI 全部通过
- `main` ruleset `18834688` 已启用，要求 PR 和 `desktop` 检查
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `f67d9ef7-d523-4365-a53a-9ef7d6f5282e`
- App 与 DMG stapler validate、Gatekeeper 校验通过
- packaged smoke 通过

校验值：

```text
CoreStudio-1.1.16-arm64.dmg
sha256: 9d51e5769b5d29bbb543a9fd41263c6036693f65b1af618f5d5afc94e43985fd

CoreStudio-1.1.16-arm64-mac.zip
sha256: 59bc264f0e4a6ec95110001ffe3ed26dd0dd8e449ad4b8f5ac3804dab9acb8fe

CoreStudio-1.1.16-arm64.dmg.blockmap
sha256: 3e923ec05931120139bc00eda11ad711e45b0c53ba1508b861306d6a3afc035c

CoreStudio-1.1.16-arm64-mac.zip.blockmap
sha256: 74e44b58875e167947f3978a97ad3f21f6fdf804875af33302b91f75006257ef
```

## 1.1.9 已验证信息

1.1.9 发布时通过了这些检查：

- 大项目图片性能：缩略图优先加载，按视口逐步升级预览图/原图
- 项目维护：支持从文件菜单修复当前项目缩略图缓存
- 画布体验：底部输入框和维护状态提示收回 Excalidraw 原生岛状控件风格
- Desktop tests：265 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `889b5871-a0eb-4ccb-aebb-b035a8da2eb5`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`, codesign verify passed

校验值：

```text
CoreStudio-1.1.9-arm64.dmg
sha256: 31dddb6d1fa6b9b5f778225e05c64fb0fd6cb74e828755781e960cfd8bf98fa7

CoreStudio-1.1.9-arm64-mac.zip
sha256: c7caf39f7e3003e7c36d438dd2b78ca767faa8c73152dc5d090ea7e8e80da000

CoreStudio-1.1.9-arm64.dmg.blockmap
sha256: db4be761493c219d12007c5f719cf7528c3a0981ef403d3fe202baf2fa4d71e0

CoreStudio-1.1.9-arm64-mac.zip.blockmap
sha256: 7c91e663a5d2775091ac964d6f60742e9a4087bd4690329e66374c976b95917f
```

## 1.1.8 已验证信息

1.1.8 发布时通过了这些检查：

- DMG 安装窗口：显式固定为 `640x420`，`CoreStudio.app` 和 `Applications` 图标居中横向排列
- Desktop tests：246 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `442032c9-dab5-4572-9a51-192c9dc45f79`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`, codesign verify passed

校验值：

```text
CoreStudio-1.1.8-arm64.dmg
sha256: 11b0d08aaf4be176fb74b9c5e1deeebaca409519ff0414201ca0227a2ab1ee3f

CoreStudio-1.1.8-arm64-mac.zip
sha256: dac2d7d128f301704903a72d9d941853737d2b04687b150d05e31e23d127986a

CoreStudio-1.1.8-arm64.dmg.blockmap
sha256: 6bdfd60e67adb9efc0ac475a15181673e2e3b1fd824bef0b087709fdfd0b1368

CoreStudio-1.1.8-arm64-mac.zip.blockmap
sha256: 33c023c7d6bbbb1657281c92428e6324f53d3b92ba37e723cc99f6dc36e6ba85
```

## 1.1.7 已验证信息

1.1.7 发布时通过了这些检查：

- Desktop tests：246 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `ad3bb935-7b9d-4e09-814a-906ca508d3a7`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`, codesign verify passed

校验值：

```text
CoreStudio-1.1.7-arm64.dmg
sha256: 09fc87c7a6d6845dcb135e50db84c1d3f166ec2c710abcb6e2a34c3b034281d4

CoreStudio-1.1.7-arm64-mac.zip
sha256: 3880624a0835e63b0612a1c07818dffa7fbc66d2bbb9b9cb8475ce8d7f472e9d

CoreStudio-1.1.7-arm64.dmg.blockmap
sha256: 763557c9197b871558a80af68acaf096e8df4f4812c08e7f349474572b6cb85a

CoreStudio-1.1.7-arm64-mac.zip.blockmap
sha256: 30001396a99ef1f984b155956042a60d8c5bfdb20ae2d5cc394394abe4f089d7
```

## 1.1.6 已验证信息

1.1.6 发布时通过了这些检查：

- Desktop tests：226 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `695877a1-acde-4e63-98b8-8cb7aa1fe923`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.1.6-arm64.dmg
sha256: fe391b2174f05ff764b1bdddd426fbd2db294e2f6640e4b2e204c86ba989dbda

CoreStudio-1.1.6-arm64-mac.zip
sha256: f10360ba51567f596ad3ad82e921584bdf2f2b60df087b988af765bf36c810d3

CoreStudio-1.1.6-arm64.dmg.blockmap
sha256: 000d727ba68c8bfee13b45d8aa694ebe268924f354967b8af77e22469a039b10

CoreStudio-1.1.6-arm64-mac.zip.blockmap
sha256: ac8f3b2267a753be720c65904d6740cf38fc77de7bb852860b88f6342001b06a
```

## 1.1.0 已验证信息

1.1.0 发布时通过了这些检查：

- Desktop tests：199 passed
- TypeScript typecheck：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `c4371ffa-5f0e-4d9e-926f-93ac4726e6ce`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.1.0-arm64.dmg
sha256: e5d3a181946eb3e99491a4de6a882691e44fbc24d7ee5eb08ea5c9021ceec208

CoreStudio-1.1.0-arm64-mac.zip
sha256: aa0ea56d5913537148ad27b7953d6c690d89f8329a527c1494cb343e19223b67
```

## 1.0.0 已验证信息

1.0.0 发布时通过了这些检查：

- Desktop tests：182 passed
- TypeScript typecheck：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `b6aab739-a138-4295-90a4-55ee172e8587`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.0.0-arm64.dmg
sha256: 69e842fbf83ee4e3377d439039b3d9e8222439740a4a6cbd69a4a0e987baab9a

CoreStudio-1.0.0-arm64-mac.zip
sha256: c9f4565fee75fb87de2c5672ff6efb7c5fa22585b4ffaf59ac2f145f3e4fc673
```
