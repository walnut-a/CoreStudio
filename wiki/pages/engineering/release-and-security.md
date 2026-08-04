---
title: 发布与安全
type: engineering
updated: 2026-07-30
source_count: 5
---

# 发布与安全

本页说明 CoreStudio 桌面端的构建、打包、签名、公证、密钥扫描和发布状态边界。

## 不同对象

以下对象必须分开验证：

1. 当前源码 checkout；
2. 本地构建输出；
3. `.app` 或目录包；
4. DMG 安装包；
5. 已安装应用；
6. GitHub release 附件；
7. 用户机器上当前运行实例。

- `confirmed`：版本号相同不能证明这些对象内容相同。
- `confirmed`：源码开发版或松散 `.app` 不能替代正式 DMG 的发布权威性。
- `confirmed`：涉及“最新”“已发布”“已安装”或“正在运行”的回答必须实时核验目标对象。

## 发布链路

- `confirmed`：桌面端提供构建、密钥扫描、electron-builder、签名、公证和 release 检查脚本。
- `confirmed`：普通 UI 改动不默认触发完整打包。
- `confirmed`：L4 风险应使用打包预览、packaged smoke 或正式打包链路。
- `confirmed`：发布前后分别检查源码 / package inputs 和 release 输出中的秘密。

实际命令、证书、notary 配置和目标架构以当前 `RELEASE.md`、package scripts 和 CI workflow 为准。

## 密钥与本地配置

- `confirmed`：模型服务 Key 是本地配置，不进入源码仓库和安装包。
- `confirmed`：仓库包含针对常见 API Key、Bearer Token 和本地配置文件的扫描门禁。
- `confirmed`：日志和错误输出不应泄露 token、Key、完整认证材料或用户项目敏感数据。
- `unknown`：用户机器当前是否配置了有效凭据；不得通过 Wiki 或仓库内容推断。

## 发布状态判断

回答发布问题前至少确认：

- 当前分支、提交和工作区；
- package 中的版本；
- 本地目标产物路径、哈希、签名和公证；
- GitHub release 的 tag、附件和时间；
- 若涉及安装版，比较安装 bundle 的实际内容；
- 若涉及运行版，核对机器身份文件和精确可执行文件。

上述是 `confirmed` 的验证原则，但每一次结果都是新的 `observation`，不应长期写死在 Wiki。

## 当前未知

- `unknown`：当前最新公开版本、CI 结果和 release 附件。
- `unknown`：本机已安装应用是否来自最新构建。
- `unknown`：当前签名证书和公证凭据是否可用。
- `unknown`：某次历史计划中的发布验收是否覆盖了后来代码。

## 主要来源

- [仓库 README](../../../README.md)
- [发布清单](../../../excalidraw/apps/image-board-desktop/RELEASE.md)
- [桌面端 package](../../../excalidraw/apps/image-board-desktop/package.json)
- [根 package scripts](../../../excalidraw/package.json)
- [桌面 CI](../../../.github/workflows/corestudio-desktop.yml)
