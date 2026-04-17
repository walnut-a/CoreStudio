"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSelectedShapeActions = void 0;
const selection_1 = require("./selection");
const showSelectedShapeActions = (appState, elements) => Boolean(!appState.viewModeEnabled &&
    appState.openDialog?.name !== "elementLinkSelector" &&
    ((appState.activeTool.type !== "custom" &&
        (appState.editingTextElement ||
            (appState.activeTool.type !== "selection" &&
                appState.activeTool.type !== "lasso" &&
                appState.activeTool.type !== "eraser" &&
                appState.activeTool.type !== "hand" &&
                appState.activeTool.type !== "laser"))) ||
        (0, selection_1.getSelectedElements)(elements, appState).length));
exports.showSelectedShapeActions = showSelectedShapeActions;
