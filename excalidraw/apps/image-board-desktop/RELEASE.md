# CoreStudio 桌面端发布清单

这份文件用于桌面端发布检查。源码保存在仓库中，生成的安装包不要提交到 git，统一上传到 GitHub Releases。

## 版本

桌面端版本号在：

```text
excalidraw/apps/image-board-desktop/package.json
```

当前发布版本：

```text
1.1.8
```

## 本地打包

从代码工作区执行：

```sh
cd excalidraw
```

正式打包：

```sh
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" corepack yarn package:desktop
```

这个命令会执行：

- renderer build
- Electron main / preload build
- 源码密钥扫描
- 打包输入密钥扫描
- electron-builder 打包
- DMG 签名
- Apple 公证
- DMG / App 写入公证票据
- Gatekeeper 校验
- ZIP 重新压缩
- DMG / ZIP blockmap 重新生成
- release 输出密钥扫描

生成文件位于：

```text
excalidraw/apps/image-board-desktop/release/
```

`release/` 已被 git 忽略。

DMG 安装窗口布局由 `apps/image-board-desktop/package.json` 里的 `build.dmg`
固定，包括窗口尺寸、背景色、图标尺寸以及 `CoreStudio.app` / `Applications`
两个图标的位置。调整安装窗口视觉时，需要重新生成 DMG。

## 签名

当前配置使用这个 Developer ID：

```text
Developer ID Application: junyan liu (CUP682RD2S)
```

如果 macOS 询问是否允许 `codesign` 使用私钥，请允许后继续打包。

验证 app 签名：

```sh
codesign -dv --verbose=4 apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

预期能看到：

```text
Developer ID Application: junyan liu (CUP682RD2S)
TeamIdentifier=CUP682RD2S
```

## Apple 公证脚本

这台开发机已有 FileBox 共用的 `notarytool` profile：

```text
filebox-notary
```

正式打包时会自动运行：

```sh
corepack yarn --cwd apps/image-board-desktop notarize:release
```

这个脚本会使用：

- `CORESTUDIO_NOTARY_PROFILE`：默认 `filebox-notary`
- `CORESTUDIO_CODESIGN_IDENTITY`：默认 `Developer ID Application: junyan liu (CUP682RD2S)`
- `CSC_KEYCHAIN`：默认 `$HOME/Library/Keychains/login.keychain-db`

如果只是临时打一个不公证的内部包，可以显式跳过：

```sh
CORESTUDIO_SKIP_NOTARIZE=1 corepack yarn --cwd apps/image-board-desktop notarize:release
```

单独重跑公证：

```sh
cd excalidraw
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" \
  corepack yarn --cwd apps/image-board-desktop notarize:release
```

脚本成功后，预期校验结果应包含：

```text
accepted
source=Notarized Developer ID
```

## ZIP 处理

`notarize:release` 会在 `CoreStudio.app` 写入票据后重新压缩 ZIP，并重新生成 `.blockmap`。发布 ZIP 前可以再抽检一次：

```sh
cd excalidraw
TMP_DIR="$(mktemp -d /tmp/corestudio-zip-check.XXXXXX)"
unzip -q apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip -d "$TMP_DIR"
xcrun stapler validate "$TMP_DIR/CoreStudio.app"
spctl -a -vvv -t exec "$TMP_DIR/CoreStudio.app"
codesign --verify --deep --strict --verbose=2 "$TMP_DIR/CoreStudio.app"
```

也可以直接校验发布目录里的 app：

```sh
xcrun stapler validate apps/image-board-desktop/release/mac-arm64/CoreStudio.app
spctl -a -vvv -t exec apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

## 密钥检查

发布前运行：

```sh
corepack yarn check:desktop-secrets --source --package-inputs --release
```

扫描会拦截常见 API Key、Bearer Token，以及本地 `image-board-settings.json` 配置文件。

模型服务 Key 只保存在用户本地应用数据目录，不应该进入源码或安装包。

## GitHub Release

提交并推送源码后，从仓库顶层上传安装包：

```text
excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64.dmg
excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip
```

示例：

```sh
gh release create v1.1.0 \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64.dmg \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.1.0-arm64-mac.zip \
  --title "CoreStudio 1.1.0" \
  --notes-file release-notes.md \
  --repo OWNER/REPO
```

如果后续加入自动更新，再同时上传对应的 `.blockmap` 文件。

## 1.1.8 已验证信息

1.1.8 发布时通过了这些检查：

- DMG 安装窗口：显式固定为 `640x420`，`CoreStudio.app` 和 `Applications` 图标居中横向排列
- Desktop tests：246 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `442032c9-dab5-4572-9a51-192c9dc45f79`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`, codesign verify passed

校验值：

```text
CoreStudio-1.1.8-arm64.dmg
sha256: 11b0d08aaf4be176fb74b9c5e1deeebaca409519ff0414201ca0227a2ab1ee3f

CoreStudio-1.1.8-arm64-mac.zip
sha256: dac2d7d128f301704903a72d9d941853737d2b04687b150d05e31e23d127986a

CoreStudio-1.1.8-arm64.dmg.blockmap
sha256: 6bdfd60e67adb9efc0ac475a15181673e2e3b1fd824bef0b087709fdfd0b1368

CoreStudio-1.1.8-arm64-mac.zip.blockmap
sha256: 33c023c7d6bbbb1657281c92428e6324f53d3b92ba37e723cc99f6dc36e6ba85
```

## 1.1.7 已验证信息

1.1.7 发布时通过了这些检查：

- Desktop tests：246 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `ad3bb935-7b9d-4e09-814a-906ca508d3a7`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`, codesign verify passed

校验值：

```text
CoreStudio-1.1.7-arm64.dmg
sha256: 09fc87c7a6d6845dcb135e50db84c1d3f166ec2c710abcb6e2a34c3b034281d4

CoreStudio-1.1.7-arm64-mac.zip
sha256: 3880624a0835e63b0612a1c07818dffa7fbc66d2bbb9b9cb8475ce8d7f472e9d

CoreStudio-1.1.7-arm64.dmg.blockmap
sha256: 763557c9197b871558a80af68acaf096e8df4f4812c08e7f349474572b6cb85a

CoreStudio-1.1.7-arm64-mac.zip.blockmap
sha256: 30001396a99ef1f984b155956042a60d8c5bfdb20ae2d5cc394394abe4f089d7
```

## 1.1.6 已验证信息

1.1.6 发布时通过了这些检查：

- Desktop tests：226 passed
- TypeScript typecheck：passed
- `git diff --check`：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `695877a1-acde-4e63-98b8-8cb7aa1fe923`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.1.6-arm64.dmg
sha256: fe391b2174f05ff764b1bdddd426fbd2db294e2f6640e4b2e204c86ba989dbda

CoreStudio-1.1.6-arm64-mac.zip
sha256: f10360ba51567f596ad3ad82e921584bdf2f2b60df087b988af765bf36c810d3

CoreStudio-1.1.6-arm64.dmg.blockmap
sha256: 000d727ba68c8bfee13b45d8aa694ebe268924f354967b8af77e22469a039b10

CoreStudio-1.1.6-arm64-mac.zip.blockmap
sha256: ac8f3b2267a753be720c65904d6740cf38fc77de7bb852860b88f6342001b06a
```

## 1.1.0 已验证信息

1.1.0 发布时通过了这些检查：

- Desktop tests：199 passed
- TypeScript typecheck：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `c4371ffa-5f0e-4d9e-926f-93ac4726e6ce`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.1.0-arm64.dmg
sha256: e5d3a181946eb3e99491a4de6a882691e44fbc24d7ee5eb08ea5c9021ceec208

CoreStudio-1.1.0-arm64-mac.zip
sha256: aa0ea56d5913537148ad27b7953d6c690d89f8329a527c1494cb343e19223b67
```

## 1.0.0 已验证信息

1.0.0 发布时通过了这些检查：

- Desktop tests：182 passed
- TypeScript typecheck：passed
- Source/package-input/release secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `b6aab739-a138-4295-90a4-55ee172e8587`
- Gatekeeper：DMG accepted as `Notarized Developer ID`
- ZIP app：stapler validate passed, Gatekeeper accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.0.0-arm64.dmg
sha256: 69e842fbf83ee4e3377d439039b3d9e8222439740a4a6cbd69a4a0e987baab9a

CoreStudio-1.0.0-arm64-mac.zip
sha256: c9f4565fee75fb87de2c5672ff6efb7c5fa22585b4ffaf59ac2f145f3e4fc673
```
