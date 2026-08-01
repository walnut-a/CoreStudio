# CoreStudio CLI 原生图表写入需求整理

> 所属项目：CoreStudio
>
> 状态：代码完成，待真实界面验收
>
> 本文是本需求的唯一规格来源。实现范围变化时先更新本文，不再平行创建同类规格。

## 需求背景

CoreStudio CLI 已经可以读取当前项目、画布和选区，并通过 Local Bridge
受控写入图片与提示词，但不能让外部 Agent 稳定创建由矩形、文字、箭头和绑定关系
组成的流程图。Agent 若直接拼装持久化 scene，不仅需要了解内部字段，还会绕过
CoreStudio 的项目房间、并发协调和数据所有权边界。

Excalidraw 上游已经提供 Mermaid 到原生 Excalidraw 元素的转换能力，也提供
`convertToExcalidrawElements` 处理文字容器和箭头绑定。第一版应复用这些成熟能力，
把图表作为一个语义写入操作提交到当前 Project Room，而不是引入云端 MCP、
图片化导出或新的绘图引擎。

## 当前理解

- 目标用户/角色：通过 Codex、Cursor 等外部 Agent 操作当前 CoreStudio 项目的用户。
- 使用场景：用户要求创建流程图、时序图、类图或 ER 图，并希望结果直接进入当前
  本地画布继续编辑。
- 需求目标：Agent 使用紧凑、稳定的 Mermaid 输入生成原生可编辑图形，同时保持
  CoreStudio 对项目数据、并发写入和持久化的唯一所有权。

## 第一版范围

### 包含

- 新增 CLI 命令：

  ```sh
  corestudio write diagram \
    --format mermaid \
    --file /absolute/path/to/diagram.mmd \
    --anchor auto \
    --json
  ```

- `--format` 第一版只接受 `mermaid`，不根据文件内容自动猜测格式。
- `--file` 由 CLI 在本机读取 UTF-8 文本，再通过 Local Bridge 发送；Bridge
  不接收任意项目文件路径，也不自行读取 Agent 工作区文件。
- `--anchor` 接受：
  - `auto`：优先放到当前 Agent Board 选区右侧；没有选区时放到当前视口附近。
  - `selection`：必须存在当前 Agent Board 选区，否则返回 `BAD_REQUEST`。
  - `viewport`：忽略选区，放到当前视口附近。
- Mermaid 转换结果必须是原生 Excalidraw 元素；若转换退化为图片资产，第一版拒绝
  写入并返回明确错误。
- 图表作为一批元素避开当前场景已有内容，并以一次 Agent Writer operation
  提交到 Project Room。
- 每个主要元素写入 CoreStudio 图表元数据，至少包含 `diagramId`、输入格式和
  Mermaid 语义元素 ID，供后续定位与增量编辑使用。
- 返回结果包含 `diagramId`、元素 ID、图表范围、Project Room sequence 和
  持久化状态。
- 支持 `--dry-run`：实际解析 Mermaid、转换元素并计算放置结果，但不修改房间、
  不写项目文件。
- `read capabilities` 和 CLI 帮助必须暴露新命令与 Bridge route。

### 不包含

- 不开放任意 `write scene` 或完整 scene 替换能力。
- 不接入 `mcp.excalidraw.com`，不上传画布，不实现云端 checkpoint。
- 不复制官方 MCP 的镜头动画、流式绘制和分享链接。
- 第一版不开放官方 MCP 风格的 Excalidraw skeleton 输入。
- 第一版不实现按 `diagramId` 增量修改或删除；但必须保留未来实现所需的元数据。
- 第一版不将不受 Mermaid 原生转换支持的图表类型静默转成图片。

## 关键规则

### 数据与权限

- CLI 仍是 Local Bridge 的薄客户端；项目数据只能由 CoreStudio 读取和持久化。
- 图表写入必须具有可信 Codex participant identity，并使用 `agent-writer` 房间角色。
- Renderer 负责调用需要浏览器文字测量能力的 Mermaid / Excalidraw 转换代码；
  Electron 主进程只接收已经校验的语义元素操作。
- 写入使用当前房间 identity、`baseSequence` 和唯一 `operationId`，沿用现有
  并发冲突与持久化错误语义。

### 输入限制

- Mermaid 源文本必须非空，按 UTF-8 读取。
- CLI 对源文件设置明确大小上限；超限、无法读取或不是有效 Mermaid 时返回结构化
  错误，且不得向项目提交任何元素。
- 转换后的元素必须满足 Project Room element contract，元素 ID 不得与当前场景冲突。
- 第一版设置明确元素数量上限，避免一次命令阻塞 renderer 或产生不可用大图。

### 放置与可编辑性

- 节点、文字容器、箭头和绑定关系必须保持 Excalidraw 原生结构，用户可在主画布和
  Agent Board 中继续移动、改字或删除。
- 整批图表只做统一平移，不单独改变 Mermaid 计算出的节点关系。
- 有选区时优先放在选区右侧；没有选区或指定 `viewport` 时以视口中心为首选位置。
- 首选位置与现有内容重叠时，寻找距离首选位置最近的合法空位。

### Dry run

- `--dry-run` 不是简单回显请求。
- Dry run 必须经过与正式写入相同的读取、语法解析、元素转换、数量校验和放置计算。
- Dry run 返回预期 `diagramId`、元素数量、范围和元素 ID，但 `inserted=false`、
  `persisted=false`，Project Room sequence 不变化。

## 验收口径

- [ ] 有效流程图 Mermaid 可以通过 CLI 写入当前 CoreStudio 项目。
- [x] 结果是可编辑的矩形、文字、菱形和箭头，不是截图或单张图片。
- [x] 箭头绑定与节点文字容器保持有效，移动节点后连线仍跟随。
- [ ] `auto`、`selection`、`viewport` 三种定位规则符合定义且不覆盖已有内容。
- [x] `--dry-run` 能发现 Mermaid 语法错误，且不会改变房间或项目文件。
- [ ] 无效格式、空文件、文件读取失败、过大输入、转换图片化和元素超限都返回
      结构化错误。
- [x] 正式写入作为一次 Agent Writer operation 广播并持久化。
- [x] CLI、Local Bridge、renderer runtime 和 Project Room 的定向测试通过。
- [x] `corepack yarn test:typecheck` 通过。
- [ ] 在真实 CoreStudio / Agent Board 界面验收至少一个含判断分支的流程图，并确认
      主画布与 Agent Board 均可见、可编辑。

## 后续方向

- 增加 `--format skeleton`，吸收官方 Excalidraw MCP 的紧凑元素协议、标签和样式
  指南，但继续在本机完成校验与写入。
- 基于 `diagramId + semanticId + baseRevision` 增加冲突可见的增量编辑。
- 在 CLI 稳定契约之上提供本地 MCP Adapter，而不是让 MCP 直接操作项目文件。

## 待确认问题

- 暂无。第一版按本文边界开发；出现需要扩大产品范围的新证据时先更新规格并确认。
