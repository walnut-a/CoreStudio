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
exports.FontPicker = exports.isDefaultFont = exports.DEFAULT_FONTS = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../../i18n");
const RadioSelection_1 = require("../RadioSelection");
const ButtonSeparator_1 = require("../ButtonSeparator");
const icons_1 = require("../icons");
const FontPickerList_1 = require("./FontPickerList");
const FontPickerTrigger_1 = require("./FontPickerTrigger");
require("./FontPicker.scss");
exports.DEFAULT_FONTS = [
    {
        value: common_1.FONT_FAMILY.Excalifont,
        icon: icons_1.FreedrawIcon,
        text: (0, i18n_1.t)("labels.handDrawn"),
        testId: "font-family-hand-drawn",
    },
    {
        value: common_1.FONT_FAMILY.Nunito,
        icon: icons_1.FontFamilyNormalIcon,
        text: (0, i18n_1.t)("labels.normal"),
        testId: "font-family-normal",
    },
    {
        value: common_1.FONT_FAMILY["Comic Shanns"],
        icon: icons_1.FontFamilyCodeIcon,
        text: (0, i18n_1.t)("labels.code"),
        testId: "font-family-code",
    },
];
const defaultFontFamilies = new Set(exports.DEFAULT_FONTS.map((x) => x.value));
const isDefaultFont = (fontFamily) => {
    if (!fontFamily) {
        return false;
    }
    return defaultFontFamilies.has(fontFamily);
};
exports.isDefaultFont = isDefaultFont;
exports.FontPicker = react_1.default.memo(({ isOpened, selectedFontFamily, hoveredFontFamily, onSelect, onHover, onLeave, onPopupChange, compactMode = false, }) => {
    const defaultFonts = (0, react_1.useMemo)(() => exports.DEFAULT_FONTS, []);
    const onSelectCallback = (0, react_1.useCallback)((value) => {
        if (value) {
            onSelect(value);
        }
    }, [onSelect]);
    return ((0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", className: (0, clsx_1.default)("FontPicker__container", {
            "FontPicker__container--compact": compactMode,
        }), children: [!compactMode && ((0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { type: "button", options: defaultFonts, value: selectedFontFamily, onClick: onSelectCallback }) })), !compactMode && (0, jsx_runtime_1.jsx)(ButtonSeparator_1.ButtonSeparator, {}), (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isOpened, onOpenChange: onPopupChange, children: [(0, jsx_runtime_1.jsx)(FontPickerTrigger_1.FontPickerTrigger, { selectedFontFamily: selectedFontFamily, isOpened: isOpened, compactMode: compactMode }), isOpened && ((0, jsx_runtime_1.jsx)(FontPickerList_1.FontPickerList, { selectedFontFamily: selectedFontFamily, hoveredFontFamily: hoveredFontFamily, onSelect: onSelectCallback, onHover: onHover, onLeave: onLeave, onOpen: () => onPopupChange(true), onClose: () => onPopupChange(false) }))] })] }));
}, (prev, next) => prev.isOpened === next.isOpened &&
    prev.selectedFontFamily === next.selectedFontFamily &&
    prev.hoveredFontFamily === next.hoveredFontFamily);
