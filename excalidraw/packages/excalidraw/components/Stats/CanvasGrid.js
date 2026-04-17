"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const scene_1 = require("../../scene");
const DragInput_1 = __importDefault(require("./DragInput"));
const utils_1 = require("./utils");
const STEP_SIZE = 5;
const CanvasGrid = ({ property, scene, appState, setAppState, }) => {
    return ((0, jsx_runtime_1.jsx)(DragInput_1.default, { label: "Grid step", sensitivity: 8, elements: [], dragInputCallback: ({ nextValue, instantChange, shouldChangeByStepSize, setInputValue, }) => {
            setAppState((state) => {
                let nextGridStep;
                if (nextValue) {
                    nextGridStep = nextValue;
                }
                else if (instantChange) {
                    nextGridStep = shouldChangeByStepSize
                        ? (0, utils_1.getStepSizedValue)(state.gridStep + STEP_SIZE * Math.sign(instantChange), STEP_SIZE)
                        : state.gridStep + instantChange;
                }
                if (!nextGridStep) {
                    setInputValue(state.gridStep);
                    return null;
                }
                nextGridStep = (0, scene_1.getNormalizedGridStep)(nextGridStep);
                setInputValue(nextGridStep);
                return {
                    gridStep: nextGridStep,
                };
            });
        }, scene: scene, value: appState.gridStep, property: property, appState: appState }));
};
exports.default = CanvasGrid;
