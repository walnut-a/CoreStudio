"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bumpVersion = exports.newElementWith = exports.mutateElement = void 0;
const common_1 = require("@excalidraw/common");
const shape_1 = require("./shape");
const elbowArrow_1 = require("./elbowArrow");
const typeChecks_1 = require("./typeChecks");
/**
 * This function tracks updates of text elements for the purposes for collaboration.
 * The version is used to compare updates when more than one user is working in
 * the same drawing.
 *
 * WARNING: this won't trigger the component to update, so if you need to trigger component update,
 * use `scene.mutateElement` or `ExcalidrawImperativeAPI.mutateElement` instead.
 */
const mutateElement = (element, elementsMap, updates, options) => {
    let didChange = false;
    // casting to any because can't use `in` operator
    // (see https://github.com/microsoft/TypeScript/issues/21732)
    const { points, fixedSegments, fileId } = updates;
    if ((0, typeChecks_1.isElbowArrow)(element) &&
        (Object.keys(updates).length === 0 || // normalization case
            typeof points !== "undefined" || // repositioning
            typeof fixedSegments !== "undefined") // segment fixing
    ) {
        updates = {
            ...updates,
            angle: 0,
            ...(0, elbowArrow_1.updateElbowArrowPoints)({
                ...element,
                x: updates.x || element.x,
                y: updates.y || element.y,
            }, elementsMap, updates, options),
        };
    }
    else if (typeof points !== "undefined") {
        updates = { ...(0, common_1.getSizeFromPoints)(points), ...updates };
    }
    for (const key in updates) {
        const value = updates[key];
        if (typeof value !== "undefined") {
            if (element[key] === value &&
                // if object, always update because its attrs could have changed
                // (except for specific keys we handle below)
                (typeof value !== "object" ||
                    value === null ||
                    key === "groupIds" ||
                    key === "scale")) {
                continue;
            }
            if (key === "scale") {
                const prevScale = element[key];
                const nextScale = value;
                if (prevScale[0] === nextScale[0] && prevScale[1] === nextScale[1]) {
                    continue;
                }
            }
            else if (key === "points") {
                const prevPoints = element[key];
                const nextPoints = value;
                if (prevPoints.length === nextPoints.length) {
                    let didChangePoints = false;
                    let index = prevPoints.length;
                    while (--index) {
                        const prevPoint = prevPoints[index];
                        const nextPoint = nextPoints[index];
                        if (prevPoint[0] !== nextPoint[0] ||
                            prevPoint[1] !== nextPoint[1]) {
                            didChangePoints = true;
                            break;
                        }
                    }
                    if (!didChangePoints) {
                        continue;
                    }
                }
            }
            element[key] = value;
            didChange = true;
        }
    }
    if (!didChange) {
        return element;
    }
    if (typeof updates.height !== "undefined" ||
        typeof updates.width !== "undefined" ||
        typeof fileId != "undefined" ||
        typeof points !== "undefined") {
        shape_1.ShapeCache.delete(element);
    }
    element.version = updates.version ?? element.version + 1;
    element.versionNonce = updates.versionNonce ?? (0, common_1.randomInteger)();
    element.updated = (0, common_1.getUpdatedTimestamp)();
    return element;
};
exports.mutateElement = mutateElement;
const newElementWith = (element, updates, 
/** pass `true` to always regenerate */
force = false) => {
    let didChange = false;
    for (const key in updates) {
        const value = updates[key];
        if (typeof value !== "undefined") {
            if (element[key] === value &&
                // if object, always update because its attrs could have changed
                (typeof value !== "object" || value === null)) {
                continue;
            }
            didChange = true;
        }
    }
    if (!didChange && !force) {
        return element;
    }
    return {
        ...element,
        ...updates,
        version: updates.version ?? element.version + 1,
        versionNonce: updates.versionNonce ?? (0, common_1.randomInteger)(),
        updated: (0, common_1.getUpdatedTimestamp)(),
    };
};
exports.newElementWith = newElementWith;
/**
 * Mutates element, bumping `version`, `versionNonce`, and `updated`.
 *
 * NOTE: does not trigger re-render.
 */
const bumpVersion = (element, version) => {
    element.version = (version ?? element.version) + 1;
    element.versionNonce = (0, common_1.randomInteger)();
    element.updated = (0, common_1.getUpdatedTimestamp)();
    return element;
};
exports.bumpVersion = bumpVersion;
