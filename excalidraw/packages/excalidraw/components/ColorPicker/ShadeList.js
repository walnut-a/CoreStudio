"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShadeList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const HotkeyLabel_1 = __importDefault(require("./HotkeyLabel"));
const colorPickerUtils_1 = require("./colorPickerUtils");
const ShadeList = ({ color, onChange, palette, showHotKey, }) => {
    const colorObj = (0, colorPickerUtils_1.getColorNameAndShadeFromColor)({
        color: color || "transparent",
        palette,
    });
    const [activeColorPickerSection, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    const btnRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (btnRef.current && activeColorPickerSection === "shades") {
            btnRef.current.focus();
        }
    }, [colorObj, activeColorPickerSection]);
    if (colorObj) {
        const { colorName, shade } = colorObj;
        const shades = palette[colorName];
        if (Array.isArray(shades)) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "color-picker-content--default shades", children: shades.map((color, i) => ((0, jsx_runtime_1.jsxs)("button", { ref: i === shade && activeColorPickerSection === "shades"
                        ? btnRef
                        : undefined, tabIndex: -1, type: "button", className: (0, clsx_1.default)("color-picker__button color-picker__button--large has-outline", { active: i === shade }), "aria-label": "Shade", title: `${colorName} - ${i + 1}`, style: color ? { "--swatch-color": color } : undefined, onClick: () => {
                        onChange(color);
                        setActiveColorPickerSection("shades");
                    }, children: [(0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-outline" }), showHotKey && ((0, jsx_runtime_1.jsx)(HotkeyLabel_1.default, { color: color, keyLabel: i + 1, isShade: true }))] }, i))) }));
        }
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "color-picker-content--default", style: { position: "relative" }, tabIndex: -1, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", tabIndex: -1, className: "color-picker__button color-picker__button--large color-picker__button--no-focus-visible" }), (0, jsx_runtime_1.jsx)("div", { tabIndex: -1, style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: "0.75rem",
                }, children: (0, i18n_1.t)("colorPicker.noShades") })] }));
};
exports.ShadeList = ShadeList;
