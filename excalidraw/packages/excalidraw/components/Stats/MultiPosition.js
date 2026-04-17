"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const react_1 = require("react");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const moveElements = (property, changeInTopX, changeInTopY, originalElements, originalElementsMap, scene, appState) => {
    for (let i = 0; i < originalElements.length; i++) {
        const origElement = originalElements[i];
        const [cx, cy] = [
            origElement.x + origElement.width / 2,
            origElement.y + origElement.height / 2,
        ];
        const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(origElement.x, origElement.y), (0, math_1.pointFrom)(cx, cy), origElement.angle);
        const newTopLeftX = property === "x" ? Math.round(topLeftX + changeInTopX) : topLeftX;
        const newTopLeftY = property === "y" ? Math.round(topLeftY + changeInTopY) : topLeftY;
        (0, utils_2.moveElement)(newTopLeftX, newTopLeftY, origElement, scene, appState, originalElementsMap, false);
    }
};
const moveGroupTo = (nextX, nextY, originalElements, originalElementsMap, scene, appState) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const [x1, y1, ,] = (0, element_2.getCommonBounds)(originalElements);
    const offsetX = nextX - x1;
    const offsetY = nextY - y1;
    for (let i = 0; i < originalElements.length; i++) {
        const origElement = originalElements[i];
        const latestElement = elementsMap.get(origElement.id);
        if (!latestElement) {
            continue;
        }
        // bound texts are moved with their containers
        if (!(0, element_1.isTextElement)(latestElement) || !latestElement.containerId) {
            const [cx, cy] = [
                latestElement.x + latestElement.width / 2,
                latestElement.y + latestElement.height / 2,
            ];
            const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(latestElement.x, latestElement.y), (0, math_1.pointFrom)(cx, cy), latestElement.angle);
            (0, utils_2.moveElement)(topLeftX + offsetX, topLeftY + offsetY, origElement, scene, appState, originalElementsMap, false);
        }
    }
};
const handlePositionChange = ({ accumulatedChange, originalElements, originalElementsMap, shouldChangeByStepSize, nextValue, property, scene, originalAppState, app, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    if (nextValue !== undefined) {
        for (const atomicUnit of (0, utils_1.getAtomicUnits)(originalElements, originalAppState)) {
            const elementsInUnit = (0, utils_2.getElementsInAtomicUnit)(atomicUnit, elementsMap, originalElementsMap);
            if (elementsInUnit.length > 1) {
                const [x1, y1, ,] = (0, element_2.getCommonBounds)(elementsInUnit.map((el) => el.latest));
                const newTopLeftX = property === "x" ? nextValue : x1;
                const newTopLeftY = property === "y" ? nextValue : y1;
                moveGroupTo(newTopLeftX, newTopLeftY, elementsInUnit.map((el) => el.original), originalElementsMap, scene, app.state);
            }
            else {
                const origElement = elementsInUnit[0]?.original;
                const latestElement = elementsInUnit[0]?.latest;
                if (origElement &&
                    latestElement &&
                    (0, utils_1.isPropertyEditable)(latestElement, property)) {
                    const [cx, cy] = [
                        origElement.x + origElement.width / 2,
                        origElement.y + origElement.height / 2,
                    ];
                    const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(origElement.x, origElement.y), (0, math_1.pointFrom)(cx, cy), origElement.angle);
                    const newTopLeftX = property === "x" ? nextValue : topLeftX;
                    const newTopLeftY = property === "y" ? nextValue : topLeftY;
                    (0, utils_2.moveElement)(newTopLeftX, newTopLeftY, origElement, scene, app.state, originalElementsMap, false);
                }
            }
        }
        scene.triggerUpdate();
        return;
    }
    const change = shouldChangeByStepSize
        ? (0, utils_1.getStepSizedValue)(accumulatedChange, utils_1.STEP_SIZE)
        : accumulatedChange;
    const changeInTopX = property === "x" ? change : 0;
    const changeInTopY = property === "y" ? change : 0;
    moveElements(property, changeInTopX, changeInTopY, originalElements, originalElementsMap, scene, app.state);
    scene.triggerUpdate();
};
const MultiPosition = ({ property, elements, elementsMap, atomicUnits, scene, appState, }) => {
    const positions = (0, react_1.useMemo)(() => atomicUnits.map((atomicUnit) => {
        const elementsInUnit = Object.keys(atomicUnit)
            .map((id) => elementsMap.get(id))
            .filter((el) => el !== undefined);
        // we're dealing with a group
        if (elementsInUnit.length > 1) {
            const [x1, y1] = (0, element_2.getCommonBounds)(elementsInUnit);
            return Math.round((property === "x" ? x1 : y1) * 100) / 100;
        }
        const [el] = elementsInUnit;
        const [cx, cy] = [el.x + el.width / 2, el.y + el.height / 2];
        const [topLeftX, topLeftY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(el.x, el.y), (0, math_1.pointFrom)(cx, cy), el.angle);
        return Math.round((property === "x" ? topLeftX : topLeftY) * 100) / 100;
    }), [atomicUnits, elementsMap, property]);
    const value = new Set(positions).size === 1 ? positions[0] : "Mixed";
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: property === "x" ? "X" : "Y", elements: elements, dragInputCallback: handlePositionChange, value: value, property: property, scene: scene, appState: appState }));
};
exports.default = MultiPosition;
