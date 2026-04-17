"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCursorForResizingElement = exports.getTransformHandleTypeFromCoords = exports.getElementWithTransformHandleType = exports.resizeTest = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const bounds_1 = require("./bounds");
const transformHandles_1 = require("./transformHandles");
const typeChecks_1 = require("./typeChecks");
const isInsideTransformHandle = (transformHandle, x, y) => x >= transformHandle[0] &&
    x <= transformHandle[0] + transformHandle[2] &&
    y >= transformHandle[1] &&
    y <= transformHandle[1] + transformHandle[3];
const resizeTest = (element, elementsMap, appState, x, y, zoom, pointerType, editorInterface) => {
    if (!appState.selectedElementIds[element.id]) {
        return false;
    }
    const { rotation: rotationTransformHandle, ...transformHandles } = (0, transformHandles_1.getTransformHandles)(element, zoom, elementsMap, pointerType, (0, transformHandles_1.getOmitSidesForEditorInterface)(editorInterface));
    if (rotationTransformHandle &&
        isInsideTransformHandle(rotationTransformHandle, x, y)) {
        return "rotation";
    }
    const filter = Object.keys(transformHandles).filter((key) => {
        const transformHandle = transformHandles[key];
        if (!transformHandle) {
            return false;
        }
        return isInsideTransformHandle(transformHandle, x, y);
    });
    if (filter.length > 0) {
        return filter[0];
    }
    if ((0, transformHandles_1.canResizeFromSides)(editorInterface)) {
        const [x1, y1, x2, y2, cx, cy] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        // do not resize from the sides for linear elements with only two points
        if (!((0, typeChecks_1.isLinearElement)(element) && element.points.length <= 2)) {
            const SPACING = (0, typeChecks_1.isImageElement)(element)
                ? 0
                : common_1.SIDE_RESIZING_THRESHOLD / zoom.value;
            const ZOOMED_SIDE_RESIZING_THRESHOLD = common_1.SIDE_RESIZING_THRESHOLD / zoom.value;
            const sides = getSelectionBorders((0, math_1.pointFrom)(x1 - SPACING, y1 - SPACING), (0, math_1.pointFrom)(x2 + SPACING, y2 + SPACING), (0, math_1.pointFrom)(cx, cy), element.angle);
            for (const [dir, side] of Object.entries(sides)) {
                // test to see if x, y are on the line segment
                if ((0, math_1.pointOnLineSegment)((0, math_1.pointFrom)(x, y), side, ZOOMED_SIDE_RESIZING_THRESHOLD)) {
                    return dir;
                }
            }
        }
    }
    return false;
};
exports.resizeTest = resizeTest;
const getElementWithTransformHandleType = (elements, appState, scenePointerX, scenePointerY, zoom, pointerType, elementsMap, editorInterface) => {
    return elements.reduce((result, element) => {
        if (result) {
            return result;
        }
        const transformHandleType = (0, exports.resizeTest)(element, elementsMap, appState, scenePointerX, scenePointerY, zoom, pointerType, editorInterface);
        return transformHandleType ? { element, transformHandleType } : null;
    }, null);
};
exports.getElementWithTransformHandleType = getElementWithTransformHandleType;
const getTransformHandleTypeFromCoords = ([x1, y1, x2, y2], scenePointerX, scenePointerY, zoom, pointerType, editorInterface) => {
    const transformHandles = (0, transformHandles_1.getTransformHandlesFromCoords)([x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2], 0, zoom, pointerType, (0, transformHandles_1.getOmitSidesForEditorInterface)(editorInterface));
    const found = Object.keys(transformHandles).find((key) => {
        const transformHandle = transformHandles[key];
        return (transformHandle &&
            isInsideTransformHandle(transformHandle, scenePointerX, scenePointerY));
    });
    if (found) {
        return found;
    }
    if ((0, transformHandles_1.canResizeFromSides)(editorInterface)) {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const SPACING = common_1.SIDE_RESIZING_THRESHOLD / zoom.value;
        const sides = getSelectionBorders((0, math_1.pointFrom)(x1 - SPACING, y1 - SPACING), (0, math_1.pointFrom)(x2 + SPACING, y2 + SPACING), (0, math_1.pointFrom)(cx, cy), 0);
        for (const [dir, side] of Object.entries(sides)) {
            // test to see if x, y are on the line segment
            if ((0, math_1.pointOnLineSegment)((0, math_1.pointFrom)(scenePointerX, scenePointerY), side, SPACING)) {
                return dir;
            }
        }
    }
    return false;
};
exports.getTransformHandleTypeFromCoords = getTransformHandleTypeFromCoords;
const RESIZE_CURSORS = ["ns", "nesw", "ew", "nwse"];
const rotateResizeCursor = (cursor, angle) => {
    const index = RESIZE_CURSORS.indexOf(cursor);
    if (index >= 0) {
        const a = Math.round(angle / (Math.PI / 4));
        cursor = RESIZE_CURSORS[(index + a) % RESIZE_CURSORS.length];
    }
    return cursor;
};
/*
 * Returns bi-directional cursor for the element being resized
 */
const getCursorForResizingElement = (resizingElement) => {
    const { element, transformHandleType } = resizingElement;
    const shouldSwapCursors = element && Math.sign(element.height) * Math.sign(element.width) === -1;
    let cursor = null;
    switch (transformHandleType) {
        case "n":
        case "s":
            cursor = "ns";
            break;
        case "w":
        case "e":
            cursor = "ew";
            break;
        case "nw":
        case "se":
            if (shouldSwapCursors) {
                cursor = "nesw";
            }
            else {
                cursor = "nwse";
            }
            break;
        case "ne":
        case "sw":
            if (shouldSwapCursors) {
                cursor = "nwse";
            }
            else {
                cursor = "nesw";
            }
            break;
        case "rotation":
            return "grab";
    }
    if (cursor && element) {
        cursor = rotateResizeCursor(cursor, element.angle);
    }
    return cursor ? `${cursor}-resize` : "";
};
exports.getCursorForResizingElement = getCursorForResizingElement;
const getSelectionBorders = ([x1, y1], [x2, y2], center, angle) => {
    const topLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), center, angle);
    const topRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), center, angle);
    const bottomLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), center, angle);
    const bottomRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y2), center, angle);
    return {
        n: [topLeft, topRight],
        e: [topRight, bottomRight],
        s: [bottomRight, bottomLeft],
        w: [bottomLeft, topLeft],
    };
};
