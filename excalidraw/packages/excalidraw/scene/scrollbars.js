"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOverScrollBars = exports.getScrollBars = exports.SCROLLBAR_COLOR = exports.SCROLLBAR_WIDTH = exports.SCROLLBAR_MARGIN = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
exports.SCROLLBAR_MARGIN = 4;
exports.SCROLLBAR_WIDTH = 6;
exports.SCROLLBAR_COLOR = "rgba(0,0,0,0.3)";
// The scrollbar represents where the viewport is in relationship to the scene
const getScrollBars = (elements, viewportWidth, viewportHeight, appState) => {
    if (!elements.size) {
        return {
            horizontal: null,
            vertical: null,
        };
    }
    // This is the bounding box of all the elements
    const [elementsMinX, elementsMinY, elementsMaxX, elementsMaxY] = (0, element_1.getCommonBounds)(elements);
    // Apply zoom
    const viewportWidthWithZoom = viewportWidth / appState.zoom.value;
    const viewportHeightWithZoom = viewportHeight / appState.zoom.value;
    const safeArea = {
        top: parseInt((0, common_1.getGlobalCSSVariable)("sat")) || 0,
        bottom: parseInt((0, common_1.getGlobalCSSVariable)("sab")) || 0,
        left: parseInt((0, common_1.getGlobalCSSVariable)("sal")) || 0,
        right: parseInt((0, common_1.getGlobalCSSVariable)("sar")) || 0,
    };
    const isRTL = (0, i18n_1.getLanguage)().rtl;
    // The viewport is the rectangle currently visible for the user
    const viewportMinX = -appState.scrollX + safeArea.left;
    const viewportMinY = -appState.scrollY + safeArea.top;
    const viewportMaxX = viewportMinX + viewportWidthWithZoom - safeArea.right;
    const viewportMaxY = viewportMinY + viewportHeightWithZoom - safeArea.bottom;
    // The scene is the bounding box of both the elements and viewport
    const sceneMinX = Math.min(elementsMinX, viewportMinX);
    const sceneMinY = Math.min(elementsMinY, viewportMinY);
    const sceneMaxX = Math.max(elementsMaxX, viewportMaxX);
    const sceneMaxY = Math.max(elementsMaxY, viewportMaxY);
    // the elements-only bbox
    const sceneWidth = elementsMaxX - elementsMinX;
    const sceneHeight = elementsMaxY - elementsMinY;
    // scene (elements) bbox + the viewport bbox that extends outside of it
    const extendedSceneWidth = sceneMaxX - sceneMinX;
    const extendedSceneHeight = sceneMaxY - sceneMinY;
    const scrollWidthOffset = Math.max(exports.SCROLLBAR_MARGIN * 2, safeArea.left + safeArea.right) +
        exports.SCROLLBAR_WIDTH * 2;
    const scrollbarWidth = viewportWidth * (viewportWidthWithZoom / extendedSceneWidth) -
        scrollWidthOffset;
    const scrollbarHeightOffset = Math.max(exports.SCROLLBAR_MARGIN * 2, safeArea.top + safeArea.bottom) +
        exports.SCROLLBAR_WIDTH * 2;
    const scrollbarHeight = viewportHeight * (viewportHeightWithZoom / extendedSceneHeight) -
        scrollbarHeightOffset;
    // NOTE the delta multiplier calculation isn't quite correct when viewport
    // is extended outside the scene (elements) bbox as there's some small
    // accumulation error. I'll let this be an exercise for others to fix. ^^
    const horizontalDeltaMultiplier = extendedSceneWidth > sceneWidth
        ? (extendedSceneWidth * appState.zoom.value) /
            (scrollbarWidth + scrollWidthOffset)
        : viewportWidth / (scrollbarWidth + scrollWidthOffset);
    const verticalDeltaMultiplier = extendedSceneHeight > sceneHeight
        ? (extendedSceneHeight * appState.zoom.value) /
            (scrollbarHeight + scrollbarHeightOffset)
        : viewportHeight / (scrollbarHeight + scrollbarHeightOffset);
    return {
        horizontal: viewportMinX === sceneMinX && viewportMaxX === sceneMaxX
            ? null
            : {
                x: Math.max(safeArea.left, exports.SCROLLBAR_MARGIN) +
                    exports.SCROLLBAR_WIDTH +
                    ((viewportMinX - sceneMinX) / extendedSceneWidth) * viewportWidth,
                y: viewportHeight -
                    exports.SCROLLBAR_WIDTH -
                    Math.max(exports.SCROLLBAR_MARGIN, safeArea.bottom),
                width: scrollbarWidth,
                height: exports.SCROLLBAR_WIDTH,
                deltaMultiplier: horizontalDeltaMultiplier,
            },
        vertical: viewportMinY === sceneMinY && viewportMaxY === sceneMaxY
            ? null
            : {
                x: isRTL
                    ? Math.max(safeArea.left, exports.SCROLLBAR_MARGIN)
                    : viewportWidth -
                        exports.SCROLLBAR_WIDTH -
                        Math.max(safeArea.right, exports.SCROLLBAR_MARGIN),
                y: Math.max(safeArea.top, exports.SCROLLBAR_MARGIN) +
                    exports.SCROLLBAR_WIDTH +
                    ((viewportMinY - sceneMinY) / extendedSceneHeight) *
                        viewportHeight,
                width: exports.SCROLLBAR_WIDTH,
                height: scrollbarHeight,
                deltaMultiplier: verticalDeltaMultiplier,
            },
    };
};
exports.getScrollBars = getScrollBars;
const isOverScrollBars = (scrollBars, x, y) => {
    const [isOverHorizontal, isOverVertical] = [
        scrollBars.horizontal,
        scrollBars.vertical,
    ].map((scrollBar) => {
        return (scrollBar != null &&
            scrollBar.x <= x &&
            x <= scrollBar.x + scrollBar.width &&
            scrollBar.y <= y &&
            y <= scrollBar.y + scrollBar.height);
    });
    const isOverEither = isOverHorizontal || isOverVertical;
    return { isOverEither, isOverHorizontal, isOverVertical };
};
exports.isOverScrollBars = isOverScrollBars;
