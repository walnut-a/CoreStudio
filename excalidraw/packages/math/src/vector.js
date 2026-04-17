"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorNormal = exports.vectorNormalize = void 0;
exports.vector = vector;
exports.vectorFromPoint = vectorFromPoint;
exports.vectorCross = vectorCross;
exports.vectorDot = vectorDot;
exports.isVector = isVector;
exports.vectorAdd = vectorAdd;
exports.vectorSubtract = vectorSubtract;
exports.vectorScale = vectorScale;
exports.vectorMagnitudeSq = vectorMagnitudeSq;
exports.vectorMagnitude = vectorMagnitude;
/**
 * Create a vector from the x and y coordiante elements.
 *
 * @param x The X aspect of the vector
 * @param y T Y aspect of the vector
 * @returns The constructed vector with X and Y as the coordinates
 */
function vector(x, y, originX = 0, originY = 0) {
    return [x - originX, y - originY];
}
/**
 * Turn a point into a vector with the origin point.
 *
 * @param p The point to turn into a vector
 * @param origin The origin point in a given coordiante system
 * @param threshold The threshold to consider the vector as 'undefined'
 * @param defaultValue The default value to return if the vector is 'undefined'
 * @returns The created vector from the point and the origin or default
 */
function vectorFromPoint(p, origin = [0, 0], threshold, defaultValue = [0, 1]) {
    const vec = vector(p[0] - origin[0], p[1] - origin[1]);
    if (threshold && vectorMagnitudeSq(vec) < threshold * threshold) {
        return defaultValue;
    }
    return vec;
}
/**
 * Cross product is a binary operation on two vectors in 2D space.
 * It results in a vector that is perpendicular to both vectors.
 *
 * @param a One of the vectors to use for the directed area calculation
 * @param b The other vector to use for the directed area calculation
 * @returns The directed area value for the two vectos
 */
function vectorCross(a, b) {
    return a[0] * b[1] - b[0] * a[1];
}
/**
 * Dot product is defined as the sum of the products of the
 * two vectors.
 *
 * @param a One of the vectors for which the sum of products is calculated
 * @param b The other vector for which the sum of products is calculated
 * @returns The sum of products of the two vectors
 */
function vectorDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
}
/**
 * Determines if the value has the shape of a Vector.
 *
 * @param v The value to test
 * @returns TRUE if the value has the shape and components of a Vectors
 */
function isVector(v) {
    return (Array.isArray(v) &&
        v.length === 2 &&
        typeof v[0] === "number" &&
        !isNaN(v[0]) &&
        typeof v[1] === "number" &&
        !isNaN(v[1]));
}
/**
 * Add two vectors by adding their coordinates.
 *
 * @param a One of the vectors to add
 * @param b The other vector to add
 * @returns The sum vector of the two provided vectors
 */
function vectorAdd(a, b) {
    return [a[0] + b[0], a[1] + b[1]];
}
/**
 * Add two vectors by adding their coordinates.
 *
 * @param start One of the vectors to add
 * @param end The other vector to add
 * @returns The sum vector of the two provided vectors
 */
function vectorSubtract(start, end) {
    return [start[0] - end[0], start[1] - end[1]];
}
/**
 * Scale vector by a scalar.
 *
 * @param v The vector to scale
 * @param scalar The scalar to multiply the vector components with
 * @returns The new scaled vector
 */
function vectorScale(v, scalar) {
    return vector(v[0] * scalar, v[1] * scalar);
}
/**
 * Calculates the sqare magnitude of a vector. Use this if you compare
 * magnitudes as it saves you an SQRT.
 *
 * @param v The vector to measure
 * @returns The scalar squared magnitude of the vector
 */
function vectorMagnitudeSq(v) {
    return v[0] * v[0] + v[1] * v[1];
}
/**
 * Calculates the magnitude of a vector.
 *
 * @param v The vector to measure
 * @returns The scalar magnitude of the vector
 */
function vectorMagnitude(v) {
    return Math.sqrt(vectorMagnitudeSq(v));
}
/**
 * Normalize the vector (i.e. make the vector magnitue equal 1).
 *
 * @param v The vector to normalize
 * @returns The new normalized vector
 */
const vectorNormalize = (v) => {
    const m = vectorMagnitude(v);
    if (m === 0) {
        return vector(0, 0);
    }
    return vector(v[0] / m, v[1] / m);
};
exports.vectorNormalize = vectorNormalize;
/**
 * Calculate the right-hand normal of the vector.
 */
const vectorNormal = (v) => vector(v[1], -v[0]);
exports.vectorNormal = vectorNormal;
