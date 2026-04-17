"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScrollCenter = exports.centerScrollOn = void 0;
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const isOutsideViewPort = (appState, cords) => {
    const [x1, y1, x2, y2] = cords;
    const { x: viewportX1, y: viewportY1 } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: x1, sceneY: y1 }, appState);
    const { x: viewportX2, y: viewportY2 } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: x2, sceneY: y2 }, appState);
    return (viewportX2 - viewportX1 > appState.width ||
        viewportY2 - viewportY1 > appState.height);
};
const centerScrollOn = ({ scenePoint, viewportDimensions, zoom, offsets, }) => {
    let scrollX = (viewportDimensions.width - (offsets?.right ?? 0)) / 2 / zoom.value -
        scenePoint.x;
    scrollX += (offsets?.left ?? 0) / 2 / zoom.value;
    let scrollY = (viewportDimensions.height - (offsets?.bottom ?? 0)) / 2 / zoom.value -
        scenePoint.y;
    scrollY += (offsets?.top ?? 0) / 2 / zoom.value;
    return {
        scrollX,
        scrollY,
    };
};
exports.centerScrollOn = centerScrollOn;
const calculateScrollCenter = (elements, appState) => {
    elements = (0, element_1.getVisibleElements)(elements);
    if (!elements.length) {
        return {
            scrollX: 0,
            scrollY: 0,
        };
    }
    let [x1, y1, x2, y2] = (0, element_3.getCommonBounds)(elements);
    if (isOutsideViewPort(appState, [x1, y1, x2, y2])) {
        [x1, y1, x2, y2] = (0, element_2.getClosestElementBounds)(elements, (0, common_1.viewportCoordsToSceneCoords)({ clientX: appState.scrollX, clientY: appState.scrollY }, appState));
    }
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    return (0, exports.centerScrollOn)({
        scenePoint: { x: centerX, y: centerY },
        viewportDimensions: { width: appState.width, height: appState.height },
        zoom: appState.zoom,
    });
};
exports.calculateScrollCenter = calculateScrollCenter;
