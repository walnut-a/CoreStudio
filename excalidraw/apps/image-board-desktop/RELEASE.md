# CoreStudio Desktop Release

This file is the release checklist for the desktop client. Keep source code in
the repository. Keep generated installers in GitHub Releases, not in git.

## Version

The desktop client version lives in `excalidraw/apps/image-board-desktop/package.json`.

Current release:

```text
1.0.0
```

## Local Build

Run release commands from the code workspace:

```sh
cd excalidraw
```

Then use the root workspace command:

```sh
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" corepack yarn package:desktop
```

The command runs the renderer build, Electron main/preload build, source/package
secret scan, electron-builder packaging, and release secret scan.

Generated files are written to this repository-root path:

```text
excalidraw/apps/image-board-desktop/release/
```

The release directory is ignored by git.

## Signing

The package is configured to use this Developer ID identity:

```text
Developer ID Application: junyan liu (CUP682RD2S)
```

If macOS asks whether `codesign` can access the private key, allow it for the
build to continue. If command-line signing stalls again, grant codesign access
to the keychain item from Keychain Access, or run Apple recommended keychain
partition setup locally with the keychain password.

Verify the signed app:

```sh
codesign -dv --verbose=4 apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

The expected authority should include:

```text
Developer ID Application: junyan liu (CUP682RD2S)
TeamIdentifier=CUP682RD2S
```

## Notarization

electron-builder will notarize automatically when notarization credentials are
available. Store credentials locally; do not put Apple passwords or API keys in
the repository.

Apple ID option:

```sh
xcrun notarytool store-credentials "CoreStudio" \
  --apple-id "<apple-id>" \
  --team-id "CUP682RD2S" \
  --password "<app-specific-password>"
```

Build with the stored profile:

```sh
APPLE_KEYCHAIN_PROFILE="CoreStudio" \
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" \
corepack yarn package:desktop
```

Verify Gatekeeper status:

```sh
spctl -a -vvv -t install apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```

Before notarization this can report `Unnotarized Developer ID`. After
notarization it should be accepted by Gatekeeper.

## Secret Checks

Run this before uploading assets:

```sh
corepack yarn check:desktop-secrets --source --package-inputs --release
```

The scanner fails if package inputs or release output contain common API key
patterns, bearer tokens, or the local `image-board-settings.json` settings file.

The app stores provider keys in the user's application data directory, not in
the packaged app.

## GitHub Release

Commit and push source code to the target repository. Do not commit generated
installers.

Upload these files as GitHub Release assets from the repository root:

```text
excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg
excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip
```

If auto-update is introduced later, also upload the matching `.blockmap` files.

Example release command:

```sh
gh release create v1.0.0 \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64.dmg \
  excalidraw/apps/image-board-desktop/release/CoreStudio-1.0.0-arm64-mac.zip \
  --title "CoreStudio 1.0.0" \
  --notes "CoreStudio desktop client 1.0.0" \
  --repo OWNER/REPO
```
