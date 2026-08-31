# CoreStudio 官方网站

这是 CoreStudio 的静态官方网站实现，页面不依赖前端框架或远程字体，可直接部署到任意静态托管服务。

首页把轻量的 CoreStudio 模拟画布组织成一张“工业设计编辑桌”：四张 Dieter Rams 参考素材在左侧组成双排拼贴，右侧按原始 3:2 比例完整展示生成结果，中间以一条 Excalidraw 原生箭头连接。近黑 slogan 与本地项目、模型自由、Agent 协作三个利益点共同构成底部内容带。访客可以选中画布对象、缩放或拖动画布，并触发一次图片生成演示。这些交互只用于展示，不把官网伪装成完整的网页版应用。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/website/`。英文版使用该路径，中文版位于
`http://127.0.0.1:4173/website/zh/`；从仓库根目录提供静态文件，是为了让官网加载仓库内的 Excalidraw 字体资源。两个版本在页头与页脚提供固定切换入口，不按浏览器语言自动跳转。
原 `/en/` 路径保留为英文首页的兼容跳转。

Agent 集成中心位于 `http://127.0.0.1:4173/website/integrations/` 与
`http://127.0.0.1:4173/website/zh/integrations/`。页面提供 Codex、Cursor、Claude Code 的 Skill / CLI 安装指南与只读 WebMCP 渐进增强；不支持 WebMCP 或关闭 JavaScript 时，核心教程仍由静态 HTML 提供。

## 文件结构

```text
website/
├── CNAME
├── DESIGN.md
├── PRODUCT.md
├── index.html
├── integrations/
│   └── index.html       # 英文 Agent 集成中心
├── robots.txt
├── sitemap.xml
├── en/
│   └── index.html       # 旧英文路径兼容跳转
├── zh/
│   ├── index.html       # 中文版
│   └── integrations/
│       └── index.html   # 中文 Agent 集成中心
├── integrations.css
├── integrations.mjs
├── integrations-content.mjs
├── integrations-contract.test.mjs
├── webmcp-adapter.mjs
├── styles.css
├── main.js
├── canvas-engine.mjs
├── canvas-engine.test.mjs
└── assets/
    ├── dieter-rams-*.webp
    ├── corestudio-canvas-result-rams-v2.webp
    ├── corestudio-icon-*.{png,webp}
    ├── corestudio-favicon-32.png
    ├── corestudio-apple-touch-icon.png
    ├── corestudio-social-card.jpeg
    ├── corestudio-product.jpeg
    ├── corestudio-product-*.webp
    └── fonts/
        ├── Assistant-Regular-Latin.woff2
        ├── Assistant-SemiBold-Latin.woff2
        ├── Assistant-Bold-Latin.woff2
        ├── SmileySans-Oblique.woff2
        └── SmileySans-LICENSE.txt
```

官网图标的唯一原始素材是
`excalidraw/apps/image-board-desktop/build/icon.png`，官网不另行重绘或替代。页面使用的
PNG / WebP 是从这张原始图标生成的尺寸与格式衍生文件，网站目录不重复保存原图。

`dieter-rams-*.webp` 是四张独立的画布参考图片，`corestudio-canvas-result-rams-v2.webp` 是与这些参考在材质、配色上对应的演示生成结果。参考图保持为无圆角的独立图片对象，不预合成为网页卡片；生成结果只出现一次，并按素材原始比例完整缩放，不做额外放大裁切。旧版产品截图仍保留在 `assets/` 中，但当前首页不再加载它们。

## 定向验证

画布缩放、视图切换和触摸手势逻辑放在 `canvas-engine.mjs` 中。可以从仓库根目录运行：

```sh
node --test website/canvas-engine.test.mjs
node --test website/integrations-contract.test.mjs
node --check website/main.js
node --check website/integrations.mjs
node --check website/integrations-content.mjs
node --check website/webmcp-adapter.mjs
```

Assistant 字体文件只保留 Basic Latin 字符。中文版仅按需使用 SemiBold / Bold；英文版正文
使用 Regular，导航、按钮和重点文字使用 SemiBold / Bold。

中文版主标题使用本地托管的 Smiley Sans 倾斜字形，字体许可与第三方素材来源记录在
`THIRD_PARTY_ASSETS.md` 和 `assets/fonts/SmileySans-LICENSE.txt`。

## 发布配置

- 正式域名为 `https://getcorestudio.com/`，`www.getcorestudio.com` 由 GitHub Pages 重定向到裸域名。
- 英文版使用根路径，中文版使用 `/zh/`，旧 `/en/` 路径跳转到英文首页。
- `CNAME`、canonical URL、Open Graph 图片 URL、`robots.txt` 和 `sitemap.xml` 均使用正式域名。
- 下载按钮当前始终指向 GitHub Latest Release，不在页面内写死版本号。
- GitHub 与 Release 链接均指向 `walnut-a/CoreStudio`；许可证和素材来源继续保存在仓库文档中，不占用官网画布界面。

## GitHub Pages 部署

`.github/workflows/deploy-website-pages.yml` 会在 `main` 分支的官网文件发生变化时，
把 `website/` 与所需字体资源组装为静态站点并上传到 GitHub Pages，不需要前端构建。也可以在 Actions 页面手动运行该工作流。

正式英文版地址为 `https://getcorestudio.com/`，中文版位于
`https://getcorestudio.com/zh/`。
