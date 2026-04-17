"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionAddToLibrary = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
const register_1 = require("./register");
exports.actionAddToLibrary = (0, register_1.register)({
    name: "addToLibrary",
    trackEvent: { category: "element" },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
            includeElementsInFrames: true,
        });
        for (const type of common_1.LIBRARY_DISABLED_TYPES) {
            if (selectedElements.some((element) => element.type === type)) {
                return {
                    captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
                    appState: {
                        ...appState,
                        errorMessage: (0, i18n_1.t)(`errors.libraryElementTypeError.${type}`),
                    },
                };
            }
        }
        return app.library
            .getLatestLibrary()
            .then((items) => {
            return app.library.setLibrary([
                {
                    id: (0, common_1.randomId)(),
                    status: "unpublished",
                    elements: selectedElements.map(element_1.deepCopyElement),
                    created: Date.now(),
                },
                ...items,
            ]);
        })
            .then(() => {
            return {
                captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
                appState: {
                    ...appState,
                    toast: { message: (0, i18n_1.t)("toast.addedToLibrary") },
                },
            };
        })
            .catch((error) => {
            return {
                captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
                appState: {
                    ...appState,
                    errorMessage: error.message,
                },
            };
        });
    },
    label: "labels.addToLibrary",
});
