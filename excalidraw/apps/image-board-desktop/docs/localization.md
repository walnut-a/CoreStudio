# CoreStudio 多语言开发约定

CoreStudio 不为不同语言维护功能分支。React renderer、Excalidraw 画板和 Electron 主进程共享同一个应用级 locale；语言偏好不写入项目文件。

## 当前底座

- `src/shared/desktopLocale.ts` 定义支持的 locale、用户偏好和系统语言解析规则。
- `src/app/copy.ts` 是简体中文基线，同时导出类型安全的 `DesktopCopy`。
- `src/app/copy.en.ts` 是英文知识。它必须满足 `DesktopCopy`；中文新增 key 而英文未补时，TypeScript 检查会失败。
- `src/app/localization/DesktopLocaleProvider.tsx` 把当前 locale 提供给 renderer，并同步现有 `copy` 消费者。
- `src/main.tsx` 把同一个 locale 传给 CoreStudio 和 Excalidraw。
- `electron/localeSettingsStore.ts` 持久化 `system | zh-CN | en` 应用偏好。
- `electron/localeSettingsController.ts` 在启动和偏好变化时应用 locale；原生菜单随后从对应词典重建。

## 新增功能时怎么做

1. 不要在组件、controller 或 Electron 菜单里直接写用户可见文案。
2. 在 `src/app/copy.ts` 的对应功能命名空间添加中文 key。
3. 在 `src/app/copy.en.ts` 的相同位置添加英文文案。
4. 组件通过 `copy.<feature>.<key>` 读取文案。带数量或参数的内容使用词典函数，不在组件里拼中文句子。
5. 日期和时间使用当前 `DESKTOP_LANG_CODE`，不要写死 `zh-CN` 或 `en`。
6. renderer / Electron 边界优先传稳定状态码、错误码和参数，最终在展示层翻译；不要把某一种语言的错误句子当协议。
7. Agent 原始回复、用户提示词和第三方 API 原始报错保持原文，只翻译 CoreStudio 自己控制的标签、状态和解释。

示例：

```tsx
// copy.ts 中的 zhCnCopy 片段
{
  exportPanel: {
    title: "导出图片",
    completed: (count: number) => `已导出 ${count} 张图片。`,
  },
};

// copy.en.ts 中的 enCopy 片段
{
  exportPanel: {
    title: "Export images",
    completed: (count: number) => `Exported ${count} images.`,
  },
}

// component
<h2>{copy.exportPanel.title}</h2>
```

实际代码里的中文基线目前是 `zhCnCopy` 的内部常量，不需要把它改成导出；上面的片段只演示 key 的对应关系。

## 验证

修改多语言底座或新增多语言功能时，至少运行：

```bash
corepack yarn vitest \
  apps/image-board-desktop/src/shared/desktopLocale.test.ts \
  apps/image-board-desktop/src/app/copy.test.ts \
  apps/image-board-desktop/electron/menu.test.ts \
  --run

cd apps/image-board-desktop
corepack yarn tsc --noEmit -p tsconfig.json
corepack yarn build
```

界面测试应至少覆盖一个中文断言和一个英文断言，并确认 Excalidraw 的 `langCode` 与 CoreStudio 当前 locale 一致。
