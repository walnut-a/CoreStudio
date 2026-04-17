"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeVertically = exports.distributeHorizontally = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
const enableActionGroup = (appState, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    return ((0, element_6.getSelectedElementsByGroup)(selectedElements, app.scene.getNonDeletedElementsMap(), appState).length > 2 &&
        // TODO enable distributing frames when implemented properly
        !selectedElements.some((el) => (0, element_2.isFrameLikeElement)(el)));
};
const distributeSelectedElements = (elements, appState, app, distribution) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    const updatedElements = (0, element_4.distributeElements)(selectedElements, app.scene.getNonDeletedElementsMap(), distribution, appState, app.scene);
    const updatedElementsMap = (0, common_1.arrayToMap)(updatedElements);
    return (0, element_3.updateFrameMembershipOfSelectedElements)(elements.map((element) => updatedElementsMap.get(element.id) || element), appState, app);
};
exports.distributeHorizontally = (0, register_1.register)({
    name: "distributeHorizontally",
    label: "labels.distributeHorizontally",
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: distributeSelectedElements(elements, appState, app, {
                space: "between",
                axis: "x",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.H,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !enableActionGroup(appState, app), type: "button", icon: icons_1.DistributeHorizontallyIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.distributeHorizontally")} — ${(0, shortcut_1.getShortcutKey)("Alt+H")}`, "aria-label": (0, i18n_1.t)("labels.distributeHorizontally"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.distributeVertically = (0, register_1.register)({
    name: "distributeVertically",
    label: "labels.distributeVertically",
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: distributeSelectedElements(elements, appState, app, {
                space: "between",
                axis: "y",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => !event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.V,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !enableActionGroup(appState, app), type: "button", icon: icons_1.DistributeVerticallyIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.distributeVertically")} — ${(0, shortcut_1.getShortcutKey)("Alt+V")}`, "aria-label": (0, i18n_1.t)("labels.distributeVertically"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
