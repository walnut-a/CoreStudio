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
exports.FontPickerList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const fonts_1 = require("../../fonts");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const PropertiesPopover_1 = require("../PropertiesPopover");
const QuickSearch_1 = require("../QuickSearch");
const ScrollableList_1 = require("../ScrollableList");
const DropdownMenuGroup_1 = __importDefault(require("../dropdownMenu/DropdownMenuGroup"));
const DropdownMenuItem_1 = require("../dropdownMenu/DropdownMenuItem");
const DropdownMenuItemContent_1 = __importDefault(require("../dropdownMenu/DropdownMenuItemContent"));
const common_2 = require("../dropdownMenu/common");
const icons_1 = require("../icons");
const keyboardNavHandlers_1 = require("./keyboardNavHandlers");
const getFontFamilyIcon = (fontFamily) => {
    switch (fontFamily) {
        case common_1.FONT_FAMILY.Excalifont:
        case common_1.FONT_FAMILY.Virgil:
            return icons_1.FreedrawIcon;
        case common_1.FONT_FAMILY.Nunito:
        case common_1.FONT_FAMILY.Helvetica:
            return icons_1.FontFamilyNormalIcon;
        case common_1.FONT_FAMILY["Lilita One"]:
            return icons_1.FontFamilyHeadingIcon;
        case common_1.FONT_FAMILY["Comic Shanns"]:
        case common_1.FONT_FAMILY.Cascadia:
            return icons_1.FontFamilyCodeIcon;
        default:
            return icons_1.FontFamilyNormalIcon;
    }
};
const getFontFamilyLabel = (fontFamily, fontFaces) => 
// prefer our config as the browser resolved names may be wrapped in quotes and such
Object.entries(common_1.FONT_FAMILY).find(([, id]) => id === fontFamily)?.[0] ??
    fontFaces[0]?.fontFace?.family ??
    "Unknown";
exports.FontPickerList = react_1.default.memo(({ selectedFontFamily, hoveredFontFamily, onSelect, onHover, onLeave, onOpen, onClose, }) => {
    const { container } = (0, App_1.useExcalidrawContainer)();
    const app = (0, App_1.useApp)();
    const { fonts } = app;
    const { showDeprecatedFonts } = (0, App_1.useAppProps)();
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const [searchTerm, setSearchTerm] = (0, react_1.useState)("");
    const inputRef = (0, react_1.useRef)(null);
    const allFonts = (0, react_1.useMemo)(() => Array.from(fonts_1.Fonts.registered.entries())
        .filter(([_, { metadata }]) => !metadata.private && !metadata.fallback)
        .map(([familyId, { metadata, fontFaces }]) => {
        const fontDescriptor = {
            value: familyId,
            icon: getFontFamilyIcon(familyId),
            text: getFontFamilyLabel(familyId, fontFaces),
        };
        if (metadata.deprecated) {
            Object.assign(fontDescriptor, {
                deprecated: metadata.deprecated,
                badge: {
                    type: DropdownMenuItem_1.DropDownMenuItemBadgeType.RED,
                    placeholder: (0, i18n_1.t)("fontList.badge.old"),
                },
            });
        }
        return fontDescriptor;
    })
        .sort((a, b) => a.text.toLowerCase() > b.text.toLowerCase() ? 1 : -1), []);
    const sceneFamilies = (0, react_1.useMemo)(() => new Set(fonts.getSceneFamilies()), 
    // cache per selected font family, so hover re-render won't mess it up
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFontFamily]);
    const sceneFonts = (0, react_1.useMemo)(() => allFonts.filter((font) => sceneFamilies.has(font.value)), // always show all the fonts in the scene, even those that were deprecated
    [allFonts, sceneFamilies]);
    const availableFonts = (0, react_1.useMemo)(() => allFonts.filter((font) => !sceneFamilies.has(font.value) &&
        (showDeprecatedFonts || !font.deprecated)), [allFonts, sceneFamilies, showDeprecatedFonts]);
    const filteredFonts = (0, react_1.useMemo)(() => (0, common_1.arrayToList)([...sceneFonts, ...availableFonts].filter((font) => font.text?.toLowerCase().includes(searchTerm))), [sceneFonts, availableFonts, searchTerm]);
    const hoveredFont = (0, react_1.useMemo)(() => {
        let font;
        if (hoveredFontFamily) {
            font = filteredFonts.find((font) => font.value === hoveredFontFamily);
        }
        else if (selectedFontFamily) {
            font = filteredFonts.find((font) => font.value === selectedFontFamily);
        }
        if (!font && searchTerm) {
            if (filteredFonts[0]?.value) {
                // hover first element on search
                onHover(filteredFonts[0].value);
            }
            else {
                // re-render cache on no results
                onLeave();
            }
        }
        return font;
    }, [
        hoveredFontFamily,
        selectedFontFamily,
        searchTerm,
        filteredFonts,
        onHover,
        onLeave,
    ]);
    // Create a wrapped onSelect function that preserves caret position
    const wrappedOnSelect = (0, react_1.useCallback)((fontFamily) => {
        // Save caret position before font selection if editing text
        let savedSelection = null;
        if (app.state.editingTextElement) {
            const textEditor = document.querySelector(".excalidraw-wysiwyg");
            if (textEditor) {
                savedSelection = {
                    start: textEditor.selectionStart,
                    end: textEditor.selectionEnd,
                };
            }
        }
        onSelect(fontFamily);
        // Restore caret position after font selection if editing text
        if (app.state.editingTextElement && savedSelection) {
            setTimeout(() => {
                const textEditor = document.querySelector(".excalidraw-wysiwyg");
                if (textEditor && savedSelection) {
                    textEditor.focus();
                    textEditor.selectionStart = savedSelection.start;
                    textEditor.selectionEnd = savedSelection.end;
                }
            }, 0);
        }
    }, [onSelect, app.state.editingTextElement]);
    const onKeyDown = (0, react_1.useCallback)((event) => {
        const handled = (0, keyboardNavHandlers_1.fontPickerKeyHandler)({
            event,
            inputRef,
            hoveredFont,
            filteredFonts,
            onSelect: wrappedOnSelect,
            onHover,
            onClose,
        });
        if (handled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, [hoveredFont, filteredFonts, wrappedOnSelect, onHover, onClose]);
    (0, react_1.useEffect)(() => {
        onOpen();
        return () => {
            onClose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const sceneFilteredFonts = (0, react_1.useMemo)(() => filteredFonts.filter((font) => sceneFamilies.has(font.value)), [filteredFonts, sceneFamilies]);
    const availableFilteredFonts = (0, react_1.useMemo)(() => filteredFonts.filter((font) => !sceneFamilies.has(font.value)), [filteredFonts, sceneFamilies]);
    const FontPickerListItem = ({ font, order, }) => {
        const ref = (0, react_1.useRef)(null);
        const isHovered = font.value === hoveredFont?.value;
        const isSelected = font.value === selectedFontFamily;
        (0, react_1.useEffect)(() => {
            if (!isHovered) {
                return;
            }
            if (order === 0) {
                // scroll into the first item differently, so it's visible what is above (i.e. group title)
                ref.current?.scrollIntoView?.({ block: "end" });
            }
            else {
                ref.current?.scrollIntoView?.({ block: "nearest" });
            }
        }, [isHovered, order]);
        return ((0, jsx_runtime_1.jsx)("button", { ref: ref, type: "button", value: font.value, className: (0, common_2.getDropdownMenuItemClassName)("", isSelected, isHovered), title: font.text, 
            // allow to tab between search and selected font
            tabIndex: isSelected ? 0 : -1, onClick: (e) => {
                wrappedOnSelect(Number(e.currentTarget.value));
            }, onMouseMove: () => {
                if (hoveredFont?.value !== font.value) {
                    onHover(font.value);
                }
            }, children: (0, jsx_runtime_1.jsx)(DropdownMenuItemContent_1.default, { icon: font.icon, badge: font.badge && ((0, jsx_runtime_1.jsx)(DropdownMenuItem_1.DropDownMenuItemBadge, { type: font.badge.type, children: font.badge.placeholder })), textStyle: {
                    fontFamily: (0, common_1.getFontFamilyString)({ fontFamily: font.value }),
                }, children: font.text }) }));
    };
    const groups = [];
    if (sceneFilteredFonts.length) {
        groups.push((0, jsx_runtime_1.jsx)(DropdownMenuGroup_1.default, { title: (0, i18n_1.t)("fontList.sceneFonts"), children: sceneFilteredFonts.map((font, index) => ((0, jsx_runtime_1.jsx)(FontPickerListItem, { font: font, order: index }, font.value))) }, "group_1"));
    }
    if (availableFilteredFonts.length) {
        groups.push((0, jsx_runtime_1.jsx)(DropdownMenuGroup_1.default, { title: (0, i18n_1.t)("fontList.availableFonts"), children: availableFilteredFonts.map((font, index) => ((0, jsx_runtime_1.jsx)(FontPickerListItem, { font: font, order: index + sceneFilteredFonts.length }, font.value))) }, "group_2"));
    }
    return ((0, jsx_runtime_1.jsxs)(PropertiesPopover_1.PropertiesPopover, { className: "properties-content", container: container, style: { width: "15rem" }, onClose: () => {
            onClose();
            // Refocus text editor when font picker closes if we were editing text
            if (app.state.editingTextElement) {
                setTimeout(() => {
                    const textEditor = document.querySelector(".excalidraw-wysiwyg");
                    if (textEditor) {
                        textEditor.focus();
                    }
                }, 0);
            }
        }, onPointerLeave: onLeave, onKeyDown: onKeyDown, preventAutoFocusOnTouch: !!app.state.editingTextElement, children: [stylesPanelMode === "full" && ((0, jsx_runtime_1.jsx)(QuickSearch_1.QuickSearch, { ref: inputRef, placeholder: (0, i18n_1.t)("quickSearch.placeholder"), onChange: (0, common_1.debounce)(setSearchTerm, 20) })), (0, jsx_runtime_1.jsx)(ScrollableList_1.ScrollableList, { className: "dropdown-menu fonts manual-hover", placeholder: (0, i18n_1.t)("fontList.empty"), children: groups.length ? groups : null })] }));
}, (prev, next) => prev.selectedFontFamily === next.selectedFontFamily &&
    prev.hoveredFontFamily === next.hoveredFontFamily);
