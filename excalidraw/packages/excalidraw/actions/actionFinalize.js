"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionFinalize = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const binding_1 = require("@excalidraw/element/binding");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
const cursor_1 = require("../cursor");
const icons_1 = require("../components/icons");
const ToolButton_1 = require("../components/ToolButton");
const register_1 = require("./register");
exports.actionFinalize = (0, register_1.register)({
    name: "finalize",
    label: "",
    trackEvent: false,
    perform: (elements, appState, data, app) => {
        let newElements = elements;
        const { interactiveCanvas, focusContainer, scene } = app;
        const elementsMap = scene.getNonDeletedElementsMap();
        if (data && appState.selectedLinearElement) {
            const { event, sceneCoords } = data;
            const element = element_1.LinearElementEditor.getElement(appState.selectedLinearElement.elementId, elementsMap);
            (0, common_1.invariant)(element, "Arrow element should exist if selectedLinearElement is set");
            (0, common_1.invariant)(sceneCoords, "sceneCoords should be defined if actionFinalize is called with event");
            const linearElementEditor = element_1.LinearElementEditor.handlePointerUp(event, appState.selectedLinearElement, appState, app.scene);
            if ((0, element_2.isBindingElement)(element) &&
                !appState.selectedLinearElement.segmentMidPointHoveredCoords) {
                const newArrow = !!appState.newElement;
                const selectedPointsIndices = newArrow || !appState.selectedLinearElement.selectedPointsIndices
                    ? [element.points.length - 1] // New arrow creation
                    : appState.selectedLinearElement.selectedPointsIndices;
                const draggedPoints = selectedPointsIndices.reduce((map, index) => {
                    map.set(index, {
                        point: element_1.LinearElementEditor.pointFromAbsoluteCoords(element, (0, math_1.pointFrom)(sceneCoords.x - linearElementEditor.pointerOffset.x, sceneCoords.y - linearElementEditor.pointerOffset.y), elementsMap),
                    });
                    return map;
                }, new Map()) ?? new Map();
                (0, binding_1.bindOrUnbindBindingElement)(element, draggedPoints, sceneCoords.x - linearElementEditor.pointerOffset.x, sceneCoords.y - linearElementEditor.pointerOffset.y, scene, appState, {
                    newArrow,
                    altKey: event.altKey,
                    angleLocked: (0, common_1.shouldRotateWithDiscreteAngle)(event),
                });
            }
            else if ((0, element_2.isLineElement)(element)) {
                if (appState.selectedLinearElement?.isEditing &&
                    !appState.newElement &&
                    !(0, element_1.isValidPolygon)(element.points)) {
                    scene.mutateElement(element, {
                        polygon: false,
                    });
                }
            }
            if (linearElementEditor !== appState.selectedLinearElement) {
                // `handlePointerUp()` updated the linear element instance,
                // so filter out this element if it is too small,
                // but do an update to all new elements anyway for undo/redo purposes.
                if (element && (0, element_4.isInvisiblySmallElement)(element)) {
                    // TODO: #7348 in theory this gets recorded by the store, so the invisible elements could be restored by the undo/redo, which might be not what we would want
                    newElements = newElements.map((el) => {
                        if (el.id === element.id) {
                            return (0, element_1.newElementWith)(el, {
                                isDeleted: true,
                            });
                        }
                        return el;
                    });
                }
                const activeToolLocked = appState.activeTool?.locked;
                return {
                    elements: element.points.length < 2 || (0, element_4.isInvisiblySmallElement)(element)
                        ? elements.map((el) => {
                            if (el.id === element.id) {
                                return (0, element_1.newElementWith)(el, { isDeleted: true });
                            }
                            return el;
                        })
                        : newElements,
                    appState: {
                        ...appState,
                        cursorButton: "up",
                        selectedLinearElement: activeToolLocked
                            ? null
                            : {
                                ...linearElementEditor,
                                selectedPointsIndices: null,
                                isEditing: false,
                                initialState: {
                                    ...linearElementEditor.initialState,
                                    lastClickedPoint: -1,
                                },
                                pointerOffset: { x: 0, y: 0 },
                            },
                        selectionElement: null,
                        suggestedBinding: null,
                        newElement: null,
                        multiElement: null,
                    },
                    captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
                };
            }
        }
        if (window.document.activeElement instanceof HTMLElement) {
            focusContainer();
        }
        let element = null;
        if (appState.multiElement) {
            element = appState.multiElement;
        }
        else if (appState.newElement?.type === "freedraw" ||
            (0, element_2.isBindingElement)(appState.newElement)) {
            element = appState.newElement;
        }
        else if (Object.keys(appState.selectedElementIds).length === 1) {
            const candidate = elementsMap.get(Object.keys(appState.selectedElementIds)[0]);
            if (candidate) {
                element = candidate;
            }
        }
        if (element) {
            // pen and mouse have hover
            if (appState.selectedLinearElement &&
                appState.multiElement &&
                element.type !== "freedraw" &&
                appState.lastPointerDownWith !== "touch") {
                const { points } = element;
                const { lastCommittedPoint } = appState.selectedLinearElement;
                if (!lastCommittedPoint ||
                    points[points.length - 1] !== lastCommittedPoint) {
                    scene.mutateElement(element, {
                        points: element.points.slice(0, -1),
                    });
                }
            }
            if (element && (0, element_4.isInvisiblySmallElement)(element)) {
                // TODO: #7348 in theory this gets recorded by the store, so the invisible elements could be restored by the undo/redo, which might be not what we would want
                newElements = newElements.map((el) => {
                    if (el.id === element?.id) {
                        return (0, element_1.newElementWith)(el, { isDeleted: true });
                    }
                    return el;
                });
            }
            if ((0, element_2.isLinearElement)(element) || (0, element_2.isFreeDrawElement)(element)) {
                // If the multi point line closes the loop,
                // set the last point to first point.
                // This ensures that loop remains closed at different scales.
                const isLoop = (0, element_3.isPathALoop)(element.points, appState.zoom.value);
                if (isLoop && ((0, element_2.isLineElement)(element) || (0, element_2.isFreeDrawElement)(element))) {
                    const linePoints = element.points;
                    const firstPoint = linePoints[0];
                    const points = linePoints.map((p, index) => index === linePoints.length - 1
                        ? (0, math_1.pointFrom)(firstPoint[0], firstPoint[1])
                        : p);
                    if ((0, element_2.isLineElement)(element)) {
                        scene.mutateElement(element, {
                            points,
                            polygon: true,
                        });
                    }
                    else {
                        scene.mutateElement(element, {
                            points,
                        });
                    }
                }
                if ((0, element_2.isLineElement)(element) && !(0, element_1.isValidPolygon)(element.points)) {
                    scene.mutateElement(element, {
                        polygon: false,
                    });
                }
            }
        }
        if ((!appState.activeTool.locked &&
            appState.activeTool.type !== "freedraw") ||
            !element) {
            (0, cursor_1.resetCursor)(interactiveCanvas);
        }
        let activeTool;
        if (appState.activeTool.type === "eraser") {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                ...(appState.activeTool.lastActiveTool || {
                    type: app.state.preferredSelectionTool.type,
                }),
                lastActiveToolBeforeEraser: null,
            });
        }
        else {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                type: app.state.preferredSelectionTool.type,
            });
        }
        let selectedLinearElement = element && (0, element_2.isLinearElement)(element)
            ? new element_1.LinearElementEditor(element, (0, common_1.arrayToMap)(newElements)) // To select the linear element when user has finished mutipoint editing
            : appState.selectedLinearElement;
        selectedLinearElement = selectedLinearElement
            ? {
                ...selectedLinearElement,
                isEditing: appState.newElement
                    ? false
                    : selectedLinearElement.isEditing,
                initialState: {
                    ...selectedLinearElement.initialState,
                    lastClickedPoint: -1,
                    origin: null,
                },
            }
            : selectedLinearElement;
        return {
            elements: newElements,
            appState: {
                ...appState,
                cursorButton: "up",
                activeTool: (appState.activeTool.locked ||
                    appState.activeTool.type === "freedraw") &&
                    element
                    ? appState.activeTool
                    : activeTool,
                activeEmbeddable: null,
                newElement: null,
                selectionElement: null,
                multiElement: null,
                editingTextElement: null,
                startBoundElement: null,
                suggestedBinding: null,
                selectedElementIds: element &&
                    !appState.activeTool.locked &&
                    appState.activeTool.type !== "freedraw"
                    ? {
                        ...appState.selectedElementIds,
                        [element.id]: true,
                    }
                    : appState.selectedElementIds,
                selectedLinearElement,
            },
            // TODO: #7348 we should not capture everything, but if we don't, it leads to incosistencies -> revisit
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event, appState) => (event.key === common_1.KEYS.ESCAPE && appState.selectedLinearElement?.isEditing) ||
        ((event.key === common_1.KEYS.ESCAPE || event.key === common_1.KEYS.ENTER) &&
            appState.multiElement !== null),
    PanelComponent: ({ appState, updateData, data }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.done, title: (0, i18n_1.t)("buttons.done"), "aria-label": (0, i18n_1.t)("buttons.done"), onClick: updateData, visible: appState.multiElement != null, size: data?.size || "medium", style: { pointerEvents: "all" } })),
});
