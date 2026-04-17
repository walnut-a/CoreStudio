"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStaticScene = exports.renderStaticSceneThrottled = exports.frameClip = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const helpers_1 = require("../components/hyperlink/helpers");
const helpers_2 = require("./helpers");
const GridLineColor = {
    [common_1.THEME.LIGHT]: {
        bold: "#dddddd",
        regular: "#e5e5e5",
    },
    [common_1.THEME.DARK]: {
        bold: (0, common_1.applyDarkModeFilter)("#dddddd"),
        regular: (0, common_1.applyDarkModeFilter)("#e5e5e5"),
    },
};
const strokeGrid = (context, 
/** grid cell pixel size */
gridSize, 
/** setting to 1 will disble bold lines */
gridStep, scrollX, scrollY, zoom, theme, width, height) => {
    const offsetX = (scrollX % gridSize) - gridSize;
    const offsetY = (scrollY % gridSize) - gridSize;
    const actualGridSize = gridSize * zoom.value;
    const spaceWidth = 1 / zoom.value;
    context.save();
    // Offset rendering by 0.5 to ensure that 1px wide lines are crisp.
    // We only do this when zoomed to 100% because otherwise the offset is
    // fractional, and also visibly offsets the elements.
    // We also do this per-axis, as each axis may already be offset by 0.5.
    if (zoom.value === 1) {
        context.translate(offsetX % 1 ? 0 : 0.5, offsetY % 1 ? 0 : 0.5);
    }
    // vertical lines
    for (let x = offsetX; x < offsetX + width + gridSize * 2; x += gridSize) {
        const isBold = gridStep > 1 && Math.round(x - scrollX) % (gridStep * gridSize) === 0;
        // don't render regular lines when zoomed out and they're barely visible
        if (!isBold && actualGridSize < 10) {
            continue;
        }
        const lineWidth = Math.min(1 / zoom.value, isBold ? 4 : 1);
        context.lineWidth = lineWidth;
        const lineDash = [lineWidth * 3, spaceWidth + (lineWidth + spaceWidth)];
        context.beginPath();
        context.setLineDash(isBold ? [] : lineDash);
        context.strokeStyle = isBold
            ? GridLineColor[theme].bold
            : GridLineColor[theme].regular;
        context.moveTo(x, offsetY - gridSize);
        context.lineTo(x, Math.ceil(offsetY + height + gridSize * 2));
        context.stroke();
    }
    for (let y = offsetY; y < offsetY + height + gridSize * 2; y += gridSize) {
        const isBold = gridStep > 1 && Math.round(y - scrollY) % (gridStep * gridSize) === 0;
        if (!isBold && actualGridSize < 10) {
            continue;
        }
        const lineWidth = Math.min(1 / zoom.value, isBold ? 4 : 1);
        context.lineWidth = lineWidth;
        const lineDash = [lineWidth * 3, spaceWidth + (lineWidth + spaceWidth)];
        context.beginPath();
        context.setLineDash(isBold ? [] : lineDash);
        context.strokeStyle = isBold
            ? GridLineColor[theme].bold
            : GridLineColor[theme].regular;
        context.moveTo(offsetX - gridSize, y);
        context.lineTo(Math.ceil(offsetX + width + gridSize * 2), y);
        context.stroke();
    }
    context.restore();
};
const frameClip = (frame, context, renderConfig, appState) => {
    context.translate(frame.x + appState.scrollX, frame.y + appState.scrollY);
    context.beginPath();
    if (context.roundRect) {
        context.roundRect(0, 0, frame.width, frame.height, common_1.FRAME_STYLE.radius / appState.zoom.value);
    }
    else {
        context.rect(0, 0, frame.width, frame.height);
    }
    context.clip();
    context.translate(-(frame.x + appState.scrollX), -(frame.y + appState.scrollY));
};
exports.frameClip = frameClip;
const linkIconCanvasCache = {
    regularLink: null,
    elementLink: null,
};
const renderLinkIcon = (element, context, appState, elementsMap) => {
    if (element.link && !appState.selectedElementIds[element.id]) {
        const [x1, y1, x2, y2] = (0, element_7.getElementAbsoluteCoords)(element, elementsMap);
        const [x, y, width, height] = (0, helpers_1.getLinkHandleFromCoords)([x1, y1, x2, y2], element.angle, appState);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        context.save();
        context.translate(appState.scrollX + centerX, appState.scrollY + centerY);
        context.rotate(element.angle);
        const canvasKey = (0, element_1.isElementLink)(element.link)
            ? "elementLink"
            : "regularLink";
        let linkCanvas = linkIconCanvasCache[canvasKey];
        if (!linkCanvas || linkCanvas.zoom !== appState.zoom.value) {
            linkCanvas = Object.assign(document.createElement("canvas"), {
                zoom: appState.zoom.value,
            });
            linkCanvas.width = width * window.devicePixelRatio * appState.zoom.value;
            linkCanvas.height =
                height * window.devicePixelRatio * appState.zoom.value;
            linkIconCanvasCache[canvasKey] = linkCanvas;
            const linkCanvasCacheContext = linkCanvas.getContext("2d");
            linkCanvasCacheContext.scale(window.devicePixelRatio * appState.zoom.value, window.devicePixelRatio * appState.zoom.value);
            linkCanvasCacheContext.fillStyle = appState.viewBackgroundColor || "#fff";
            linkCanvasCacheContext.fillRect(0, 0, width, height);
            if (canvasKey === "elementLink") {
                linkCanvasCacheContext.drawImage(helpers_1.ELEMENT_LINK_IMG, 0, 0, width, height);
            }
            else {
                linkCanvasCacheContext.drawImage(helpers_1.EXTERNAL_LINK_IMG, 0, 0, width, height);
            }
            linkCanvasCacheContext.restore();
        }
        context.globalAlpha = element.opacity / 100;
        context.drawImage(linkCanvas, x - centerX, y - centerY, width, height);
        context.restore();
    }
};
const _renderStaticScene = ({ canvas, rc, elementsMap, allElementsMap, visibleElements, scale, appState, renderConfig, }) => {
    if (canvas === null) {
        return;
    }
    const { renderGrid = true, isExporting } = renderConfig;
    const [normalizedWidth, normalizedHeight] = (0, helpers_2.getNormalizedCanvasDimensions)(canvas, scale);
    const context = (0, helpers_2.bootstrapCanvas)({
        canvas,
        scale,
        normalizedWidth,
        normalizedHeight,
        theme: appState.theme,
        isExporting,
        viewBackgroundColor: appState.viewBackgroundColor,
    });
    // Apply zoom
    context.scale(appState.zoom.value, appState.zoom.value);
    // Grid
    if (renderGrid) {
        strokeGrid(context, appState.gridSize, appState.gridStep, appState.scrollX, appState.scrollY, appState.zoom, renderConfig.theme, normalizedWidth / appState.zoom.value, normalizedHeight / appState.zoom.value);
    }
    const groupsToBeAddedToFrame = new Set();
    visibleElements.forEach((element) => {
        if (element.groupIds.length > 0 &&
            appState.frameToHighlight &&
            appState.selectedElementIds[element.id] &&
            ((0, element_5.elementOverlapsWithFrame)(element, appState.frameToHighlight, elementsMap) ||
                element.groupIds.find((groupId) => groupsToBeAddedToFrame.has(groupId)))) {
            element.groupIds.forEach((groupId) => groupsToBeAddedToFrame.add(groupId));
        }
    });
    const inFrameGroupsMap = new Map();
    // Paint visible elements
    visibleElements
        .filter((el) => !(0, element_4.isIframeLikeElement)(el))
        .forEach((element) => {
        try {
            const frameId = element.frameId || appState.frameToHighlight?.id;
            if ((0, element_4.isTextElement)(element) &&
                element.containerId &&
                elementsMap.has(element.containerId)) {
                // will be rendered with the container
                return;
            }
            context.save();
            if (frameId &&
                appState.frameRendering.enabled &&
                appState.frameRendering.clip) {
                const frame = (0, element_5.getTargetFrame)(element, elementsMap, appState);
                if (frame &&
                    (0, element_5.shouldApplyFrameClip)(element, frame, appState, elementsMap, inFrameGroupsMap)) {
                    (0, exports.frameClip)(frame, context, renderConfig, appState);
                }
                (0, element_6.renderElement)(element, elementsMap, allElementsMap, rc, context, renderConfig, appState);
            }
            else {
                (0, element_6.renderElement)(element, elementsMap, allElementsMap, rc, context, renderConfig, appState);
            }
            const boundTextElement = (0, element_3.getBoundTextElement)(element, elementsMap);
            if (boundTextElement) {
                (0, element_6.renderElement)(boundTextElement, elementsMap, allElementsMap, rc, context, renderConfig, appState);
            }
            context.restore();
            if (!isExporting) {
                renderLinkIcon(element, context, appState, elementsMap);
            }
        }
        catch (error) {
            console.error(error, element.id, element.x, element.y, element.width, element.height);
        }
    });
    // render embeddables on top
    visibleElements
        .filter((el) => (0, element_4.isIframeLikeElement)(el))
        .forEach((element) => {
        try {
            const render = () => {
                (0, element_6.renderElement)(element, elementsMap, allElementsMap, rc, context, renderConfig, appState);
                if ((0, element_4.isIframeLikeElement)(element) &&
                    (isExporting ||
                        ((0, element_4.isEmbeddableElement)(element) &&
                            renderConfig.embedsValidationStatus.get(element.id) !==
                                true)) &&
                    element.width &&
                    element.height) {
                    const label = (0, element_2.createPlaceholderEmbeddableLabel)(element);
                    (0, element_6.renderElement)(label, elementsMap, allElementsMap, rc, context, renderConfig, appState);
                }
                if (!isExporting) {
                    renderLinkIcon(element, context, appState, elementsMap);
                }
            };
            // - when exporting the whole canvas, we DO NOT apply clipping
            // - when we are exporting a particular frame, apply clipping
            //   if the containing frame is not selected, apply clipping
            const frameId = element.frameId || appState.frameToHighlight?.id;
            if (frameId &&
                appState.frameRendering.enabled &&
                appState.frameRendering.clip) {
                context.save();
                const frame = (0, element_5.getTargetFrame)(element, elementsMap, appState);
                if (frame &&
                    (0, element_5.shouldApplyFrameClip)(element, frame, appState, elementsMap, inFrameGroupsMap)) {
                    (0, exports.frameClip)(frame, context, renderConfig, appState);
                }
                render();
                context.restore();
            }
            else {
                render();
            }
        }
        catch (error) {
            console.error(error);
        }
    });
    // render pending nodes for flowcharts
    renderConfig.pendingFlowchartNodes?.forEach((element) => {
        try {
            (0, element_6.renderElement)(element, elementsMap, allElementsMap, rc, context, renderConfig, appState);
        }
        catch (error) {
            console.error(error);
        }
    });
};
/** throttled to animation framerate */
exports.renderStaticSceneThrottled = (0, common_1.throttleRAF)((config) => {
    _renderStaticScene(config);
});
/**
 * Static scene is the non-ui canvas where we render elements.
 */
const renderStaticScene = (renderConfig, throttle) => {
    if (throttle) {
        (0, exports.renderStaticSceneThrottled)(renderConfig);
        return;
    }
    _renderStaticScene(renderConfig);
};
exports.renderStaticScene = renderStaticScene;
