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
exports.IconPicker = IconPicker;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../editor-jotai");
const i18n_1 = require("../i18n");
const Collapsible_1 = __importDefault(require("./Stats/Collapsible"));
const App_1 = require("./App");
require("./IconPicker.scss");
const moreOptionsAtom = (0, editor_jotai_1.atom)(false);
const PICKER_COLUMNS = 4;
const DEFAULT_SECTION_NAME = "default";
const flattenOptions = (sections) => sections.flatMap((section) => section.options);
const findOption = (sections, predicate) => {
    for (const section of sections) {
        const option = section.options.find(predicate);
        if (option) {
            return option;
        }
    }
    return null;
};
const hasOption = (sections, predicate) => sections.some((section) => section.options.some(predicate));
const getNavigationRows = (sections) => sections.flatMap((section) => Array.from({ length: Math.ceil(section.options.length / PICKER_COLUMNS) }, (_, index) => section.options.slice(index * PICKER_COLUMNS, index * PICKER_COLUMNS + PICKER_COLUMNS)));
function Picker({ visibleSections, hiddenSections = [], value, label, onChange, onClose, }) {
    const { container } = (0, App_1.useExcalidrawContainer)();
    const [showMoreOptions, setShowMoreOptions] = (0, editor_jotai_1.useAtom)(moreOptionsAtom);
    const allSections = [...visibleSections, ...hiddenSections];
    const allOptions = flattenOptions(allSections);
    const navigationRows = getNavigationRows([
        ...visibleSections,
        ...(showMoreOptions ? hiddenSections : []),
    ]);
    const handleKeyDown = (event) => {
        const pressedOption = allOptions.find((option) => option.keyBinding === event.key.toLowerCase());
        if (!(event.metaKey || event.altKey || event.ctrlKey) && pressedOption) {
            // Keybinding navigation
            onChange(pressedOption.value);
            event.preventDefault();
        }
        else if (event.key === common_1.KEYS.TAB) {
            const index = allOptions.findIndex((option) => option.value === value);
            const nextIndex = event.shiftKey
                ? (allOptions.length + index - 1) % allOptions.length
                : (index + 1) % allOptions.length;
            onChange(allOptions[nextIndex].value);
        }
        else if ((0, common_1.isArrowKey)(event.key)) {
            // Arrow navigation
            const isRTL = (0, i18n_1.getLanguage)().rtl;
            const index = allOptions.findIndex((option) => option.value === value);
            if (index !== -1) {
                const length = allOptions.length;
                let nextIndex = index;
                switch (event.key) {
                    // Select the next option
                    case isRTL ? common_1.KEYS.ARROW_LEFT : common_1.KEYS.ARROW_RIGHT:
                        nextIndex = (index + 1) % length;
                        break;
                    // Select the previous option
                    case isRTL ? common_1.KEYS.ARROW_RIGHT : common_1.KEYS.ARROW_LEFT:
                        nextIndex = (length + index - 1) % length;
                        break;
                    // Go the next row
                    case common_1.KEYS.ARROW_DOWN: {
                        const currentRowIndex = navigationRows.findIndex((row) => row.some((option) => option.value === value));
                        const currentRow = navigationRows[currentRowIndex];
                        if (currentRowIndex !== -1 && currentRow) {
                            const column = currentRow.findIndex((option) => option.value === value);
                            const nextRow = navigationRows[(currentRowIndex + 1) % navigationRows.length];
                            const nextOption = nextRow[Math.min(column, nextRow.length - 1)] ??
                                allOptions[index];
                            onChange(nextOption.value);
                            event.preventDefault();
                            event.nativeEvent.stopImmediatePropagation();
                            event.stopPropagation();
                            return;
                        }
                        break;
                    }
                    // Go the previous row
                    case common_1.KEYS.ARROW_UP: {
                        const currentRowIndex = navigationRows.findIndex((row) => row.some((option) => option.value === value));
                        const currentRow = navigationRows[currentRowIndex];
                        if (currentRowIndex !== -1 && currentRow) {
                            const column = currentRow.findIndex((option) => option.value === value);
                            const previousRow = navigationRows[(navigationRows.length + currentRowIndex - 1) %
                                navigationRows.length];
                            const previousOption = previousRow[Math.min(column, previousRow.length - 1)] ??
                                allOptions[index];
                            onChange(previousOption.value);
                            event.preventDefault();
                            event.nativeEvent.stopImmediatePropagation();
                            event.stopPropagation();
                            return;
                        }
                        break;
                    }
                }
                onChange(allOptions[nextIndex].value);
            }
            event.preventDefault();
        }
        else if (event.key === common_1.KEYS.ESCAPE || event.key === common_1.KEYS.ENTER) {
            // Close on escape or enter
            event.preventDefault();
            onClose();
        }
        event.nativeEvent.stopImmediatePropagation();
        event.stopPropagation();
    };
    (0, react_1.useEffect)(() => {
        if (hasOption(hiddenSections, (option) => option.value === value)) {
            setShowMoreOptions(true);
        }
    }, [value, hiddenSections, setShowMoreOptions]);
    const renderOptions = (options) => {
        return ((0, jsx_runtime_1.jsx)("div", { className: "picker-content", children: options.map((option) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: (0, clsx_1.default)("picker-option", {
                    active: value === option.value,
                }), onClick: () => {
                    onChange(option.value);
                }, title: option.keyBinding
                    ? `${option.text} — ${option.keyBinding.toUpperCase()}`
                    : option.text, "aria-label": option.text || "none", "aria-keyshortcuts": option.keyBinding || undefined, ref: (ref) => {
                    if (value === option.value) {
                        // Use a timeout here to render focus properly
                        setTimeout(() => {
                            ref?.focus();
                        }, 0);
                    }
                }, children: [option.icon, option.keyBinding && ((0, jsx_runtime_1.jsx)("span", { className: "picker-keybinding", children: option.keyBinding }))] }, option.text))) }));
    };
    const renderSections = (sections) => sections.map((section, index) => section.name === DEFAULT_SECTION_NAME ? ((0, jsx_runtime_1.jsx)(react_1.default.Fragment, { children: renderOptions(section.options) }, `${section.name}-${index}`)) : ((0, jsx_runtime_1.jsxs)("div", { className: "picker-section", children: [(0, jsx_runtime_1.jsx)("div", { className: "picker-section-label", children: section.name }), renderOptions(section.options)] }, `${section.name}-${index}`)));
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Content, { className: "picker", role: "dialog", "aria-modal": "true", "aria-label": label, side: "bottom", align: "start", sideOffset: 12, alignOffset: 12, style: { zIndex: "var(--zIndex-ui-styles-popup)" }, onKeyDown: handleKeyDown, collisionBoundary: container ?? undefined, children: (0, jsx_runtime_1.jsxs)("div", { className: "picker-sections", children: [renderSections(visibleSections), hiddenSections.length > 0 && ((0, jsx_runtime_1.jsx)(Collapsible_1.default, { label: (0, i18n_1.t)("labels.more_options"), open: showMoreOptions, openTrigger: () => {
                        setShowMoreOptions((value) => !value);
                    }, className: "picker-collapsible", children: (0, jsx_runtime_1.jsx)("div", { className: "picker-sections", children: renderSections(hiddenSections) }) }))] }) }));
}
function IconPicker({ value, label, visibleSections, hiddenSections, onChange, }) {
    const [isActive, setActive] = react_1.default.useState(false);
    const selectedOption = (0, react_1.useMemo)(() => findOption(visibleSections, (option) => option.value === value) ??
        findOption(hiddenSections ?? [], (option) => option.value === value), [visibleSections, hiddenSections, value]);
    return ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isActive, onOpenChange: (open) => setActive(open), children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { type: "button", "aria-label": label, onClick: () => setActive(!isActive), className: isActive ? "active" : "", children: selectedOption?.icon }), isActive && ((0, jsx_runtime_1.jsx)(Picker, { visibleSections: visibleSections, hiddenSections: hiddenSections, value: value, label: label, onChange: onChange, onClose: () => {
                        setActive(false);
                    } }))] }) }));
}
