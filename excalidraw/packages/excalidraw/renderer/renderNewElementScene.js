"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNewElementScene = exports.renderNewElementSceneThrottled = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const helpers_1 = require("./helpers");
const staticScene_1 = require("./staticScene");
const _renderNewElementScene = ({ canvas, rc, newElement, elementsMap, allElementsMap, scale, appState, renderConfig, }) => {
    if (canvas) {
        const [normalizedWidth, normalizedHeight] = (0, helpers_1.getNormalizedCanvasDimensions)(canvas, scale);
        const context = (0, helpers_1.bootstrapCanvas)({
            canvas,
            scale,
            normalizedWidth,
            normalizedHeight,
        });
        context.save();
        // Apply zoom
        context.scale(appState.zoom.value, appState.zoom.value);
        if (newElement && newElement.type !== "selection") {
            // e.g. when creating arrows and we're still below the arrow drag distance
            // threshold
            // (for now we skip render only with elements while we're creating to be
            // safe)
            if ((0, element_1.isInvisiblySmallElement)(newElement)) {
                return;
            }
            const frameId = newElement.frameId || appState.frameToHighlight?.id;
            if (frameId &&
                appState.frameRendering.enabled &&
                appState.frameRendering.clip) {
                const frame = (0, element_1.getTargetFrame)(newElement, elementsMap, appState);
                if (frame &&
                    (0, element_1.shouldApplyFrameClip)(newElement, frame, appState, elementsMap)) {
                    (0, staticScene_1.frameClip)(frame, context, renderConfig, appState);
                }
            }
            (0, element_1.renderElement)(newElement, elementsMap, allElementsMap, rc, context, renderConfig, appState);
        }
        else {
            context.clearRect(0, 0, normalizedWidth, normalizedHeight);
        }
        context.restore();
    }
};
exports.renderNewElementSceneThrottled = (0, common_1.throttleRAF)((config) => {
    _renderNewElementScene(config);
});
const renderNewElementScene = (renderConfig, throttle) => {
    if (throttle) {
        (0, exports.renderNewElementSceneThrottled)(renderConfig);
        return;
    }
    _renderNewElementScene(renderConfig);
};
exports.renderNewElementScene = renderNewElementScene;
