# CoreStudio 桌面端发布清单

这份文件用于桌面端发布检查。源码保存在仓库中，生成的安装包不要提交到 git，统一上传到 GitHub Releases。

## 版本

桌面端版本号在：

```text
excalidraw/apps/image-board-desktop/package.json
```

当前发布版本：

```text
1.1.0
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
