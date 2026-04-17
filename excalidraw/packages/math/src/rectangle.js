"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rectangle = rectangle;
exports.rectangleFromNumberSequence = rectangleFromNumberSequence;
exports.rectangleIntersectLineSegment = rectangleIntersectLineSegment;
exports.rectangleIntersectRectangle = rectangleIntersectRectangle;
const point_1 = require("./point");
const segment_1 = require("./segment");
function rectangle(topLeft, bottomRight) {
    return [topLeft, bottomRight];
}
function rectangleFromNumberSequence(minX, minY, maxX, maxY) {
    return rectangle((0, point_1.pointFrom)(minX, minY), (0, point_1.pointFrom)(maxX, maxY));
}
function rectangleIntersectLineSegment(r, l) {
    return [
        (0, segment_1.lineSegment)(r[0], (0, point_1.pointFrom)(r[1][0], r[0][1])),
        (0, segment_1.lineSegment)((0, point_1.pointFrom)(r[1][0], r[0][1]), r[1]),
        (0, segment_1.lineSegment)(r[1], (0, point_1.pointFrom)(r[0][0], r[1][1])),
        (0, segment_1.lineSegment)((0, point_1.pointFrom)(r[0][0], r[1][1]), r[0]),
    ]
        .map((s) => (0, segment_1.lineSegmentIntersectionPoints)(l, s))
        .filter((i) => !!i);
}
function rectangleIntersectRectangle(rectangle1, rectangle2) {
    const [[minX1, minY1], [maxX1, maxY1]] = rectangle1;
    const [[minX2, minY2], [maxX2, maxY2]] = rectangle2;
    return minX1 < maxX2 && maxX1 > minX2 && minY1 < maxY2 && maxY1 > minY2;
}
