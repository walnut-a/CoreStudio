"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const icons_1 = require("../icons");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const MIN_FONT_SIZE = 4;
const STEP_SIZE = 4;
const handleFontSizeChange = ({ accumulatedChange, originalElements, shouldChangeByStepSize, nextValue, scene, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const origElement = originalElements[0];
    if (origElement) {
        const latestElement = elementsMap.get(origElement.id);
        if (!latestElement || !(0, element_2.isTextElement)(latestElement)) {
            return;
        }
        let nextFontSize;
        if (nextValue !== undefined) {
            nextFontSize = Math.max(Math.round(nextValue), MIN_FONT_SIZE);
        }
        else if (origElement.type === "text") {
            const originalFontSize = Math.round(origElement.fontSize);
            const changeInFontSize = Math.round(accumulatedChange);
            nextFontSize = Math.max(originalFontSize + changeInFontSize, MIN_FONT_SIZE);
            if (shouldChangeByStepSize) {
                nextFontSize = (0, utils_1.getStepSizedValue)(nextFontSize, STEP_SIZE);
            }
        }
        if (nextFontSize) {
            scene.mutateElement(latestElement, {
                fontSize: nextFontSize,
            });
            (0, element_1.redrawTextBoundingBox)(latestElement, scene.getContainerElement(latestElement), scene);
        }
    }
};
const FontSize = ({ element, scene, appState, property }) => {
    const _element = (0, element_2.isTextElement)(element)
        ? element
        : (0, element_2.hasBoundTextElement)(element)
            ? (0, element_1.getBoundTextElement)(element, scene.getNonDeletedElementsMap())
            : null;
    if (!_element) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: "F", value: Math.round(_element.fontSize * 10) / 10, elements: [_element], dragInputCallback: handleFontSizeChange, icon: icons_1.fontSizeIcon, appState: appState, scene: scene, property: property }));
};
exports.default = FontSize;
