"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanceToLineSegment = exports.pointOnLineSegment = exports.segmentsIntersectAt = exports.lineSegmentRotate = exports.isLineSegment = void 0;
exports.lineSegment = lineSegment;
exports.lineSegmentIntersectionPoints = lineSegmentIntersectionPoints;
exports.lineSegmentsDistance = lineSegmentsDistance;
const line_1 = require("./line");
const point_1 = require("./point");
const utils_1 = require("./utils");
const vector_1 = require("./vector");
/**
 * Create a line segment from two points.
 *
 * @param points The two points delimiting the line segment on each end
 * @returns The line segment delineated by the points
 */
function lineSegment(a, b) {
    return [a, b];
}
/**
 *
 * @param segment
 * @returns
 */
const isLineSegment = (segment) => Array.isArray(segment) &&
    segment.length === 2 &&
    (0, point_1.isPoint)(segment[0]) &&
    (0, point_1.isPoint)(segment[1]);
exports.isLineSegment = isLineSegment;
/**
 * Return the coordinates resulting from rotating the given line about an origin by an angle in radians
 * note that when the origin is not given, the midpoint of the given line is used as the origin.
 *
 * @param l
 * @param angle
 * @param origin
 * @returns
 */
const lineSegmentRotate = (l, angle, origin) => {
    return lineSegment((0, point_1.pointRotateRads)(l[0], origin || (0, point_1.pointCenter)(l[0], l[1]), angle), (0, point_1.pointRotateRads)(l[1], origin || (0, point_1.pointCenter)(l[0], l[1]), angle));
};
exports.lineSegmentRotate = lineSegmentRotate;
/**
 * Calculates the point two line segments with a definite start and end point
 * intersect at.
 */
const segmentsIntersectAt = (a, b) => {
    const a0 = (0, vector_1.vectorFromPoint)(a[0]);
    const a1 = (0, vector_1.vectorFromPoint)(a[1]);
    const b0 = (0, vector_1.vectorFromPoint)(b[0]);
    const b1 = (0, vector_1.vectorFromPoint)(b[1]);
    const r = (0, vector_1.vectorSubtract)(a1, a0);
    const s = (0, vector_1.vectorSubtract)(b1, b0);
    const denominator = (0, vector_1.vectorCross)(r, s);
    if (denominator === 0) {
        return null;
    }
    const i = (0, vector_1.vectorSubtract)((0, vector_1.vectorFromPoint)(b[0]), (0, vector_1.vectorFromPoint)(a[0]));
    const u = (0, vector_1.vectorCross)(i, r) / denominator;
    const t = (0, vector_1.vectorCross)(i, s) / denominator;
    if (u === 0) {
        return null;
    }
    const p = (0, vector_1.vectorAdd)(a0, (0, vector_1.vectorScale)(r, t));
    if (t >= 0 && t < 1 && u >= 0 && u < 1) {
        return (0, point_1.pointFromVector)(p);
    }
    return null;
};
exports.segmentsIntersectAt = segmentsIntersectAt;
const pointOnLineSegment = (point, line, threshold = utils_1.PRECISION) => {
    const distance = (0, exports.distanceToLineSegment)(point, line);
    if (distance === 0) {
        return true;
    }
    return distance < threshold;
};
exports.pointOnLineSegment = pointOnLineSegment;
const distanceToLineSegment = (point, line) => {
    const [x, y] = point;
    const [[x1, y1], [x2, y2]] = line;
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) {
        param = dot / len_sq;
    }
    let xx;
    let yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    }
    else if (param > 1) {
        xx = x2;
        yy = y2;
    }
    else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};
exports.distanceToLineSegment = distanceToLineSegment;
/**
 * Returns the intersection point of a segment and a line
 *
 * @param l
 * @param s
 * @returns
 */
function lineSegmentIntersectionPoints(l, s, threshold) {
    const candidate = (0, line_1.linesIntersectAt)((0, line_1.line)(l[0], l[1]), (0, line_1.line)(s[0], s[1]));
    if (!candidate ||
        !(0, exports.pointOnLineSegment)(candidate, s, threshold) ||
        !(0, exports.pointOnLineSegment)(candidate, l, threshold)) {
        return null;
    }
    return candidate;
}
function lineSegmentsDistance(s1, s2) {
    if (lineSegmentIntersectionPoints(s1, s2)) {
        return 0;
    }
    return Math.min((0, exports.distanceToLineSegment)(s1[0], s2), (0, exports.distanceToLineSegment)(s1[1], s2), (0, exports.distanceToLineSegment)(s2[0], s1), (0, exports.distanceToLineSegment)(s2[1], s1));
}
