"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDistance = exports.getCenter = void 0;
const getCenter = (pointers) => {
    const allCoords = Array.from(pointers.values());
    return {
        x: sum(allCoords, (coords) => coords.x) / allCoords.length,
        y: sum(allCoords, (coords) => coords.y) / allCoords.length,
    };
};
exports.getCenter = getCenter;
const getDistance = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
exports.getDistance = getDistance;
const sum = (array, mapper) => array.reduce((acc, item) => acc + mapper(item), 0);
