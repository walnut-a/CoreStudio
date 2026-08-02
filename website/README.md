# CoreStudio 官方网站

这是 CoreStudio 的静态官方网站实现，页面不依赖前端框架或远程字体，可直接部署到任意静态托管服务。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 4173 --directory website
```

然后访问 `http://127.0.0.1:4173/`。英文版位于
`http://127.0.0.1:4173/en/`，两个版本在页头与页脚提供固定切换入口，不做自动跳转。

## 文件结构

```text
website/
├── DESIGN.md
├── index.html
├── en/
│   └── index.html
├── styles.css
├── main.js
└── assets/
    ├── corestudio-icon-*.{png,webp}
    ├── corestudio-favicon-32.png
    ├── corestudio-apple-touch-icon.png
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

`corestudio-product.jpeg` 是产品截图原图；带尺寸后缀的 WebP 和移动端裁切图用于响应式加载。

Assistant 字体文件只保留 Basic Latin 字符。中文版仅按需使用 SemiBold / Bold；英文版正文
使用 Regular，导航、按钮和重点文字使用 SemiBold / Bold。

## 发布前需要确认

- 正式域名确定后，补充 canonical URL、完整的 Open Graph 图片 URL、`robots.txt` 和 `sitemap.xml`。
- 下载按钮当前始终指向 GitHub Latest Release，不在页面内写死版本号。
- GitHub、Release 和 License 链接均指向 `walnut-a/CoreStudio`。
