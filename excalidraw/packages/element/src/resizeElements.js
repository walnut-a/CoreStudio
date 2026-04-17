"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resizeMultipleElements = exports.resizeSingleElement = exports.getResizeArrowDirection = exports.getResizeOffsetXY = exports.resizeSingleTextElement = exports.measureFontSizeFromWidth = exports.rescalePointsInElement = exports.transformElements = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const binding_1 = require("./binding");
const bounds_1 = require("./bounds");
const linearElementEditor_1 = require("./linearElementEditor");
const textElement_1 = require("./textElement");
const textMeasurements_1 = require("./textMeasurements");
const textWrapping_1 = require("./textWrapping");
const typeChecks_1 = require("./typeChecks");
const groups_1 = require("./groups");
// Returns true when transform (resizing/rotation) happened
const transformElements = (originalElements, transformHandleType, selectedElements, scene, shouldRotateWithDiscreteAngle, shouldResizeFromCenter, shouldMaintainAspectRatio, pointerX, pointerY, centerX, centerY) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    if (selectedElements.length === 1) {
        const [element] = selectedElements;
        if (transformHandleType === "rotation") {
            if (!(0, typeChecks_1.isElbowArrow)(element)) {
                rotateSingleElement(element, scene, pointerX, pointerY, shouldRotateWithDiscreteAngle);
                (0, binding_1.updateBoundElements)(element, scene);
            }
        }
        else if (transformHandleType) {
            const elementId = selectedElements[0].id;
            const latestElement = elementsMap.get(elementId);
            const origElement = originalElements.get(elementId);
            if (latestElement && origElement) {
                const { nextWidth, nextHeight } = getNextSingleWidthAndHeightFromPointer(latestElement, origElement, transformHandleType, pointerX, pointerY, {
                    shouldMaintainAspectRatio,
                    shouldResizeFromCenter,
                });
                (0, exports.resizeSingleElement)(nextWidth, nextHeight, latestElement, origElement, originalElements, scene, transformHandleType, {
                    shouldMaintainAspectRatio,
                    shouldResizeFromCenter,
                });
            }
        }
        if ((0, typeChecks_1.isTextElement)(element)) {
            (0, binding_1.updateBoundElements)(element, scene);
        }
        return true;
    }
    else if (selectedElements.length > 1) {
        if (transformHandleType === "rotation") {
            rotateMultipleElements(originalElements, selectedElements, scene, pointerX, pointerY, shouldRotateWithDiscreteAngle, centerX, centerY);
            return true;
        }
        else if (transformHandleType) {
            const { nextWidth, nextHeight, flipByX, flipByY, originalBoundingBox } = getNextMultipleWidthAndHeightFromPointer(selectedElements, originalElements, elementsMap, transformHandleType, pointerX, pointerY, {
                shouldMaintainAspectRatio,
                shouldResizeFromCenter,
            });
            (0, exports.resizeMultipleElements)(selectedElements, elementsMap, transformHandleType, scene, originalElements, {
                shouldResizeFromCenter,
                shouldMaintainAspectRatio,
                flipByX,
                flipByY,
                nextWidth,
                nextHeight,
                originalBoundingBox,
            });
            return true;
        }
    }
    return false;
};
exports.transformElements = transformElements;
const rotateSingleElement = (element, scene, pointerX, pointerY, shouldRotateWithDiscreteAngle) => {
    const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, scene.getNonDeletedElementsMap());
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    let angle;
    if ((0, typeChecks_1.isFrameLikeElement)(element)) {
        angle = 0;
    }
    else {
        angle = ((5 * Math.PI) / 2 +
            Math.atan2(pointerY - cy, pointerX - cx));
        if (shouldRotateWithDiscreteAngle) {
            angle = (angle + common_1.SHIFT_LOCKING_ANGLE / 2);
            angle = (angle - (angle % common_1.SHIFT_LOCKING_ANGLE));
        }
        angle = (0, math_1.normalizeRadians)(angle);
    }
    const boundTextElementId = (0, textElement_1.getBoundTextElementId)(element);
    let update = {
        angle,
    };
    if ((0, typeChecks_1.isBindingElement)(element)) {
        update = {
            ...update,
        };
        if (element.startBinding) {
            (0, binding_1.unbindBindingElement)(element, "start", scene);
        }
        if (element.endBinding) {
            (0, binding_1.unbindBindingElement)(element, "end", scene);
        }
    }
    scene.mutateElement(element, update);
    if (boundTextElementId) {
        const textElement = scene.getElement(boundTextElementId);
        if (textElement && !(0, typeChecks_1.isArrowElement)(element)) {
            const { x, y } = (0, textElement_1.computeBoundTextPosition)(element, textElement, scene.getNonDeletedElementsMap());
            scene.mutateElement(textElement, {
                angle,
                x,
                y,
            });
        }
    }
};
const rescalePointsInElement = (element, width, height, normalizePoints) => (0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element)
    ? {
        points: (0, common_1.rescalePoints)(0, width, (0, common_1.rescalePoints)(1, height, element.points, normalizePoints), normalizePoints),
    }
    : {};
exports.rescalePointsInElement = rescalePointsInElement;
const measureFontSizeFromWidth = (element, elementsMap, nextWidth) => {
    // We only use width to scale font on resize
    let width = element.width;
    const hasContainer = (0, typeChecks_1.isBoundToContainer)(element);
    if (hasContainer) {
        const container = (0, textElement_1.getContainerElement)(element, elementsMap);
        if (container) {
            width = (0, textElement_1.getBoundTextMaxWidth)(container, element);
        }
    }
    const nextFontSize = element.fontSize * (nextWidth / width);
    if (nextFontSize < common_1.MIN_FONT_SIZE) {
        return null;
    }
    return {
        size: nextFontSize,
    };
};
exports.measureFontSizeFromWidth = measureFontSizeFromWidth;
const resizeSingleTextElement = (origElement, element, scene, transformHandleType, shouldResizeFromCenter, nextWidth, nextHeight) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const metricsWidth = element.width * (nextHeight / element.height);
    const metrics = (0, exports.measureFontSizeFromWidth)(element, elementsMap, metricsWidth);
    if (metrics === null) {
        return;
    }
    if (transformHandleType.includes("n") || transformHandleType.includes("s")) {
        const previousOrigin = (0, math_1.pointFrom)(origElement.x, origElement.y);
        const newOrigin = getResizedOrigin(previousOrigin, origElement.width, origElement.height, metricsWidth, nextHeight, origElement.angle, transformHandleType, false, shouldResizeFromCenter);
        scene.mutateElement(element, {
            fontSize: metrics.size,
            width: metricsWidth,
            height: nextHeight,
            x: newOrigin.x,
            y: newOrigin.y,
        });
        return;
    }
    if (transformHandleType === "e" || transformHandleType === "w") {
        const minWidth = (0, textMeasurements_1.getMinTextElementWidth)((0, common_1.getFontString)({
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
        }), element.lineHeight);
        const newWidth = Math.max(minWidth, nextWidth);
        const text = (0, textWrapping_1.wrapText)(element.originalText, (0, common_1.getFontString)(element), Math.abs(newWidth));
        const metrics = (0, textMeasurements_1.measureText)(text, (0, common_1.getFontString)(element), element.lineHeight);
        const newHeight = metrics.height;
        const previousOrigin = (0, math_1.pointFrom)(origElement.x, origElement.y);
        const newOrigin = getResizedOrigin(previousOrigin, origElement.width, origElement.height, newWidth, newHeight, element.angle, transformHandleType, false, shouldResizeFromCenter);
        const resizedElement = {
            width: Math.abs(newWidth),
            height: Math.abs(metrics.height),
            x: newOrigin.x,
            y: newOrigin.y,
            text,
            autoResize: false,
        };
        scene.mutateElement(element, resizedElement);
    }
};
exports.resizeSingleTextElement = resizeSingleTextElement;
const rotateMultipleElements = (originalElements, elements, scene, pointerX, pointerY, shouldRotateWithDiscreteAngle, centerX, centerY) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    let centerAngle = (5 * Math.PI) / 2 + Math.atan2(pointerY - centerY, pointerX - centerX);
    if (shouldRotateWithDiscreteAngle) {
        centerAngle += common_1.SHIFT_LOCKING_ANGLE / 2;
        centerAngle -= centerAngle % common_1.SHIFT_LOCKING_ANGLE;
    }
    const rotatedElementsMap = new Map(elements.map((element) => [element.id, element]));
    for (const element of elements) {
        if (!(0, typeChecks_1.isFrameLikeElement)(element)) {
            const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            const origAngle = originalElements.get(element.id)?.angle ?? element.angle;
            const [rotatedCX, rotatedCY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(cx, cy), (0, math_1.pointFrom)(centerX, centerY), (centerAngle + origAngle - element.angle));
            const updates = (0, typeChecks_1.isElbowArrow)(element)
                ? {
                    // Needed to re-route the arrow
                    points: (0, binding_1.getArrowLocalFixedPoints)(element, elementsMap),
                }
                : {
                    x: element.x + (rotatedCX - cx),
                    y: element.y + (rotatedCY - cy),
                    angle: (0, math_1.normalizeRadians)((centerAngle + origAngle)),
                };
            scene.mutateElement(element, updates);
            (0, binding_1.updateBoundElements)(element, scene, {
                simultaneouslyUpdated: elements,
            });
            if ((0, typeChecks_1.isBindingElement)(element)) {
                if (element.startBinding) {
                    if (!rotatedElementsMap.has(element.startBinding.elementId)) {
                        (0, binding_1.unbindBindingElement)(element, "start", scene);
                    }
                }
                if (element.endBinding) {
                    if (!rotatedElementsMap.has(element.endBinding.elementId)) {
                        (0, binding_1.unbindBindingElement)(element, "end", scene);
                    }
                }
            }
            const boundText = (0, textElement_1.getBoundTextElement)(element, elementsMap);
            if (boundText && !(0, typeChecks_1.isArrowElement)(element)) {
                const { x, y } = (0, textElement_1.computeBoundTextPosition)(element, boundText, elementsMap);
                scene.mutateElement(boundText, {
                    x,
                    y,
                    angle: (0, math_1.normalizeRadians)((centerAngle + origAngle)),
                });
            }
        }
    }
    scene.triggerUpdate();
};
const getResizeOffsetXY = (transformHandleType, selectedElements, elementsMap, x, y) => {
    const [x1, y1, x2, y2] = selectedElements.length === 1
        ? (0, bounds_1.getElementAbsoluteCoords)(selectedElements[0], elementsMap)
        : (0, bounds_1.getCommonBounds)(selectedElements);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const angle = (selectedElements.length === 1 ? selectedElements[0].angle : 0);
    [x, y] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), (0, math_1.pointFrom)(cx, cy), -angle);
    switch (transformHandleType) {
        case "n":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - (x1 + x2) / 2, y - y1), (0, math_1.pointFrom)(0, 0), angle);
        case "s":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - (x1 + x2) / 2, y - y2), (0, math_1.pointFrom)(0, 0), angle);
        case "w":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x1, y - (y1 + y2) / 2), (0, math_1.pointFrom)(0, 0), angle);
        case "e":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x2, y - (y1 + y2) / 2), (0, math_1.pointFrom)(0, 0), angle);
        case "nw":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x1, y - y1), (0, math_1.pointFrom)(0, 0), angle);
        case "ne":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x2, y - y1), (0, math_1.pointFrom)(0, 0), angle);
        case "sw":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x1, y - y2), (0, math_1.pointFrom)(0, 0), angle);
        case "se":
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - x2, y - y2), (0, math_1.pointFrom)(0, 0), angle);
        default:
            return [0, 0];
    }
};
exports.getResizeOffsetXY = getResizeOffsetXY;
const getResizeArrowDirection = (transformHandleType, element) => {
    const [, [px, py]] = element.points;
    const isResizeEnd = (transformHandleType === "nw" && (px < 0 || py < 0)) ||
        (transformHandleType === "ne" && px >= 0) ||
        (transformHandleType === "sw" && px <= 0) ||
        (transformHandleType === "se" && (px > 0 || py > 0));
    return isResizeEnd ? "end" : "origin";
};
exports.getResizeArrowDirection = getResizeArrowDirection;
const getResizeAnchor = (handleDirection, shouldMaintainAspectRatio, shouldResizeFromCenter) => {
    if (shouldResizeFromCenter) {
        return "center";
    }
    if (shouldMaintainAspectRatio) {
        switch (handleDirection) {
            case "n":
                return "south-side";
            case "e": {
                return "west-side";
            }
            case "s":
                return "north-side";
            case "w":
                return "east-side";
            case "ne":
                return "bottom-left";
            case "nw":
                return "bottom-right";
            case "se":
                return "top-left";
            case "sw":
                return "top-right";
        }
    }
    if (["e", "se", "s"].includes(handleDirection)) {
        return "top-left";
    }
    else if (["n", "nw", "w"].includes(handleDirection)) {
        return "bottom-right";
    }
    else if (handleDirection === "ne") {
        return "bottom-left";
    }
    return "top-right";
};
const getResizedOrigin = (prevOrigin, prevWidth, prevHeight, newWidth, newHeight, angle, handleDirection, shouldMaintainAspectRatio, shouldResizeFromCenter) => {
    const anchor = getResizeAnchor(handleDirection, shouldMaintainAspectRatio, shouldResizeFromCenter);
    const [x, y] = prevOrigin;
    switch (anchor) {
        case "top-left":
            return {
                x: x +
                    (prevWidth - newWidth) / 2 +
                    ((newWidth - prevWidth) / 2) * Math.cos(angle) +
                    ((prevHeight - newHeight) / 2) * Math.sin(angle),
                y: y +
                    (prevHeight - newHeight) / 2 +
                    ((newWidth - prevWidth) / 2) * Math.sin(angle) +
                    ((newHeight - prevHeight) / 2) * Math.cos(angle),
            };
        case "top-right":
            return {
                x: x +
                    ((prevWidth - newWidth) / 2) * (Math.cos(angle) + 1) +
                    ((prevHeight - newHeight) / 2) * Math.sin(angle),
                y: y +
                    (prevHeight - newHeight) / 2 +
                    ((prevWidth - newWidth) / 2) * Math.sin(angle) +
                    ((newHeight - prevHeight) / 2) * Math.cos(angle),
            };
        case "bottom-left":
            return {
                x: x +
                    ((prevWidth - newWidth) / 2) * (1 - Math.cos(angle)) +
                    ((newHeight - prevHeight) / 2) * Math.sin(angle),
                y: y +
                    ((prevHeight - newHeight) / 2) * (Math.cos(angle) + 1) +
                    ((newWidth - prevWidth) / 2) * Math.sin(angle),
            };
        case "bottom-right":
            return {
                x: x +
                    ((prevWidth - newWidth) / 2) * (Math.cos(angle) + 1) +
                    ((newHeight - prevHeight) / 2) * Math.sin(angle),
                y: y +
                    ((prevHeight - newHeight) / 2) * (Math.cos(angle) + 1) +
                    ((prevWidth - newWidth) / 2) * Math.sin(angle),
            };
        case "center":
            return {
                x: x - (newWidth - prevWidth) / 2,
                y: y - (newHeight - prevHeight) / 2,
            };
        case "east-side":
            return {
                x: x + ((prevWidth - newWidth) / 2) * (Math.cos(angle) + 1),
                y: y +
                    ((prevWidth - newWidth) / 2) * Math.sin(angle) +
                    (prevHeight - newHeight) / 2,
            };
        case "west-side":
            return {
                x: x + ((prevWidth - newWidth) / 2) * (1 - Math.cos(angle)),
                y: y +
                    ((newWidth - prevWidth) / 2) * Math.sin(angle) +
                    (prevHeight - newHeight) / 2,
            };
        case "north-side":
            return {
                x: x +
                    (prevWidth - newWidth) / 2 +
                    ((prevHeight - newHeight) / 2) * Math.sin(angle),
                y: y + ((newHeight - prevHeight) / 2) * (Math.cos(angle) - 1),
            };
        case "south-side":
            return {
                x: x +
                    (prevWidth - newWidth) / 2 +
                    ((newHeight - prevHeight) / 2) * Math.sin(angle),
                y: y + ((prevHeight - newHeight) / 2) * (Math.cos(angle) + 1),
            };
    }
};
const resizeSingleElement = (nextWidth, nextHeight, latestElement, origElement, originalElementsMap, scene, handleDirection, { shouldInformMutation = true, shouldMaintainAspectRatio = false, shouldResizeFromCenter = false, } = {}) => {
    if ((0, typeChecks_1.isTextElement)(latestElement) && (0, typeChecks_1.isTextElement)(origElement)) {
        return (0, exports.resizeSingleTextElement)(origElement, latestElement, scene, handleDirection, shouldResizeFromCenter, nextWidth, nextHeight);
    }
    let boundTextFont = {};
    const elementsMap = scene.getNonDeletedElementsMap();
    const boundTextElement = (0, textElement_1.getBoundTextElement)(latestElement, elementsMap);
    if (boundTextElement) {
        const stateOfBoundTextElementAtResize = originalElementsMap.get(boundTextElement.id);
        if (stateOfBoundTextElementAtResize) {
            boundTextFont = {
                fontSize: stateOfBoundTextElementAtResize.fontSize,
            };
        }
        if (shouldMaintainAspectRatio) {
            const updatedElement = {
                ...latestElement,
                width: nextWidth,
                height: nextHeight,
            };
            const nextFont = (0, exports.measureFontSizeFromWidth)(boundTextElement, elementsMap, (0, textElement_1.getBoundTextMaxWidth)(updatedElement, boundTextElement));
            if (nextFont === null) {
                return;
            }
            boundTextFont = {
                fontSize: nextFont.size,
            };
        }
        else {
            const minWidth = (0, textMeasurements_1.getApproxMinLineWidth)((0, common_1.getFontString)(boundTextElement), boundTextElement.lineHeight);
            const minHeight = (0, textMeasurements_1.getApproxMinLineHeight)(boundTextElement.fontSize, boundTextElement.lineHeight);
            nextWidth = Math.max(nextWidth, minWidth);
            nextHeight = Math.max(nextHeight, minHeight);
        }
    }
    const rescaledPoints = (0, exports.rescalePointsInElement)(origElement, nextWidth, nextHeight, true);
    let previousOrigin = (0, math_1.pointFrom)(origElement.x, origElement.y);
    if ((0, typeChecks_1.isLinearElement)(origElement)) {
        const [x1, y1] = (0, bounds_1.getElementBounds)(origElement, originalElementsMap);
        previousOrigin = (0, math_1.pointFrom)(x1, y1);
    }
    const newOrigin = getResizedOrigin(previousOrigin, origElement.width, origElement.height, nextWidth, nextHeight, origElement.angle, handleDirection, shouldMaintainAspectRatio, shouldResizeFromCenter);
    if ((0, typeChecks_1.isLinearElement)(origElement) && rescaledPoints.points) {
        const offsetX = origElement.x - previousOrigin[0];
        const offsetY = origElement.y - previousOrigin[1];
        newOrigin.x += offsetX;
        newOrigin.y += offsetY;
        const scaledX = rescaledPoints.points[0][0];
        const scaledY = rescaledPoints.points[0][1];
        newOrigin.x += scaledX;
        newOrigin.y += scaledY;
        rescaledPoints.points = rescaledPoints.points.map((p) => (0, math_1.pointFrom)(p[0] - scaledX, p[1] - scaledY));
    }
    // flipping
    if (nextWidth < 0) {
        newOrigin.x = newOrigin.x + nextWidth;
    }
    if (nextHeight < 0) {
        newOrigin.y = newOrigin.y + nextHeight;
    }
    if ("scale" in latestElement && "scale" in origElement) {
        scene.mutateElement(latestElement, {
            scale: [
                // defaulting because scaleX/Y can be 0/-0
                (Math.sign(nextWidth) || origElement.scale[0]) * origElement.scale[0],
                (Math.sign(nextHeight) || origElement.scale[1]) * origElement.scale[1],
            ],
        });
    }
    if ((0, typeChecks_1.isArrowElement)(latestElement) &&
        boundTextElement &&
        shouldMaintainAspectRatio) {
        const fontSize = (nextWidth / latestElement.width) * boundTextElement.fontSize;
        if (fontSize < common_1.MIN_FONT_SIZE) {
            return;
        }
        boundTextFont.fontSize = fontSize;
    }
    if (nextWidth !== 0 &&
        nextHeight !== 0 &&
        Number.isFinite(newOrigin.x) &&
        Number.isFinite(newOrigin.y)) {
        let updates = {
            ...newOrigin,
            width: Math.abs(nextWidth),
            height: Math.abs(nextHeight),
            ...rescaledPoints,
        };
        if ((0, typeChecks_1.isBindingElement)(latestElement)) {
            if (latestElement.startBinding) {
                updates = {
                    ...updates,
                };
                if (latestElement.startBinding) {
                    (0, binding_1.unbindBindingElement)(latestElement, "start", scene);
                }
            }
            if (latestElement.endBinding) {
                updates = {
                    ...updates,
                    endBinding: null,
                };
            }
        }
        scene.mutateElement(latestElement, updates, {
            informMutation: shouldInformMutation,
            isDragging: false,
        });
        if (boundTextElement && boundTextFont != null) {
            scene.mutateElement(boundTextElement, {
                fontSize: boundTextFont.fontSize,
            });
        }
        (0, textElement_1.handleBindTextResize)(latestElement, scene, handleDirection, shouldMaintainAspectRatio);
        (0, binding_1.updateBoundElements)(latestElement, scene);
    }
};
exports.resizeSingleElement = resizeSingleElement;
const getNextSingleWidthAndHeightFromPointer = (latestElement, origElement, handleDirection, pointerX, pointerY, { shouldMaintainAspectRatio = false, shouldResizeFromCenter = false, } = {}) => {
    // Gets bounds corners
    const [x1, y1, x2, y2] = (0, bounds_1.getResizedElementAbsoluteCoords)(origElement, origElement.width, origElement.height, true);
    const startTopLeft = (0, math_1.pointFrom)(x1, y1);
    const startBottomRight = (0, math_1.pointFrom)(x2, y2);
    const startCenter = (0, math_1.pointCenter)(startTopLeft, startBottomRight);
    // Calculate new dimensions based on cursor position
    const rotatedPointer = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(pointerX, pointerY), startCenter, -origElement.angle);
    // Get bounds corners rendered on screen
    const [esx1, esy1, esx2, esy2] = (0, bounds_1.getResizedElementAbsoluteCoords)(latestElement, latestElement.width, latestElement.height, true);
    const boundsCurrentWidth = esx2 - esx1;
    const boundsCurrentHeight = esy2 - esy1;
    // It's important we set the initial scale value based on the width and height at resize start,
    // otherwise previous dimensions affected by modifiers will be taken into account.
    const atStartBoundsWidth = startBottomRight[0] - startTopLeft[0];
    const atStartBoundsHeight = startBottomRight[1] - startTopLeft[1];
    let scaleX = atStartBoundsWidth / boundsCurrentWidth;
    let scaleY = atStartBoundsHeight / boundsCurrentHeight;
    if (handleDirection.includes("e")) {
        scaleX = (rotatedPointer[0] - startTopLeft[0]) / boundsCurrentWidth;
    }
    if (handleDirection.includes("s")) {
        scaleY = (rotatedPointer[1] - startTopLeft[1]) / boundsCurrentHeight;
    }
    if (handleDirection.includes("w")) {
        scaleX = (startBottomRight[0] - rotatedPointer[0]) / boundsCurrentWidth;
    }
    if (handleDirection.includes("n")) {
        scaleY = (startBottomRight[1] - rotatedPointer[1]) / boundsCurrentHeight;
    }
    // We have to use dimensions of element on screen, otherwise the scaling of the
    // dimensions won't match the cursor for linear elements.
    let nextWidth = latestElement.width * scaleX;
    let nextHeight = latestElement.height * scaleY;
    if (shouldResizeFromCenter) {
        nextWidth = 2 * nextWidth - origElement.width;
        nextHeight = 2 * nextHeight - origElement.height;
    }
    // adjust dimensions to keep sides ratio
    if (shouldMaintainAspectRatio) {
        const widthRatio = Math.abs(nextWidth) / origElement.width;
        const heightRatio = Math.abs(nextHeight) / origElement.height;
        if (handleDirection.length === 1) {
            nextHeight *= widthRatio;
            nextWidth *= heightRatio;
        }
        if (handleDirection.length === 2) {
            const ratio = Math.max(widthRatio, heightRatio);
            nextWidth = origElement.width * ratio * Math.sign(nextWidth);
            nextHeight = origElement.height * ratio * Math.sign(nextHeight);
        }
    }
    return {
        nextWidth,
        nextHeight,
    };
};
const getNextMultipleWidthAndHeightFromPointer = (selectedElements, originalElementsMap, elementsMap, handleDirection, pointerX, pointerY, { shouldMaintainAspectRatio = false, shouldResizeFromCenter = false, } = {}) => {
    const originalElementsArray = selectedElements.map((el) => originalElementsMap.get(el.id));
    // getCommonBoundingBox() uses getBoundTextElement() which returns null for
    // original elements from pointerDownState, so we have to find and add these
    // bound text elements manually. Additionally, the coordinates of bound text
    // elements aren't always up to date.
    const boundTextElements = originalElementsArray.reduce((acc, orig) => {
        if (!(0, typeChecks_1.isLinearElement)(orig)) {
            return acc;
        }
        const textId = (0, textElement_1.getBoundTextElementId)(orig);
        if (!textId) {
            return acc;
        }
        const text = originalElementsMap.get(textId) ?? null;
        if (!(0, typeChecks_1.isBoundToContainer)(text)) {
            return acc;
        }
        return [
            ...acc,
            {
                ...text,
                ...linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(orig, text, elementsMap),
            },
        ];
    }, []);
    const originalBoundingBox = (0, bounds_1.getCommonBoundingBox)(originalElementsArray.map((orig) => orig).concat(boundTextElements));
    const { minX, minY, maxX, maxY, midX, midY } = originalBoundingBox;
    const width = maxX - minX;
    const height = maxY - minY;
    const anchorsMap = {
        ne: [minX, maxY],
        se: [minX, minY],
        sw: [maxX, minY],
        nw: [maxX, maxY],
        e: [minX, minY + height / 2],
        w: [maxX, minY + height / 2],
        n: [minX + width / 2, maxY],
        s: [minX + width / 2, minY],
    };
    // anchor point must be on the opposite side of the dragged selection handle
    // or be the center of the selection if shouldResizeFromCenter
    const [anchorX, anchorY] = shouldResizeFromCenter
        ? [midX, midY]
        : anchorsMap[handleDirection];
    const resizeFromCenterScale = shouldResizeFromCenter ? 2 : 1;
    const scale = Math.max(Math.abs(pointerX - anchorX) / width || 0, Math.abs(pointerY - anchorY) / height || 0) * resizeFromCenterScale;
    let nextWidth = handleDirection.includes("e") || handleDirection.includes("w")
        ? Math.abs(pointerX - anchorX) * resizeFromCenterScale
        : width;
    let nextHeight = handleDirection.includes("n") || handleDirection.includes("s")
        ? Math.abs(pointerY - anchorY) * resizeFromCenterScale
        : height;
    if (shouldMaintainAspectRatio) {
        nextWidth = width * scale * Math.sign(pointerX - anchorX);
        nextHeight = height * scale * Math.sign(pointerY - anchorY);
    }
    const flipConditionsMap = {
        ne: [pointerX < anchorX, pointerY > anchorY],
        se: [pointerX < anchorX, pointerY < anchorY],
        sw: [pointerX > anchorX, pointerY < anchorY],
        nw: [pointerX > anchorX, pointerY > anchorY],
        // e.g. when resizing from the "e" side, we do not need to consider changes in the `y` direction
        //      and therefore, we do not need to flip in the `y` direction at all
        e: [pointerX < anchorX, false],
        w: [pointerX > anchorX, false],
        n: [false, pointerY > anchorY],
        s: [false, pointerY < anchorY],
    };
    const [flipByX, flipByY] = flipConditionsMap[handleDirection].map((condition) => condition);
    return {
        originalBoundingBox,
        nextWidth,
        nextHeight,
        flipByX,
        flipByY,
    };
};
const resizeMultipleElements = (selectedElements, elementsMap, handleDirection, scene, originalElementsMap, { shouldMaintainAspectRatio = false, shouldResizeFromCenter = false, flipByX = false, flipByY = false, nextHeight, nextWidth, originalBoundingBox, } = {}) => {
    // in the case of just flipping, there is no need to specify the next width and height
    if (nextWidth === undefined &&
        nextHeight === undefined &&
        flipByX === undefined &&
        flipByY === undefined) {
        return;
    }
    // do not allow next width or height to be 0
    if (nextHeight === 0 || nextWidth === 0) {
        return;
    }
    if (!originalElementsMap) {
        originalElementsMap = elementsMap;
    }
    const targetElements = selectedElements.reduce((acc, element) => {
        const origElement = originalElementsMap.get(element.id);
        if (origElement) {
            acc.push({ orig: origElement, latest: element });
        }
        return acc;
    }, []);
    let boundingBox;
    if (originalBoundingBox) {
        boundingBox = originalBoundingBox;
    }
    else {
        const boundTextElements = targetElements.reduce((acc, { orig }) => {
            if (!(0, typeChecks_1.isLinearElement)(orig)) {
                return acc;
            }
            const textId = (0, textElement_1.getBoundTextElementId)(orig);
            if (!textId) {
                return acc;
            }
            const text = originalElementsMap.get(textId) ?? null;
            if (!(0, typeChecks_1.isBoundToContainer)(text)) {
                return acc;
            }
            return [
                ...acc,
                {
                    ...text,
                    ...linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(orig, text, elementsMap),
                },
            ];
        }, []);
        boundingBox = (0, bounds_1.getCommonBoundingBox)(targetElements.map(({ orig }) => orig).concat(boundTextElements));
    }
    const { minX, minY, maxX, maxY, midX, midY } = boundingBox;
    const width = maxX - minX;
    const height = maxY - minY;
    if (nextWidth === undefined && nextHeight === undefined) {
        nextWidth = width;
        nextHeight = height;
    }
    if (shouldMaintainAspectRatio) {
        if (nextWidth === undefined) {
            nextWidth = nextHeight * (width / height);
        }
        else if (nextHeight === undefined) {
            nextHeight = nextWidth * (height / width);
        }
        else if (Math.abs(nextWidth / nextHeight - width / height) > 0.001) {
            nextWidth = nextHeight * (width / height);
        }
    }
    if (nextWidth && nextHeight) {
        let scaleX = handleDirection.includes("e") || handleDirection.includes("w")
            ? Math.abs(nextWidth) / width
            : 1;
        let scaleY = handleDirection.includes("n") || handleDirection.includes("s")
            ? Math.abs(nextHeight) / height
            : 1;
        let scale;
        if (handleDirection.length === 1) {
            scale =
                handleDirection.includes("e") || handleDirection.includes("w")
                    ? scaleX
                    : scaleY;
        }
        else {
            scale = Math.max(Math.abs(nextWidth) / width || 0, Math.abs(nextHeight) / height || 0);
        }
        const anchorsMap = {
            ne: [minX, maxY],
            se: [minX, minY],
            sw: [maxX, minY],
            nw: [maxX, maxY],
            e: [minX, minY + height / 2],
            w: [maxX, minY + height / 2],
            n: [minX + width / 2, maxY],
            s: [minX + width / 2, minY],
        };
        // anchor point must be on the opposite side of the dragged selection handle
        // or be the center of the selection if shouldResizeFromCenter
        const [anchorX, anchorY] = shouldResizeFromCenter
            ? [midX, midY]
            : anchorsMap[handleDirection];
        const keepAspectRatio = shouldMaintainAspectRatio ||
            targetElements.some((item) => item.latest.angle !== 0 ||
                (0, typeChecks_1.isTextElement)(item.latest) ||
                (0, groups_1.isInGroup)(item.latest));
        if (keepAspectRatio) {
            scaleX = scale;
            scaleY = scale;
        }
        /**
         * to flip an element:
         * 1. determine over which axis is the element being flipped
         *    (could be x, y, or both) indicated by `flipFactorX` & `flipFactorY`
         * 2. shift element's position by the amount of width or height (or both) or
         *    mirror points in the case of linear & freedraw elemenets
         * 3. adjust element angle
         */
        const [flipFactorX, flipFactorY] = [flipByX ? -1 : 1, flipByY ? -1 : 1];
        const elementsAndUpdates = [];
        for (const { orig, latest } of targetElements) {
            // bounded text elements are updated along with their container elements
            if ((0, typeChecks_1.isTextElement)(orig) && (0, typeChecks_1.isBoundToContainer)(orig)) {
                continue;
            }
            const width = orig.width * scaleX;
            const height = orig.height * scaleY;
            const angle = (0, math_1.normalizeRadians)((orig.angle * flipFactorX * flipFactorY));
            const isLinearOrFreeDraw = (0, typeChecks_1.isLinearElement)(orig) || (0, typeChecks_1.isFreeDrawElement)(orig);
            const offsetX = orig.x - anchorX;
            const offsetY = orig.y - anchorY;
            const shiftX = flipByX && !isLinearOrFreeDraw ? width : 0;
            const shiftY = flipByY && !isLinearOrFreeDraw ? height : 0;
            const x = anchorX + flipFactorX * (offsetX * scaleX + shiftX);
            const y = anchorY + flipFactorY * (offsetY * scaleY + shiftY);
            const rescaledPoints = (0, exports.rescalePointsInElement)(orig, width * flipFactorX, height * flipFactorY, false);
            const update = {
                x,
                y,
                width,
                height,
                angle,
                ...rescaledPoints,
            };
            if ((0, typeChecks_1.isElbowArrow)(orig)) {
                // Mirror fixed point binding for elbow arrows
                // when resize goes into the negative direction
                if (orig.startBinding) {
                    update.startBinding = {
                        ...orig.startBinding,
                        fixedPoint: [
                            flipByX
                                ? -orig.startBinding.fixedPoint[0] + 1
                                : orig.startBinding.fixedPoint[0],
                            flipByY
                                ? -orig.startBinding.fixedPoint[1] + 1
                                : orig.startBinding.fixedPoint[1],
                        ],
                    };
                }
                if (orig.endBinding) {
                    update.endBinding = {
                        ...orig.endBinding,
                        fixedPoint: [
                            flipByX
                                ? -orig.endBinding.fixedPoint[0] + 1
                                : orig.endBinding.fixedPoint[0],
                            flipByY
                                ? -orig.endBinding.fixedPoint[1] + 1
                                : orig.endBinding.fixedPoint[1],
                        ],
                    };
                }
                if (orig.fixedSegments && rescaledPoints.points) {
                    update.fixedSegments = orig.fixedSegments.map((segment) => ({
                        ...segment,
                        start: rescaledPoints.points[segment.index - 1],
                        end: rescaledPoints.points[segment.index],
                    }));
                }
            }
            if ((0, typeChecks_1.isImageElement)(orig)) {
                update.scale = [
                    orig.scale[0] * flipFactorX,
                    orig.scale[1] * flipFactorY,
                ];
            }
            if ((0, typeChecks_1.isTextElement)(orig)) {
                const metrics = (0, exports.measureFontSizeFromWidth)(orig, elementsMap, width);
                if (!metrics) {
                    return;
                }
                update.fontSize = metrics.size;
            }
            const boundTextElement = originalElementsMap.get((0, textElement_1.getBoundTextElementId)(orig) ?? "");
            if (boundTextElement) {
                if (keepAspectRatio) {
                    const newFontSize = boundTextElement.fontSize * scale;
                    if (newFontSize < common_1.MIN_FONT_SIZE) {
                        return;
                    }
                    update.boundTextFontSize = newFontSize;
                }
                else {
                    update.boundTextFontSize = boundTextElement.fontSize;
                }
            }
            elementsAndUpdates.push({
                element: latest,
                update,
            });
        }
        const elementsToUpdate = elementsAndUpdates.map(({ element }) => element);
        const resizedElementsMap = new Map(elementsAndUpdates.map(({ element }) => [element.id, element]));
        for (const { element, update: { boundTextFontSize, ...update }, } of elementsAndUpdates) {
            const { angle } = update;
            scene.mutateElement(element, update);
            (0, binding_1.updateBoundElements)(element, scene, {
                simultaneouslyUpdated: elementsToUpdate,
            });
            if ((0, typeChecks_1.isBindingElement)(element)) {
                if (element.startBinding) {
                    if (!resizedElementsMap.has(element.startBinding.elementId)) {
                        (0, binding_1.unbindBindingElement)(element, "start", scene);
                    }
                }
                if (element.endBinding) {
                    if (!resizedElementsMap.has(element.endBinding.elementId)) {
                        (0, binding_1.unbindBindingElement)(element, "end", scene);
                    }
                }
            }
            const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
            if (boundTextElement && boundTextFontSize) {
                scene.mutateElement(boundTextElement, {
                    fontSize: boundTextFontSize,
                    angle: (0, typeChecks_1.isLinearElement)(element) ? undefined : angle,
                });
                (0, textElement_1.handleBindTextResize)(element, scene, handleDirection, true);
            }
        }
        scene.triggerUpdate();
    }
};
exports.resizeMultipleElements = resizeMultipleElements;
