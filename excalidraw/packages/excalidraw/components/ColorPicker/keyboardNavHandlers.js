"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorPickerKeyNavHandler = void 0;
const common_1 = require("@excalidraw/common");
const colorPickerUtils_1 = require("./colorPickerUtils");
const arrowHandler = (eventKey, currentIndex, length) => {
    const rows = Math.ceil(length / common_1.COLORS_PER_ROW);
    currentIndex = currentIndex ?? -1;
    switch (eventKey) {
        case "ArrowLeft": {
            const prevIndex = currentIndex - 1;
            return prevIndex < 0 ? length - 1 : prevIndex;
        }
        case "ArrowRight": {
            return (currentIndex + 1) % length;
        }
        case "ArrowDown": {
            const nextIndex = currentIndex + common_1.COLORS_PER_ROW;
            return nextIndex >= length ? currentIndex % common_1.COLORS_PER_ROW : nextIndex;
        }
        case "ArrowUp": {
            const prevIndex = currentIndex - common_1.COLORS_PER_ROW;
            const newIndex = prevIndex < 0 ? common_1.COLORS_PER_ROW * rows + prevIndex : prevIndex;
            return newIndex >= length ? undefined : newIndex;
        }
    }
};
/**
 * @returns true if the event was handled
 */
const hotkeyHandler = ({ e, colorObj, onChange, palette, customColors, setActiveColorPickerSection, activeShade, }) => {
    if (colorObj?.shade != null) {
        // shift + numpad is extremely messed up on windows apparently
        if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].includes(e.code) &&
            e.shiftKey) {
            const newShade = Number(e.code.slice(-1)) - 1;
            onChange(palette[colorObj.colorName][newShade]);
            setActiveColorPickerSection("shades");
            return true;
        }
    }
    if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const c = customColors[Number(e.key) - 1];
        if (c) {
            onChange(customColors[Number(e.key) - 1]);
            setActiveColorPickerSection("custom");
            return true;
        }
    }
    if (colorPickerUtils_1.colorPickerHotkeyBindings.includes(e.key)) {
        const index = colorPickerUtils_1.colorPickerHotkeyBindings.indexOf(e.key);
        const paletteKey = Object.keys(palette)[index];
        const paletteValue = palette[paletteKey];
        const r = Array.isArray(paletteValue)
            ? paletteValue[activeShade]
            : paletteValue;
        onChange(r);
        setActiveColorPickerSection("baseColors");
        return true;
    }
    return false;
};
/**
 * @returns true if the event was handled
 */
const colorPickerKeyNavHandler = ({ event, activeColorPickerSection, palette, color, onChange, customColors, setActiveColorPickerSection, updateData, activeShade, onEyeDropperToggle, onEscape, }) => {
    if (event[common_1.KEYS.CTRL_OR_CMD]) {
        return false;
    }
    if (event.key === common_1.KEYS.ESCAPE) {
        onEscape(event);
        return true;
    }
    // checkt using `key` to ignore combos with Alt modifier
    if (event.key === common_1.KEYS.ALT) {
        onEyeDropperToggle(true);
        return true;
    }
    if (event.key === common_1.KEYS.I) {
        onEyeDropperToggle();
        return true;
    }
    const colorObj = (0, colorPickerUtils_1.getColorNameAndShadeFromColor)({ color, palette });
    if (event.key === common_1.KEYS.TAB) {
        const sectionsMap = {
            custom: !!customColors.length,
            baseColors: true,
            shades: colorObj?.shade != null,
            hex: true,
        };
        const sections = Object.entries(sectionsMap).reduce((acc, [key, value]) => {
            if (value) {
                acc.push(key);
            }
            return acc;
        }, []);
        const activeSectionIndex = sections.indexOf(activeColorPickerSection);
        const indexOffset = event.shiftKey ? -1 : 1;
        const nextSectionIndex = activeSectionIndex + indexOffset > sections.length - 1
            ? 0
            : activeSectionIndex + indexOffset < 0
                ? sections.length - 1
                : activeSectionIndex + indexOffset;
        const nextSection = sections[nextSectionIndex];
        if (nextSection) {
            setActiveColorPickerSection(nextSection);
        }
        if (nextSection === "custom") {
            onChange(customColors[0]);
        }
        else if (nextSection === "baseColors") {
            const baseColorName = Object.entries(palette).find(([name, shades]) => {
                if (Array.isArray(shades)) {
                    return shades.includes(color);
                }
                else if (shades === color) {
                    return name;
                }
                return null;
            });
            if (!baseColorName) {
                onChange(common_1.COLOR_PALETTE.black);
            }
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }
    if (hotkeyHandler({
        e: event,
        colorObj,
        onChange,
        palette,
        customColors,
        setActiveColorPickerSection,
        activeShade,
    })) {
        return true;
    }
    if (activeColorPickerSection === "shades") {
        if (colorObj) {
            const { shade } = colorObj;
            const newShade = arrowHandler(event.key, shade, common_1.COLORS_PER_ROW);
            if (newShade !== undefined) {
                onChange(palette[colorObj.colorName][newShade]);
                return true;
            }
        }
    }
    if (activeColorPickerSection === "baseColors") {
        if (colorObj) {
            const { colorName } = colorObj;
            const colorNames = Object.keys(palette);
            const indexOfColorName = colorNames.indexOf(colorName);
            const newColorIndex = arrowHandler(event.key, indexOfColorName, colorNames.length);
            if (newColorIndex !== undefined) {
                const newColorName = colorNames[newColorIndex];
                const newColorNameValue = palette[newColorName];
                onChange(Array.isArray(newColorNameValue)
                    ? newColorNameValue[activeShade]
                    : newColorNameValue);
                return true;
            }
        }
    }
    if (activeColorPickerSection === "custom") {
        const indexOfColor = color != null ? customColors.indexOf(color) : 0;
        const newColorIndex = arrowHandler(event.key, indexOfColor, customColors.length);
        if (newColorIndex !== undefined) {
            const newColor = customColors[newColorIndex];
            onChange(newColor);
            return true;
        }
    }
    return false;
};
exports.colorPickerKeyNavHandler = colorPickerKeyNavHandler;
