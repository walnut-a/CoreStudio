"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionManager = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const analytics_1 = require("../analytics");
const trackAction = (action, source, appState, elements, app, value) => {
    if (action.trackEvent) {
        try {
            if (typeof action.trackEvent === "object") {
                const shouldTrack = action.trackEvent.predicate
                    ? action.trackEvent.predicate(appState, elements, value)
                    : true;
                if (shouldTrack) {
                    (0, analytics_1.trackEvent)(action.trackEvent.category, action.trackEvent.action || action.name, `${source} (${app.editorInterface.formFactor === "phone" ? "mobile" : "desktop"})`);
                }
            }
        }
        catch (error) {
            console.error("error while logging action:", error);
        }
    }
};
class ActionManager {
    actions = {};
    updater;
    getAppState;
    getElementsIncludingDeleted;
    app;
    constructor(updater, getAppState, getElementsIncludingDeleted, app) {
        this.updater = (actionResult) => {
            if ((0, common_1.isPromiseLike)(actionResult)) {
                actionResult.then((actionResult) => {
                    return updater(actionResult);
                });
            }
            else {
                return updater(actionResult);
            }
        };
        this.getAppState = getAppState;
        this.getElementsIncludingDeleted = getElementsIncludingDeleted;
        this.app = app;
    }
    registerAction(action) {
        this.actions[action.name] = action;
    }
    registerAll(actions) {
        actions.forEach((action) => this.registerAction(action));
    }
    handleKeyDown(event) {
        const canvasActions = this.app.props.UIOptions.canvasActions;
        const data = Object.values(this.actions)
            .sort((a, b) => (b.keyPriority || 0) - (a.keyPriority || 0))
            .filter((action) => (action.name in canvasActions
            ? canvasActions[action.name]
            : true) &&
            action.keyTest &&
            action.keyTest(event, this.getAppState(), this.getElementsIncludingDeleted(), this.app));
        if (data.length !== 1) {
            if (data.length > 1) {
                console.warn("Canceling as multiple actions match this shortcut", data);
            }
            return false;
        }
        const action = data[0];
        if (this.getAppState().viewModeEnabled && action.viewMode !== true) {
            return false;
        }
        const elements = this.getElementsIncludingDeleted();
        const appState = this.getAppState();
        const value = null;
        trackAction(action, "keyboard", appState, elements, this.app, null);
        event.preventDefault();
        event.stopPropagation();
        this.updater(data[0].perform(elements, appState, value, this.app));
        return true;
    }
    executeAction(action, source = "api", value = null) {
        const elements = this.getElementsIncludingDeleted();
        const appState = this.getAppState();
        trackAction(action, source, appState, elements, this.app, value);
        this.updater(action.perform(elements, appState, value, this.app));
    }
    /**
     * @param data additional data sent to the PanelComponent
     */
    renderAction = (name, data) => {
        const canvasActions = this.app.props.UIOptions.canvasActions;
        if (this.actions[name] &&
            "PanelComponent" in this.actions[name] &&
            (name in canvasActions
                ? canvasActions[name]
                : true)) {
            const action = this.actions[name];
            const PanelComponent = action.PanelComponent;
            PanelComponent.displayName = "PanelComponent";
            const elements = this.getElementsIncludingDeleted();
            const appState = this.getAppState();
            const updateData = (formState) => {
                trackAction(action, "ui", appState, elements, this.app, formState);
                this.updater(action.perform(this.getElementsIncludingDeleted(), this.getAppState(), formState, this.app));
            };
            return ((0, jsx_runtime_1.jsx)(PanelComponent, { elements: this.getElementsIncludingDeleted(), appState: this.getAppState(), updateData: updateData, appProps: this.app.props, app: this.app, data: data, renderAction: this.renderAction }));
        }
        return null;
    };
    isActionEnabled = (action) => {
        const elements = this.getElementsIncludingDeleted();
        const appState = this.getAppState();
        return (!action.predicate ||
            action.predicate(elements, appState, this.app.props, this.app));
    };
}
exports.ActionManager = ActionManager;
