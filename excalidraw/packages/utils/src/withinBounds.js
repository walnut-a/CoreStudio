"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementsOverlappingBBox = exports.elementPartiallyOverlapsWithOrContainsBBox = exports.isElementInsideBBox = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const math_1 = require("@excalidraw/math");
/** @returns vertices relative to element's top-left [0,0] position  */
const getNonLinearElementRelativePoints = (element) => {
    if (element.type === "diamond") {
        return [
            (0, math_1.pointFrom)(element.width / 2, 0),
            (0, math_1.pointFrom)(element.width, element.height / 2),
            (0, math_1.pointFrom)(element.width / 2, element.height),
            (0, math_1.pointFrom)(0, element.height / 2),
        ];
    }
    return [
        (0, math_1.pointFrom)(0, 0),
        (0, math_1.pointFrom)(0 + element.width, 0),
        (0, math_1.pointFrom)(0 + element.width, element.height),
        (0, math_1.pointFrom)(0, element.height),
    ];
};
/** @returns vertices relative to element's top-left [0,0] position  */
const getElementRelativePoints = (element) => {
    if ((0, element_2.isLinearElement)(element) || (0, element_2.isFreeDrawElement)(element)) {
        return element.points;
    }
    return getNonLinearElementRelativePoints(element);
};
const getMinMaxPoints = (points) => {
    const ret = points.reduce((limits, [x, y]) => {
        limits.minY = Math.min(limits.minY, y);
        limits.minX = Math.min(limits.minX, x);
        limits.maxX = Math.max(limits.maxX, x);
        limits.maxY = Math.max(limits.maxY, y);
        return limits;
    }, {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        cx: 0,
        cy: 0,
    });
    ret.cx = (ret.maxX + ret.minX) / 2;
    ret.cy = (ret.maxY + ret.minY) / 2;
    return ret;
};
const getRotatedBBox = (element) => {
    const points = getElementRelativePoints(element);
    const { cx, cy } = getMinMaxPoints(points);
    const centerPoint = (0, math_1.pointFrom)(cx, cy);
    const rotatedPoints = points.map((p) => (0, math_1.pointRotateRads)(p, centerPoint, element.angle));
    const { minX, minY, maxX, maxY } = getMinMaxPoints(rotatedPoints);
    return [
        minX + element.x,
        minY + element.y,
        maxX + element.x,
        maxY + element.y,
    ];
};
const isElementInsideBBox = (element, bbox, eitherDirection = false) => {
    const elementBBox = getRotatedBBox(element);
    const elementInsideBbox = bbox[0] <= elementBBox[0] &&
        bbox[2] >= elementBBox[2] &&
        bbox[1] <= elementBBox[1] &&
        bbox[3] >= elementBBox[3];
    if (!eitherDirection) {
        return elementInsideBbox;
    }
    if (elementInsideBbox) {
        return true;
    }
    return (elementBBox[0] <= bbox[0] &&
        elementBBox[2] >= bbox[2] &&
        elementBBox[1] <= bbox[1] &&
        elementBBox[3] >= bbox[3]);
};
exports.isElementInsideBBox = isElementInsideBBox;
const elementPartiallyOverlapsWithOrContainsBBox = (element, bbox) => {
    const elementBBox = getRotatedBBox(element);
    return (((0, math_1.rangeIncludesValue)(elementBBox[0], (0, math_1.rangeInclusive)(bbox[0], bbox[2])) ||
        (0, math_1.rangeIncludesValue)(bbox[0], (0, math_1.rangeInclusive)(elementBBox[0], elementBBox[2]))) &&
        ((0, math_1.rangeIncludesValue)(elementBBox[1], (0, math_1.rangeInclusive)(bbox[1], bbox[3])) ||
            (0, math_1.rangeIncludesValue)(bbox[1], (0, math_1.rangeInclusive)(elementBBox[1], elementBBox[3]))));
};
exports.elementPartiallyOverlapsWithOrContainsBBox = elementPartiallyOverlapsWithOrContainsBBox;
const elementsOverlappingBBox = ({ elements, bounds, type, errorMargin = 0, }) => {
    if ((0, element_2.isExcalidrawElement)(bounds)) {
        bounds = (0, element_1.getElementBounds)(bounds, (0, common_1.arrayToMap)(elements));
    }
    const adjustedBBox = [
        bounds[0] - errorMargin,
        bounds[1] - errorMargin,
        bounds[2] + errorMargin,
        bounds[3] + errorMargin,
    ];
    const includedElementSet = new Set();
    for (const element of elements) {
        if (includedElementSet.has(element.id)) {
            continue;
        }
        const isOverlaping = type === "overlap"
            ? (0, exports.elementPartiallyOverlapsWithOrContainsBBox)(element, adjustedBBox)
            : type === "inside"
                ? (0, exports.isElementInsideBBox)(element, adjustedBBox)
                : (0, exports.isElementInsideBBox)(element, adjustedBBox, true);
        if (isOverlaping) {
            includedElementSet.add(element.id);
            if (element.boundElements) {
                for (const boundElement of element.boundElements) {
                    includedElementSet.add(boundElement.id);
                }
            }
            if ((0, element_2.isTextElement)(element) && element.containerId) {
                includedElementSet.add(element.containerId);
            }
            if ((0, element_2.isArrowElement)(element)) {
                if (element.startBinding) {
                    includedElementSet.add(element.startBinding.elementId);
                }
                if (element.endBinding) {
                    includedElementSet.add(element.endBinding?.elementId);
                }
            }
        }
    }
    return elements.filter((element) => includedElementSet.has(element.id));
};
exports.elementsOverlappingBBox = elementsOverlappingBBox;
