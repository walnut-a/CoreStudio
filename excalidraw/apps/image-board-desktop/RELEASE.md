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

同一版本、同一平台、同一份源码和同一套 Node / esbuild / Electron / electron-builder 工具链已经成功生成完整 App 与 DMG 时，再次执行该命令会直接复用现有产物，不会重复构建、公证。源码或实际工具链版本变化后必须重新生成，不能复用旧包。确实需要强制重新生成时，显式使用：

```sh
CORESTUDIO_FORCE_PACKAGE=1 CSC_KEYCHAIN="$HOME/Library/Keychains/mylogin.keychain-db" \
  corepack yarn package:desktop
```

目录包不属于常规发布流程，原来的 `package:dir` 入口已移除。只有明确排查安装态问题时才使用 `package:dir:diagnostic`，不要在正式打包前把它当作默认验证步骤。

这个命令会执行：

- renderer build
- 使用 workspace 内声明版本的 esbuild 构建 Electron main / preload / CLI runtime
- 扫描 renderer 和 Electron 构建输出，禁止写入 `/Users/`、`/home/` 或 `C:\Users\` 开发机路径
- 源码密钥扫描
- 打包输入密钥扫描
- electron-builder 生成签名 App 与 DMG
- 扫描签名 App 内的 `app.asar`，在公证前再次阻断开发机路径
- DMG 签名
- Apple 公证
- DMG / App 写入公证票据
- Gatekeeper 校验
- DMG blockmap 重新生成
- release 输出密钥扫描

唯一发布安装包是公证后的 DMG。`release/` 中的 `.app` 目录用于本地验证，`.blockmap` 是更新元数据，都不作为第二个安装包发布。

生成文件位于：

```text
excalidraw/apps/image-board-desktop/release/
```

`release/` 已被 git 忽略。

路径扫描也可以独立复核：

```sh
corepack yarn --cwd apps/image-board-desktop check:bundle-paths --build
corepack yarn --cwd apps/image-board-desktop check:bundle-paths --release
```

`build:electron` 通过固定的 Node 脚本设置 esbuild `absWorkingDir`，并在执行构建前核对实际加载版本必须等于 `package.json` 声明版本。禁止改回依赖调用目录或全局 PATH 的裸 `esbuild` 命令。

打包后先跑一次最小冒烟：

```sh
corepack yarn --cwd apps/image-board-desktop smoke:packaged
```

这个脚本会先在隔离目录中以正式模式启动最新的 macOS `.app` 产物，不注入 `CORESTUDIO_RUNTIME_MODE`，确认正式包完成 renderer 加载后自动退出；随后再验证隔离的 QA 身份。也可以用 `CORESTUDIO_APP_PATH=/path/to/CoreStudio.app` 指定待测包。

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

可以直接校验发布目录里的 app：

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
```

示例：

```sh
gh release create v1.1.0 \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64.dmg \
  --title "CoreStudio 1.1.0" \
  --notes-file release-notes.md \
  --repo OWNER/REPO
```

如果后续加入自动更新，再同时上传对应的 `.blockmap` 文件。

## 1.1.39 发布说明

1.1.39 修复 Codex 内置画布的视口恢复与项目切换，并改善 macOS 安装引导：

- 刷新稳定 Agent Board 后恢复刷新前的画布位置与缩放比例，不再被初始化阶段的中心点状态覆盖
- 按页面会话与稳定画布双层保存视口，同时保留跨浏览器会话的持久回退
- 修复内置画布“切换项目…”菜单显示但点击无响应的问题
- 使用当前稳定画布的 Actor 恢复凭据申请短期、一次性项目选择会话，避免重新开放无鉴权项目列表
- 项目选择页明确区分当前项目、可切换项目和不可用项目，并在项目被其他 CoreStudio 实例占用时提前禁用
- 选择目标项目后进入对应稳定画布并继续走标准 Agent 认领流程，连接提示会显示目标项目名称并支持返回项目选择页
- 项目切换上下文不再依赖内置浏览器缺失的会话存储，刷新连接提示页后仍可保留目标项目和返回入口
- 项目候选页不再加载无关的模型供应商设置，消除错误提示
- DMG 增加 Retina 安装背景，明确提示把 CoreStudio 拖入 Applications 文件夹

本次更新不改变 CoreStudio 项目格式、图片生成服务配置、Agent Bridge protocol 或 Agent 集成版本。

## 1.1.38 发布说明

1.1.38 改善图片生成输入框的画布占用与模型目录信息表达：

- 在画布右下角帮助按钮左侧增加图片生成输入框开关，随时隐藏或展开输入框
- 收展过程中保留输入内容和运行状态，并通过朝向开关位置的动画明确界面去向
- 统一开关与帮助按钮的点击区域、图标视觉尺寸和状态提示，完整说明“隐藏图片生成输入框”或“展开图片生成输入框”
- 模型目录不再显示内部修订版本号，改为显示目录实际发布日期；缺少有效发布日期时明确显示“内置目录”
- 补充收展状态、动画、无障碍名称、模型目录日期和上游边界的自动化测试

本次更新不改变图片生成服务配置、模型协议、CoreStudio 项目格式或 Excalidraw 的 Frame / Group 交互语义。

## 1.1.37 发布说明

1.1.37 升级并收紧 Excalidraw 画布底座，重点改善复杂流程图的组织、导出和桌面宿主稳定性：

- 更新 Excalidraw 上游基线，继续保留 CoreStudio 的项目数据、1% 最小缩放、图片替换、剪贴板和 Inspector 集成合同
- 图片导出、SVG 导出和复制图片时隐藏 Frame 名称与边框，同时保留 Frame 裁剪范围
- 修复宿主菜单延迟挂载时左上角出现两个菜单按钮的问题，并补齐主菜单可访问名称
- 移除没有生产入口的旧 Sidebar、Toolbar 和滚轮缩放补丁，恢复更合理的上游默认实现
- 建立 53/53 的上游差异登记门禁，后续升级出现未归属补丁时会直接阻断
- 本地托管字体时不再追加 `esm.sh` 远程兜底，消除严格 CSP 下的大量字体警告并保持离线边界

本次升级不改变现有 CoreStudio 项目格式，也不调整 Excalidraw 上游的 Frame、Group 或多边形交互语义。

## 1.1.36 发布说明

1.1.36 紧急修复桌面端全选快捷键在不同编辑上下文中失效的问题：

- 补齐 macOS `Command+A` 与其他平台 `Ctrl+A` 的桌面快捷键路由
- 画布文字编辑时，全选会选中当前文字内容，继续输入可直接完整替换
- 退出文字编辑后，同一快捷键继续保持画布语义，选择画布中的全部元素
- 生成输入框、普通输入控件与应用菜单统一复用当前焦点对应的全选行为
- 保留撤销、重做、剪切、复制、粘贴、光标移动和删除等已有快捷键的原生处理边界

本次修复不改变 Agent 集成、Local Bridge、Skill、CLI 协议或安装结构。

## 1.1.35 发布说明

1.1.35 重新适配火山方舟 Seedream 图片生成，并优化图片服务配置流程：

- 将原有混杂的即梦直连与多种火山凭证方案收敛为火山方舟 API Key，避免把不同控制台生成的凭证误当成可互换密钥
- 按火山方舟图片生成接口适配 Seedream 5.0 Pro，更新模型目录、请求参数和响应处理
- 配置页明确提示只填写方舟控制台创建的 API Key，不支持 Access Key、IAM API Key 或旧版即梦直连接口
- 细分鉴权失败、模型不可用和请求参数错误，保留服务端请求 ID 与原始错误，便于定位真实原因
- 重整图片集成页面的信息层级，以已添加的图片生成服务为核心，简化添加、编辑和保存流程
- 补充 Seedream Provider、设置迁移、错误归因与配置界面的自动化测试，并补齐接入说明和项目 Wiki

升级后请在“应用设置 → 图片集成”中添加或编辑“火山方舟 / Seedream”，重新保存方舟 API Key，并确认所选模型已在对应方舟账号下开通。

## 1.1.34 发布说明

1.1.34 扩展本地 Agent 协作能力，并修复跨项目复制图片时的原图保真问题：

- 将原有 Codex 专用集成扩展为 Codex、Cursor 和 Claude Code 本地 Agent 集成
- 新增运行时 Agent Session、宿主隔离身份和稳定画布认领，让多个本地 Agent 能在受控边界内读取、写入和协作
- 支持按宿主独立安装、更新和移除集成，并分别控制是否允许 Agent 使用 CoreStudio 的图片生成服务
- 保留 Codex 兼容路径，同时为各宿主提供独立 Skill、CLI 回退与打包内安装资源
- 修复跨项目复制图片时目标项目只保存缩略图的问题，内部粘贴现在会恢复源项目原图
- 保持外部软件快捷键粘贴为轻量预览，“复制为 PNG”继续输出高清结果
- 发布 CoreStudio 官方网站，并将仓库首页调整为英文优先、提供完整中文版本

本次客户端升级将统一 Agent 集成版本提升至 `2.0.0`、Agent Bridge protocol 提升至 `6`、Skill contract version 提升至 `17`、CLI wrapper version 提升至 `2`。安装 1.1.34 后，请在“应用设置 → Agent 集成”中为需要使用的宿主完成安装或更新。

## 1.1.33 发布说明

1.1.33 完善画布恢复、Agent 原生图表写入与图片生成授权边界：

- 修复 Codex 内置浏览器直接刷新画布后视口回到原点的问题，保留刷新前的位置与缩放比例
- 去掉左侧栏对汉堡菜单的额外避让，统一左右侧栏入口布局、按钮尺寸和图标视觉大小
- 在图片集成设置中新增画布生成输入框显示开关；关闭后只隐藏输入框，不清除服务、模型或密钥配置
- 在 Codex 集成中新增 Agent 使用 CoreStudio 图片生成能力的独立授权，默认关闭；开启后才允许消耗用户自己的图片服务额度
- Agent 调用 CoreStudio 生图时只能使用用户当前选定的服务与模型，不能读取凭据、切换模型或修改图片集成配置
- 新增 `corestudio generate image` 与受控 Local Bridge 生图路由，复用占位、原位替换、项目图片记录和严格持久化链路
- 新增 `corestudio write diagram --format mermaid`，将 Mermaid 写成可编辑的原生画布元素，并支持自动、选区和当前视口三种落点
- 同步中英文设置文案、CLI 合同、CoreStudio Skill、安装器与规格文档

本次客户端升级同时将 Codex 集成提升至 `1.12.0`、Agent Bridge protocol 提升至 `5`、Skill contract version 提升至 `16`。安装 1.1.33 后，请在“应用设置 → Codex 集成”中完成更新。

## 1.1.32 发布说明

1.1.32 完善 CoreStudio Agent Board 与 Codex 内置浏览器之间的连接和实时同步：

- 画布地址尚未连接到 Codex 对话时，明确说明当前状态、下一步操作和连接后的结果，并提供一键复制的结构化连接指令
- Codex 完成身份认领后，原页面会自动进入可编辑画布，无需刷新或重新打开
- 修复 CLI 写入图片后 Agent Board 不自动刷新、图片资源无法显示的问题
- 刷新图片资源时保留当前画布视口，避免回到中心点后找不到刚加入的内容
- 修复打包预览版无法生成有效画布地址的问题，并完善集成版本不匹配时的提示样式
- 统一连接提示的中英文文案、字号层级和“Codex 对话”术语

本次客户端升级同时将 Codex 集成提升至 `1.10.0`、Skill contract version 提升至 `14`。安装 1.1.32 后，请在“应用设置 → Codex 集成”中完成更新。

## 1.1.31 发布说明

1.1.31 集中完善图片详情侧栏、项目导航和模型配置体验：

- 统一图片详情侧栏的字号、字重、区块间距和滚动层级，优化提示词、编辑链、生成参数与复制操作的排版
- 统一左右侧栏的内容边距和出现动画，并修复新侧栏未覆盖画布帮助按钮的问题
- 优化模型目录来源、更新状态和能力选项说明，统一下拉控件与设置弹窗的交互和视觉规范
- 支持顶部项目标签拖拽排序，并在项目文件夹丢失或路径变化时提供安全的失效处理
- 修复图片裁切期间右侧栏裁切入口消失的问题，保留入口并显示对应的进行中状态
- 完善项目视图、房间持久化和桌面运行身份的防御性校验，继续保持对 Excalidraw 底座的低侵入边界

本次客户端升级不要求重新安装 Codex 集成；Codex 集成版本继续保持 `1.9.0`。

## 1.1.30 发布说明

1.1.30 集中完善生成输入、桌面验收边界和界面设计一致性：

- 重构生成输入编辑器的引用图与占位状态，完善粘贴、撤销、重做、退格删除和异步结果回写边界
- 修复图片信息、最近项目、删除确认弹窗、画板恢复提示和模型下拉控件的字号、间距、文案及图标不一致
- 统一右侧栏的字体层级、内容边距和区块节奏，并让左右侧栏使用同一组镜像出现动画与减少动态效果降级
- 完善源码开发版、打包预览版和正式版的运行身份校验；正式版不再显示常驻运行身份徽标
- 保留全量桌面测试的一次性、资源有界、互斥和完整进程树清理约束

本次客户端升级不要求重新安装 Codex 集成；Codex 集成版本继续保持 `1.9.0`。

## 1.1.29 发布说明

1.1.29 修复 1.1.28 正式安装包无法启动的严重回归：

- 正式包不再通过内部 package name 判断是否属于源码环境，改用 Electron 的 `app.isPackaged` 识别打包状态
- 保留源码必须通过固定 `CoreStudio Dev` 启动器运行的 fail-closed 边界
- 打包冒烟测试会先以无 `CORESTUDIO_RUNTIME_MODE` 覆盖的正式身份启动应用，再验证隔离的 QA 身份，防止开发或 QA 环境变量掩盖正式包启动故障

本次客户端升级不要求重新安装 Codex 集成；Codex 集成版本继续保持 `1.9.0`。

## 1.1.28 发布说明

1.1.28 修复 1.1.27 中影响生成输入的明显回归，并收紧开发验收边界：

- 修复输入任意内容后光标被重置到开头的问题，保持普通输入、中文输入法提交和控制器状态回显后的光标位置
- 修复删除最后一个图片引用后光标跳到开头的问题，剩余文字或引用仍存在时光标保持在正确位置
- 保留浏览器原生编辑历史，使粘贴大段文字、删除图片引用和撤销恢复引用能够连续工作
- 修复设置页模型下拉框使用系统原生箭头导致的歪斜，统一浅色和深色模式下的尺寸与垂直居中
- 优化未配置图片服务提示的上下间距，继续复用现有设计系统 token
- 为 Electron UI 验收增加仓库级规范和主进程 fail-closed 校验，人工验收固定使用 `CoreStudio Dev`

本次客户端升级不要求重新安装 Codex 集成；Codex 集成版本继续保持 `1.9.0`。

## 1.1.27 发布说明

1.1.27 完善首次使用体验、生成输入细节和本地多进程数据安全：

- Home 在没有项目时显示非阻断式三步新手引导，明确提示先配置图片服务 API Key；创建或打开项目后自动恢复最近项目视图
- Home、侧栏、设置弹窗和生成输入控件继续复用 Excalidraw 主题 token，完善深色模式、等高排版和对齐细节
- 收窄生成输入框默认宽度，统一单行高度、图片引用浮层与原生画布控件的垂直节奏
- 修复插入图片后输入框高度跳变、删除最后一个图片引用后光标回到开头等编辑问题
- 正式版与开发版使用独立的应用身份、用户目录、Bridge 端口和 session 文件，开发包不再抢占正式运行环境
- 同一项目同一时间只允许一个 Electron 进程持有并写入；多个浏览器 Agent Board 仍可加入该进程维护的项目房间
- 第二个 Electron 打开同一项目时给出明确冲突提示；异常退出遗留的项目租约可安全回收
- 修复窗口关闭期间重复销毁 WebContents 导致的 `Object has been destroyed` 主进程崩溃
- 桌面全量测试改为一次性、资源有界、互斥且可清理残留进程的统一执行入口

本次客户端升级不要求重新安装 Codex 集成；Codex 集成版本继续保持 `1.9.0`。

## 1.1.26 发布说明

1.1.26 进一步压缩 Agent Board 选区状态条，并把复制引用升级为稳定快照：

- 图片预览上限从 4 张降为 2 张，操作按钮改为带提示的图标
- 复制成功后图标短暂变为完成状态，反馈不再撑高状态条
- 复制内容包含固定协议标记、项目名、元素 ID、图片 ID 和分类摘要
- Codex 优先使用固定快照解析原图和元素，不再被后续实时选区变化干扰
- Codex 集成升级到 1.5.0、Skill 契约升级到 7；安装后需要在设置中更新集成环境
- 修复提示词输入框粘贴大段内容后无法撤销的问题，并恢复输入框的正常尺寸约束
- 生成占位改为一次可删除的整体；删除占位会取消任务或丢弃迟到结果，不再残留提示元素或重新写回图片
- 输入框、侧栏、设置弹窗和 Home 页统一复用基座主题 token，完整支持深色模式

## 1.1.25 发布说明

1.1.25 完成 Agent Board 画布选区上下文的首版闭环：

- 画布底部显示实时选区状态、有限图片预览以及文字和图形类型
- 支持复制人可读的 CoreStudio 选区引用，并在剪贴板失败时保留选区
- 支持仅清除临时画布选择，不删除元素、不触发 Agent Board 项目自动保存
- Codex Skill 在画布任务中优先读取选区，并固定任务开始时的元素和图片引用
- Codex 集成升级到 1.4.0、Skill 契约升级到 6；安装后需要在设置中更新集成环境

## 1.1.24 发布说明

1.1.24 收紧图片来源与生成记录的数据边界，并修复详情、历史记录与画布之间的定位问题：

- CoreStudio、Codex 生成与导入图片使用明确且不可伪装的来源组合
- 旧项目按单条记录容错读取，异常数据进入健康诊断，不再击穿整个项目
- 保留目录外图片服务的 provider 信息，并在详情与生成记录中统一安全展示
- 项目健康检查和实际画布定位共用引用链候选规则
- 详情中的“在生成记录中显示”可重复触发，后台记录更新不再抢走滚动位置
- 项目修复只执行确定性的来源变换，不删除图片资产

本次客户端升级不改变 CLI、Skill、Local Bridge 协议或安装结构。Codex 集成版本继续保持 `1.2.0`，已安装该版本集成的用户无需重新安装。

## 1.1.23 发布说明

1.1.23 明确分离 CoreStudio 本地生成与 Codex 外部 Agent 能力，并轻量联动现有的图片信息：

- CoreStudio 本地继续保留单次生成模式和内置模型配置
- Codex、CLI、Local Bridge 和 Agent Board 不再暴露或调用 CoreStudio 内置生成模型
- Codex 生成的图片和搜索导入的图片使用不同来源类型写回项目
- 画布选中图片时，左侧生成记录会高亮对应项；右侧详情可直接打开生成记录
- 移除退役的外部生成路由、命令、权限、上下文和无用测试

本次内置的 Codex 集成版本从 `1.1.0` 升级为 `1.2.0`，Bridge 协议升级为 2，Skill 契约升级为 4。安装 CoreStudio 1.1.23 后需在设置中执行一次 Codex 集成更新。

本次发布通过了这些检查：

- 195 个测试文件、1542 项测试全部通过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- 包内 Codex 安装器、CLI 版本契约与独立用户数据目录的 renderer smoke 通过
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `2ad22069-4243-4af8-afd9-6819e16c0448`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper 和 codesign 校验通过
- GitHub Release 为公开非预发布，四个远程资产校验值与本地一致

校验值：

```text
CoreStudio-1.1.23-arm64.dmg
sha256: 644a79cf07e3e1c5062032cf6416b4b89a22e737a99befaae30c774f98495576

CoreStudio-1.1.23-arm64-mac.zip
sha256: 0d504a22126261499795611715cd37d8f4a18896e2aa8f97977058b23e3fa9eb

CoreStudio-1.1.23-arm64.dmg.blockmap
sha256: 9a266de465d18df9df0fa824f4d082de81b1d15109d6a75fe4340600f2cf8b53

CoreStudio-1.1.23-arm64-mac.zip.blockmap
sha256: a551bda1dbeff530a75563c8e85a49f675b4b345d00a951cd6cf99480d30dd09
```

## 1.1.22 发布说明

1.1.22 移除 CoreStudio 内置的 ACP / Agent runtime，收敛产品交互和数据流：

- 删除内置 Agent 会话、任务、日志、设置、IPC 和调试入口
- 本地生成器只保留单次生成模式，并继续支持并发提交和任务级取消
- 保留 Codex 集成、CoreStudio CLI、Local Bridge 和 Agent Board 外部协作链路
- 删除退役协议的兼容代码、历史恢复逻辑、无用测试和依赖
- 项目图片资产与画布引用保持不变；旧 Agent 运行历史不再保留

本次客户端升级不会要求重新安装 Codex 集成；Codex 集成版本继续保持独立的 `1.1.0`。

本次发布通过了这些检查：

- 195 个测试文件、1545 项测试全部通过
- TypeScript typecheck、source/package-input/release secret scan 和 production build 全部通过
- 包内 Codex 安装器、CLI 版本契约与隔离 renderer smoke 通过
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `40323cce-7b21-458f-a8ba-53be74147bfc`，状态 `Accepted`
- App 与 DMG 的 stapler validate、Gatekeeper 和 codesign 校验通过

校验值：

```text
CoreStudio-1.1.22-arm64.dmg
sha256: 682ea8c639f3d9e1e09b397b992c156ecf7fa88d578266bb067fc0ca9e3a33f0

CoreStudio-1.1.22-arm64-mac.zip
sha256: 131331eab09c62a58d436af6e9e76029268666047002e225ad64bbfb3c90a8d8

CoreStudio-1.1.22-arm64.dmg.blockmap
sha256: 48d742d7a5843d11d0762f7052e12bb74056a0fa0f47a39e34d561898a664795

CoreStudio-1.1.22-arm64-mac.zip.blockmap
sha256: 37c6ea189eabc159649f36d4601f39a7bcbf81869d750d1d543a16af55e9b5c6
```

## 1.1.21 发布说明

1.1.21 修复生成输入状态和任务并发行为：

- 画布预选内容不再自动视为已输入提示词，需要先点击输入框确认引用
- 只有引用、没有额外指令时不允许提交，避免误触发生成
- 单次生成提交后立即清空输入内容，并允许继续提交多个并发任务
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
- 当前 Codex 对话缺少浏览器控制能力时，明确降级为一键链接，不再误报 CoreStudio 或 Bridge 故障
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
