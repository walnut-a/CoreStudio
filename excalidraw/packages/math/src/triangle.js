"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triangleIncludesPoint = triangleIncludesPoint;
// Types
/**
 * Tests if a point lies inside a triangle. This function
 * will return FALSE if the point lies exactly on the sides
 * of the triangle.
 *
 * @param triangle The triangle to test the point for
 * @param p The point to test whether is in the triangle
 * @returns TRUE if the point is inside of the triangle
 */
function triangleIncludesPoint([a, b, c], p) {
    const triangleSign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
    const d1 = triangleSign(p, a, b);
    const d2 = triangleSign(p, b, c);
    const d3 = triangleSign(p, c, a);
    const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
    const has_pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(has_neg && has_pos);
}
