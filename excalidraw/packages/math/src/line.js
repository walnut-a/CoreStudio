"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.line = line;
exports.linesIntersectAt = linesIntersectAt;
const point_1 = require("./point");
/**
 * Create a line from two points.
 *
 * @param points The two points lying on the line
 * @returns The line on which the points lie
 */
function line(a, b) {
    return [a, b];
}
/**
 * Determines the intersection point (unless the lines are parallel) of two
 * lines
 *
 * @param a
 * @param b
 * @returns
 */
function linesIntersectAt(a, b) {
    const A1 = a[1][1] - a[0][1];
    const B1 = a[0][0] - a[1][0];
    const A2 = b[1][1] - b[0][1];
    const B2 = b[0][0] - b[1][0];
    const D = A1 * B2 - A2 * B1;
    if (D !== 0) {
        const C1 = A1 * a[0][0] + B1 * a[0][1];
        const C2 = A2 * b[0][0] + B2 * b[0][1];
        return (0, point_1.pointFrom)((C1 * B2 - C2 * B1) / D, (A1 * C2 - A2 * C1) / D);
    }
    return null;
}
