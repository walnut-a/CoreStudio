"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const HotkeyLabel_1 = __importDefault(require("./HotkeyLabel"));
const colorPickerUtils_1 = require("./colorPickerUtils");
const PickerColorList = ({ palette, color, onChange, activeShade, showHotKey = true, }) => {
    const colorObj = (0, colorPickerUtils_1.getColorNameAndShadeFromColor)({
        color,
        palette,
    });
    const [activeColorPickerSection, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    const btnRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (btnRef.current && activeColorPickerSection === "baseColors") {
            btnRef.current.focus();
        }
    }, [colorObj?.colorName, activeColorPickerSection]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "color-picker-content--default", children: Object.entries(palette).map(([key, value], index) => {
            const color = (Array.isArray(value) ? value[activeShade] : value) || "transparent";
            const keybinding = colorPickerUtils_1.colorPickerHotkeyBindings[index];
            const label = (0, i18n_1.t)(`colors.${key.replace(/\d+/, "")}`, null, "");
            return ((0, jsx_runtime_1.jsxs)("button", { ref: colorObj?.colorName === key ? btnRef : undefined, tabIndex: -1, type: "button", className: (0, clsx_1.default)("color-picker__button color-picker__button--large has-outline", {
                    active: colorObj?.colorName === key,
                    "is-transparent": color === "transparent" || !color,
                }), onClick: () => {
                    onChange(color);
                    setActiveColorPickerSection("baseColors");
                }, title: `${label}${color.startsWith("#") ? ` ${color}` : ""} — ${keybinding}`, "aria-label": `${label} — ${keybinding}`, style: color ? { "--swatch-color": color } : undefined, "data-testid": `color-${key}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-outline" }), showHotKey && (0, jsx_runtime_1.jsx)(HotkeyLabel_1.default, { color: color, keyLabel: keybinding })] }, key));
        }) }));
};
exports.default = PickerColorList;
