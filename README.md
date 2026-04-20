# CoreStudio

CoreStudio is a desktop image-board client built on top of Excalidraw. The
project keeps product notes, release notes, and repository-level workflow files
at this root. The application source code lives under `excalidraw/`.

## Repository Layout

```text
.
├── 2026-04-12-excalidraw-image-board-design.md
├── docs/
└── excalidraw/
    ├── apps/image-board-desktop/
    ├── packages/
    └── package.json
```

Use the outer repository for CoreStudio project work and GitHub releases. Use
`excalidraw/` as the code workspace when running Yarn scripts.

## Common Commands

```sh
cd excalidraw
corepack yarn test:desktop --run
corepack yarn test:typecheck
corepack yarn package:desktop
```

## Release Boundary

Generated desktop packages must not be committed. The source code belongs in the
repository. Installer files belong in GitHub Releases.

Release assets are generated under:

```text
excalidraw/apps/image-board-desktop/release/
```

The desktop release checklist is here:

```text
excalidraw/apps/image-board-desktop/RELEASE.md
```
