"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flipHeading = exports.headingForPointFromElement = exports.headingIsVertical = exports.headingIsHorizontal = exports.compareHeading = exports.headingForPointIsHorizontal = exports.headingForPoint = exports.vectorToHeading = exports.HEADING_UP = exports.HEADING_LEFT = exports.HEADING_DOWN = exports.HEADING_RIGHT = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
exports.HEADING_RIGHT = [1, 0];
exports.HEADING_DOWN = [0, 1];
exports.HEADING_LEFT = [-1, 0];
exports.HEADING_UP = [0, -1];
const vectorToHeading = (vec) => {
    const [x, y] = vec;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    if (x > absY) {
        return exports.HEADING_RIGHT;
    }
    else if (x <= -absY) {
        return exports.HEADING_LEFT;
    }
    else if (y > absX) {
        return exports.HEADING_DOWN;
    }
    return exports.HEADING_UP;
};
exports.vectorToHeading = vectorToHeading;
const headingForPoint = (p, o) => (0, exports.vectorToHeading)((0, math_1.vectorFromPoint)(p, o));
exports.headingForPoint = headingForPoint;
const headingForPointIsHorizontal = (p, o) => (0, exports.headingIsHorizontal)((0, exports.headingForPoint)(p, o));
exports.headingForPointIsHorizontal = headingForPointIsHorizontal;
const compareHeading = (a, b) => a[0] === b[0] && a[1] === b[1];
exports.compareHeading = compareHeading;
const headingIsHorizontal = (a) => (0, exports.compareHeading)(a, exports.HEADING_RIGHT) || (0, exports.compareHeading)(a, exports.HEADING_LEFT);
exports.headingIsHorizontal = headingIsHorizontal;
const headingIsVertical = (a) => !(0, exports.headingIsHorizontal)(a);
exports.headingIsVertical = headingIsVertical;
const headingForPointFromDiamondElement = (element, aabb, point) => {
    const midPoint = (0, bounds_1.getCenterForBounds)(aabb);
    if ((0, common_1.isDevEnv)() || (0, common_1.isTestEnv)()) {
        (0, common_1.invariant)(element.width > 0 && element.height > 0, "Diamond element has no width or height");
        (0, common_1.invariant)(!(0, math_1.pointsEqual)(midPoint, point), "The point is too close to the element mid point to determine heading");
    }
    const SHRINK = 0.95; // Rounded elements tolerance
    const top = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y), midPoint, element.angle), midPoint), SHRINK), midPoint);
    const right = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width, element.y + element.height / 2), midPoint, element.angle), midPoint), SHRINK), midPoint);
    const bottom = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width / 2, element.y + element.height), midPoint, element.angle), midPoint), SHRINK), midPoint);
    const left = (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x, element.y + element.height / 2), midPoint, element.angle), midPoint), SHRINK), midPoint);
    // Corners
    if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, top), (0, math_1.vectorFromPoint)(top, right)) <=
        0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, top), (0, math_1.vectorFromPoint)(top, left)) > 0) {
        return (0, exports.headingForPoint)(top, midPoint);
    }
    else if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, right), (0, math_1.vectorFromPoint)(right, bottom)) <= 0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, right), (0, math_1.vectorFromPoint)(right, top)) > 0) {
        return (0, exports.headingForPoint)(right, midPoint);
    }
    else if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, bottom), (0, math_1.vectorFromPoint)(bottom, left)) <= 0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, bottom), (0, math_1.vectorFromPoint)(bottom, right)) > 0) {
        return (0, exports.headingForPoint)(bottom, midPoint);
    }
    else if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, left), (0, math_1.vectorFromPoint)(left, top)) <=
        0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, left), (0, math_1.vectorFromPoint)(left, bottom)) > 0) {
        return (0, exports.headingForPoint)(left, midPoint);
    }
    // Sides
    if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(top, midPoint)) <= 0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(right, midPoint)) > 0) {
        const p = element.width > element.height ? top : right;
        return (0, exports.headingForPoint)(p, midPoint);
    }
    else if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(right, midPoint)) <= 0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(bottom, midPoint)) > 0) {
        const p = element.width > element.height ? bottom : right;
        return (0, exports.headingForPoint)(p, midPoint);
    }
    else if ((0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(bottom, midPoint)) <= 0 &&
        (0, math_1.vectorCross)((0, math_1.vectorFromPoint)(point, midPoint), (0, math_1.vectorFromPoint)(left, midPoint)) > 0) {
        const p = element.width > element.height ? bottom : left;
        return (0, exports.headingForPoint)(p, midPoint);
    }
    const p = element.width > element.height ? top : left;
    return (0, exports.headingForPoint)(p, midPoint);
};
// Gets the heading for the point by creating a bounding box around the rotated
// close fitting bounding box, then creating 4 search cones around the center of
// the external bbox.
const headingForPointFromElement = (element, aabb, p) => {
    const SEARCH_CONE_MULTIPLIER = 2;
    const midPoint = (0, bounds_1.getCenterForBounds)(aabb);
    if (element.type === "diamond") {
        return headingForPointFromDiamondElement(element, aabb, p);
    }
    const topLeft = (0, math_1.pointScaleFromOrigin)((0, math_1.pointFrom)(aabb[0], aabb[1]), midPoint, SEARCH_CONE_MULTIPLIER);
    const topRight = (0, math_1.pointScaleFromOrigin)((0, math_1.pointFrom)(aabb[2], aabb[1]), midPoint, SEARCH_CONE_MULTIPLIER);
    const bottomLeft = (0, math_1.pointScaleFromOrigin)((0, math_1.pointFrom)(aabb[0], aabb[3]), midPoint, SEARCH_CONE_MULTIPLIER);
    const bottomRight = (0, math_1.pointScaleFromOrigin)((0, math_1.pointFrom)(aabb[2], aabb[3]), midPoint, SEARCH_CONE_MULTIPLIER);
    return (0, math_1.triangleIncludesPoint)([topLeft, topRight, midPoint], p)
        ? exports.HEADING_UP
        : (0, math_1.triangleIncludesPoint)([topRight, bottomRight, midPoint], p)
            ? exports.HEADING_RIGHT
            : (0, math_1.triangleIncludesPoint)([bottomRight, bottomLeft, midPoint], p)
                ? exports.HEADING_DOWN
                : exports.HEADING_LEFT;
};
exports.headingForPointFromElement = headingForPointFromElement;
const flipHeading = (h) => [
    h[0] === 0 ? 0 : h[0] > 0 ? -1 : 1,
    h[1] === 0 ? 0 : h[1] > 0 ? -1 : 1,
];
exports.flipHeading = flipHeading;
