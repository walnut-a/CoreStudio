"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedGridStep = exports.getNormalizedGridSize = exports.getNormalizedZoom = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const getNormalizedZoom = (zoom) => {
    return (0, math_1.clamp)((0, math_1.round)(zoom, 6), common_1.MIN_ZOOM, common_1.MAX_ZOOM);
};
exports.getNormalizedZoom = getNormalizedZoom;
const getNormalizedGridSize = (gridStep) => {
    return (0, math_1.clamp)(Math.round(gridStep), 1, 100);
};
exports.getNormalizedGridSize = getNormalizedGridSize;
const getNormalizedGridStep = (gridStep) => {
    return (0, math_1.clamp)(Math.round(gridStep), 1, 100);
};
exports.getNormalizedGridStep = getNormalizedGridStep;
