# CoreStudio 官方网站

这是 CoreStudio 的静态官方网站实现，页面不依赖前端框架或远程字体，可直接部署到任意静态托管服务。

首页以轻量的 CoreStudio 模拟画布展示产品：访客可以切换故事视图、选中画布对象、缩放或拖动画布、展开迷你地图，并触发一次图片生成演示。Agent 写回作为独立故事视图展示，不与生成动作混在一起。这些交互只用于展示，不把官网伪装成完整的网页版应用。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/website/`。英文版使用该路径，中文版位于
`http://127.0.0.1:4173/website/zh/`；从仓库根目录提供静态文件，是为了让官网与桌面端直接加载同一份迷你地图绘制核心。两个版本在页头与页脚提供固定切换入口，不按浏览器语言自动跳转。
原 `/en/` 路径保留为英文首页的兼容跳转。

## 文件结构

```text
website/
├── CNAME
├── DESIGN.md
├── PRODUCT.md
├── index.html
├── robots.txt
├── sitemap.xml
├── en/
│   └── index.html       # 旧英文路径兼容跳转
├── zh/
│   └── index.html       # 中文版
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
        └── Assistant-Bold-Latin.woff2
```

官网图标的唯一原始素材是
`excalidraw/apps/image-board-desktop/build/icon.png`，官网不另行重绘或替代。页面使用的
PNG / WebP 是从这张原始图标生成的尺寸与格式衍生文件，网站目录不重复保存原图。

`dieter-rams-*.webp` 是四张独立的画布参考图片，`corestudio-canvas-result-rams-v2.webp` 是与这些参考在材质、配色上对应的演示生成结果。参考图保持为无圆角的独立图片对象，不预合成为网页卡片；旧版产品截图仍保留在 `assets/` 中，但当前首页不再加载它们。

## 定向验证

画布缩放和视图切换逻辑放在 `canvas-engine.mjs` 中。迷你地图直接复用桌面端的
`excalidraw/apps/image-board-desktop/src/app/canvasMinimapCore.mjs`，场景边界、视口换算、
Canvas 绘制和拖拽坐标映射不再由官网模拟。可以从仓库根目录运行：

```sh
node --test website/canvas-engine.test.mjs
node --check website/main.js
```

Assistant 字体文件只保留 Basic Latin 字符。中文版仅按需使用 SemiBold / Bold；英文版正文
使用 Regular，导航、按钮和重点文字使用 SemiBold / Bold。

## 发布配置

- 正式域名为 `https://getcorestudio.com/`，`www.getcorestudio.com` 由 GitHub Pages 重定向到裸域名。
- 英文版使用根路径，中文版使用 `/zh/`，旧 `/en/` 路径跳转到英文首页。
- `CNAME`、canonical URL、Open Graph 图片 URL、`robots.txt` 和 `sitemap.xml` 均使用正式域名。
- 下载按钮当前始终指向 GitHub Latest Release，不在页面内写死版本号。
- GitHub、Release 和 License 链接均指向 `walnut-a/CoreStudio`。

## GitHub Pages 部署

`.github/workflows/deploy-website-pages.yml` 会在 `main` 分支的官网文件或共享迷你地图核心发生变化时，
把 `website/` 与该运行文件组装为静态站点并上传到 GitHub Pages，不需要前端构建。也可以在 Actions 页面手动运行该工作流。

正式英文版地址为 `https://getcorestudio.com/`，中文版位于
`https://getcorestudio.com/zh/`。
