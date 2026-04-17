"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const App_1 = require("../App");
const InlineIcon_1 = require("../InlineIcon");
const utils_1 = require("./utils");
require("./DragInput.scss");
const StatsDragInput = ({ label, icon, dragInputCallback, value, elements, editable = true, shouldKeepAspectRatio, property, scene, appState, sensitivity = 1, dragFinishedCallback, }) => {
    const app = (0, App_1.useApp)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const inputRef = (0, react_1.useRef)(null);
    const labelRef = (0, react_1.useRef)(null);
    const [inputValue, setInputValue] = (0, react_1.useState)(value.toString());
    const stateRef = (0, react_1.useRef)(null);
    if (!stateRef.current) {
        stateRef.current = {
            originalAppState: (0, common_1.cloneJSON)(appState),
            originalElements: elements,
            lastUpdatedValue: inputValue,
            updatePending: false,
        };
    }
    (0, react_1.useEffect)(() => {
        const inputValue = value.toString();
        setInputValue(inputValue);
        stateRef.current.lastUpdatedValue = inputValue;
    }, [value]);
    const handleInputValue = (updatedValue, elements, appState) => {
        if (!stateRef.current.updatePending) {
            return false;
        }
        stateRef.current.updatePending = false;
        const parsed = Number(updatedValue);
        if (isNaN(parsed)) {
            setInputValue(value.toString());
            return;
        }
        const rounded = Number(parsed.toFixed(2));
        const original = Number(value);
        // only update when
        // 1. original was "Mixed" and we have a new value
        // 2. original was not "Mixed" and the difference between a new value and previous value is greater
        //    than the smallest delta allowed, which is 0.01
        // reason: idempotent to avoid unnecessary
        if (isNaN(original) || Math.abs(rounded - original) >= utils_1.SMALLEST_DELTA) {
            stateRef.current.lastUpdatedValue = updatedValue;
            dragInputCallback({
                accumulatedChange: 0,
                instantChange: 0,
                originalElements: elements,
                originalElementsMap: app.scene.getNonDeletedElementsMap(),
                shouldKeepAspectRatio: shouldKeepAspectRatio,
                shouldChangeByStepSize: false,
                scene,
                nextValue: rounded,
                property,
                originalAppState: appState,
                setInputValue: (value) => setInputValue(String(value)),
                app,
                setAppState,
            });
            app.syncActionResult({
                captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
            });
        }
    };
    const callbacksRef = (0, react_1.useRef)({});
    callbacksRef.current.handleInputValue = handleInputValue;
    // make sure that clicking on canvas (which umounts the component)
    // updates current input value (blur isn't triggered)
    (0, react_1.useEffect)(() => {
        const input = inputRef.current;
        const callbacks = callbacksRef.current;
        return () => {
            const nextValue = input?.value;
            if (nextValue) {
                callbacks.handleInputValue?.(nextValue, stateRef.current.originalElements, stateRef.current.originalAppState);
            }
            // generally not needed, but in case `pointerup` doesn't fire and
            // we don't remove the listeners that way, we should at least remove
            // on unmount
            window.removeEventListener(common_1.EVENT.POINTER_MOVE, callbacks.onPointerMove, false);
            window.removeEventListener(common_1.EVENT.POINTER_UP, callbacks.onPointerUp, false);
        };
    }, [
        // we need to track change of `editable` state as mount/unmount
        // because react doesn't trigger `blur` when a an input is blurred due
        // to being disabled (https://github.com/facebook/react/issues/9142).
        // As such, if we keep rendering disabled inputs, then change in selection
        // to an element that has a given property as non-editable would not trigger
        // blur/unmount and wouldn't update the value.
        editable,
    ]);
    if (!editable) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("drag-input-container", !editable && "disabled"), "data-testid": label, children: [(0, jsx_runtime_1.jsx)("div", { className: "drag-input-label", ref: labelRef, onPointerDown: (event) => {
                    if (inputRef.current && editable) {
                        document.body.classList.add("excalidraw-cursor-resize");
                        let startValue = Number(inputRef.current.value);
                        if (isNaN(startValue)) {
                            startValue = 0;
                        }
                        let lastPointer = null;
                        let originalElementsMap = app.scene
                            .getNonDeletedElements()
                            .reduce((acc, element) => {
                            acc.set(element.id, (0, element_1.deepCopyElement)(element));
                            return acc;
                        }, new Map());
                        let originalElements = elements.map((element) => originalElementsMap.get(element.id));
                        const originalAppState = (0, common_1.cloneJSON)(appState);
                        let accumulatedChange = 0;
                        let stepChange = 0;
                        const onPointerMove = (event) => {
                            if (lastPointer &&
                                originalElementsMap !== null &&
                                originalElements !== null) {
                                const instantChange = event.clientX - lastPointer.x;
                                if (instantChange !== 0) {
                                    stepChange += instantChange;
                                    if (Math.abs(stepChange) >= sensitivity) {
                                        stepChange =
                                            Math.sign(stepChange) *
                                                Math.floor(Math.abs(stepChange) / sensitivity);
                                        accumulatedChange += stepChange;
                                        dragInputCallback({
                                            accumulatedChange,
                                            instantChange: stepChange,
                                            originalElements,
                                            originalElementsMap,
                                            shouldKeepAspectRatio: shouldKeepAspectRatio,
                                            shouldChangeByStepSize: event.shiftKey,
                                            property,
                                            scene,
                                            originalAppState,
                                            setInputValue: (value) => setInputValue(String(value)),
                                            app,
                                            setAppState,
                                        });
                                        stepChange = 0;
                                    }
                                }
                            }
                            lastPointer = {
                                x: event.clientX,
                                y: event.clientY,
                            };
                        };
                        const onPointerUp = () => {
                            window.removeEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove, false);
                            app.syncActionResult({
                                captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
                            });
                            // Notify implementors
                            dragFinishedCallback?.({
                                app,
                                setAppState,
                                originalElements,
                                originalAppState,
                            });
                            lastPointer = null;
                            accumulatedChange = 0;
                            stepChange = 0;
                            originalElements = null;
                            originalElementsMap = null;
                            document.body.classList.remove("excalidraw-cursor-resize");
                            window.removeEventListener(common_1.EVENT.POINTER_UP, onPointerUp, false);
                        };
                        callbacksRef.current.onPointerMove = onPointerMove;
                        callbacksRef.current.onPointerUp = onPointerUp;
                        window.addEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove, false);
                        window.addEventListener(common_1.EVENT.POINTER_UP, onPointerUp, false);
                    }
                }, onPointerEnter: () => {
                    if (labelRef.current) {
                        labelRef.current.style.cursor = "ew-resize";
                    }
                }, children: icon ? (0, jsx_runtime_1.jsx)(InlineIcon_1.InlineIcon, { icon: icon }) : label }), (0, jsx_runtime_1.jsx)("input", { className: "drag-input", autoComplete: "off", spellCheck: "false", onKeyDown: (event) => {
                    if (editable) {
                        const eventTarget = event.target;
                        if (eventTarget instanceof HTMLInputElement &&
                            event.key === common_1.KEYS.ENTER) {
                            handleInputValue(eventTarget.value, elements, appState);
                            app.focusContainer();
                        }
                    }
                }, ref: inputRef, value: inputValue, onChange: (event) => {
                    stateRef.current.updatePending = true;
                    setInputValue(event.target.value);
                }, onFocus: (event) => {
                    event.target.select();
                    stateRef.current.originalElements = elements;
                    stateRef.current.originalAppState = (0, common_1.cloneJSON)(appState);
                }, onBlur: (event) => {
                    if (!inputValue) {
                        setInputValue(value.toString());
                    }
                    else if (editable) {
                        handleInputValue(event.target.value, stateRef.current.originalElements, stateRef.current.originalAppState);
                    }
                }, disabled: !editable })] }));
};
exports.default = StatsDragInput;
