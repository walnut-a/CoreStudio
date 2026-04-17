"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strokeRectWithRotation_simple = exports.bootstrapCanvas = exports.getNormalizedCanvasDimensions = exports.fillCircle = void 0;
const common_1 = require("@excalidraw/common");
const fillCircle = (context, cx, cy, radius, stroke, fill = true) => {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    if (fill) {
        context.fill();
    }
    if (stroke) {
        context.stroke();
    }
};
exports.fillCircle = fillCircle;
const getNormalizedCanvasDimensions = (canvas, scale) => {
    // When doing calculations based on canvas width we should used normalized one
    return [canvas.width / scale, canvas.height / scale];
};
exports.getNormalizedCanvasDimensions = getNormalizedCanvasDimensions;
const bootstrapCanvas = ({ canvas, scale, normalizedWidth, normalizedHeight, theme, isExporting, viewBackgroundColor, }) => {
    const context = canvas.getContext("2d");
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(scale, scale);
    // Paint background
    if (typeof viewBackgroundColor === "string") {
        const hasTransparence = viewBackgroundColor === "transparent" ||
            viewBackgroundColor.length === 5 || // #RGBA
            viewBackgroundColor.length === 9 || // #RRGGBBA
            /(hsla|rgba)\(/.test(viewBackgroundColor);
        if (hasTransparence) {
            context.clearRect(0, 0, normalizedWidth, normalizedHeight);
        }
        context.save();
        context.fillStyle =
            theme === common_1.THEME.DARK
                ? (0, common_1.applyDarkModeFilter)(viewBackgroundColor)
                : viewBackgroundColor;
        context.fillRect(0, 0, normalizedWidth, normalizedHeight);
        context.restore();
    }
    else {
        context.clearRect(0, 0, normalizedWidth, normalizedHeight);
    }
    return context;
};
exports.bootstrapCanvas = bootstrapCanvas;
const strokeRectWithRotation_simple = (context, x, y, width, height, cx, cy, angle, fill = false, 
/** should account for zoom */
radius = 0) => {
    context.save();
    context.translate(cx, cy);
    context.rotate(angle);
    if (fill) {
        context.fillRect(x - cx, y - cy, width, height);
    }
    if (radius && context.roundRect) {
        context.beginPath();
        context.roundRect(x - cx, y - cy, width, height, radius);
        context.stroke();
        context.closePath();
    }
    else {
        context.strokeRect(x - cx, y - cy, width, height);
    }
    context.restore();
};
exports.strokeRectWithRotation_simple = strokeRectWithRotation_simple;
