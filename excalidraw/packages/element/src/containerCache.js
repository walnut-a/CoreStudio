"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOriginalContainerHeightFromCache = exports.resetOriginalContainerCache = exports.updateOriginalContainerCache = exports.originalContainerCache = void 0;
exports.originalContainerCache = {};
const updateOriginalContainerCache = (id, height) => {
    const data = exports.originalContainerCache[id] || (exports.originalContainerCache[id] = { height });
    data.height = height;
    return data;
};
exports.updateOriginalContainerCache = updateOriginalContainerCache;
const resetOriginalContainerCache = (id) => {
    if (exports.originalContainerCache[id]) {
        delete exports.originalContainerCache[id];
    }
};
exports.resetOriginalContainerCache = resetOriginalContainerCache;
const getOriginalContainerHeightFromCache = (id) => {
    return exports.originalContainerCache[id]?.height ?? null;
};
exports.getOriginalContainerHeightFromCache = getOriginalContainerHeightFromCache;
