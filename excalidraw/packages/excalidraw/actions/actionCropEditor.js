"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleCropEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const register_1 = require("./register");
exports.actionToggleCropEditor = (0, register_1.register)({
    name: "cropEditor",
    label: "helpDialog.cropStart",
    icon: icons_1.cropIcon,
    viewMode: true,
    trackEvent: { category: "menu" },
    keywords: ["image", "crop"],
    perform(elements, appState, _, app) {
        const selectedElement = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
        })[0];
        return {
            appState: {
                ...appState,
                isCropping: false,
                croppingElementId: selectedElement.id,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        if (!appState.croppingElementId &&
            selectedElements.length === 1 &&
            (0, element_1.isImageElement)(selectedElements[0])) {
            return true;
        }
        return false;
    },
    PanelComponent: ({ appState, updateData, app }) => {
        const label = (0, i18n_1.t)("helpDialog.cropStart");
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.cropIcon, title: label, "aria-label": label, onClick: () => updateData(null) }));
    },
});
