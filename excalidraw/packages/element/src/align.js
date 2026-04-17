"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alignElements = void 0;
const binding_1 = require("./binding");
const bounds_1 = require("./bounds");
const groups_1 = require("./groups");
const alignElements = (selectedElements, alignment, scene, appState) => {
    const groups = (0, groups_1.getSelectedElementsByGroup)(selectedElements, scene.getNonDeletedElementsMap(), appState);
    const selectionBoundingBox = (0, bounds_1.getCommonBoundingBox)(selectedElements);
    return groups.flatMap((group) => {
        const translation = calculateTranslation(group, selectionBoundingBox, alignment);
        return group.map((element) => {
            // update element
            const updatedEle = scene.mutateElement(element, {
                x: element.x + translation.x,
                y: element.y + translation.y,
            });
            // update bound elements
            (0, binding_1.updateBoundElements)(element, scene, {
                simultaneouslyUpdated: group,
            });
            return updatedEle;
        });
    });
};
exports.alignElements = alignElements;
const calculateTranslation = (group, selectionBoundingBox, { axis, position }) => {
    const groupBoundingBox = (0, bounds_1.getCommonBoundingBox)(group);
    const [min, max] = axis === "x" ? ["minX", "maxX"] : ["minY", "maxY"];
    const noTranslation = { x: 0, y: 0 };
    if (position === "start") {
        return {
            ...noTranslation,
            [axis]: selectionBoundingBox[min] - groupBoundingBox[min],
        };
    }
    else if (position === "end") {
        return {
            ...noTranslation,
            [axis]: selectionBoundingBox[max] - groupBoundingBox[max],
        };
    } // else if (position === "center") {
    return {
        ...noTranslation,
        [axis]: (selectionBoundingBox[min] + selectionBoundingBox[max]) / 2 -
            (groupBoundingBox[min] + groupBoundingBox[max]) / 2,
    };
};
