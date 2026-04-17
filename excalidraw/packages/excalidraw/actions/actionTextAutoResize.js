"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionTextAutoResize = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const scene_1 = require("../scene");
const register_1 = require("./register");
exports.actionTextAutoResize = (0, register_1.register)({
    name: "autoResize",
    label: "labels.autoResize",
    icon: null,
    trackEvent: { category: "element" },
    predicate: (elements, appState, _) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return (selectedElements.length === 1 &&
            (0, element_3.isTextElement)(selectedElements[0]) &&
            !selectedElements[0].autoResize);
    },
    perform: (elements, appState, targetElement) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        const targetTextElement = (0, element_1.isExcalidrawElement)(targetElement) && (0, element_3.isTextElement)(targetElement)
            ? targetElement
            : selectedElements[0];
        return {
            appState,
            elements: elements.map((element) => {
                if (element.id === targetTextElement?.id && (0, element_3.isTextElement)(element)) {
                    const metrics = (0, element_2.measureText)(element.originalText, (0, common_1.getFontString)(element), element.lineHeight);
                    return (0, element_1.newElementWith)(element, {
                        autoResize: true,
                        width: metrics.width,
                        height: metrics.height,
                        text: element.originalText,
                    });
                }
                return element;
            }),
            captureUpdate: element_4.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
