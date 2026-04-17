"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionLinkToElement = exports.actionCopyElementLink = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const clipboard_1 = require("../clipboard");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const register_1 = require("./register");
exports.actionCopyElementLink = (0, register_1.register)({
    name: "copyElementLink",
    label: "labels.copyElementLink",
    icon: icons_1.copyIcon,
    trackEvent: { category: "element" },
    perform: async (elements, appState, _, app) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        try {
            if (window.location) {
                const idAndType = (0, element_1.getLinkIdAndTypeFromSelection)(selectedElements, appState);
                if (idAndType) {
                    await (0, clipboard_1.copyTextToSystemClipboard)(app.props.generateLinkForSelection
                        ? app.props.generateLinkForSelection(idAndType.id, idAndType.type)
                        : (0, element_1.defaultGetElementLinkFromSelection)(idAndType.id, idAndType.type));
                    return {
                        appState: {
                            toast: {
                                message: (0, i18n_1.t)("toast.elementLinkCopied"),
                                closable: true,
                            },
                        },
                        captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
                    };
                }
                return {
                    appState,
                    elements,
                    app,
                    captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
                };
            }
        }
        catch (error) {
            console.error(error);
        }
        return {
            appState,
            elements,
            app,
            captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
        };
    },
    predicate: (elements, appState) => (0, element_1.canCreateLinkFromElements)((0, scene_1.getSelectedElements)(elements, appState)),
});
exports.actionLinkToElement = (0, register_1.register)({
    name: "linkToElement",
    label: "labels.linkToElement",
    icon: icons_1.elementLinkIcon,
    perform: (elements, appState, _, app) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        if (selectedElements.length !== 1 ||
            !(0, element_1.canCreateLinkFromElements)(selectedElements)) {
            return {
                elements,
                appState,
                app,
                captureUpdate: element_2.CaptureUpdateAction.EVENTUALLY,
            };
        }
        return {
            appState: {
                ...appState,
                openDialog: {
                    name: "elementLinkSelector",
                    sourceElementId: (0, scene_1.getSelectedElements)(elements, appState)[0].id,
                },
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    predicate: (elements, appState, appProps, app) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return (appState.openDialog?.name !== "elementLinkSelector" &&
            selectedElements.length === 1 &&
            (0, element_1.canCreateLinkFromElements)(selectedElements));
    },
    trackEvent: false,
});
