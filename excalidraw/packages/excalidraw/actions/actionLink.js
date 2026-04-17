"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionLink = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_2 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const Hyperlink_1 = require("../components/hyperlink/Hyperlink");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
exports.actionLink = (0, register_1.register)({
    name: "hyperlink",
    label: (elements, appState) => (0, Hyperlink_1.getContextMenuLabel)(elements, appState),
    icon: icons_1.LinkIcon,
    perform: (elements, appState) => {
        if (appState.showHyperlinkPopup === "editor") {
            return false;
        }
        return {
            elements,
            appState: {
                ...appState,
                showHyperlinkPopup: "editor",
                openMenu: null,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    trackEvent: { category: "hyperlink", action: "click" },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.K,
    predicate: (elements, appState) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return selectedElements.length === 1;
    },
    PanelComponent: ({ elements, appState, updateData }) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.LinkIcon, "aria-label": (0, i18n_1.t)((0, Hyperlink_1.getContextMenuLabel)(elements, appState)), title: `${(0, element_1.isEmbeddableElement)(elements[0])
                ? (0, i18n_1.t)("labels.link.labelEmbed")
                : (0, i18n_1.t)("labels.link.label")} - ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+K")}`, onClick: () => updateData(null), selected: selectedElements.length === 1 && !!selectedElements[0].link }));
    },
});
