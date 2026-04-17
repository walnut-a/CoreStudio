"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPointHittingLink = exports.isPointHittingLinkIcon = exports.getLinkHandleFromCoords = exports.ELEMENT_LINK_IMG = exports.EXTERNAL_LINK_IMG = exports.DEFAULT_LINK_SIZE = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
exports.DEFAULT_LINK_SIZE = 12;
exports.EXTERNAL_LINK_IMG = document.createElement("img");
exports.EXTERNAL_LINK_IMG.src = `data:${common_1.MIME_TYPES.svg}, ${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1971c2" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="feather feather-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`)}`;
exports.ELEMENT_LINK_IMG = document.createElement("img");
exports.ELEMENT_LINK_IMG.src = `data:${common_1.MIME_TYPES.svg}, ${encodeURIComponent(`<svg  xmlns="http://www.w3.org/2000/svg"  width="16"  height="16"  viewBox="0 0 24 24"  fill="none"  stroke="#1971c2"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-big-right-line"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v-3.586a1 1 0 0 1 1.707 -.707l6.586 6.586a1 1 0 0 1 0 1.414l-6.586 6.586a1 1 0 0 1 -1.707 -.707v-3.586h-6v-6h6z" /><path d="M3 9v6" /></svg>`)}`;
const getLinkHandleFromCoords = ([x1, y1, x2, y2], angle, appState) => {
    const size = exports.DEFAULT_LINK_SIZE;
    const zoom = appState.zoom.value > 1 ? appState.zoom.value : 1;
    const linkWidth = size / zoom;
    const linkHeight = size / zoom;
    const linkMarginY = size / zoom;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const centeringOffset = (size - 8) / (2 * zoom);
    const dashedLineMargin = 4 / zoom;
    // Same as `ne` resize handle
    const x = x2 + dashedLineMargin - centeringOffset;
    const y = y1 - dashedLineMargin - linkMarginY + centeringOffset;
    const [rotatedX, rotatedY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + linkWidth / 2, y + linkHeight / 2), (0, math_1.pointFrom)(centerX, centerY), angle);
    return [
        rotatedX - linkWidth / 2,
        rotatedY - linkHeight / 2,
        linkWidth,
        linkHeight,
    ];
};
exports.getLinkHandleFromCoords = getLinkHandleFromCoords;
const isPointHittingLinkIcon = (element, elementsMap, appState, [x, y]) => {
    const threshold = 4 / appState.zoom.value;
    const [x1, y1, x2, y2] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap);
    const [linkX, linkY, linkWidth, linkHeight] = (0, exports.getLinkHandleFromCoords)([x1, y1, x2, y2], element.angle, appState);
    const hitLink = x > linkX - threshold &&
        x < linkX + threshold + linkWidth &&
        y > linkY - threshold &&
        y < linkY + linkHeight + threshold;
    return hitLink;
};
exports.isPointHittingLinkIcon = isPointHittingLinkIcon;
const isPointHittingLink = (element, elementsMap, appState, [x, y], isMobile) => {
    if (!element.link || appState.selectedElementIds[element.id]) {
        return false;
    }
    if (!isMobile &&
        appState.viewModeEnabled &&
        (0, element_2.hitElementBoundingBox)((0, math_1.pointFrom)(x, y), element, elementsMap)) {
        return true;
    }
    return (0, exports.isPointHittingLinkIcon)(element, elementsMap, appState, (0, math_1.pointFrom)(x, y));
};
exports.isPointHittingLink = isPointHittingLink;
