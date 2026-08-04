---
title: Karpathy LLM Wiki 模式
type: source
updated: 2026-07-30
source_count: 1
---

# Karpathy LLM Wiki 模式

## 来源

- 作者：Andrej Karpathy
- 标题：LLM Wiki
- URL：<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
- 创建日期：2026-04-04
- 本次访问：2026-07-30
- 类型：external

## 核心思想

- `confirmed`：与每次查询都从原始资料重新拼装答案的 RAG 不同，LLM Wiki 把综合知识持久化为持续更新的 Markdown 页面。
- `confirmed`：架构包含三个层次：不可变原始来源、LLM 维护的 Wiki、约束维护方式的 schema。
- `confirmed`：核心操作是 ingest、query 和 lint。
- `confirmed`：`index.md` 是内容目录，`log.md` 是追加式时间线，两者职责不同。
- `confirmed`：新来源不仅生成一篇摘要，还应更新所有受影响的实体、概念、比较和综合页面。
- `confirmed`：具体目录、页面类型、工具和输出格式应按项目领域定制。

## CoreStudio 的采用方式

- 现有仓库文件保持原位，作为可追溯来源层，不为建 Wiki 而复制或改写。
- `wiki/pages/` 承担跨文档综合，`wiki/sources/` 承担来源路由，`wiki/AGENTS.md` 承担 schema。
- 在原模式基础上增加证据状态，以防历史计划、运行观察和推断被误写成当前产品事实。
- 首版使用普通 Markdown、Git、`rg` 和轻量链接检查，不提前引入向量检索或数据库。

## 影响页面

- [Wiki 说明](../README.md)
- [维护协议](../AGENTS.md)
- [操作手册](../operations.md)
- [来源地图](source-map.md)
