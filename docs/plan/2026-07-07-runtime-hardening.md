# 运行时健壮性加固计划

**日期：** 2026-07-07  
**状态：** In progress

## 背景

外部 review 指出第二批问题集中在运行时健壮性：项目文件写入、单实例、provider 请求生命周期、ACP 日志增长、主进程异常兜底、发布验证和平台声明。

## 已落地

1. 核心项目 JSON 改为同目录临时文件加原子 `rename`。
2. Electron 主进程加入单实例锁，第二次启动聚焦已有窗口。
3. Provider 直连 `fetch` 统一走 `providerFetch`，默认 5 分钟超时，并支持外部 `AbortSignal`。
4. `taskGrants` 创建新授权前清理过期和已完成 grant，token 比较改为常数时间比较。
5. ACP run log 保留策略会删除超出上限的旧 `.jsonl` 文件，并从 thread index 中移除被裁剪的 task id。
6. 主进程未捕获异常和未处理 Promise rejection 会写入本地日志，并弹窗提示日志路径。
7. 桌面端打包配置只声明已验证的 macOS 目标，不再声明未验证的 Windows/Linux 包。
8. 新增打包后冒烟脚本：启动 macOS `.app`，等待 renderer 加载完成并自动退出。
9. 内置生图 pending job 会把 `generationJobId` 传入主进程；停止生成会取消主进程 `AbortController`，并让 provider `fetch` 收到 `AbortSignal`。

## 待处理

1. IPC 按域拆分，并给 renderer 入参补 schema 校验。
2. 增加轻量检查更新入口，优先只提示 GitHub Releases 最新版本，不自动下载安装。

## 验证

本计划对应改动需要至少跑：

```sh
cd excalidraw
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source
git diff --check
```
