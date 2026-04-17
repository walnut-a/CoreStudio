"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBBox = getBBox;
exports.doBBoxesIntersect = doBBoxesIntersect;
exports.isPointOnLine = isPointOnLine;
exports.isPointRightOfLine = isPointRightOfLine;
exports.isLineSegmentTouchingOrCrossingLine = isLineSegmentTouchingOrCrossingLine;
exports.doLineSegmentsIntersect = doLineSegmentsIntersect;
const math_1 = require("@excalidraw/math");
function getBBox(line) {
    return [
        Math.min(line[0][0], line[1][0]),
        Math.min(line[0][1], line[1][1]),
        Math.max(line[0][0], line[1][0]),
        Math.max(line[0][1], line[1][1]),
    ];
}
function doBBoxesIntersect(a, b) {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
const EPSILON = 0.000001;
function isPointOnLine(l, p) {
    const p1 = (0, math_1.vectorFromPoint)(l[1], l[0]);
    const p2 = (0, math_1.vectorFromPoint)(p, l[0]);
    const r = (0, math_1.vectorCross)(p1, p2);
    return Math.abs(r) < EPSILON;
}
function isPointRightOfLine(l, p) {
    const p1 = (0, math_1.vectorFromPoint)(l[1], l[0]);
    const p2 = (0, math_1.vectorFromPoint)(p, l[0]);
    return (0, math_1.vectorCross)(p1, p2) < 0;
}
function isLineSegmentTouchingOrCrossingLine(a, b) {
    return (isPointOnLine(a, b[0]) ||
        isPointOnLine(a, b[1]) ||
        (isPointRightOfLine(a, b[0])
            ? !isPointRightOfLine(a, b[1])
            : isPointRightOfLine(a, b[1])));
}
// https://martin-thoma.com/how-to-check-if-two-line-segments-intersect/
function doLineSegmentsIntersect(a, b) {
    return (doBBoxesIntersect(getBBox(a), getBBox(b)) &&
        isLineSegmentTouchingOrCrossingLine(a, b) &&
        isLineSegmentTouchingOrCrossingLine(b, a));
}
