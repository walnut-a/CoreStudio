"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canBecomePolygon = exports.isValidPolygon = exports.getLinearElementSubType = exports.getDefaultRoundnessTypeForElement = exports.canApplyRoundnessTypeToElement = exports.isUsingProportionalRadius = exports.isUsingAdaptiveRadius = exports.isArrowBoundToElement = exports.isBoundToContainer = exports.hasBoundTextElement = exports.isFlowchartNodeElement = exports.isExcalidrawElement = exports.isTextBindableContainer = exports.isRectangularElement = exports.isRectanguloidElement = exports.isBindableElement = exports.isBindingElementType = exports.isBindingElement = exports.isLinearElementType = exports.isCurvedArrow = exports.isSharpArrow = exports.isSimpleArrow = exports.isElbowArrow = exports.isArrowElement = exports.isLineElement = exports.isLinearElement = exports.isFreeDrawElementType = exports.isFreeDrawElement = exports.isFrameLikeElement = exports.isMagicFrameElement = exports.isFrameElement = exports.isTextElement = exports.isIframeLikeElement = exports.isIframeElement = exports.isEmbeddableElement = exports.isImageElement = exports.isInitializedImageElement = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const isInitializedImageElement = (element) => {
    return !!element && element.type === "image" && !!element.fileId;
};
exports.isInitializedImageElement = isInitializedImageElement;
const isImageElement = (element) => {
    return !!element && element.type === "image";
};
exports.isImageElement = isImageElement;
const isEmbeddableElement = (element) => {
    return !!element && element.type === "embeddable";
};
exports.isEmbeddableElement = isEmbeddableElement;
const isIframeElement = (element) => {
    return !!element && element.type === "iframe";
};
exports.isIframeElement = isIframeElement;
const isIframeLikeElement = (element) => {
    return (!!element && (element.type === "iframe" || element.type === "embeddable"));
};
exports.isIframeLikeElement = isIframeLikeElement;
const isTextElement = (element) => {
    return element != null && element.type === "text";
};
exports.isTextElement = isTextElement;
const isFrameElement = (element) => {
    return element != null && element.type === "frame";
};
exports.isFrameElement = isFrameElement;
const isMagicFrameElement = (element) => {
    return element != null && element.type === "magicframe";
};
exports.isMagicFrameElement = isMagicFrameElement;
const isFrameLikeElement = (element) => {
    return (element != null &&
        (element.type === "frame" || element.type === "magicframe"));
};
exports.isFrameLikeElement = isFrameLikeElement;
const isFreeDrawElement = (element) => {
    return element != null && (0, exports.isFreeDrawElementType)(element.type);
};
exports.isFreeDrawElement = isFreeDrawElement;
const isFreeDrawElementType = (elementType) => {
    return elementType === "freedraw";
};
exports.isFreeDrawElementType = isFreeDrawElementType;
const isLinearElement = (element) => {
    return element != null && (0, exports.isLinearElementType)(element.type);
};
exports.isLinearElement = isLinearElement;
const isLineElement = (element) => {
    return element != null && element.type === "line";
};
exports.isLineElement = isLineElement;
const isArrowElement = (element) => {
    return element != null && element.type === "arrow";
};
exports.isArrowElement = isArrowElement;
const isElbowArrow = (element) => {
    return (0, exports.isArrowElement)(element) && element.elbowed;
};
exports.isElbowArrow = isElbowArrow;
/**
 * sharp or curved arrow, but not elbow
 */
const isSimpleArrow = (element) => {
    return (0, exports.isArrowElement)(element) && !element.elbowed;
};
exports.isSimpleArrow = isSimpleArrow;
const isSharpArrow = (element) => {
    return (0, exports.isArrowElement)(element) && !element.elbowed && !element.roundness;
};
exports.isSharpArrow = isSharpArrow;
const isCurvedArrow = (element) => {
    return ((0, exports.isArrowElement)(element) && !element.elbowed && element.roundness !== null);
};
exports.isCurvedArrow = isCurvedArrow;
const isLinearElementType = (elementType) => {
    return (elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
    );
};
exports.isLinearElementType = isLinearElementType;
const isBindingElement = (element, includeLocked = true) => {
    return (element != null &&
        (!element.locked || includeLocked === true) &&
        (0, exports.isBindingElementType)(element.type));
};
exports.isBindingElement = isBindingElement;
const isBindingElementType = (elementType) => {
    return elementType === "arrow";
};
exports.isBindingElementType = isBindingElementType;
const isBindableElement = (element, includeLocked = true) => {
    return (element != null &&
        (!element.locked || includeLocked === true) &&
        (element.type === "rectangle" ||
            element.type === "diamond" ||
            element.type === "ellipse" ||
            element.type === "image" ||
            element.type === "iframe" ||
            element.type === "embeddable" ||
            element.type === "frame" ||
            element.type === "magicframe" ||
            (element.type === "text" && !element.containerId)));
};
exports.isBindableElement = isBindableElement;
const isRectanguloidElement = (element) => {
    return (element != null &&
        (element.type === "rectangle" ||
            element.type === "diamond" ||
            element.type === "image" ||
            element.type === "iframe" ||
            element.type === "embeddable" ||
            element.type === "frame" ||
            element.type === "magicframe" ||
            (element.type === "text" && !element.containerId)));
};
exports.isRectanguloidElement = isRectanguloidElement;
// TODO: Remove this when proper distance calculation is introduced
// @see binding.ts:distanceToBindableElement()
const isRectangularElement = (element) => {
    return (element != null &&
        (element.type === "rectangle" ||
            element.type === "image" ||
            element.type === "text" ||
            element.type === "iframe" ||
            element.type === "embeddable" ||
            element.type === "frame" ||
            element.type === "magicframe" ||
            element.type === "freedraw"));
};
exports.isRectangularElement = isRectangularElement;
const isTextBindableContainer = (element, includeLocked = true) => {
    return (element != null &&
        (!element.locked || includeLocked === true) &&
        (element.type === "rectangle" ||
            element.type === "diamond" ||
            element.type === "ellipse" ||
            (0, exports.isArrowElement)(element)));
};
exports.isTextBindableContainer = isTextBindableContainer;
const isExcalidrawElement = (element) => {
    const type = element?.type;
    if (!type) {
        return false;
    }
    switch (type) {
        case "text":
        case "diamond":
        case "rectangle":
        case "iframe":
        case "embeddable":
        case "ellipse":
        case "arrow":
        case "freedraw":
        case "line":
        case "frame":
        case "magicframe":
        case "image":
        case "selection": {
            return true;
        }
        default: {
            (0, common_1.assertNever)(type, null);
            return false;
        }
    }
};
exports.isExcalidrawElement = isExcalidrawElement;
const isFlowchartNodeElement = (element) => {
    return (element.type === "rectangle" ||
        element.type === "ellipse" ||
        element.type === "diamond");
};
exports.isFlowchartNodeElement = isFlowchartNodeElement;
const hasBoundTextElement = (element) => {
    return ((0, exports.isTextBindableContainer)(element) &&
        !!element.boundElements?.some(({ type }) => type === "text"));
};
exports.hasBoundTextElement = hasBoundTextElement;
const isBoundToContainer = (element) => {
    return (element !== null &&
        "containerId" in element &&
        element.containerId !== null &&
        (0, exports.isTextElement)(element));
};
exports.isBoundToContainer = isBoundToContainer;
const isArrowBoundToElement = (element) => {
    return !!element.startBinding || !!element.endBinding;
};
exports.isArrowBoundToElement = isArrowBoundToElement;
const isUsingAdaptiveRadius = (type) => type === "rectangle" ||
    type === "embeddable" ||
    type === "iframe" ||
    type === "image";
exports.isUsingAdaptiveRadius = isUsingAdaptiveRadius;
const isUsingProportionalRadius = (type) => type === "line" || type === "arrow" || type === "diamond";
exports.isUsingProportionalRadius = isUsingProportionalRadius;
const canApplyRoundnessTypeToElement = (roundnessType, element) => {
    if ((roundnessType === common_1.ROUNDNESS.ADAPTIVE_RADIUS ||
        // if legacy roundness, it can be applied to elements that currently
        // use adaptive radius
        roundnessType === common_1.ROUNDNESS.LEGACY) &&
        (0, exports.isUsingAdaptiveRadius)(element.type)) {
        return true;
    }
    if (roundnessType === common_1.ROUNDNESS.PROPORTIONAL_RADIUS &&
        (0, exports.isUsingProportionalRadius)(element.type)) {
        return true;
    }
    return false;
};
exports.canApplyRoundnessTypeToElement = canApplyRoundnessTypeToElement;
const getDefaultRoundnessTypeForElement = (element) => {
    if ((0, exports.isUsingProportionalRadius)(element.type)) {
        return {
            type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
        };
    }
    if ((0, exports.isUsingAdaptiveRadius)(element.type)) {
        return {
            type: common_1.ROUNDNESS.ADAPTIVE_RADIUS,
        };
    }
    return null;
};
exports.getDefaultRoundnessTypeForElement = getDefaultRoundnessTypeForElement;
const getLinearElementSubType = (element) => {
    if ((0, exports.isSharpArrow)(element)) {
        return "sharpArrow";
    }
    if ((0, exports.isCurvedArrow)(element)) {
        return "curvedArrow";
    }
    if ((0, exports.isElbowArrow)(element)) {
        return "elbowArrow";
    }
    return "line";
};
exports.getLinearElementSubType = getLinearElementSubType;
/**
 * Checks if current element points meet all the conditions for polygon=true
 * (this isn't a element type check, for that use isLineElement).
 *
 * If you want to check if points *can* be turned into a polygon, use
 *  canBecomePolygon(points).
 */
const isValidPolygon = (points) => {
    return points.length > 3 && (0, math_1.pointsEqual)(points[0], points[points.length - 1]);
};
exports.isValidPolygon = isValidPolygon;
const canBecomePolygon = (points) => {
    return (points.length > 3 ||
        // 3-point polygons can't have all points in a single line
        (points.length === 3 && !(0, math_1.pointsEqual)(points[0], points[points.length - 1])));
};
exports.canBecomePolygon = canBecomePolygon;
