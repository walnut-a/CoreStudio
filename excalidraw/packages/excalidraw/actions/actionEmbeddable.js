"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionSetEmbeddableAsActiveTool = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const cursor_1 = require("../cursor");
const register_1 = require("./register");
exports.actionSetEmbeddableAsActiveTool = (0, register_1.register)({
    name: "setEmbeddableAsActiveTool",
    trackEvent: { category: "toolbar" },
    target: "Tool",
    label: "toolBar.embeddable",
    perform: (elements, appState, _, app) => {
        const nextActiveTool = (0, common_1.updateActiveTool)(appState, {
            type: "embeddable",
        });
        (0, cursor_1.setCursorForShape)(app.canvas, {
            ...appState,
            activeTool: nextActiveTool,
        });
        return {
            elements,
            appState: {
                ...appState,
                activeTool: (0, common_1.updateActiveTool)(appState, {
                    type: "embeddable",
                }),
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
});
