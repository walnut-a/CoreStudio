"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const icons_1 = require("../icons");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const MIN_FONT_SIZE = 4;
const STEP_SIZE = 4;
const getApplicableTextElements = (elements, elementsMap) => elements.reduce((acc, el) => {
    if (!el || (0, element_3.isInGroup)(el)) {
        return acc;
    }
    if ((0, element_2.isTextElement)(el)) {
        acc.push(el);
        return acc;
    }
    if ((0, element_2.hasBoundTextElement)(el)) {
        const boundTextElement = (0, element_1.getBoundTextElement)(el, elementsMap);
        if (boundTextElement) {
            acc.push(boundTextElement);
            return acc;
        }
    }
    return acc;
}, []);
const handleFontSizeChange = ({ accumulatedChange, originalElements, shouldChangeByStepSize, nextValue, scene, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const latestTextElements = originalElements.map((el) => elementsMap.get(el.id));
    let nextFontSize;
    if (nextValue) {
        nextFontSize = Math.max(Math.round(nextValue), MIN_FONT_SIZE);
        for (const textElement of latestTextElements) {
            scene.mutateElement(textElement, {
                fontSize: nextFontSize,
            });
            (0, element_1.redrawTextBoundingBox)(textElement, scene.getContainerElement(textElement), scene);
        }
        scene.triggerUpdate();
    }
    else {
        const originalTextElements = originalElements;
        for (let i = 0; i < latestTextElements.length; i++) {
            const latestElement = latestTextElements[i];
            const originalElement = originalTextElements[i];
            const originalFontSize = Math.round(originalElement.fontSize);
            const changeInFontSize = Math.round(accumulatedChange);
            let nextFontSize = Math.max(originalFontSize + changeInFontSize, MIN_FONT_SIZE);
            if (shouldChangeByStepSize) {
                nextFontSize = (0, utils_1.getStepSizedValue)(nextFontSize, STEP_SIZE);
            }
            scene.mutateElement(latestElement, {
                fontSize: nextFontSize,
            });
            (0, element_1.redrawTextBoundingBox)(latestElement, scene.getContainerElement(latestElement), scene);
        }
        scene.triggerUpdate();
    }
};
const MultiFontSize = ({ elements, scene, appState, property, elementsMap, }) => {
    const latestTextElements = getApplicableTextElements(elements, elementsMap);
    if (!latestTextElements.length) {
        return null;
    }
    const fontSizes = latestTextElements.map((textEl) => Math.round(textEl.fontSize * 10) / 10);
    const value = new Set(fontSizes).size === 1 ? fontSizes[0] : "Mixed";
    const editable = fontSizes.length > 0;
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: "F", icon: icons_1.fontSizeIcon, elements: latestTextElements, dragInputCallback: handleFontSizeChange, value: value, editable: editable, scene: scene, property: property, appState: appState }));
};
exports.default = MultiFontSize;
