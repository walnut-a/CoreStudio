# CoreStudio 图片格式协议

## 结论

CoreStudio 所有桌面适配入口共用一份格式协议，不再各自维护白名单。协议覆盖桌面“导入图片”、项目目录自动接纳、Inbox、Agent/CLI 写入和系统剪贴板图片读取。画布插入、拖入和网页粘贴保持上游 Excalidraw 实现不变，通过契约测试保证与本协议一致。

## 输入协议 v1

| 格式 | 扩展名                   | 规范 MIME       | 兼容 MIME    |
| ---- | ------------------------ | --------------- | ------------ |
| PNG  | `.png`                   | `image/png`     | —            |
| JPEG | `.jpg`、`.jpeg`、`.jfif` | `image/jpeg`    | `image/jfif` |
| WebP | `.webp`                  | `image/webp`    | —            |
| AVIF | `.avif`                  | `image/avif`    | —            |
| GIF  | `.gif`                   | `image/gif`     | —            |
| BMP  | `.bmp`                   | `image/bmp`     | —            |
| ICO  | `.ico`                   | `image/x-icon`  | —            |
| SVG  | `.svg`                   | `image/svg+xml` | —            |

`.jfif` 按 JPEG 原图处理，持久化时使用 `image/jpeg`；来自浏览器或剪贴板的 `image/jfif` 仍会被接受。

## 入口行为

- 文件选择器、路径扫描和 CLI 扩展名判断从同一定义派生。
- 项目接纳和 Agent/CLI 保留合法原图字节，并统一执行 64 MiB、6400 万像素、容器头和真实解码检查。
- 系统剪贴板只能读取当前操作系统实际提供的 MIME；匹配协议后会解码并转为 PNG 进入现有 Bridge 协议。
- SVG 必须是静态、可独立解码的内容；不接受脚本、`foreignObject`、DOCTYPE、外部资源或事件属性。
- GIF 作为图片原文件接纳；当前不定义动画编辑或动画导出能力。

## 输出协议

导出是独立的输出能力，不与输入白名单混用。当前保持：

- 导出 PNG。
- 导出 SVG。
- 复制 PNG 到剪贴板。

新增输入格式不代表自动新增同名导出格式。

## 单一真实来源

代码的唯一 CoreStudio 格式定义是 `excalidraw/apps/image-board-desktop/src/shared/imageFormatProtocol.ts` 中的 `IMAGE_FORMATS`。下列入口视图都由它生成：

- `IMAGE_FILE_EXTENSIONS`：所有输入扩展名。
- `IMAGE_MIME_TYPE_BY_EXTENSION`：扩展名到规范 MIME 的映射。
- `IMAGE_INPUT_MIME_TYPES`：浏览器和剪贴板可接受的 MIME 集合。

各桌面适配入口只能从这些派生视图使用过滤条件，不得新增本地格式白名单。上游画布白名单不被 CoreStudio 改写；`imageFormatProtocol.test.ts` 负责检测格式或 MIME 漂移。
