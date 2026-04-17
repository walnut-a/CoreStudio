"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStateForZoom = void 0;
const getStateForZoom = ({ viewportX, viewportY, nextZoom, }, appState) => {
    const appLayerX = viewportX - appState.offsetLeft;
    const appLayerY = viewportY - appState.offsetTop;
    const currentZoom = appState.zoom.value;
    // get original scroll position without zoom
    const baseScrollX = appState.scrollX + (appLayerX - appLayerX / currentZoom);
    const baseScrollY = appState.scrollY + (appLayerY - appLayerY / currentZoom);
    // get scroll offsets for target zoom level
    const zoomOffsetScrollX = -(appLayerX - appLayerX / nextZoom);
    const zoomOffsetScrollY = -(appLayerY - appLayerY / nextZoom);
    return {
        scrollX: baseScrollX + zoomOffsetScrollX,
        scrollY: baseScrollY + zoomOffsetScrollY,
        zoom: {
            value: nextZoom,
        },
    };
};
exports.getStateForZoom = getStateForZoom;
