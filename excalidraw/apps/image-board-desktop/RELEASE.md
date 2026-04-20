# CoreStudio 桌面端发布清单

这份文件用于桌面端发布检查。源码保存在仓库中，生成的安装包不要提交到 git，统一上传到 GitHub Releases。

## 版本

桌面端版本号在：

```text
excalidraw/apps/image-board-desktop/package.json
```

当前发布版本：

```text
1.0.0
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

## Apple 公证

这台开发机已有 FileBox 共用的 `notarytool` profile：

```text
filebox-notary
```

手动提交 DMG：

```sh
xcrun notarytool submit apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg \
  --keychain-profile filebox-notary \
  --wait \
  --progress
```

公证通过后写入票据：

```sh
xcrun stapler staple apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg
xcrun stapler validate apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg
```

验证 Gatekeeper：

```sh
spctl -a -vvv -t open --context context:primary-signature apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg
```

预期结果应包含：

```text
accepted
source=Notarized Developer ID
```

## ZIP 处理

如果同时发布 ZIP，需要确认 ZIP 内的 `CoreStudio.app` 也带有公证票据：

```sh
TMP_DIR="$(mktemp -d /tmp/corestudio-zip-check.XXXXXX)"
unzip -q apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip -d "$TMP_DIR"
xcrun stapler validate "$TMP_DIR/CoreStudio.app"
spctl -a -vvv -t install "$TMP_DIR/CoreStudio.app"
codesign --verify --deep --strict --verbose=2 "$TMP_DIR/CoreStudio.app"
```

如果需要重新压 ZIP：

```sh
ditto -c -k --sequesterRsrc --keepParent "$TMP_DIR/CoreStudio.app" \
  apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip
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
excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg
excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip
```

示例：

```sh
gh release create v1.0.0 \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip \
  --title "CoreStudio 1.0.0" \
  --notes-file release-notes.md \
  --repo OWNER/REPO
```

如果后续加入自动更新，再同时上传对应的 `.blockmap` 文件。

## 1.0.0 已验证信息

1.0.0 发布时通过了这些检查：

- Desktop tests：145 passed
- TypeScript typecheck：passed
- Source secret scan：passed
- Developer ID signature：`Developer ID Application: junyan liu (CUP682RD2S)`
- Apple notarization：submission `9cb6d8f2-0d62-4ad6-b1e3-e2c9d7911840`
- Gatekeeper：DMG accepted as `Notarized Developer ID`

校验值：

```text
CoreStudio-1.0.0-arm64.dmg
sha256: 23b98e005c3b204d85e3ce9b3aaaa4aa2d42de73ad3dc4dac356ed15792f55a3

CoreStudio-1.0.0-arm64-mac.zip
sha256: 4e0fee1d6a8607a8bd86078fb904ff2107e4b384dd6e57c42ae23bd671ecd156
```
