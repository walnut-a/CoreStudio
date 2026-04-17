"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeColorPickerSectionAtom = exports.getMostUsedCustomColors = exports.isCustomColor = exports.colorPickerHotkeyBindings = exports.getColorNameAndShadeFromColor = void 0;
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../../editor-jotai");
const getColorNameAndShadeFromColor = ({ palette, color, }) => {
    if (!color) {
        return null;
    }
    for (const [colorName, colorVal] of Object.entries(palette)) {
        if (Array.isArray(colorVal)) {
            const shade = colorVal.indexOf(color);
            if (shade > -1) {
                return { colorName: colorName, shade };
            }
        }
        else if (colorVal === color) {
            return { colorName: colorName, shade: null };
        }
    }
    return null;
};
exports.getColorNameAndShadeFromColor = getColorNameAndShadeFromColor;
exports.colorPickerHotkeyBindings = [
    ["q", "w", "e", "r", "t"],
    ["a", "s", "d", "f", "g"],
    ["z", "x", "c", "v", "b"],
].flat();
const isCustomColor = ({ color, palette, }) => {
    const paletteValues = Object.values(palette).flat();
    return !paletteValues.includes(color);
};
exports.isCustomColor = isCustomColor;
const getMostUsedCustomColors = (elements, type, palette) => {
    const elementColorTypeMap = {
        elementBackground: "backgroundColor",
        elementStroke: "strokeColor",
    };
    const colors = elements.filter((element) => {
        if (element.isDeleted) {
            return false;
        }
        const color = element[elementColorTypeMap[type]];
        return (0, exports.isCustomColor)({ color, palette });
    });
    const colorCountMap = new Map();
    colors.forEach((element) => {
        const color = element[elementColorTypeMap[type]];
        if (colorCountMap.has(color)) {
            colorCountMap.set(color, colorCountMap.get(color) + 1);
        }
        else {
            colorCountMap.set(color, 1);
        }
    });
    return [...colorCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map((c) => c[0])
        .slice(0, common_1.MAX_CUSTOM_COLORS_USED_IN_CANVAS);
};
exports.getMostUsedCustomColors = getMostUsedCustomColors;
exports.activeColorPickerSectionAtom = (0, editor_jotai_1.atom)(null);
