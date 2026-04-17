"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCursorForShape = exports.setEraserCursor = exports.setCursor = exports.resetCursor = void 0;
const common_1 = require("@excalidraw/common");
const appState_1 = require("./appState");
const laserPointerCursorSVG_tag = `<svg viewBox="0 0 24 24" stroke-width="1" width="28" height="28" xmlns="http://www.w3.org/2000/svg">`;
const laserPointerCursorBackgroundSVG = `<path d="M6.164 11.755a5.314 5.314 0 0 1-4.932-5.298 5.314 5.314 0 0 1 5.311-5.311 5.314 5.314 0 0 1 5.307 5.113l8.773 8.773a3.322 3.322 0 0 1 0 4.696l-.895.895a3.322 3.322 0 0 1-4.696 0l-8.868-8.868Z" style="fill:#fff"/>`;
const laserPointerCursorIconSVG = `<path stroke="#1b1b1f" fill="#fff" d="m7.868 11.113 7.773 7.774a2.359 2.359 0 0 0 1.667.691 2.368 2.368 0 0 0 2.357-2.358c0-.625-.248-1.225-.69-1.667L11.201 7.78 9.558 9.469l-1.69 1.643v.001Zm10.273 3.606-3.333 3.333m-3.25-6.583 2 2m-7-7 3 3M3.664 3.625l1 1M2.529 6.922l1.407-.144m5.735-2.932-1.118.866M4.285 9.823l.758-1.194m1.863-6.207-.13 1.408"/>`;
const laserPointerCursorDataURL_lightMode = `data:${common_1.MIME_TYPES.svg},${encodeURIComponent(`${laserPointerCursorSVG_tag}${laserPointerCursorIconSVG}</svg>`)}`;
const laserPointerCursorDataURL_darkMode = `data:${common_1.MIME_TYPES.svg},${encodeURIComponent(`${laserPointerCursorSVG_tag}${laserPointerCursorBackgroundSVG}${laserPointerCursorIconSVG}</svg>`)}`;
const resetCursor = (interactiveCanvas) => {
    if (interactiveCanvas) {
        interactiveCanvas.style.cursor = "";
    }
};
exports.resetCursor = resetCursor;
const setCursor = (interactiveCanvas, cursor) => {
    if (interactiveCanvas) {
        interactiveCanvas.style.cursor = cursor;
    }
};
exports.setCursor = setCursor;
let eraserCanvasCache;
let previewDataURL;
const setEraserCursor = (interactiveCanvas, theme) => {
    const cursorImageSizePx = 20;
    const drawCanvas = () => {
        const isDarkTheme = theme === common_1.THEME.DARK;
        eraserCanvasCache = document.createElement("canvas");
        eraserCanvasCache.theme = theme;
        eraserCanvasCache.height = cursorImageSizePx;
        eraserCanvasCache.width = cursorImageSizePx;
        const context = eraserCanvasCache.getContext("2d");
        context.lineWidth = 1;
        context.beginPath();
        context.arc(eraserCanvasCache.width / 2, eraserCanvasCache.height / 2, 5, 0, 2 * Math.PI);
        context.fillStyle = isDarkTheme ? "#000" : "#fff";
        context.fill();
        context.strokeStyle = isDarkTheme ? "#fff" : "#000";
        context.stroke();
        previewDataURL = eraserCanvasCache.toDataURL(common_1.MIME_TYPES.svg);
    };
    if (!eraserCanvasCache || eraserCanvasCache.theme !== theme) {
        drawCanvas();
    }
    (0, exports.setCursor)(interactiveCanvas, `url(${previewDataURL}) ${cursorImageSizePx / 2} ${cursorImageSizePx / 2}, auto`);
};
exports.setEraserCursor = setEraserCursor;
const setCursorForShape = (interactiveCanvas, appState) => {
    if (!interactiveCanvas) {
        return;
    }
    if (appState.activeTool.type === "selection") {
        (0, exports.resetCursor)(interactiveCanvas);
    }
    else if ((0, appState_1.isHandToolActive)(appState)) {
        interactiveCanvas.style.cursor = common_1.CURSOR_TYPE.GRAB;
    }
    else if ((0, appState_1.isEraserActive)(appState)) {
        (0, exports.setEraserCursor)(interactiveCanvas, appState.theme);
        // do nothing if image tool is selected which suggests there's
        // a image-preview set as the cursor
        // Ignore custom type as well and let host decide
    }
    else if (appState.activeTool.type === "laser") {
        const url = appState.theme === common_1.THEME.LIGHT
            ? laserPointerCursorDataURL_lightMode
            : laserPointerCursorDataURL_darkMode;
        interactiveCanvas.style.cursor = `url(${url}), auto`;
    }
    else if (!["image", "custom"].includes(appState.activeTool.type)) {
        interactiveCanvas.style.cursor = common_1.CURSOR_TYPE.CROSSHAIR;
    }
    else if (appState.activeTool.type !== "image") {
        interactiveCanvas.style.cursor = common_1.CURSOR_TYPE.AUTO;
    }
};
exports.setCursorForShape = setCursorForShape;
