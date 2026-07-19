import path from "path";

const normalizeModulePath = (id: string) => id.split(path.sep).join("/");

export const getDesktopManualChunk = (id: string) => {
  const normalizedId = normalizeModulePath(id);

  if (
    normalizedId.includes("packages/excalidraw/locales/") &&
    !normalizedId.match(/en\.json|percentages\.json/)
  ) {
    const index = normalizedId.indexOf("locales/");
    return `locales/${normalizedId.substring(index + 8)}`;
  }

  if (normalizedId.includes("@excalidraw/mermaid-to-excalidraw")) {
    return "mermaid-to-excalidraw";
  }

  if (
    normalizedId.includes("@codemirror/") ||
    normalizedId.includes("@lezer/")
  ) {
    return "codemirror.chunk";
  }

  if (normalizedId.includes("/node_modules/@radix-ui/")) {
    return "vendor-ui";
  }

  if (
    normalizedId.includes("/node_modules/react/") ||
    normalizedId.includes("/node_modules/react-dom/") ||
    normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (normalizedId.includes("/node_modules/jotai/")) {
    return "vendor-state";
  }

  if (
    normalizedId.includes("/packages/element/") ||
    normalizedId.includes("/packages/common/") ||
    normalizedId.includes("/packages/math/") ||
    normalizedId.includes("/packages/utils/")
  ) {
    return "excalidraw-core";
  }

  // Keep the remaining modules under Rollup's default chunking. A broad
  // node_modules or packages/excalidraw chunk pulls lazy diagram/subset code
  // back into giant shared bundles.
};
