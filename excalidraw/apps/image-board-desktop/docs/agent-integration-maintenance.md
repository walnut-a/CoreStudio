# Agent 接入文档维护链条

## 唯一来源与分工

| 内容 | 唯一维护入口 | 交付方式 |
| --- | --- | --- |
| 稳定 CLI、安全边界和任务流程 | `resources/codex-integration/corestudio-skill/SKILL.md` | 随应用打包，由固定安装器安装 |
| 宿主工具、浏览器入口和故障处理 | `resources/agent-integration/hosts/<host>.md` | 三款新宿主安装为 Skill 下的 `references/host.md`，Skill 按需读取 |
| 用户安装与使用说明 | 仓库根 `docs/agent-integration/content.mjs` 与 `workflows.md`，生成用户指南及随包 USER_GUIDE.md | 客户端和官网指向 GitHub main，持续维护 |
| 接入协议与架构 | `docs/agent-cli-contract.md`、`docs/agent-integration-architecture-and-principles.md` | 仓库文档，按协议版本注明变化 |
| 官网引导 | 同一 `docs/agent-integration/content.mjs` 生成 website 模块及 HTML | 生成中英文页面，部署后核对真实响应 |

以上路径除特别说明外，相对桌面应用目录。宿主说明不再复制整份到公共 Skill；官网、仓库指南与随包用户指南由 `node docs/agent-integration/generate.mjs` 同次生成；宿主参考文件也进入生成指南。禁止手改生成输出。两套 CI 都执行 `--check`，遗漏生成会失败。

## 更新原则

- 第三方 Agent 更新时，先验证实际工具与权限，再修改对应宿主文件，保留验证日期和未验证能力说明；不把历史工具名称写成永久保证。
- 本地已安装的 Skill 是快照，不会因 GitHub 文档修改自动刷新。新的文档必须先进入交付包，再由用户在设置中更新集成；文档内容差异或缺失会触发更新提示，不依赖应用版本号变化。
- 在线指南提供持续修订的解释，不授权 Agent 下载脚本、替换本地 Skill 或绕过签名包安装器。运行能力以当前本机 CLI、Bridge 和工具为准。
- main 上涉及新功能的指南要说明适用条件；同版本可能有多个构建，不能仅凭版本号保证功能存在。优先让 Agent 检查实际能力，必要时说明对应源码提交或构建。
- 发布标签保存历史文档快照。修改 main 不会修改旧标签；禁止为了说明更新强推历史标签。

## 检查与交付

日常 CI 的服务、文档和安装器测试负责链接规则、内容约束与本地安装。发布前另运行 `corepack yarn check:agent-docs:online`：比较本次工作区中的指南、公共 Skill、宿主说明、安装资源及官网源码与 GitHub main 的 blob 哈希，再逐字核对中英文官网 HTML。未推送、未部署或网络失败均报告失败，不能以本地测试通过替代。

此命令只读，不推送代码、不发布网站、不移动标签，也不替换安装包。完整执行顺序及包内验收见 [发布清单](../RELEASE.md#agent-接入文档交付门禁包括同版本重新打包)。同版本更新需要记录源码提交和包哈希；版本号不是内容一致性的证据。

## 无 Computer Use 的安装

应用包内 `resources/agent-integration/setup.sh` 是面向 Agent 和终端用户的无界面入口，复用设置里的安装服务（覆盖保护、兼容性记录、宿主隔离）。可按参数顺序安装多个指定宿主，失败时停止并保留已完成结果。不直接暴露底层 install.sh。安装不启动窗口、不认领项目、不授予生图权限。具体命令从统一内容源生成。旧包不含此入口时需更新包或由用户通过设置安装；仅推送文档无法补上旧包能力。
