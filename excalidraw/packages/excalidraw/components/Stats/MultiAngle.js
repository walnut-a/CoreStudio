"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const icons_1 = require("../icons");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const STEP_SIZE = 15;
const handleDegreeChange = ({ accumulatedChange, originalElements, shouldChangeByStepSize, nextValue, property, scene, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const editableLatestIndividualElements = originalElements
        .map((el) => elementsMap.get(el.id))
        .filter((el) => el && !(0, element_3.isInGroup)(el) && (0, utils_1.isPropertyEditable)(el, property));
    const editableOriginalIndividualElements = originalElements.filter((el) => !(0, element_3.isInGroup)(el) && (0, utils_1.isPropertyEditable)(el, property));
    if (nextValue !== undefined) {
        const nextAngle = (0, math_1.degreesToRadians)(nextValue);
        for (const element of editableLatestIndividualElements) {
            if (!element) {
                continue;
            }
            scene.mutateElement(element, {
                angle: nextAngle,
            });
            const boundTextElement = (0, element_1.getBoundTextElement)(element, elementsMap);
            if (boundTextElement && !(0, element_2.isArrowElement)(element)) {
                scene.mutateElement(boundTextElement, { angle: nextAngle });
            }
        }
        scene.triggerUpdate();
        return;
    }
    for (let i = 0; i < editableLatestIndividualElements.length; i++) {
        const latestElement = editableLatestIndividualElements[i];
        if (!latestElement) {
            continue;
        }
        const originalElement = editableOriginalIndividualElements[i];
        const originalAngleInDegrees = Math.round((0, math_1.radiansToDegrees)(originalElement.angle) * 100) / 100;
        const changeInDegrees = Math.round(accumulatedChange);
        let nextAngleInDegrees = (originalAngleInDegrees + changeInDegrees) % 360;
        if (shouldChangeByStepSize) {
            nextAngleInDegrees = (0, utils_1.getStepSizedValue)(nextAngleInDegrees, STEP_SIZE);
        }
        nextAngleInDegrees =
            nextAngleInDegrees < 0 ? nextAngleInDegrees + 360 : nextAngleInDegrees;
        const nextAngle = (0, math_1.degreesToRadians)(nextAngleInDegrees);
        scene.mutateElement(latestElement, {
            angle: nextAngle,
        });
        const boundTextElement = (0, element_1.getBoundTextElement)(latestElement, elementsMap);
        if (boundTextElement && !(0, element_2.isArrowElement)(latestElement)) {
            scene.mutateElement(boundTextElement, { angle: nextAngle });
        }
    }
    scene.triggerUpdate();
};
const MultiAngle = ({ elements, scene, appState, property, }) => {
    const editableLatestIndividualElements = elements.filter((el) => !(0, element_3.isInGroup)(el) && (0, utils_1.isPropertyEditable)(el, "angle"));
    const angles = editableLatestIndividualElements.map((el) => Math.round(((0, math_1.radiansToDegrees)(el.angle) % 360) * 100) / 100);
    const value = new Set(angles).size === 1 ? angles[0] : "Mixed";
    const editable = editableLatestIndividualElements.some((el) => (0, utils_1.isPropertyEditable)(el, "angle"));
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: "A", icon: icons_1.angleIcon, value: value, elements: elements, dragInputCallback: handleDegreeChange, editable: editable, appState: appState, scene: scene, property: property }));
};
exports.default = MultiAngle;
