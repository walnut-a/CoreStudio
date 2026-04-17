"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Picker = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const common_2 = require("@excalidraw/common");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const CustomColorList_1 = require("./CustomColorList");
const PickerColorList_1 = __importDefault(require("./PickerColorList"));
const PickerHeading_1 = __importDefault(require("./PickerHeading"));
const ShadeList_1 = require("./ShadeList");
const colorPickerUtils_1 = require("./colorPickerUtils");
const keyboardNavHandlers_1 = require("./keyboardNavHandlers");
exports.Picker = react_1.default.forwardRef(({ color, onChange, type, elements, palette, updateData, children, showTitle, onEyeDropperToggle, onEscape, showHotKey = true, }, ref) => {
    const title = showTitle
        ? type === "elementStroke"
            ? (0, i18n_1.t)("labels.stroke")
            : type === "elementBackground"
                ? (0, i18n_1.t)("labels.background")
                : null
        : null;
    const [customColors] = react_1.default.useState(() => {
        if (type === "canvasBackground") {
            return [];
        }
        return (0, colorPickerUtils_1.getMostUsedCustomColors)(elements, type, palette);
    });
    const [activeColorPickerSection, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    const colorObj = (0, colorPickerUtils_1.getColorNameAndShadeFromColor)({
        color,
        palette,
    });
    (0, react_1.useEffect)(() => {
        if (!activeColorPickerSection) {
            const isCustom = !!color && (0, colorPickerUtils_1.isCustomColor)({ color, palette });
            const isCustomButNotInList = isCustom && !customColors.includes(color);
            setActiveColorPickerSection(isCustomButNotInList
                ? null
                : isCustom
                    ? "custom"
                    : colorObj?.shade != null
                        ? "shades"
                        : "baseColors");
        }
    }, [
        activeColorPickerSection,
        color,
        palette,
        setActiveColorPickerSection,
        colorObj,
        customColors,
    ]);
    const [activeShade, setActiveShade] = (0, react_1.useState)(colorObj?.shade ??
        (type === "elementBackground"
            ? common_2.DEFAULT_ELEMENT_BACKGROUND_COLOR_INDEX
            : common_2.DEFAULT_ELEMENT_STROKE_COLOR_INDEX));
    (0, react_1.useEffect)(() => {
        if (colorObj?.shade != null) {
            setActiveShade(colorObj.shade);
        }
        const keyup = (event) => {
            if (event.key === common_2.KEYS.ALT) {
                onEyeDropperToggle(false);
            }
        };
        document.addEventListener(common_1.EVENT.KEYUP, keyup, { capture: true });
        return () => {
            document.removeEventListener(common_1.EVENT.KEYUP, keyup, { capture: true });
        };
    }, [colorObj, onEyeDropperToggle]);
    const pickerRef = react_1.default.useRef(null);
    (0, react_1.useImperativeHandle)(ref, () => pickerRef.current);
    (0, react_1.useEffect)(() => {
        pickerRef?.current?.focus();
    }, []);
    return ((0, jsx_runtime_1.jsx)("div", { role: "dialog", "aria-modal": "true", "aria-label": (0, i18n_1.t)("labels.colorPicker"), children: (0, jsx_runtime_1.jsxs)("div", { ref: pickerRef, onKeyDown: (event) => {
                const handled = (0, keyboardNavHandlers_1.colorPickerKeyNavHandler)({
                    event,
                    activeColorPickerSection,
                    palette,
                    color,
                    onChange,
                    onEyeDropperToggle,
                    customColors,
                    setActiveColorPickerSection,
                    updateData,
                    activeShade,
                    onEscape,
                });
                if (handled) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }, className: "color-picker-content properties-content", 
            // to allow focusing by clicking but not by tabbing
            tabIndex: -1, children: [title && (0, jsx_runtime_1.jsx)("div", { className: "color-picker__title", children: title }), !!customColors.length && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PickerHeading_1.default, { children: (0, i18n_1.t)("colorPicker.mostUsedCustomColors") }), (0, jsx_runtime_1.jsx)(CustomColorList_1.CustomColorList, { colors: customColors, color: color, label: (0, i18n_1.t)("colorPicker.mostUsedCustomColors"), onChange: onChange })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PickerHeading_1.default, { children: (0, i18n_1.t)("colorPicker.colors") }), (0, jsx_runtime_1.jsx)(PickerColorList_1.default, { color: color, palette: palette, onChange: onChange, activeShade: activeShade, showHotKey: showHotKey })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PickerHeading_1.default, { children: (0, i18n_1.t)("colorPicker.shades") }), (0, jsx_runtime_1.jsx)(ShadeList_1.ShadeList, { color: color, onChange: onChange, palette: palette, showHotKey: showHotKey })] }), children] }) }));
});
