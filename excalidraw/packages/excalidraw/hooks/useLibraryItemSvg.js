"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLibraryCache = exports.useLibraryItemSvg = exports.libraryItemSvgsCache = void 0;
const export_1 = require("@excalidraw/utils/export");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../editor-jotai");
exports.libraryItemSvgsCache = (0, editor_jotai_1.atom)(new Map());
const exportLibraryItemToSvg = async (elements) => {
    // TODO should pass theme (appState.exportWithDark) - we're still using
    // CSS filter here
    return await (0, export_1.exportToSvg)({
        elements,
        appState: {
            exportBackground: false,
            viewBackgroundColor: common_1.COLOR_PALETTE.white,
        },
        files: null,
        renderEmbeddables: false,
        skipInliningFonts: true,
    });
};
const useLibraryItemSvg = (id, elements, svgCache, ref) => {
    const [svg, setSvg] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => {
        if (elements) {
            if (id) {
                // Try to load cached svg
                const cachedSvg = svgCache.get(id);
                if (cachedSvg) {
                    setSvg(cachedSvg);
                }
                else {
                    // When there is no svg in cache export it and save to cache
                    (async () => {
                        const exportedSvg = await exportLibraryItemToSvg(elements);
                        // TODO: should likely be removed for custom fonts
                        exportedSvg.querySelector(".style-fonts")?.remove();
                        if (exportedSvg) {
                            svgCache.set(id, exportedSvg);
                            setSvg(exportedSvg);
                        }
                    })();
                }
            }
            else {
                // When we have no id (usualy selected items from canvas) just export the svg
                (async () => {
                    const exportedSvg = await exportLibraryItemToSvg(elements);
                    setSvg(exportedSvg);
                })();
            }
        }
    }, [id, elements, svgCache, setSvg]);
    (0, react_1.useEffect)(() => {
        const node = ref.current;
        if (!node) {
            return;
        }
        if (svg) {
            node.innerHTML = svg.outerHTML;
        }
        return () => {
            node.innerHTML = "";
        };
    }, [svg, ref]);
    return svg;
};
exports.useLibraryItemSvg = useLibraryItemSvg;
const useLibraryCache = () => {
    const [svgCache] = (0, editor_jotai_1.useAtom)(exports.libraryItemSvgsCache);
    const clearLibraryCache = () => svgCache.clear();
    const deleteItemsFromLibraryCache = (items) => {
        items.forEach((item) => svgCache.delete(item));
    };
    return {
        clearLibraryCache,
        deleteItemsFromLibraryCache,
        svgCache,
    };
};
exports.useLibraryCache = useLibraryCache;
