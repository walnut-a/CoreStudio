"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextFromElements = exports.getBoundTextMaxHeight = exports.getBoundTextMaxWidth = exports.computeContainerDimensionForBoundText = exports.isValidTextContainer = exports.suppportsHorizontalAlign = exports.shouldAllowVerticalAlign = exports.getBoundTextElementPosition = exports.getTextElementAngle = exports.getContainerCoords = exports.getContainerCenter = exports.getContainerElement = exports.getBoundTextElement = exports.getBoundTextElementId = exports.computeBoundTextPosition = exports.handleBindTextResize = exports.redrawTextBoundingBox = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const containerCache_1 = require("./containerCache");
const linearElementEditor_1 = require("./linearElementEditor");
const textMeasurements_1 = require("./textMeasurements");
const textWrapping_1 = require("./textWrapping");
const typeChecks_1 = require("./typeChecks");
const redrawTextBoundingBox = (textElement, container, scene) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    let maxWidth = undefined;
    if (!(0, common_1.isProdEnv)()) {
        (0, common_1.invariant)(!container || !(0, typeChecks_1.isArrowElement)(container) || textElement.angle === 0, "text element angle must be 0 if bound to arrow container");
    }
    const boundTextUpdates = {
        x: textElement.x,
        y: textElement.y,
        text: textElement.text,
        width: textElement.width,
        height: textElement.height,
        angle: (container
            ? (0, typeChecks_1.isArrowElement)(container)
                ? 0
                : container.angle
            : textElement.angle),
    };
    boundTextUpdates.text = textElement.text;
    if (container || !textElement.autoResize) {
        maxWidth = container
            ? (0, exports.getBoundTextMaxWidth)(container, textElement)
            : textElement.width;
        boundTextUpdates.text = (0, textWrapping_1.wrapText)(textElement.originalText, (0, common_1.getFontString)(textElement), maxWidth);
    }
    const metrics = (0, textMeasurements_1.measureText)(boundTextUpdates.text, (0, common_1.getFontString)(textElement), textElement.lineHeight);
    // Note: only update width for unwrapped text and bound texts (which always have autoResize set to true)
    if (textElement.autoResize) {
        boundTextUpdates.width = metrics.width;
    }
    boundTextUpdates.height = metrics.height;
    if (container) {
        const maxContainerHeight = (0, exports.getBoundTextMaxHeight)(container, textElement);
        const maxContainerWidth = (0, exports.getBoundTextMaxWidth)(container, textElement);
        if (!(0, typeChecks_1.isArrowElement)(container) && metrics.height > maxContainerHeight) {
            const nextHeight = (0, exports.computeContainerDimensionForBoundText)(metrics.height, container.type);
            scene.mutateElement(container, { height: nextHeight });
            (0, containerCache_1.updateOriginalContainerCache)(container.id, nextHeight);
        }
        if (metrics.width > maxContainerWidth) {
            const nextWidth = (0, exports.computeContainerDimensionForBoundText)(metrics.width, container.type);
            scene.mutateElement(container, { width: nextWidth });
        }
        const updatedTextElement = {
            ...textElement,
            ...boundTextUpdates,
        };
        const { x, y } = (0, exports.computeBoundTextPosition)(container, updatedTextElement, elementsMap);
        boundTextUpdates.x = x;
        boundTextUpdates.y = y;
    }
    scene.mutateElement(textElement, boundTextUpdates);
};
exports.redrawTextBoundingBox = redrawTextBoundingBox;
const handleBindTextResize = (container, scene, transformHandleType, shouldMaintainAspectRatio = false) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const boundTextElementId = (0, exports.getBoundTextElementId)(container);
    if (!boundTextElementId) {
        return;
    }
    (0, containerCache_1.resetOriginalContainerCache)(container.id);
    const textElement = (0, exports.getBoundTextElement)(container, elementsMap);
    if (textElement && textElement.text) {
        if (!container) {
            return;
        }
        let text = textElement.text;
        let nextHeight = textElement.height;
        let nextWidth = textElement.width;
        const maxWidth = (0, exports.getBoundTextMaxWidth)(container, textElement);
        const maxHeight = (0, exports.getBoundTextMaxHeight)(container, textElement);
        let containerHeight = container.height;
        if (shouldMaintainAspectRatio ||
            (transformHandleType !== "n" && transformHandleType !== "s")) {
            if (text) {
                text = (0, textWrapping_1.wrapText)(textElement.originalText, (0, common_1.getFontString)(textElement), maxWidth);
            }
            const metrics = (0, textMeasurements_1.measureText)(text, (0, common_1.getFontString)(textElement), textElement.lineHeight);
            nextHeight = metrics.height;
            nextWidth = metrics.width;
        }
        // increase height in case text element height exceeds
        if (nextHeight > maxHeight) {
            containerHeight = (0, exports.computeContainerDimensionForBoundText)(nextHeight, container.type);
            const diff = containerHeight - container.height;
            // fix the y coord when resizing from ne/nw/n
            const updatedY = !(0, typeChecks_1.isArrowElement)(container) &&
                (transformHandleType === "ne" ||
                    transformHandleType === "nw" ||
                    transformHandleType === "n")
                ? container.y - diff
                : container.y;
            scene.mutateElement(container, {
                height: containerHeight,
                y: updatedY,
            });
        }
        scene.mutateElement(textElement, {
            text,
            width: nextWidth,
            height: nextHeight,
        });
        if (!(0, typeChecks_1.isArrowElement)(container)) {
            scene.mutateElement(textElement, (0, exports.computeBoundTextPosition)(container, textElement, elementsMap));
        }
    }
};
exports.handleBindTextResize = handleBindTextResize;
const computeBoundTextPosition = (container, boundTextElement, elementsMap) => {
    if ((0, typeChecks_1.isArrowElement)(container)) {
        return linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(container, boundTextElement, elementsMap);
    }
    const containerCoords = (0, exports.getContainerCoords)(container);
    const maxContainerHeight = (0, exports.getBoundTextMaxHeight)(container, boundTextElement);
    const maxContainerWidth = (0, exports.getBoundTextMaxWidth)(container, boundTextElement);
    let x;
    let y;
    if (boundTextElement.verticalAlign === common_1.VERTICAL_ALIGN.TOP) {
        y = containerCoords.y;
    }
    else if (boundTextElement.verticalAlign === common_1.VERTICAL_ALIGN.BOTTOM) {
        y = containerCoords.y + (maxContainerHeight - boundTextElement.height);
    }
    else {
        y =
            containerCoords.y +
                (maxContainerHeight / 2 - boundTextElement.height / 2);
    }
    if (boundTextElement.textAlign === common_1.TEXT_ALIGN.LEFT) {
        x = containerCoords.x;
    }
    else if (boundTextElement.textAlign === common_1.TEXT_ALIGN.RIGHT) {
        x = containerCoords.x + (maxContainerWidth - boundTextElement.width);
    }
    else {
        x =
            containerCoords.x + (maxContainerWidth / 2 - boundTextElement.width / 2);
    }
    const angle = (container.angle ?? 0);
    if (angle !== 0) {
        const contentCenter = (0, math_1.pointFrom)(containerCoords.x + maxContainerWidth / 2, containerCoords.y + maxContainerHeight / 2);
        const textCenter = (0, math_1.pointFrom)(x + boundTextElement.width / 2, y + boundTextElement.height / 2);
        const [rx, ry] = (0, math_1.pointRotateRads)(textCenter, contentCenter, angle);
        return {
            x: rx - boundTextElement.width / 2,
            y: ry - boundTextElement.height / 2,
        };
    }
    return { x, y };
};
exports.computeBoundTextPosition = computeBoundTextPosition;
const getBoundTextElementId = (container) => {
    return container?.boundElements?.length
        ? container?.boundElements?.find((ele) => ele.type === "text")?.id || null
        : null;
};
exports.getBoundTextElementId = getBoundTextElementId;
const getBoundTextElement = (element, elementsMap) => {
    if (!element) {
        return null;
    }
    const boundTextElementId = (0, exports.getBoundTextElementId)(element);
    if (boundTextElementId) {
        return (elementsMap.get(boundTextElementId) ||
            null);
    }
    return null;
};
exports.getBoundTextElement = getBoundTextElement;
const getContainerElement = (element, elementsMap) => {
    if (!element) {
        return null;
    }
    if (element.containerId) {
        return (elementsMap.get(element.containerId) ||
            null);
    }
    return null;
};
exports.getContainerElement = getContainerElement;
const getContainerCenter = (container, appState, elementsMap) => {
    if (!(0, typeChecks_1.isArrowElement)(container)) {
        return {
            x: container.x + container.width / 2,
            y: container.y + container.height / 2,
        };
    }
    const points = linearElementEditor_1.LinearElementEditor.getPointsGlobalCoordinates(container, elementsMap);
    if (points.length % 2 === 1) {
        const index = Math.floor(container.points.length / 2);
        const midPoint = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(container, container.points[index], elementsMap);
        return { x: midPoint[0], y: midPoint[1] };
    }
    const index = container.points.length / 2 - 1;
    let midSegmentMidpoint = linearElementEditor_1.LinearElementEditor.getEditorMidPoints(container, elementsMap, appState)[index];
    if (!midSegmentMidpoint) {
        midSegmentMidpoint = linearElementEditor_1.LinearElementEditor.getSegmentMidPoint(container, index + 1, elementsMap);
    }
    return { x: midSegmentMidpoint[0], y: midSegmentMidpoint[1] };
};
exports.getContainerCenter = getContainerCenter;
const getContainerCoords = (container) => {
    let offsetX = common_1.BOUND_TEXT_PADDING;
    let offsetY = common_1.BOUND_TEXT_PADDING;
    if (container.type === "ellipse") {
        // The derivation of coordinates is explained in https://github.com/excalidraw/excalidraw/pull/6172
        offsetX += (container.width / 2) * (1 - Math.sqrt(2) / 2);
        offsetY += (container.height / 2) * (1 - Math.sqrt(2) / 2);
    }
    // The derivation of coordinates is explained in https://github.com/excalidraw/excalidraw/pull/6265
    if (container.type === "diamond") {
        offsetX += container.width / 4;
        offsetY += container.height / 4;
    }
    return {
        x: container.x + offsetX,
        y: container.y + offsetY,
    };
};
exports.getContainerCoords = getContainerCoords;
const getTextElementAngle = (textElement, container) => {
    if ((0, typeChecks_1.isArrowElement)(container)) {
        return 0;
    }
    if (!container) {
        return textElement.angle;
    }
    return container.angle;
};
exports.getTextElementAngle = getTextElementAngle;
const getBoundTextElementPosition = (container, boundTextElement, elementsMap) => {
    if ((0, typeChecks_1.isArrowElement)(container)) {
        return linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(container, boundTextElement, elementsMap);
    }
};
exports.getBoundTextElementPosition = getBoundTextElementPosition;
const shouldAllowVerticalAlign = (selectedElements, elementsMap) => {
    return selectedElements.some((element) => {
        if ((0, typeChecks_1.isBoundToContainer)(element)) {
            const container = (0, exports.getContainerElement)(element, elementsMap);
            if ((0, typeChecks_1.isArrowElement)(container)) {
                return false;
            }
            return true;
        }
        return false;
    });
};
exports.shouldAllowVerticalAlign = shouldAllowVerticalAlign;
const suppportsHorizontalAlign = (selectedElements, elementsMap) => {
    return selectedElements.some((element) => {
        if ((0, typeChecks_1.isBoundToContainer)(element)) {
            const container = (0, exports.getContainerElement)(element, elementsMap);
            if ((0, typeChecks_1.isArrowElement)(container)) {
                return false;
            }
            return true;
        }
        return (0, typeChecks_1.isTextElement)(element);
    });
};
exports.suppportsHorizontalAlign = suppportsHorizontalAlign;
const VALID_CONTAINER_TYPES = new Set([
    "rectangle",
    "ellipse",
    "diamond",
    "arrow",
]);
const isValidTextContainer = (element) => VALID_CONTAINER_TYPES.has(element.type);
exports.isValidTextContainer = isValidTextContainer;
const computeContainerDimensionForBoundText = (dimension, containerType) => {
    dimension = Math.ceil(dimension);
    const padding = common_1.BOUND_TEXT_PADDING * 2;
    if (containerType === "ellipse") {
        return Math.round(((dimension + padding) / Math.sqrt(2)) * 2);
    }
    if (containerType === "arrow") {
        return dimension + padding * 8;
    }
    if (containerType === "diamond") {
        return 2 * (dimension + padding);
    }
    return dimension + padding;
};
exports.computeContainerDimensionForBoundText = computeContainerDimensionForBoundText;
const getBoundTextMaxWidth = (container, boundTextElement) => {
    const { width } = container;
    if ((0, typeChecks_1.isArrowElement)(container)) {
        const minWidth = (boundTextElement?.fontSize ?? common_1.DEFAULT_FONT_SIZE) *
            common_1.ARROW_LABEL_FONT_SIZE_TO_MIN_WIDTH_RATIO;
        return Math.max(common_1.ARROW_LABEL_WIDTH_FRACTION * width, minWidth);
    }
    if (container.type === "ellipse") {
        // The width of the largest rectangle inscribed inside an ellipse is
        // Math.round((ellipse.width / 2) * Math.sqrt(2)) which is derived from
        // equation of an ellipse -https://github.com/excalidraw/excalidraw/pull/6172
        return Math.round((width / 2) * Math.sqrt(2)) - common_1.BOUND_TEXT_PADDING * 2;
    }
    if (container.type === "diamond") {
        // The width of the largest rectangle inscribed inside a rhombus is
        // Math.round(width / 2) - https://github.com/excalidraw/excalidraw/pull/6265
        return Math.round(width / 2) - common_1.BOUND_TEXT_PADDING * 2;
    }
    return width - common_1.BOUND_TEXT_PADDING * 2;
};
exports.getBoundTextMaxWidth = getBoundTextMaxWidth;
const getBoundTextMaxHeight = (container, boundTextElement) => {
    const { height } = container;
    if ((0, typeChecks_1.isArrowElement)(container)) {
        const containerHeight = height - common_1.BOUND_TEXT_PADDING * 8 * 2;
        if (containerHeight <= 0) {
            return boundTextElement.height;
        }
        return height;
    }
    if (container.type === "ellipse") {
        // The height of the largest rectangle inscribed inside an ellipse is
        // Math.round((ellipse.height / 2) * Math.sqrt(2)) which is derived from
        // equation of an ellipse - https://github.com/excalidraw/excalidraw/pull/6172
        return Math.round((height / 2) * Math.sqrt(2)) - common_1.BOUND_TEXT_PADDING * 2;
    }
    if (container.type === "diamond") {
        // The height of the largest rectangle inscribed inside a rhombus is
        // Math.round(height / 2) - https://github.com/excalidraw/excalidraw/pull/6265
        return Math.round(height / 2) - common_1.BOUND_TEXT_PADDING * 2;
    }
    return height - common_1.BOUND_TEXT_PADDING * 2;
};
exports.getBoundTextMaxHeight = getBoundTextMaxHeight;
/** retrieves text from text elements and concatenates to a single string */
const getTextFromElements = (elements, separator = "\n\n") => {
    const text = elements
        .reduce((acc, element) => {
        if ((0, typeChecks_1.isTextElement)(element)) {
            acc.push(element.text);
        }
        return acc;
    }, [])
        .join(separator);
    return text;
};
exports.getTextFromElements = getTextFromElements;
