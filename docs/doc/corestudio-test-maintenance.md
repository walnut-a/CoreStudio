# CoreStudio 核心回归测试

## 维护目标

桌面端保持 **100 条以下**，按 Vitest 实际执行条数计数，`it.each` 的每个样本单独计数。当前为 26 个文件、99 条，其中真实 UI 测试只有输入框的 5 条。上游 Excalidraw 的测试不属于本次桌面端精简范围。

按用户流程和严重失败后果决定覆盖职责，不按源文件、函数、Props 或回调数量配套测试。新增测试优先扩展已有流程；独立安全边界仍独立计数，不把大量无关场景塞进一个循环来满足预算。

这是一套精简的核心回归集，覆盖广度小于原来的 1,795 条。组件展示、文案、CSS 数值、每个模型的参数排列、普通菜单/设置回调、历史结构和依赖精确版本的断言已移除；不再承诺对这些细节做逐项自动回归。真实 UI、桌面和发布验收继续按仓库 L2/L3/L4 规则执行。

## 覆盖职责

下表文件相对于 `excalidraw/apps/image-board-desktop/`，省略 `.test.ts` 后缀；输入框为 `.test.tsx`。

| 流程或风险             | 条数 | 保留入口与结果                                                                                                                                                                                                                                            |
| ---------------------- | ---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 打开、保存、切换项目   |    7 | `src/app/projectOpenFlow`：打开到就绪、保存失败重试、保存/读取阶段过期成功和失败隔离、裁切原图坐标                                                                                                                                                        |
| 输入与提交             |    5 | `src/app/components/GenerateImageDialog`：真实生产组件和 Lexical 编辑器，配置模型后提交、确认引用图后提交，空提示词/未配置/引用超限禁止提交                                                                                                               |
| 配置服务并生成         |   10 | `electron/providerGenerationFlow`、`electron/providers/providerFetch`：7 个服务各一条配置落盘到响应解析流程，密钥隔离与文件权限、失败重试、取消和超时                                                                                                     |
| 生成完成与取消         |    7 | `src/app/builtinGenerationRendererController`、`builtinGenerationCompletionController`：迟到结果、剩余占位图、缺少返回图、删除与落盘竞态、替换失败回滚、保留房间已接收的数据                                                                              |
| 图片读取调度           |    2 | `src/app/imageRenditionScheduling`：限制并发与等待解码、丢弃旧资源和旧项目结果                                                                                                                                                                            |
| Agent 写回项目         |    6 | `electron/agent/agentProject.integration`、`agentWriteback.integration`：真实 CLI/HTTP/房间/磁盘，任务间隔离、重试去重、磁盘失败、退出与重新认领、原生图表、事务中断恢复                                                                                  |
| Agent 访问与 HTTP 响应 |   19 | `electron/agent/localBridgeServer`：真实 HTTP 校验关闭授权、签发和撤销、匿名读取、来源、请求大小、写入身份，以及禁止覆盖服务/模型/密钥/地址和直接写场景；JSON 序列化、错误回包、连接生命周期及脱敏诊断                                                    |
| 协作与关闭项目         |    9 | `electron/room/projectRoomWebSocketServer`、`projectRoom`、`projectRoomService`、`src/app/projectRoomClientController`：WebSocket 来源与 actor 隔离、并发合并与持久化、重连快照、图片先落盘、关闭失败保留全部项目                                         |
| 项目数据保护与恢复     |   10 | `electron/projectFs`、`electron/project/projectImageWriteback`、`projectStorageResolution`、`projectReconstruction`：损坏/未来格式不覆盖、空保存和旧版本拦截、只回滚本事务、冲突预览/备份/确认、从原图重建                                                |
| 外部图片与文件安全     |   10 | `electron/project/externalImageIntake`、`externalImageFiles`、`projectAssetAccess`、`externalImageHeader`、`externalImageDecoder`：就地登记/inbox 复制、去重和删除不复活、清缓存保原图、路径/链接/嵌套项目限制、字节/像素上限、SVG 活动内容和外部资源拦截 |
| 运行身份与进程所有权   |   14 | `electron/desktopRuntimeConfig`、`electron/room/projectProcessLease`、`scripts/desktopTestRunnerLifecycle`：正式/源码/预览隔离、裸启动/人工 QA/自定义身份拒绝、项目独占、取消/强杀/超时清理和重复测试互斥                                                 |
| 合计                   |   99 | UI 5 条，其他业务和安全回归 94 条                                                                                                                                                                                                                         |

新服务流程使用真实配置文件、能力校验、路由和响应解析，只替换 Electron 图像接口及外部网络。Agent 会话测试使用真实会话存储，从 HTTP 签发、访问到撤销后拒绝，不再用预设抛错模拟授权失效。生成完成等定向测试仍用画布/存储边界替身；它们不等于完整桌面验收。

## 清理范围

上一轮仍有 260 个测试文件、1,795 条，其中应用层 743 条。此次减少 1,703 条（94.9%），现有测试文件删除 235 个、新增 1 个服务流程文件，最终 26 个文件。测试代码从 63,782 行降到 4,979 行；另删除 1,194 行 App 专用 mock 辅助文件，共减少 59,997 行测试相关代码。整套 App 编排测试、普通组件测试和叶子模块测试已移除。原 8 份服务适配测试及配置包装测试统一到一个服务流程文件。

测试文件实际删除，没有通过增加 `skip`、`only`、`exclude` 或隐藏参数样本减少数量。通用 Vitest 配置删除了空置的 App 专用测试项目及其排除规则，后续 App 测试仍会由默认测试项目发现。Node 集成入口移除废弃路径及改为 DOM 输入校验的解码测试。涉及原生图表转换的写回测试仍在完整桌面套件中运行；它依赖 Excalidraw 的 DOM 环境，不加入纯 Node 入口。CI 删除两个指向废弃测试的步骤；类型检查、完整测试、Node 集成、真实密钥扫描、构建和产物预算步骤保留。

上述测试精简未修改生产逻辑、依赖版本、测试 runner、发布链路与上游 Excalidraw 测试文件。历史文档中的旧测试名称仅表示当时的验证记录，当前分工以此文为准。

## 测试精简验证（2026-10-12）

- 新的服务流程、真实输入框、项目切换、授权与撤销、原图重建、SVG 输入校验已做定向验证。
- 独立临时源码副本先通过基线，再分别注入密钥泄漏、撤销失效、旧项目结果覆盖。三次均由对应业务断言识别，不以语法或模块加载错误冒充有效保护；临时副本已删除，工作区生产代码未变。
- 最终完整 `corepack yarn test:desktop` 仅运行一次，26 个文件、92 条全部通过，耗时 13.24 秒，默认 2 个 worker、非 watch。独立 `test:agent-integration` 在纯 Node 环境中通过 3 个文件、8 条；它们是 92 条中的子集，不额外计数。
- 最终 `corepack yarn test:typecheck --pretty false` 通过。30 个相关测试、配置和文档文件通过 Prettier 检查，`git diff --check` 通过。
- runner 报告 `remaining=0`、`lockReleased=true`；精确进程复查确认本次测试、类型检查与故障注入进程均已退出，测试锁和临时源码副本均不存在。
- 输入框仍有少量既有 React `act()` 提示，Node 有弃用提示；两者没有测试失败。本次没有启动 Electron、打包或安装，不产生新的视觉验收结论。

测试互斥和精确进程清理遵循[测试生命周期治理](../plan/2026-07-27-corestudio-test-process-lifecycle.md)与仓库 [AGENTS.md](../../AGENTS.md)。

## Local Bridge 响应修复（2026-10-12）

正式版 1.1.60 的 `main-process-errors.log` 在本地时间 00:09:46（UTC 2026-10-11 16:09:46.622）记录了 `sendJson → sendError → sendRendererError → 外层 catch` 的 `ERR_HTTP_HEADERS_SENT`。旧日志没有首次异常和请求路由，无法判断当天到底是哪个请求、什么数据触发，不能把本次复现条件当作那次事故的已知起因。

源码已验证的机制是先 `writeHead` 再 `JSON.stringify`：循环引用、BigInt 等数据序列化失败后，成功响应已经提交，内层错误回包和外层 catch 又各尝试写头，最终产生未处理拒绝。错误详情自身不可序列化、异步命令在响应结束/连接断开后才完成，以及资源读取和响应发送共用一个 catch，也缺少可靠的收束边界。最小真实 HTTP 测试先得到请求超时和相同调用栈的未处理拒绝，再实施修复。

当前实现先序列化后提交；JSON、预检、静态资源和开发资源代理共用响应状态检查。已写头但未结束的半响应销毁连接，已结束/已销毁/已断开的连接不再写入。错误回包失败时只尝试固定、无需再次序列化的 500 内容；若已提交则关闭，不把回包或流错误再次抛入未处理 Promise。

每个请求分配独立 ID，诊断保留方法、规范化路由、阶段、耗时、响应状态以及首次异常的类型、已知错误码和原始栈位置；二次异常附带首次异常摘要。循环引用和 BigInt 使用固定原因标签。任意异常消息和 details 可能夹带密钥、正文和 JSON 片段，因此不落盘；提取栈之前剥离整个多行消息，不把其中的伪造栈行当作诊断。请求头、查询参数、动态 Board ID、请求正文均不记录。主进程写入 `<settingsDirectory>/logs/local-bridge-errors.log`，诊断落盘失败时使用同样脱敏的 console 记录；日志故障不影响 HTTP 收束。

仅扩展已有 `localBridgeServer.test.ts`：循环引用和 BigInt 2 条、错误回包与日志故障 1 条、已写头/已结束/客户端断开 3 条、异步流错误与迟到结果 1 条。使用真实本地 HTTP 和 ServerResponse，不新增包装层测试或复制整套 mock。该文件从 12 条变为 19 条，桌面总量从 92 条变为 99 条。

定向验证为 Local Bridge 19 条和既有 Agent 项目/写回 6 条，共 25 条通过；`test:typecheck --pretty false` 通过。收尾只运行一次完整 `test:desktop`：26 个文件、99 条全部通过，Vitest 耗时 10.91 秒，默认 2 个 worker。Prettier 与 `git diff --check` 通过。runner 记录 `remaining=0`、`lockReleased=true`；复查 runner PID 22910、测试 PID/PGID 22949 及相关测试/类型检查命令，均无残留，运行锁不存在。

本次只修改源码与测试，不启动或替换正式应用，不打包、发布。已安装的 1.1.60 仍包含旧响应路径，不会因源码修复自动更新。
