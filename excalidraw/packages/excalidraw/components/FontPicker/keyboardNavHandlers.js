"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fontPickerKeyHandler = void 0;
const common_1 = require("@excalidraw/common");
const fontPickerKeyHandler = ({ event, inputRef, hoveredFont, filteredFonts, onClose, onSelect, onHover, }) => {
    if (!event[common_1.KEYS.CTRL_OR_CMD] &&
        event.shiftKey &&
        event.key.toLowerCase() === common_1.KEYS.F) {
        // refocus input on the popup trigger shortcut
        inputRef.current?.focus();
        return true;
    }
    if (event.key === common_1.KEYS.ESCAPE) {
        onClose();
        return true;
    }
    if (event.key === common_1.KEYS.ENTER) {
        if (hoveredFont?.value) {
            onSelect(hoveredFont.value);
        }
        return true;
    }
    if (event.key === common_1.KEYS.ARROW_DOWN) {
        if (hoveredFont?.next) {
            onHover(hoveredFont.next.value);
        }
        else if (filteredFonts[0]?.value) {
            onHover(filteredFonts[0].value);
        }
        return true;
    }
    if (event.key === common_1.KEYS.ARROW_UP) {
        if (hoveredFont?.prev) {
            onHover(hoveredFont.prev.value);
        }
        else if (filteredFonts[filteredFonts.length - 1]?.value) {
            onHover(filteredFonts[filteredFonts.length - 1].value);
        }
        return true;
    }
};
exports.fontPickerKeyHandler = fontPickerKeyHandler;
