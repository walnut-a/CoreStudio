"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomColorList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const editor_jotai_1 = require("../../editor-jotai");
const HotkeyLabel_1 = __importDefault(require("./HotkeyLabel"));
const colorPickerUtils_1 = require("./colorPickerUtils");
const CustomColorList = ({ colors, color, onChange, label, }) => {
    const [activeColorPickerSection, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    const btnRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (btnRef.current) {
            btnRef.current.focus();
        }
    }, [color, activeColorPickerSection]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "color-picker-content--default", children: colors.map((c, i) => {
            return ((0, jsx_runtime_1.jsxs)("button", { ref: color === c ? btnRef : undefined, tabIndex: -1, type: "button", className: (0, clsx_1.default)("color-picker__button color-picker__button--large has-outline", {
                    active: color === c,
                    "is-transparent": c === "transparent" || !c,
                }), onClick: () => {
                    onChange(c);
                    setActiveColorPickerSection("custom");
                }, title: c, "aria-label": label, style: { "--swatch-color": c }, children: [(0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-outline" }), (0, jsx_runtime_1.jsx)(HotkeyLabel_1.default, { color: c, keyLabel: i + 1 })] }, i));
        }) }));
};
exports.CustomColorList = CustomColorList;
