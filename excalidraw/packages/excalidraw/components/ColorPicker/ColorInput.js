"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorInput = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const shortcut_1 = require("../..//shortcut");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const EyeDropper_1 = require("../EyeDropper");
const icons_1 = require("../icons");
const colorPickerUtils_1 = require("./colorPickerUtils");
const ColorInput = ({ color, onChange, label, colorPickerType, placeholder, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const [innerValue, setInnerValue] = (0, react_1.useState)(color);
    const [activeSection, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    (0, react_1.useEffect)(() => {
        setInnerValue(color);
    }, [color]);
    const changeColor = (0, react_1.useCallback)((inputValue) => {
        const value = inputValue.toLowerCase();
        const color = (0, common_1.normalizeInputColor)(value);
        if (color) {
            onChange(color);
        }
        setInnerValue(value);
    }, [onChange]);
    const inputRef = (0, react_1.useRef)(null);
    const eyeDropperTriggerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeSection]);
    const [eyeDropperState, setEyeDropperState] = (0, editor_jotai_1.useAtom)(EyeDropper_1.activeEyeDropperAtom);
    (0, react_1.useEffect)(() => {
        return () => {
            setEyeDropperState(null);
        };
    }, [setEyeDropperState]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "color-picker__input-label", children: [(0, jsx_runtime_1.jsx)("div", { className: "color-picker__input-hash", children: "#" }), (0, jsx_runtime_1.jsx)("input", { ref: activeSection === "hex" ? inputRef : undefined, style: { border: 0, padding: 0 }, spellCheck: false, className: "color-picker-input", "aria-label": label, onChange: (event) => {
                    changeColor(event.target.value);
                }, value: (innerValue || "").replace(/^#/, ""), onBlur: () => {
                    setInnerValue(color);
                }, tabIndex: -1, onFocus: () => setActiveColorPickerSection("hex"), onKeyDown: (event) => {
                    if (event.key === common_1.KEYS.TAB) {
                        return;
                    }
                    else if (event.key === common_1.KEYS.ESCAPE) {
                        eyeDropperTriggerRef.current?.focus();
                    }
                    event.stopPropagation();
                }, placeholder: placeholder }), editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { style: {
                            width: "1px",
                            height: "1.25rem",
                            backgroundColor: "var(--default-border-color)",
                        } }), (0, jsx_runtime_1.jsx)("div", { ref: eyeDropperTriggerRef, className: (0, clsx_1.default)("excalidraw-eye-dropper-trigger", {
                            selected: eyeDropperState,
                        }), onClick: () => setEyeDropperState((s) => s
                            ? null
                            : {
                                keepOpenOnAlt: false,
                                onSelect: (color) => onChange(color),
                                colorPickerType,
                            }), title: `${(0, i18n_1.t)("labels.eyeDropper")} — ${common_1.KEYS.I.toLocaleUpperCase()} or ${(0, shortcut_1.getShortcutKey)("Alt")} `, children: icons_1.eyeDropperIcon })] }))] }));
};
exports.ColorInput = ColorInput;
