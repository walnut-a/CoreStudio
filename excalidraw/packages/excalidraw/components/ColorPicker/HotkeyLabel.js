"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const HotkeyLabel = ({ color, keyLabel, isShade = false, }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "color-picker__button__hotkey-label", style: {
            color: (0, common_1.isColorDark)(color) ? "#fff" : "#000",
        }, children: [isShade && "⇧", keyLabel] }));
};
exports.default = HotkeyLabel;
