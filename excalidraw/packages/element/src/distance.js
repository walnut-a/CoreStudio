"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanceToElement = void 0;
const math_1 = require("@excalidraw/math");
const ellipse_1 = require("@excalidraw/math/ellipse");
const utils_1 = require("./utils");
const bounds_1 = require("./bounds");
const distanceToElement = (element, elementsMap, p) => {
    switch (element.type) {
        case "selection":
        case "rectangle":
        case "image":
        case "text":
        case "iframe":
        case "embeddable":
        case "frame":
        case "magicframe":
            return distanceToRectanguloidElement(element, elementsMap, p);
        case "diamond":
            return distanceToDiamondElement(element, elementsMap, p);
        case "ellipse":
            return distanceToEllipseElement(element, elementsMap, p);
        case "line":
        case "arrow":
        case "freedraw":
            return distanceToLinearOrFreeDraElement(element, elementsMap, p);
    }
};
exports.distanceToElement = distanceToElement;
/**
 * Returns the distance of a point and the provided rectangular-shaped element,
 * accounting for roundness and rotation
 *
 * @param element The rectanguloid element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the rectanguloid element
 */
const distanceToRectanguloidElement = (element, elementsMap, p) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    // To emulate a rotated rectangle we rotate the point in the inverse angle
    // instead. It's all the same distance-wise.
    const rotatedPoint = (0, math_1.pointRotateRads)(p, center, -element.angle);
    // Get the element's building components we can test against
    const [sides, corners] = (0, utils_1.deconstructRectanguloidElement)(element);
    return Math.min(...sides.map((s) => (0, math_1.distanceToLineSegment)(rotatedPoint, s)), ...corners
        .map((a) => (0, math_1.curvePointDistance)(a, rotatedPoint))
        .filter((d) => d !== null));
};
/**
 * Returns the distance of a point and the provided diamond element, accounting
 * for roundness and rotation
 *
 * @param element The diamond element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the diamond
 */
const distanceToDiamondElement = (element, elementsMap, p) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    // Rotate the point to the inverse direction to simulate the rotated diamond
    // points. It's all the same distance-wise.
    const rotatedPoint = (0, math_1.pointRotateRads)(p, center, -element.angle);
    const [sides, curves] = (0, utils_1.deconstructDiamondElement)(element);
    return Math.min(...sides.map((s) => (0, math_1.distanceToLineSegment)(rotatedPoint, s)), ...curves
        .map((a) => (0, math_1.curvePointDistance)(a, rotatedPoint))
        .filter((d) => d !== null));
};
/**
 * Returns the distance of a point and the provided ellipse element, accounting
 * for roundness and rotation
 *
 * @param element The ellipse element
 * @param p The point to consider
 * @returns The eucledian distance to the outline of the ellipse
 */
const distanceToEllipseElement = (element, elementsMap, p) => {
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    return (0, ellipse_1.ellipseDistanceFromPoint)(
    // Instead of rotating the ellipse, rotate the point to the inverse angle
    (0, math_1.pointRotateRads)(p, center, -element.angle), (0, ellipse_1.ellipse)(center, element.width / 2, element.height / 2));
};
const distanceToLinearOrFreeDraElement = (element, elementsMap, p) => {
    const [lines, curves] = (0, utils_1.deconstructLinearOrFreeDrawElement)(element, elementsMap);
    return Math.min(...lines.map((s) => (0, math_1.distanceToLineSegment)(p, s)), ...curves.map((a) => (0, math_1.curvePointDistance)(a, p)));
};
