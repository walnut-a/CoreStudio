"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorPicker = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../../editor-jotai");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const ButtonSeparator_1 = require("../ButtonSeparator");
const EyeDropper_1 = require("../EyeDropper");
const PropertiesPopover_1 = require("../PropertiesPopover");
const icons_1 = require("../icons");
const useTextEditorFocus_1 = require("../../hooks/useTextEditorFocus");
const ColorInput_1 = require("./ColorInput");
const Picker_1 = require("./Picker");
const PickerHeading_1 = __importDefault(require("./PickerHeading"));
const TopPicks_1 = require("./TopPicks");
const colorPickerUtils_1 = require("./colorPickerUtils");
require("./ColorPicker.scss");
const ColorPickerPopupContent = ({ type, color, onChange, label, elements, palette = common_1.COLOR_PALETTE, updateData, getOpenPopup, appState, }) => {
    const { container } = (0, App_1.useExcalidrawContainer)();
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const isCompactMode = stylesPanelMode !== "full";
    const isMobileMode = stylesPanelMode === "mobile";
    const [, setActiveColorPickerSection] = (0, editor_jotai_1.useAtom)(colorPickerUtils_1.activeColorPickerSectionAtom);
    const [eyeDropperState, setEyeDropperState] = (0, editor_jotai_1.useAtom)(EyeDropper_1.activeEyeDropperAtom);
    const colorInputJSX = ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PickerHeading_1.default, { children: (0, i18n_1.t)("colorPicker.hexCode") }), (0, jsx_runtime_1.jsx)(ColorInput_1.ColorInput, { color: color || "", label: label, onChange: (color) => {
                    onChange(color);
                }, colorPickerType: type, placeholder: (0, i18n_1.t)("colorPicker.color") })] }));
    const colorPickerContentRef = (0, react_1.useRef)(null);
    const focusPickerContent = () => {
        colorPickerContentRef.current?.focus();
    };
    return ((0, jsx_runtime_1.jsx)(PropertiesPopover_1.PropertiesPopover, { container: container, style: { maxWidth: "13rem" }, 
        // Improve focus handling for text editing scenarios
        preventAutoFocusOnTouch: !!appState.editingTextElement, onFocusOutside: (event) => {
            // refocus due to eye dropper
            if (!(0, common_1.isWritableElement)(event.target)) {
                focusPickerContent();
            }
            event.preventDefault();
        }, onPointerDownOutside: (event) => {
            if (eyeDropperState) {
                // prevent from closing if we click outside the popover
                // while eyedropping (e.g. click when clicking the sidebar;
                // the eye-dropper-backdrop is prevented downstream)
                event.preventDefault();
            }
        }, onClose: () => {
            // only clear if we're still the active popup (avoid racing with switch)
            if (getOpenPopup() === type) {
                updateData({ openPopup: null });
            }
            setActiveColorPickerSection(null);
            // Refocus text editor when popover closes if we were editing text
            if (appState.editingTextElement) {
                setTimeout(() => {
                    const textEditor = document.querySelector(".excalidraw-wysiwyg");
                    if (textEditor) {
                        textEditor.focus();
                    }
                }, 0);
            }
        }, children: palette ? ((0, jsx_runtime_1.jsx)(Picker_1.Picker, { ref: colorPickerContentRef, palette: palette, color: color, onChange: (changedColor) => {
                // Save caret position before color change if editing text
                const savedSelection = appState.editingTextElement
                    ? (0, useTextEditorFocus_1.saveCaretPosition)()
                    : null;
                onChange(changedColor);
                // Restore caret position after color change if editing text
                if (appState.editingTextElement && savedSelection) {
                    (0, useTextEditorFocus_1.restoreCaretPosition)(savedSelection);
                }
            }, onEyeDropperToggle: (force) => {
                setEyeDropperState((state) => {
                    if (force) {
                        state = state || {
                            keepOpenOnAlt: true,
                            onSelect: onChange,
                            colorPickerType: type,
                        };
                        state.keepOpenOnAlt = true;
                        return state;
                    }
                    return force === false || state
                        ? null
                        : {
                            keepOpenOnAlt: false,
                            onSelect: onChange,
                            colorPickerType: type,
                        };
                });
            }, onEscape: (event) => {
                if (eyeDropperState) {
                    setEyeDropperState(null);
                }
                else {
                    // close explicitly on Escape
                    updateData({ openPopup: null });
                }
            }, type: type, elements: elements, updateData: updateData, showTitle: isCompactMode, showHotKey: !isMobileMode, children: colorInputJSX })) : (colorInputJSX) }));
};
const ColorPickerTrigger = ({ label, color, type, mode = "background", onToggle, editingTextElement, }) => {
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const isCompactMode = stylesPanelMode !== "full";
    const isMobileMode = stylesPanelMode === "mobile";
    const handleClick = (e) => {
        // use pointerdown so we run before outside-close logic
        e.preventDefault();
        e.stopPropagation();
        // If editing text, temporarily disable the wysiwyg blur event
        if (editingTextElement) {
            (0, useTextEditorFocus_1.temporarilyDisableTextEditorBlur)();
        }
        onToggle();
    };
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Trigger, { type: "button", className: (0, clsx_1.default)("color-picker__button active-color properties-trigger", {
            "is-transparent": !color || color === "transparent",
            "has-outline": !color || !(0, common_1.isColorDark)(color, common_1.COLOR_OUTLINE_CONTRAST_THRESHOLD),
            "compact-sizing": isCompactMode,
            "mobile-border": isMobileMode,
        }), "aria-label": label, style: color ? { "--swatch-color": color } : undefined, title: type === "elementStroke"
            ? (0, i18n_1.t)("labels.showStroke")
            : (0, i18n_1.t)("labels.showBackground"), "data-openpopup": type, onClick: handleClick, children: [(0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-outline", children: !color && icons_1.slashIcon }), isCompactMode && color && mode === "stroke" && ((0, jsx_runtime_1.jsx)("div", { className: "color-picker__button-background", children: (0, jsx_runtime_1.jsx)("span", { style: {
                        color: color && (0, common_1.isColorDark)(color, common_1.COLOR_OUTLINE_CONTRAST_THRESHOLD)
                            ? "#fff"
                            : "#111",
                    }, children: icons_1.strokeIcon }) }))] }));
};
const ColorPicker = ({ type, color, onChange, label, elements, palette = common_1.COLOR_PALETTE, topPicks, updateData, appState, }) => {
    const openRef = (0, react_1.useRef)(appState.openPopup);
    (0, react_1.useEffect)(() => {
        openRef.current = appState.openPopup;
    }, [appState.openPopup]);
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const isCompactMode = stylesPanelMode !== "full";
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", className: (0, clsx_1.default)("color-picker-container", {
                "color-picker-container--no-top-picks": isCompactMode,
            }), children: [!isCompactMode && ((0, jsx_runtime_1.jsx)(TopPicks_1.TopPicks, { activeColor: color, onChange: onChange, type: type, topPicks: topPicks })), !isCompactMode && (0, jsx_runtime_1.jsx)(ButtonSeparator_1.ButtonSeparator, {}), (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: appState.openPopup === type, onOpenChange: (open) => {
                        if (open) {
                            updateData({ openPopup: type });
                        }
                    }, children: [(0, jsx_runtime_1.jsx)(ColorPickerTrigger, { color: color, label: label, type: type, mode: type === "elementStroke" ? "stroke" : "background", editingTextElement: !!appState.editingTextElement, onToggle: () => {
                                // atomic switch: if another popup is open, close it first, then open this one next tick
                                if (appState.openPopup === type) {
                                    // toggle off on same trigger
                                    updateData({ openPopup: null });
                                }
                                else if (appState.openPopup) {
                                    updateData({ openPopup: type });
                                }
                                else {
                                    // open this one
                                    updateData({ openPopup: type });
                                }
                            } }), appState.openPopup === type && ((0, jsx_runtime_1.jsx)(ColorPickerPopupContent, { type: type, color: color, onChange: onChange, label: label, elements: elements, palette: palette, updateData: updateData, getOpenPopup: () => openRef.current, appState: appState }))] })] }) }));
};
exports.ColorPicker = ColorPicker;
