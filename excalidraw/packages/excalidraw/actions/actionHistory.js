"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedoAction = exports.createUndoAction = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const history_1 = require("../history");
const useEmitter_1 = require("../hooks/useEmitter");
const i18n_1 = require("../i18n");
const App_1 = require("../components/App");
const executeHistoryAction = (app, appState, updater) => {
    if (!appState.multiElement &&
        !appState.resizingElement &&
        !appState.editingTextElement &&
        !appState.newElement &&
        !appState.selectedElementsAreBeingDragged &&
        !appState.selectionElement &&
        !app.flowChartCreator.isCreatingChart) {
        const result = updater();
        if (!result) {
            return { captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY };
        }
        const [nextElementsMap, nextAppState] = result;
        // order by fractional indices in case the map was accidently modified in the meantime
        const nextElements = (0, element_2.orderByFractionalIndex)(Array.from(nextElementsMap.values()));
        return {
            appState: nextAppState,
            elements: nextElements,
            captureUpdate: element_1.CaptureUpdateAction.NEVER,
        };
    }
    return { captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY };
};
const createUndoAction = (history) => ({
    name: "undo",
    label: "buttons.undo",
    icon: icons_1.UndoIcon,
    trackEvent: { category: "history" },
    viewMode: false,
    perform: (elements, appState, value, app) => executeHistoryAction(app, appState, () => history.undo((0, common_1.arrayToMap)(elements), appState)),
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && (0, common_1.matchKey)(event, common_1.KEYS.Z) && !event.shiftKey,
    PanelComponent: ({ appState, updateData, data, app }) => {
        const { isUndoStackEmpty } = (0, useEmitter_1.useEmitter)(history.onHistoryChangedEmitter, new history_1.HistoryChangedEvent(history.isUndoStackEmpty, history.isRedoStackEmpty));
        const isMobile = (0, App_1.useStylesPanelMode)() === "mobile";
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.UndoIcon, "aria-label": (0, i18n_1.t)("buttons.undo"), onClick: updateData, size: data?.size || "medium", disabled: isUndoStackEmpty, "data-testid": "button-undo", style: {
                ...(isMobile ? common_1.MOBILE_ACTION_BUTTON_BG : {}),
            } }));
    },
});
exports.createUndoAction = createUndoAction;
const createRedoAction = (history) => ({
    name: "redo",
    label: "buttons.redo",
    icon: icons_1.RedoIcon,
    trackEvent: { category: "history" },
    viewMode: false,
    perform: (elements, appState, __, app) => executeHistoryAction(app, appState, () => history.redo((0, common_1.arrayToMap)(elements), appState)),
    keyTest: (event) => (event[common_1.KEYS.CTRL_OR_CMD] && event.shiftKey && (0, common_1.matchKey)(event, common_1.KEYS.Z)) ||
        (common_1.isWindows && event.ctrlKey && !event.shiftKey && (0, common_1.matchKey)(event, common_1.KEYS.Y)),
    PanelComponent: ({ appState, updateData, data, app }) => {
        const { isRedoStackEmpty } = (0, useEmitter_1.useEmitter)(history.onHistoryChangedEmitter, new history_1.HistoryChangedEvent(history.isUndoStackEmpty, history.isRedoStackEmpty));
        const isMobile = (0, App_1.useStylesPanelMode)() === "mobile";
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.RedoIcon, "aria-label": (0, i18n_1.t)("buttons.redo"), onClick: updateData, size: data?.size || "medium", disabled: isRedoStackEmpty, "data-testid": "button-redo", style: {
                ...(isMobile ? common_1.MOBILE_ACTION_BUTTON_BG : {}),
            } }));
    },
});
exports.createRedoAction = createRedoAction;
