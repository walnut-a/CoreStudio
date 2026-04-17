"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPointHittingTextAutoResizeHandle = exports.getTextAutoResizeHandle = exports.getTextBoxPadding = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const TEXT_AUTO_RESIZE_HANDLE_GAP = 12;
const TEXT_AUTO_RESIZE_HANDLE_LENGTH = 16;
const TEXT_AUTO_RESIZE_HANDLE_HITBOX_WIDTH = 10;
const TEXT_AUTO_RESIZE_HANDLE_HITBOX_HEIGHT = TEXT_AUTO_RESIZE_HANDLE_LENGTH + 2;
const MAX_HANDLE_HEIGHT_RATIO = 0.8;
const getTextBoxPadding = (zoomValue) => (common_1.DEFAULT_TRANSFORM_HANDLE_SPACING * 2) / zoomValue;
exports.getTextBoxPadding = getTextBoxPadding;
const getTextAutoResizeHandle = (textElement, zoomValue, formFactor) => {
    if (formFactor !== "desktop" ||
        TEXT_AUTO_RESIZE_HANDLE_LENGTH >
            textElement.height * zoomValue * MAX_HANDLE_HEIGHT_RATIO) {
        return null;
    }
    const padding = (0, exports.getTextBoxPadding)(zoomValue);
    const gap = TEXT_AUTO_RESIZE_HANDLE_GAP / zoomValue;
    const length = TEXT_AUTO_RESIZE_HANDLE_LENGTH / zoomValue;
    const center = (0, math_1.pointFrom)(textElement.x + textElement.width / 2, textElement.y + textElement.height / 2);
    const handleCenter = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(center[0] + textElement.width / 2 + padding + gap, center[1]), center, textElement.angle);
    return {
        center: handleCenter,
        start: (0, math_1.pointRotateRads)((0, math_1.pointFrom)(handleCenter[0], handleCenter[1] - length / 2), handleCenter, textElement.angle),
        end: (0, math_1.pointRotateRads)((0, math_1.pointFrom)(handleCenter[0], handleCenter[1] + length / 2), handleCenter, textElement.angle),
        hitboxWidth: TEXT_AUTO_RESIZE_HANDLE_HITBOX_WIDTH / zoomValue,
        hitboxHeight: TEXT_AUTO_RESIZE_HANDLE_HITBOX_HEIGHT / zoomValue,
    };
};
exports.getTextAutoResizeHandle = getTextAutoResizeHandle;
const isPointHittingTextAutoResizeHandle = (point, textElement, zoomValue, formFactor) => {
    const handle = (0, exports.getTextAutoResizeHandle)(textElement, zoomValue, formFactor);
    if (!handle) {
        return false;
    }
    const unrotatedPoint = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(point.x, point.y), handle.center, -textElement.angle);
    return (Math.abs(unrotatedPoint[0] - handle.center[0]) <= handle.hitboxWidth / 2 &&
        Math.abs(unrotatedPoint[1] - handle.center[1]) <= handle.hitboxHeight / 2);
};
exports.isPointHittingTextAutoResizeHandle = isPointHittingTextAutoResizeHandle;
