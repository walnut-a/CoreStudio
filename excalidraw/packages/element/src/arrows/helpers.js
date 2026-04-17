"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeHandleArrowPointlikeDrag = void 0;
const linearElementEditor_1 = require("../linearElementEditor");
const focus_1 = require("./focus");
const maybeHandleArrowPointlikeDrag = ({ app, event, }) => {
    const appState = app.state;
    if (appState.selectedLinearElement && app.lastPointerMoveCoords) {
        // Update focus point status if the binding mode is changing
        if (appState.selectedLinearElement.draggedFocusPointBinding) {
            (0, focus_1.handleFocusPointDrag)(appState.selectedLinearElement, app.scene.getNonDeletedElementsMap(), app.lastPointerMoveCoords, app.scene, appState, app.getEffectiveGridSize(), event.altKey);
            return true;
        }
        else if (appState.selectedLinearElement.hoverPointIndex !== null &&
            app.lastPointerMoveEvent &&
            appState.selectedLinearElement.initialState.lastClickedPoint >= 0 &&
            appState.selectedLinearElement.isDragging) {
            linearElementEditor_1.LinearElementEditor.handlePointDragging(app.lastPointerMoveEvent, app, app.lastPointerMoveCoords.x, app.lastPointerMoveCoords.y, appState.selectedLinearElement);
            return true;
        }
    }
    return false;
};
exports.maybeHandleArrowPointlikeDrag = maybeHandleArrowPointlikeDrag;
