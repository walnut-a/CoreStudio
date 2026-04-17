"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionAlignHorizontallyCentered = exports.actionAlignVerticallyCentered = exports.actionAlignRight = exports.actionAlignLeft = exports.actionAlignBottom = exports.actionAlignTop = exports.alignActionsPredicate = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
const alignActionsPredicate = (appState, app) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    return ((0, element_6.getSelectedElementsByGroup)(selectedElements, app.scene.getNonDeletedElementsMap(), appState).length > 1 &&
        // TODO enable aligning frames when implemented properly
        !selectedElements.some((el) => (0, element_2.isFrameLikeElement)(el)));
};
exports.alignActionsPredicate = alignActionsPredicate;
const alignSelectedElements = (elements, appState, app, alignment) => {
    const selectedElements = app.scene.getSelectedElements(appState);
    const updatedElements = (0, element_4.alignElements)(selectedElements, alignment, app.scene, appState);
    const updatedElementsMap = (0, common_1.arrayToMap)(updatedElements);
    return (0, element_3.updateFrameMembershipOfSelectedElements)(elements.map((element) => updatedElementsMap.get(element.id) || element), appState, app);
};
exports.actionAlignTop = (0, register_1.register)({
    name: "alignTop",
    label: "labels.alignTop",
    icon: icons_1.AlignTopIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "start",
                axis: "y",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === common_1.KEYS.ARROW_UP,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.AlignTopIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.alignTop")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Up")}`, "aria-label": (0, i18n_1.t)("labels.alignTop"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionAlignBottom = (0, register_1.register)({
    name: "alignBottom",
    label: "labels.alignBottom",
    icon: icons_1.AlignBottomIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "end",
                axis: "y",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === common_1.KEYS.ARROW_DOWN,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.AlignBottomIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.alignBottom")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Down")}`, "aria-label": (0, i18n_1.t)("labels.alignBottom"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionAlignLeft = (0, register_1.register)({
    name: "alignLeft",
    label: "labels.alignLeft",
    icon: icons_1.AlignLeftIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "start",
                axis: "x",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === common_1.KEYS.ARROW_LEFT,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.AlignLeftIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.alignLeft")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Left")}`, "aria-label": (0, i18n_1.t)("labels.alignLeft"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionAlignRight = (0, register_1.register)({
    name: "alignRight",
    label: "labels.alignRight",
    icon: icons_1.AlignRightIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "end",
                axis: "x",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.shiftKey && event.key === common_1.KEYS.ARROW_RIGHT,
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.AlignRightIcon, onClick: () => updateData(null), title: `${(0, i18n_1.t)("labels.alignRight")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+Right")}`, "aria-label": (0, i18n_1.t)("labels.alignRight"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionAlignVerticallyCentered = (0, register_1.register)({
    name: "alignVerticallyCentered",
    label: "labels.centerVertically",
    icon: icons_1.CenterVerticallyIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "center",
                axis: "y",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.CenterVerticallyIcon, onClick: () => updateData(null), title: (0, i18n_1.t)("labels.centerVertically"), "aria-label": (0, i18n_1.t)("labels.centerVertically"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
exports.actionAlignHorizontallyCentered = (0, register_1.register)({
    name: "alignHorizontallyCentered",
    label: "labels.centerHorizontally",
    icon: icons_1.CenterHorizontallyIcon,
    trackEvent: { category: "element" },
    predicate: (elements, appState, appProps, app) => (0, exports.alignActionsPredicate)(appState, app),
    perform: (elements, appState, _, app) => {
        return {
            appState,
            elements: alignSelectedElements(elements, appState, app, {
                position: "center",
                axis: "x",
            }),
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { hidden: !(0, exports.alignActionsPredicate)(appState, app), type: "button", icon: icons_1.CenterHorizontallyIcon, onClick: () => updateData(null), title: (0, i18n_1.t)("labels.centerHorizontally"), "aria-label": (0, i18n_1.t)("labels.centerHorizontally"), visible: (0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState) })),
});
