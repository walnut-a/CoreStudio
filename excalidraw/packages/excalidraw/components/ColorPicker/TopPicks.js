"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopPicks = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const TopPicks = ({ onChange, type, activeColor, topPicks, }) => {
    let colors;
    if (type === "elementStroke") {
        colors = common_1.DEFAULT_ELEMENT_STROKE_PICKS;
    }
    if (type === "elementBackground") {
        colors = common_1.DEFAULT_ELEMENT_BACKGROUND_PICKS;
    }
    if (type === "canvasBackground") {
        colors = common_1.DEFAULT_CANVAS_BACKGROUND_PICKS;
    }
    // this one can overwrite defaults
    if (topPicks) {
        colors = topPicks;
    }
    if (!colors) {
        console.error("Invalid type for TopPicks");
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "color-picker__top-picks", children: colors.map((color) => ((0, jsx_runtime_1.jsx)("button", { className: (0, clsx_1.default)("color-picker__button", {
                active: color === activeColor,
                "is-transparent": color === "transparent" || !color,
                "has-outline": !(0, common_1.isColorDark)(color, common_1.COLOR_OUTLINE_CONTRAST_THRESHOLD),
            }), style: { "--swatch-color": color }, type: "button", title: color, onClick: () => onChange(color), "data-testid": `color-top-pick-${color}`, children: (0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-outline" }) }, color))) }));
};
exports.TopPicks = TopPicks;
