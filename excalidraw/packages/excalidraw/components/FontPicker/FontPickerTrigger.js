"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontPickerTrigger = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../../i18n");
const ButtonIcon_1 = require("../ButtonIcon");
const icons_1 = require("../icons");
const App_1 = require("../App");
const FontPickerTrigger = ({ selectedFontFamily, isOpened = false, compactMode = false, }) => {
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const compactStyle = compactMode
        ? {
            ...common_1.MOBILE_ACTION_BUTTON_BG,
            width: "2rem",
            height: "2rem",
        }
        : {};
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("div", { "data-openpopup": "fontFamily", className: "properties-trigger", children: (0, jsx_runtime_1.jsx)(ButtonIcon_1.ButtonIcon, { standalone: true, icon: icons_1.TextIcon, title: (0, i18n_1.t)("labels.showFonts"), className: "properties-trigger", testId: "font-family-show-fonts", active: isOpened, onClick: () => {
                    setAppState((appState) => ({
                        openPopup: appState.openPopup === "fontFamily" ? null : appState.openPopup,
                    }));
                }, style: {
                    border: "none",
                    ...compactStyle,
                } }) }) }));
};
exports.FontPickerTrigger = FontPickerTrigger;
