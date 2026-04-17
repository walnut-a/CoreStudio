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
const handleDegreeChange = ({ accumulatedChange, originalElements, shouldChangeByStepSize, nextValue, scene, app, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const origElement = originalElements[0];
    if (origElement && !(0, element_2.isElbowArrow)(origElement)) {
        const latestElement = elementsMap.get(origElement.id);
        if (!latestElement) {
            return;
        }
        if (nextValue !== undefined) {
            const nextAngle = (0, math_1.degreesToRadians)(nextValue);
            scene.mutateElement(latestElement, {
                angle: nextAngle,
            });
            (0, element_3.updateBindings)(latestElement, scene, app.state);
            const boundTextElement = (0, element_1.getBoundTextElement)(latestElement, elementsMap);
            if (boundTextElement && !(0, element_2.isArrowElement)(latestElement)) {
                scene.mutateElement(boundTextElement, { angle: nextAngle });
            }
            return;
        }
        const originalAngleInDegrees = Math.round((0, math_1.radiansToDegrees)(origElement.angle) * 100) / 100;
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
        (0, element_3.updateBindings)(latestElement, scene, app.state);
        const boundTextElement = (0, element_1.getBoundTextElement)(latestElement, elementsMap);
        if (boundTextElement && !(0, element_2.isArrowElement)(latestElement)) {
            scene.mutateElement(boundTextElement, { angle: nextAngle });
        }
    }
};
const Angle = ({ element, scene, appState, property }) => {
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: "A", icon: icons_1.angleIcon, value: Math.round(((0, math_1.radiansToDegrees)(element.angle) % 360) * 100) / 100, elements: [element], dragInputCallback: handleDegreeChange, editable: (0, utils_1.isPropertyEditable)(element, "angle"), scene: scene, appState: appState, property: property }));
};
exports.default = Angle;
