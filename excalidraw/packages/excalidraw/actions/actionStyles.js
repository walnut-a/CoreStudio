"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionPasteStyles = exports.actionCopyStyles = exports.copiedStyles = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const register_1 = require("./register");
// `copiedStyles` is exported only for tests.
exports.copiedStyles = "{}";
exports.actionCopyStyles = (0, register_1.register)({
    name: "copyStyles",
    label: "labels.copyStyles",
    icon: icons_1.paintIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, formData, app) => {
        const elementsCopied = [];
        const element = elements.find((el) => appState.selectedElementIds[el.id]);
        elementsCopied.push(element);
        if (element && (0, element_2.hasBoundTextElement)(element)) {
            const boundTextElement = (0, element_3.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap());
            elementsCopied.push(boundTextElement);
        }
        if (element) {
            exports.copiedStyles = JSON.stringify(elementsCopied);
        }
        return {
            appState: {
                ...appState,
                toast: { message: (0, i18n_1.t)("toast.copyStyles") },
            },
            captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.C,
});
exports.actionPasteStyles = (0, register_1.register)({
    name: "pasteStyles",
    label: "labels.pasteStyles",
    icon: icons_1.paintIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, formData, app) => {
        const elementsCopied = JSON.parse(exports.copiedStyles);
        const pastedElement = elementsCopied[0];
        const boundTextElement = elementsCopied[1];
        if (!(0, element_2.isExcalidrawElement)(pastedElement)) {
            return { elements, captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY };
        }
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState, {
            includeBoundTextElement: true,
        });
        const selectedElementIds = selectedElements.map((element) => element.id);
        return {
            elements: elements.map((element) => {
                if (selectedElementIds.includes(element.id)) {
                    let elementStylesToCopyFrom = pastedElement;
                    if ((0, element_2.isTextElement)(element) && element.containerId) {
                        elementStylesToCopyFrom = boundTextElement;
                    }
                    if (!elementStylesToCopyFrom) {
                        return element;
                    }
                    let newElement = (0, element_1.newElementWith)(element, {
                        backgroundColor: elementStylesToCopyFrom?.backgroundColor,
                        strokeWidth: elementStylesToCopyFrom?.strokeWidth,
                        strokeColor: elementStylesToCopyFrom?.strokeColor,
                        strokeStyle: elementStylesToCopyFrom?.strokeStyle,
                        fillStyle: elementStylesToCopyFrom?.fillStyle,
                        opacity: elementStylesToCopyFrom?.opacity,
                        roughness: elementStylesToCopyFrom?.roughness,
                        roundness: elementStylesToCopyFrom.roundness
                            ? (0, element_2.canApplyRoundnessTypeToElement)(elementStylesToCopyFrom.roundness.type, element)
                                ? elementStylesToCopyFrom.roundness
                                : (0, element_2.getDefaultRoundnessTypeForElement)(element)
                            : null,
                    });
                    if ((0, element_2.isTextElement)(newElement)) {
                        const fontSize = elementStylesToCopyFrom.fontSize ||
                            common_1.DEFAULT_FONT_SIZE;
                        const fontFamily = elementStylesToCopyFrom.fontFamily ||
                            common_1.DEFAULT_FONT_FAMILY;
                        newElement = (0, element_1.newElementWith)(newElement, {
                            fontSize,
                            fontFamily,
                            textAlign: elementStylesToCopyFrom.textAlign ||
                                common_1.DEFAULT_TEXT_ALIGN,
                            lineHeight: elementStylesToCopyFrom.lineHeight ||
                                (0, common_1.getLineHeight)(fontFamily),
                        });
                        let container = null;
                        if (newElement.containerId) {
                            container =
                                selectedElements.find((element) => (0, element_2.isTextElement)(newElement) &&
                                    element.id === newElement.containerId) || null;
                        }
                        (0, element_3.redrawTextBoundingBox)(newElement, container, app.scene);
                    }
                    if (newElement.type === "arrow" &&
                        (0, element_2.isArrowElement)(elementStylesToCopyFrom)) {
                        newElement = (0, element_1.newElementWith)(newElement, {
                            startArrowhead: elementStylesToCopyFrom.startArrowhead,
                            endArrowhead: elementStylesToCopyFrom.endArrowhead,
                        });
                    }
                    if ((0, element_2.isFrameLikeElement)(element)) {
                        newElement = (0, element_1.newElementWith)(newElement, {
                            roundness: null,
                            backgroundColor: "transparent",
                        });
                    }
                    return newElement;
                }
                return element;
            }),
            captureUpdate: element_4.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.altKey && event.code === common_1.CODES.V,
});
