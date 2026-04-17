"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFocusPointHover = exports.handleFocusPointPointerUp = exports.handleFocusPointPointerDown = exports.handleFocusPointDrag = exports.isFocusPointVisible = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const binding_1 = require("../binding");
const typeChecks_1 = require("../typeChecks");
const linearElementEditor_1 = require("../linearElementEditor");
const collision_1 = require("../collision");
const zindex_1 = require("../zindex");
const isFocusPointVisible = (focusPoint, arrow, bindableElement, elementsMap, appState, startOrEnd, ignoreOverlap = false) => {
    // No focus point management for elbow arrows, because elbow arrows
    // always have their focus point at the arrow point itself
    if ((0, typeChecks_1.isElbowArrow)(arrow) ||
        !(0, binding_1.isBindingEnabled)(appState) ||
        arrow.points.length !== 2) {
        return false;
    }
    // Avoid showing the focus point indicator if the focus point is essentially
    // on top of the arrow point it belongs to itself, if not ignoring specifically
    if (!ignoreOverlap) {
        const associatedPointIdx = arrow.startBinding?.elementId === bindableElement.id
            ? 0
            : arrow.points.length - 1;
        const associatedArrowPoint = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, associatedPointIdx, elementsMap);
        if ((0, math_1.pointDistance)(focusPoint, associatedArrowPoint) <
            (binding_1.FOCUS_POINT_SIZE * 1.5) / appState.zoom.value) {
            return false;
        }
    }
    const arrowPoint = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, startOrEnd === "end" ? arrow.points.length - 1 : 0, elementsMap);
    // Check if the focus point is within the element's shape bounds
    // Endpoint dragging takes precedence
    return ((0, math_1.pointDistance)(focusPoint, arrowPoint) >=
        (binding_1.FOCUS_POINT_SIZE * 1.5) / appState.zoom.value &&
        (0, collision_1.hitElementItself)({
            element: bindableElement,
            elementsMap,
            point: focusPoint,
            threshold: (0, binding_1.getBindingGap)(bindableElement, arrow),
            overrideShouldTestInside: true,
        }));
};
exports.isFocusPointVisible = isFocusPointVisible;
// Updates the arrow endpoints in "orbit" configuration
const focusPointUpdate = (arrow, bindableElement, isStartBinding, elementsMap, scene, appState, switchToInsideBinding) => {
    const pointUpdates = new Map();
    const bindingField = isStartBinding ? "startBinding" : "endBinding";
    const adjacentBindingField = isStartBinding ? "endBinding" : "startBinding";
    let currentBinding = arrow[bindingField];
    let adjacentBinding = arrow[adjacentBindingField];
    // Update the dragged focus point related end
    if (currentBinding && bindableElement) {
        // Update the targeted bindings
        const boundToSameElement = bindableElement &&
            adjacentBinding &&
            currentBinding.elementId === adjacentBinding.elementId;
        if (switchToInsideBinding || boundToSameElement) {
            currentBinding = {
                ...currentBinding,
                mode: "inside",
            };
        }
        else {
            currentBinding = {
                ...currentBinding,
                mode: "orbit",
            };
        }
        const pointIndex = isStartBinding ? 0 : arrow.points.length - 1;
        const newPoint = (0, binding_1.updateBoundPoint)(arrow, bindingField, currentBinding, bindableElement, elementsMap, true);
        if (newPoint) {
            pointUpdates.set(pointIndex, { point: newPoint });
        }
    }
    // Also update the adjacent end if it has a binding
    if (adjacentBinding && adjacentBinding.mode === "orbit") {
        const adjacentBindableElement = elementsMap.get(adjacentBinding.elementId);
        if (adjacentBindableElement &&
            (0, typeChecks_1.isBindableElement)(adjacentBindableElement) &&
            (0, binding_1.isBindingEnabled)(appState)) {
            // Same shape bound on both ends
            const boundToSameElementAfterUpdate = bindableElement && adjacentBinding.elementId === bindableElement.id;
            if (switchToInsideBinding || boundToSameElementAfterUpdate) {
                adjacentBinding = {
                    ...adjacentBinding,
                    mode: "inside",
                };
            }
            else {
                adjacentBinding = {
                    ...adjacentBinding,
                    mode: "orbit",
                };
            }
            const adjacentPointIndex = isStartBinding ? arrow.points.length - 1 : 0;
            const adjacentNewPoint = (0, binding_1.updateBoundPoint)(arrow, adjacentBindingField, adjacentBinding, adjacentBindableElement, elementsMap);
            if (adjacentNewPoint) {
                pointUpdates.set(adjacentPointIndex, {
                    point: adjacentNewPoint,
                });
            }
        }
    }
    if (pointUpdates.size > 0) {
        linearElementEditor_1.LinearElementEditor.movePoints(arrow, scene, pointUpdates, {
            [bindingField]: currentBinding,
            [adjacentBindingField]: adjacentBinding,
        });
    }
};
const handleFocusPointDrag = (linearElementEditor, elementsMap, pointerCoords, scene, appState, gridSize, switchToInsideBinding) => {
    const arrow = linearElementEditor_1.LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
    // Sanity checks
    if (!arrow ||
        !(0, typeChecks_1.isBindingElement)(arrow) ||
        (0, typeChecks_1.isElbowArrow)(arrow) ||
        !linearElementEditor.hoveredFocusPointBinding ||
        !linearElementEditor.draggedFocusPointBinding) {
        return;
    }
    const isStartBinding = linearElementEditor.draggedFocusPointBinding === "start";
    const binding = isStartBinding ? arrow.startBinding : arrow.endBinding;
    const { x: offsetX, y: offsetY } = linearElementEditor.pointerOffset;
    const point = (0, math_1.pointFrom)(pointerCoords.x - offsetX, pointerCoords.y - offsetY);
    const bindingField = isStartBinding ? "startBinding" : "endBinding";
    const hit = (0, collision_1.getHoveredElementForFocusPoint)(point, arrow, scene.getNonDeletedElements(), elementsMap, (0, binding_1.maxBindingDistance_simple)(appState.zoom));
    // Hovering a bindable element
    if (hit && (0, binding_1.isBindingEnabled)(appState)) {
        // Break existing binding if bound to another shape or if binding is disabled
        if (arrow[bindingField] && hit.id !== binding?.elementId) {
            (0, binding_1.unbindBindingElement)(arrow, linearElementEditor.draggedFocusPointBinding, scene);
        }
        // Handle binding mode switch
        const newMode = switchToInsideBinding && arrow[bindingField]?.mode === "orbit"
            ? "inside"
            : !switchToInsideBinding && arrow[bindingField]?.mode === "inside"
                ? "orbit"
                : null;
        // If no existing binding, create it
        if (!arrow[bindingField] || newMode) {
            // Create a new binding if none exists
            (0, binding_1.bindBindingElement)(arrow, hit, newMode || "orbit", linearElementEditor.draggedFocusPointBinding, scene, point);
        }
        // Update the binding's fixed point
        scene.mutateElement(arrow, {
            [bindingField]: {
                ...arrow[bindingField],
                elementId: hit.id,
                mode: newMode || arrow[bindingField]?.mode || "orbit",
                ...(0, binding_1.calculateFixedPointForNonElbowArrowBinding)(arrow, hit, linearElementEditor.draggedFocusPointBinding, elementsMap, point),
            },
        });
    }
    else {
        // Not hovering any bindable element, move the arrow endpoint
        const pointUpdates = new Map();
        const pointIndex = isStartBinding ? 0 : arrow.points.length - 1;
        pointUpdates.set(pointIndex, {
            point: linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, point[0], point[1], gridSize),
        });
        linearElementEditor_1.LinearElementEditor.movePoints(arrow, scene, pointUpdates);
        if (arrow[bindingField]) {
            (0, binding_1.unbindBindingElement)(arrow, isStartBinding ? "start" : "end", scene);
        }
    }
    // Update the arrow endpoints
    focusPointUpdate(arrow, hit, isStartBinding, elementsMap, scene, appState, switchToInsideBinding);
    if (hit && (0, binding_1.isBindingEnabled)(appState)) {
        (0, zindex_1.moveArrowAboveBindable)(point, arrow, scene.getElementsIncludingDeleted(), elementsMap, scene, hit);
    }
};
exports.handleFocusPointDrag = handleFocusPointDrag;
const handleFocusPointPointerDown = (arrow, pointerDownState, elementsMap, appState) => {
    const pointerPos = (0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y);
    const hitThreshold = (binding_1.FOCUS_POINT_SIZE * 1.5) / appState.zoom.value;
    // Check start binding focus point
    if (arrow.startBinding?.elementId) {
        const bindableElement = elementsMap.get(arrow.startBinding.elementId);
        if (bindableElement &&
            (0, typeChecks_1.isBindableElement)(bindableElement) &&
            !bindableElement.isDeleted) {
            const focusPoint = (0, binding_1.getGlobalFixedPointForBindableElement)(arrow.startBinding.fixedPoint, bindableElement, elementsMap);
            if ((0, exports.isFocusPointVisible)(focusPoint, arrow, bindableElement, elementsMap, appState, "start") &&
                (0, math_1.pointDistance)(pointerPos, focusPoint) <= hitThreshold) {
                return {
                    hitFocusPoint: "start",
                    pointerOffset: {
                        x: pointerPos[0] - focusPoint[0],
                        y: pointerPos[1] - focusPoint[1],
                    },
                };
            }
        }
    }
    // Check end binding focus point (only if start not already hit)
    if (arrow.endBinding?.elementId) {
        const bindableElement = elementsMap.get(arrow.endBinding.elementId);
        if (bindableElement &&
            (0, typeChecks_1.isBindableElement)(bindableElement) &&
            !bindableElement.isDeleted) {
            const focusPoint = (0, binding_1.getGlobalFixedPointForBindableElement)(arrow.endBinding.fixedPoint, bindableElement, elementsMap);
            if ((0, exports.isFocusPointVisible)(focusPoint, arrow, bindableElement, elementsMap, appState, "end") &&
                (0, math_1.pointDistance)(pointerPos, focusPoint) <= hitThreshold) {
                return {
                    hitFocusPoint: "end",
                    pointerOffset: {
                        x: pointerPos[0] - focusPoint[0],
                        y: pointerPos[1] - focusPoint[1],
                    },
                };
            }
        }
    }
    return {
        hitFocusPoint: null,
        pointerOffset: { x: 0, y: 0 },
    };
};
exports.handleFocusPointPointerDown = handleFocusPointPointerDown;
const handleFocusPointPointerUp = (linearElementEditor, scene) => {
    (0, common_1.invariant)(linearElementEditor.draggedFocusPointBinding, "Must have a dragged focus point at pointer release");
    const arrow = linearElementEditor_1.LinearElementEditor.getElement(linearElementEditor.elementId, scene.getNonDeletedElementsMap());
    (0, common_1.invariant)(arrow, "Arrow must be in the scene");
    // Clean up
    const bindingKey = linearElementEditor.draggedFocusPointBinding === "start"
        ? "startBinding"
        : "endBinding";
    const otherBindingKey = linearElementEditor.draggedFocusPointBinding === "start"
        ? "endBinding"
        : "startBinding";
    const boundElementId = arrow[bindingKey]?.elementId;
    const otherBoundElementId = arrow[otherBindingKey]?.elementId;
    const oldBoundElement = boundElementId &&
        scene
            .getNonDeletedElements()
            .find((element) => element.id !== boundElementId &&
            element.id !== otherBoundElementId &&
            (0, typeChecks_1.isBindableElement)(element) &&
            element.boundElements?.find(({ id }) => id === arrow.id));
    if (oldBoundElement) {
        scene.mutateElement(oldBoundElement, {
            boundElements: oldBoundElement.boundElements?.filter(({ id }) => id !== arrow.id),
        });
    }
    // Record the new bound element
    const boundElement = boundElementId && scene.getNonDeletedElementsMap().get(boundElementId);
    if (boundElement) {
        scene.mutateElement(boundElement, {
            boundElements: [
                ...(boundElement.boundElements || [])?.filter(({ id }) => id !== arrow.id),
                {
                    id: arrow.id,
                    type: "arrow",
                },
            ],
        });
    }
};
exports.handleFocusPointPointerUp = handleFocusPointPointerUp;
const handleFocusPointHover = (arrow, scenePointerX, scenePointerY, scene, appState) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const pointerPos = (0, math_1.pointFrom)(scenePointerX, scenePointerY);
    const hitThreshold = (binding_1.FOCUS_POINT_SIZE * 1.5) / appState.zoom.value;
    // Check start binding focus point
    if (arrow.startBinding?.elementId) {
        const bindableElement = elementsMap.get(arrow.startBinding.elementId);
        if (bindableElement &&
            (0, typeChecks_1.isBindableElement)(bindableElement) &&
            !bindableElement.isDeleted) {
            const focusPoint = (0, binding_1.getGlobalFixedPointForBindableElement)(arrow.startBinding.fixedPoint, bindableElement, elementsMap);
            if ((0, exports.isFocusPointVisible)(focusPoint, arrow, bindableElement, elementsMap, appState, "start") &&
                (0, math_1.pointDistance)(pointerPos, focusPoint) <= hitThreshold) {
                return "start";
            }
        }
    }
    // Check end binding focus point (only if start not already hovered)
    if (arrow.endBinding?.elementId) {
        const bindableElement = elementsMap.get(arrow.endBinding.elementId);
        if (bindableElement &&
            (0, typeChecks_1.isBindableElement)(bindableElement) &&
            !bindableElement.isDeleted) {
            const focusPoint = (0, binding_1.getGlobalFixedPointForBindableElement)(arrow.endBinding.fixedPoint, bindableElement, elementsMap);
            if ((0, exports.isFocusPointVisible)(focusPoint, arrow, bindableElement, elementsMap, appState, "end") &&
                (0, math_1.pointDistance)(pointerPos, focusPoint) <= hitThreshold) {
                return "end";
            }
        }
    }
    return null;
};
exports.handleFocusPointHover = handleFocusPointHover;
