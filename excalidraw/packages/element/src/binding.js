"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBindingSideMidPoint = exports.normalizeFixedPoint = exports.isFixedPoint = exports.getArrowLocalFixedPoints = exports.getGlobalFixedPoints = exports.getGlobalFixedPointForBindableElement = exports.BindableElement = exports.BoundElement = exports.bindingProperties = exports.fixBindingsAfterDeletion = exports.fixDuplicatedBindingsAfterDuplication = exports.calculateFixedPointForNonElbowArrowBinding = exports.calculateFixedPointForElbowArrowBinding = exports.updateBoundPoint = exports.snapToMid = exports.avoidRectangularCorner = exports.bindPointToSnapToElementOutline = exports.getHeadingForElbowArrowSnap = exports.updateBindings = exports.updateBoundElements = exports.unbindBindingElement = exports.bindBindingElement = exports.bindOrUnbindBindingElements = exports.getBindingStrategyForDraggingBindingElementEndpoints = exports.bindOrUnbindBindingElement = exports.isBindingEnabled = exports.maxBindingDistance_simple = exports.getBindingGap = exports.FOCUS_POINT_SIZE = exports.BASE_ARROW_MIN_LENGTH = exports.BASE_BINDING_GAP_ELBOW = exports.BASE_BINDING_GAP = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
const collision_1 = require("./collision");
const distance_1 = require("./distance");
const heading_1 = require("./heading");
const linearElementEditor_1 = require("./linearElementEditor");
const mutateElement_1 = require("./mutateElement");
const textElement_1 = require("./textElement");
const typeChecks_1 = require("./typeChecks");
const bounds_2 = require("./bounds");
const elbowArrow_1 = require("./elbowArrow");
const utils_1 = require("./utils");
/**
 * gaps exclude element strokeWidth
 *
 * IMPORTANT: currently must be > 0 (this also applies to the computed gap)
 */
exports.BASE_BINDING_GAP = 5;
exports.BASE_BINDING_GAP_ELBOW = 5;
exports.BASE_ARROW_MIN_LENGTH = 10;
exports.FOCUS_POINT_SIZE = 10 / 1.5;
const getBindingGap = (bindTarget, opts) => {
    return ((opts.elbowed ? exports.BASE_BINDING_GAP_ELBOW : exports.BASE_BINDING_GAP) +
        bindTarget.strokeWidth / 2);
};
exports.getBindingGap = getBindingGap;
const maxBindingDistance_simple = (zoom) => {
    const BASE_BINDING_DISTANCE = Math.max(exports.BASE_BINDING_GAP, 15);
    const zoomValue = zoom?.value && zoom.value < 1 ? zoom.value : 1;
    return (0, math_1.clamp)(
    // reducing zoom impact so that the diff between binding distance and
    // binding gap is kept to minimum when possible
    BASE_BINDING_DISTANCE / (zoomValue * 1.5), BASE_BINDING_DISTANCE, BASE_BINDING_DISTANCE * 2);
};
exports.maxBindingDistance_simple = maxBindingDistance_simple;
const isBindingEnabled = (appState) => {
    return appState.isBindingEnabled;
};
exports.isBindingEnabled = isBindingEnabled;
const bindOrUnbindBindingElement = (arrow, draggingPoints, scenePointerX, scenePointerY, scene, appState, opts) => {
    const { start, end } = (0, exports.getBindingStrategyForDraggingBindingElementEndpoints)(arrow, draggingPoints, scenePointerX, scenePointerY, scene.getNonDeletedElementsMap(), scene.getNonDeletedElements(), appState, {
        ...opts,
        finalize: true,
    });
    bindOrUnbindBindingElementEdge(arrow, start, "start", scene, appState.isBindingEnabled);
    bindOrUnbindBindingElementEdge(arrow, end, "end", scene, appState.isBindingEnabled);
    if (start.focusPoint || end.focusPoint) {
        // If the strategy dictates a focus point override, then
        // update the arrow points to point to the focus point.
        const updates = new Map();
        if (start.focusPoint) {
            updates.set(0, {
                point: (0, exports.updateBoundPoint)(arrow, "startBinding", arrow.startBinding, start.element, scene.getNonDeletedElementsMap()) || arrow.points[0],
            });
        }
        if (end.focusPoint) {
            updates.set(arrow.points.length - 1, {
                point: (0, exports.updateBoundPoint)(arrow, "endBinding", arrow.endBinding, end.element, scene.getNonDeletedElementsMap()) || arrow.points[arrow.points.length - 1],
            });
        }
        linearElementEditor_1.LinearElementEditor.movePoints(arrow, scene, updates);
    }
    return { start, end };
};
exports.bindOrUnbindBindingElement = bindOrUnbindBindingElement;
const bindOrUnbindBindingElementEdge = (arrow, { mode, element, focusPoint }, startOrEnd, scene, shouldSnapToOutline = true) => {
    if (mode === null) {
        // null means break the binding
        (0, exports.unbindBindingElement)(arrow, startOrEnd, scene);
    }
    else if (mode !== undefined) {
        (0, exports.bindBindingElement)(arrow, element, mode, startOrEnd, scene, focusPoint, shouldSnapToOutline);
    }
};
const bindingStrategyForElbowArrowEndpointDragging = (arrow, draggingPoints, elementsMap, elements, zoom) => {
    (0, common_1.invariant)(draggingPoints.size === 1, "Bound elbow arrows cannot be moved");
    const update = draggingPoints.entries().next().value;
    (0, common_1.invariant)(update, "There should be a position update for dragging an elbow arrow endpoint");
    const [pointIdx, { point }] = update;
    const globalPoint = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(arrow, point, elementsMap);
    const hit = (0, collision_1.getHoveredElementForBinding)(globalPoint, elements, elementsMap, (0, exports.maxBindingDistance_simple)(zoom));
    const current = hit
        ? {
            element: hit,
            mode: "orbit",
            focusPoint: linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, pointIdx, elementsMap),
        }
        : {
            mode: null,
        };
    const other = { mode: undefined };
    return pointIdx === 0
        ? { start: current, end: other }
        : { start: other, end: current };
};
const bindingStrategyForNewSimpleArrowEndpointDragging = (arrow, draggingPoints, elementsMap, elements, startDragged, endDragged, startIdx, endIdx, appState, globalBindMode, shiftKey) => {
    let start = { mode: undefined };
    let end = { mode: undefined };
    const isMultiPoint = arrow.points.length > 2;
    const point = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(arrow, draggingPoints.get(startDragged ? startIdx : endIdx).point, elementsMap);
    const hit = (0, collision_1.getHoveredElementForBinding)(point, elements, elementsMap);
    // With new arrows this handles the binding at arrow creation
    if (startDragged) {
        if (hit) {
            start = {
                element: hit,
                mode: "inside",
                focusPoint: point,
            };
        }
        else {
            start = { mode: null };
        }
        return { start, end };
    }
    // With new arrows it represents the continuous dragging of the end point
    if (endDragged) {
        const origin = appState?.selectedLinearElement?.initialState.origin;
        // Inside -> inside binding
        if (hit && arrow.startBinding?.elementId === hit.id) {
            const center = (0, math_1.pointFrom)(hit.x + hit.width / 2, hit.y + hit.height / 2);
            return {
                start: isMultiPoint
                    ? { mode: undefined }
                    : {
                        mode: "inside",
                        element: hit,
                        focusPoint: origin ?? center,
                    },
                end: isMultiPoint
                    ? { mode: "orbit", element: hit, focusPoint: point }
                    : { mode: "inside", element: hit, focusPoint: point },
            };
        }
        // Check and handle nested shapes
        if (hit && arrow.startBinding) {
            const startBinding = arrow.startBinding;
            const allHits = (0, collision_1.getAllHoveredElementAtPoint)(point, elements, elementsMap);
            if (allHits.find((el) => el.id === startBinding.elementId)) {
                const otherElement = elementsMap.get(arrow.startBinding.elementId);
                (0, common_1.invariant)(otherElement, "Other element must be in the elements map");
                return {
                    start: isMultiPoint
                        ? { mode: undefined }
                        : {
                            mode: otherElement.id !== hit.id ? "orbit" : "inside",
                            element: otherElement,
                            focusPoint: origin ?? (0, math_1.pointFrom)(arrow.x, arrow.y),
                        },
                    end: {
                        mode: "orbit",
                        element: hit,
                        focusPoint: point,
                    },
                };
            }
        }
        // Inside -> outside binding
        if (arrow.startBinding && arrow.startBinding.elementId !== hit?.id) {
            const otherElement = elementsMap.get(arrow.startBinding.elementId);
            (0, common_1.invariant)(otherElement, "Other element must be in the elements map");
            const otherIsInsideBinding = !!appState.selectedLinearElement?.initialState.arrowStartIsInside;
            const other = {
                mode: otherIsInsideBinding ? "inside" : "orbit",
                element: otherElement,
                focusPoint: shiftKey
                    ? (0, bounds_2.elementCenterPoint)(otherElement, elementsMap)
                    : origin ?? (0, math_1.pointFrom)(arrow.x, arrow.y),
            };
            // We are hovering another element with the end point
            const isNested = hit &&
                (0, collision_1.isBindableElementInsideOtherBindable)(otherElement, hit, elementsMap);
            let current;
            if (hit) {
                const isInsideBinding = globalBindMode === "inside" || globalBindMode === "skip";
                current = {
                    mode: isInsideBinding && !isNested ? "inside" : "orbit",
                    element: hit,
                    focusPoint: isInsideBinding || isNested ? point : point,
                };
            }
            else {
                current = { mode: null };
            }
            return {
                start: isMultiPoint ? { mode: undefined } : other,
                end: current,
            };
        }
        // No start binding
        if (!arrow.startBinding) {
            if (hit) {
                const isInsideBinding = globalBindMode === "inside" || globalBindMode === "skip";
                end = {
                    mode: isInsideBinding ? "inside" : "orbit",
                    element: hit,
                    focusPoint: point,
                };
            }
            else {
                end = { mode: null };
            }
            return { start, end };
        }
    }
    (0, common_1.invariant)(false, "New arrow creation should not reach here");
};
const bindingStrategyForSimpleArrowEndpointDragging_complex = (point, currentBinding, oppositeBinding, elementsMap, elements, globalBindMode, arrow, finalize) => {
    let current = { mode: undefined };
    let other = { mode: undefined };
    const isMultiPoint = arrow.points.length > 2;
    const hit = (0, collision_1.getHoveredElementForBinding)(point, elements, elementsMap);
    const isOverlapping = oppositeBinding
        ? (0, collision_1.getAllHoveredElementAtPoint)(point, elements, elementsMap).some((el) => el.id === oppositeBinding.elementId)
        : false;
    const oppositeElement = oppositeBinding
        ? elementsMap.get(oppositeBinding.elementId)
        : null;
    const otherIsTransparent = isOverlapping && oppositeElement
        ? (0, common_1.isTransparent)(oppositeElement.backgroundColor)
        : false;
    const isNested = hit &&
        oppositeElement &&
        (0, collision_1.isBindableElementInsideOtherBindable)(oppositeElement, hit, elementsMap);
    // If the global bind mode is in free binding mode, just bind
    // where the pointer is and keep the other end intact
    if (globalBindMode === "inside" || globalBindMode === "skip") {
        current = hit
            ? {
                element: !isOverlapping || !oppositeElement || otherIsTransparent
                    ? hit
                    : oppositeElement,
                focusPoint: point,
                mode: "inside",
            }
            : { mode: null };
        other =
            finalize && hit && hit.id === oppositeBinding?.elementId
                ? { mode: null }
                : other;
        return { current, other };
    }
    // Dragged point is outside of any bindable element
    // so we break any existing binding
    if (!hit) {
        return { current: { mode: null }, other };
    }
    // Already inside binding over the same hit element should remain inside bound
    if (hit.id === currentBinding?.elementId &&
        currentBinding.mode === "inside") {
        return {
            current: { mode: "inside", focusPoint: point, element: hit },
            other,
        };
    }
    // The dragged point is inside the hovered bindable element
    if (oppositeBinding) {
        // The opposite binding is on the same element
        if (oppositeBinding.elementId === hit.id) {
            // The opposite binding is on the binding gap of the same element
            if (oppositeBinding.mode === "orbit") {
                current = { element: hit, mode: "orbit", focusPoint: point };
                other = { mode: finalize ? null : undefined };
                return { current, other: isMultiPoint ? { mode: undefined } : other };
            }
            // The opposite binding is inside the same element
            // eslint-disable-next-line no-else-return
            else {
                current = { element: hit, mode: "inside", focusPoint: point };
                return { current, other: isMultiPoint ? { mode: undefined } : other };
            }
        }
        // The opposite binding is on a different element (or nested)
        // eslint-disable-next-line no-else-return
        else {
            // Handle the nested element case
            if (isOverlapping && oppositeElement && !otherIsTransparent) {
                current = {
                    element: oppositeElement,
                    mode: "inside",
                    focusPoint: point,
                };
            }
            else {
                current = {
                    element: hit,
                    mode: "orbit",
                    focusPoint: isNested ? point : point,
                };
            }
            return { current, other: isMultiPoint ? { mode: undefined } : other };
        }
    }
    // The opposite binding is on a different element or no binding
    else {
        current = {
            element: hit,
            mode: "orbit",
            focusPoint: point,
        };
    }
    // Must return as only one endpoint is dragged, therefore
    // the end binding strategy might accidentally gets overriden
    return { current, other: isMultiPoint ? { mode: undefined } : other };
};
const getBindingStrategyForDraggingBindingElementEndpoints = (arrow, draggingPoints, screenPointerX, screenPointerY, elementsMap, elements, appState, opts) => {
    if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
        return getBindingStrategyForDraggingBindingElementEndpoints_complex(arrow, draggingPoints, elementsMap, elements, appState, opts);
    }
    return getBindingStrategyForDraggingBindingElementEndpoints_simple(arrow, draggingPoints, screenPointerX, screenPointerY, elementsMap, elements, appState, opts);
};
exports.getBindingStrategyForDraggingBindingElementEndpoints = getBindingStrategyForDraggingBindingElementEndpoints;
const getBindingStrategyForDraggingBindingElementEndpoints_simple = (arrow, draggingPoints, scenePointerX, scenePointerY, elementsMap, elements, appState, opts) => {
    const startIdx = 0;
    const endIdx = arrow.points.length - 1;
    const startDragged = draggingPoints.has(startIdx);
    const endDragged = draggingPoints.has(endIdx);
    let start = { mode: undefined };
    let end = { mode: undefined };
    (0, common_1.invariant)(arrow.points.length > 1, "Do not attempt to bind linear elements with a single point");
    // If none of the ends are dragged, we don't change anything
    if (!startDragged && !endDragged) {
        return { start, end };
    }
    // If both ends are dragged, we don't bind to anything
    // and break existing bindings
    if (startDragged && endDragged) {
        return { start: { mode: null }, end: { mode: null } };
    }
    // If binding is disabled and an endpoint is dragged,
    // we actively break the end binding
    if (!(0, exports.isBindingEnabled)(appState)) {
        start = startDragged ? { mode: null } : start;
        end = endDragged ? { mode: null } : end;
        return { start, end };
    }
    // Handle simpler elbow arrow binding
    if ((0, typeChecks_1.isElbowArrow)(arrow)) {
        return bindingStrategyForElbowArrowEndpointDragging(arrow, draggingPoints, elementsMap, elements, opts?.zoom);
    }
    const otherBinding = startDragged ? arrow.endBinding : arrow.startBinding;
    const localPoint = draggingPoints.get(startDragged ? startIdx : endIdx)?.point;
    (0, common_1.invariant)(localPoint, `Local point must be defined for ${startDragged ? "start" : "end"} dragging`);
    const globalPoint = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(arrow, localPoint, elementsMap);
    const hit = (0, collision_1.getHoveredElementForBinding)(globalPoint, elements, elementsMap, (0, exports.maxBindingDistance_simple)(appState.zoom));
    const pointInElement = hit &&
        (opts?.angleLocked
            ? (0, collision_1.isPointInElement)((0, math_1.pointFrom)(scenePointerX, scenePointerY), hit, elementsMap)
            : (0, collision_1.isPointInElement)(globalPoint, hit, elementsMap));
    const otherBindableElement = otherBinding
        ? elementsMap.get(otherBinding.elementId)
        : undefined;
    const otherFocusPoint = otherBinding &&
        otherBindableElement &&
        (0, exports.getGlobalFixedPointForBindableElement)(otherBinding.fixedPoint, otherBindableElement, elementsMap);
    const otherFocusPointIsInElement = otherBindableElement &&
        otherFocusPoint &&
        (0, collision_1.hitElementItself)({
            point: otherFocusPoint,
            element: otherBindableElement,
            elementsMap,
            threshold: 0,
            overrideShouldTestInside: true,
        });
    // Handle outside-outside binding to the same element
    if (otherBinding && otherBinding.elementId === hit?.id) {
        (0, common_1.invariant)(!opts?.newArrow || appState.selectedLinearElement?.initialState.origin, "appState.selectedLinearElement.initialState.origin must be defined for new arrows");
        return {
            start: {
                mode: "inside",
                element: hit,
                focusPoint: startDragged
                    ? globalPoint
                    : // NOTE: Can only affect the start point because new arrows always drag the end point
                        opts?.newArrow
                            ? appState.selectedLinearElement.initialState.origin
                            : linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, 0, elementsMap), // startFixedPoint,
            },
            end: {
                mode: "inside",
                element: hit,
                focusPoint: endDragged
                    ? globalPoint
                    : linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, -1, elementsMap), // endFixedPoint
            },
        };
    }
    // Handle special alt key case to inside bind no matter what
    if (opts?.altKey) {
        return {
            start: startDragged
                ? hit
                    ? {
                        mode: "inside",
                        element: hit,
                        focusPoint: globalPoint,
                    }
                    : { mode: null }
                : start,
            end: endDragged
                ? hit
                    ? {
                        mode: "inside",
                        element: hit,
                        focusPoint: globalPoint,
                    }
                    : { mode: null }
                : end,
        };
    }
    // Handle normal cases
    const current = hit
        ? pointInElement
            ? {
                mode: "inside",
                element: hit,
                focusPoint: globalPoint,
            }
            : {
                mode: "orbit",
                element: hit,
                focusPoint: (0, utils_1.projectFixedPointOntoDiagonal)(arrow, globalPoint, hit, startDragged ? "start" : "end", elementsMap, appState.zoom, appState.isMidpointSnappingEnabled) || globalPoint,
            }
        : { mode: null };
    const otherEndpoint = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, startDragged ? -1 : 0, elementsMap);
    const pointIsCloseToOtherElement = otherFocusPoint &&
        otherBindableElement &&
        (0, collision_1.hitElementItself)({
            point: globalPoint,
            element: otherBindableElement,
            elementsMap,
            threshold: (0, exports.maxBindingDistance_simple)(appState.zoom),
            overrideShouldTestInside: true,
        });
    const otherNeverOverride = opts?.newArrow
        ? appState.selectedLinearElement?.initialState.arrowStartIsInside
        : otherBinding?.mode === "inside";
    const other = !otherNeverOverride
        ? otherBindableElement &&
            !otherFocusPointIsInElement &&
            !pointIsCloseToOtherElement &&
            appState.selectedLinearElement?.initialState.altFocusPoint
            ? {
                mode: "orbit",
                element: otherBindableElement,
                focusPoint: appState.selectedLinearElement.initialState.altFocusPoint,
            }
            : opts?.angleLocked && otherBindableElement
                ? {
                    mode: "orbit",
                    element: otherBindableElement,
                    focusPoint: (0, utils_1.projectFixedPointOntoDiagonal)(arrow, otherEndpoint, otherBindableElement, startDragged ? "end" : "start", elementsMap, appState.zoom, appState.isMidpointSnappingEnabled) || otherEndpoint,
                }
                : { mode: undefined }
        : { mode: undefined };
    return {
        start: startDragged ? current : other,
        end: endDragged ? current : other,
    };
};
const getBindingStrategyForDraggingBindingElementEndpoints_complex = (arrow, draggingPoints, elementsMap, elements, appState, opts) => {
    const globalBindMode = appState.bindMode || "orbit";
    const startIdx = 0;
    const endIdx = arrow.points.length - 1;
    const startDragged = draggingPoints.has(startIdx);
    const endDragged = draggingPoints.has(endIdx);
    let start = { mode: undefined };
    let end = { mode: undefined };
    (0, common_1.invariant)(arrow.points.length > 1, "Do not attempt to bind linear elements with a single point");
    // If none of the ends are dragged, we don't change anything
    if (!startDragged && !endDragged) {
        return { start, end };
    }
    // If both ends are dragged, we don't bind to anything
    // and break existing bindings
    if (startDragged && endDragged) {
        return { start: { mode: null }, end: { mode: null } };
    }
    // If binding is disabled and an endpoint is dragged,
    // we actively break the end binding
    if (!(0, exports.isBindingEnabled)(appState)) {
        start = startDragged ? { mode: null } : start;
        end = endDragged ? { mode: null } : end;
        return { start, end };
    }
    // Handle simpler elbow arrow binding
    if ((0, typeChecks_1.isElbowArrow)(arrow)) {
        return bindingStrategyForElbowArrowEndpointDragging(arrow, draggingPoints, elementsMap, elements);
    }
    // Handle new arrow creation separately, as it is special
    if (opts?.newArrow) {
        const { start, end } = bindingStrategyForNewSimpleArrowEndpointDragging(arrow, draggingPoints, elementsMap, elements, startDragged, endDragged, startIdx, endIdx, appState, globalBindMode, opts?.shiftKey);
        return { start, end };
    }
    // Only the start point is dragged
    if (startDragged) {
        const localPoint = draggingPoints.get(startIdx)?.point;
        (0, common_1.invariant)(localPoint, "Local point must be defined for start dragging");
        const globalPoint = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(arrow, localPoint, elementsMap);
        const { current, other } = bindingStrategyForSimpleArrowEndpointDragging_complex(globalPoint, arrow.startBinding, arrow.endBinding, elementsMap, elements, globalBindMode, arrow, opts?.finalize);
        return { start: current, end: other };
    }
    // Only the end point is dragged
    if (endDragged) {
        const localPoint = draggingPoints.get(endIdx)?.point;
        (0, common_1.invariant)(localPoint, "Local point must be defined for end dragging");
        const globalPoint = linearElementEditor_1.LinearElementEditor.getPointGlobalCoordinates(arrow, localPoint, elementsMap);
        const { current, other } = bindingStrategyForSimpleArrowEndpointDragging_complex(globalPoint, arrow.endBinding, arrow.startBinding, elementsMap, elements, globalBindMode, arrow, opts?.finalize);
        return { start: other, end: current };
    }
    return { start, end };
};
const bindOrUnbindBindingElements = (selectedArrows, scene, appState) => {
    selectedArrows.forEach((arrow) => {
        (0, exports.bindOrUnbindBindingElement)(arrow, new Map(), // No dragging points in this case
        Infinity, Infinity, scene, appState);
    });
};
exports.bindOrUnbindBindingElements = bindOrUnbindBindingElements;
const bindBindingElement = (arrow, hoveredElement, mode, startOrEnd, scene, focusPoint, shouldSnapToOutline = true) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    let binding;
    if ((0, typeChecks_1.isElbowArrow)(arrow)) {
        binding = {
            elementId: hoveredElement.id,
            mode: "orbit",
            ...(0, exports.calculateFixedPointForElbowArrowBinding)(arrow, hoveredElement, startOrEnd, elementsMap, shouldSnapToOutline),
        };
    }
    else {
        binding = {
            elementId: hoveredElement.id,
            mode,
            ...(0, exports.calculateFixedPointForNonElbowArrowBinding)(arrow, hoveredElement, startOrEnd, elementsMap, focusPoint),
        };
    }
    scene.mutateElement(arrow, {
        [startOrEnd === "start" ? "startBinding" : "endBinding"]: binding,
    });
    const boundElementsMap = (0, common_1.arrayToMap)(hoveredElement.boundElements || []);
    if (!boundElementsMap.has(arrow.id)) {
        scene.mutateElement(hoveredElement, {
            boundElements: (hoveredElement.boundElements || []).concat({
                id: arrow.id,
                type: "arrow",
            }),
        });
    }
};
exports.bindBindingElement = bindBindingElement;
const unbindBindingElement = (arrow, startOrEnd, scene) => {
    const field = startOrEnd === "start" ? "startBinding" : "endBinding";
    const binding = arrow[field];
    if (binding == null) {
        return null;
    }
    const oppositeBinding = arrow[startOrEnd === "start" ? "endBinding" : "startBinding"];
    if (!oppositeBinding || oppositeBinding.elementId !== binding.elementId) {
        // Only remove the record on the bound element if the other
        // end is not bound to the same element
        const boundElement = scene
            .getNonDeletedElementsMap()
            .get(binding.elementId);
        scene.mutateElement(boundElement, {
            boundElements: boundElement.boundElements?.filter((element) => element.id !== arrow.id),
        });
    }
    scene.mutateElement(arrow, { [field]: null });
    return binding.elementId;
};
exports.unbindBindingElement = unbindBindingElement;
// Supports translating, rotating and scaling `changedElement` with bound
// linear elements.
const updateBoundElements = (changedElement, scene, options) => {
    if (!(0, typeChecks_1.isBindableElement)(changedElement)) {
        return;
    }
    const { simultaneouslyUpdated } = options ?? {};
    const simultaneouslyUpdatedElementIds = getSimultaneouslyUpdatedElementIds(simultaneouslyUpdated);
    let elementsMap = scene.getNonDeletedElementsMap();
    if (options?.changedElements) {
        elementsMap = new Map(elementsMap);
        options.changedElements.forEach((element) => {
            elementsMap.set(element.id, element);
        });
    }
    const visitor = (element) => {
        if (!(0, typeChecks_1.isArrowElement)(element) || element.isDeleted) {
            return;
        }
        // In case the boundElements are stale
        if (!doesNeedUpdate(element, changedElement)) {
            return;
        }
        // Check for intersections before updating bound elements incase connected elements overlap
        const startBindingElement = element.startBinding
            ? elementsMap.get(element.startBinding.elementId)
            : null;
        const endBindingElement = element.endBinding
            ? // PERF: If the arrow is bound to the same element on both ends.
                startBindingElement?.id === element.endBinding.elementId
                    ? startBindingElement
                    : elementsMap.get(element.endBinding.elementId)
            : null;
        // `linearElement` is being moved/scaled already, just update the binding
        if (simultaneouslyUpdatedElementIds.has(element.id)) {
            return;
        }
        const updates = bindableElementsVisitor(elementsMap, element, (bindableElement, bindingProp) => {
            if (bindableElement &&
                (0, typeChecks_1.isBindableElement)(bindableElement) &&
                (bindingProp === "startBinding" || bindingProp === "endBinding") &&
                (changedElement.id === element[bindingProp]?.elementId ||
                    changedElement.id ===
                        element[bindingProp === "startBinding" ? "endBinding" : "startBinding"]?.elementId)) {
                const point = (0, exports.updateBoundPoint)(element, bindingProp, element[bindingProp], bindableElement, elementsMap);
                if (point) {
                    return [
                        bindingProp === "startBinding" ? 0 : element.points.length - 1,
                        { point },
                    ];
                }
            }
            return null;
        }).filter((update) => update !== null);
        linearElementEditor_1.LinearElementEditor.movePoints(element, scene, new Map(updates), {
            moveMidPointsWithElement: !!startBindingElement &&
                startBindingElement?.id === endBindingElement?.id,
        });
        const boundText = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundText && !boundText.isDeleted) {
            (0, textElement_1.handleBindTextResize)(element, scene, false);
        }
    };
    boundElementsVisitor(elementsMap, changedElement, visitor);
};
exports.updateBoundElements = updateBoundElements;
const updateArrowBindings = (latestElement, startOrEnd, elementsMap, scene, appState) => {
    (0, common_1.invariant)(!(0, typeChecks_1.isElbowArrow)(latestElement), "Elbow arrows not supported for indirect updates");
    const binding = latestElement[startOrEnd];
    const bindableElement = binding &&
        elementsMap.get(binding.elementId);
    const point = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(latestElement, startOrEnd === "startBinding" ? 0 : -1, elementsMap);
    const hit = bindableElement &&
        (0, collision_1.hitElementItself)({
            element: bindableElement,
            point,
            elementsMap,
            threshold: (0, exports.maxBindingDistance_simple)(appState.zoom),
        });
    const strategyName = startOrEnd === "startBinding" ? "start" : "end";
    (0, exports.unbindBindingElement)(latestElement, strategyName, scene);
    if (hit) {
        const pointIdx = startOrEnd === "startBinding" ? 0 : latestElement.points.length - 1;
        const localPoint = latestElement.points[pointIdx];
        const strategy = getBindingStrategyForDraggingBindingElementEndpoints_simple(latestElement, new Map([[pointIdx, { point: localPoint }]]), point[0], point[1], elementsMap, scene.getNonDeletedElements(), appState);
        if (strategy[strategyName] &&
            strategy[strategyName].element?.id === bindableElement.id &&
            strategy[strategyName].mode) {
            (0, exports.bindBindingElement)(latestElement, bindableElement, strategy[strategyName].mode, strategyName, scene, strategy[strategyName].focusPoint);
        }
    }
};
const updateBindings = (latestElement, scene, appState, options) => {
    if ((0, typeChecks_1.isArrowElement)(latestElement)) {
        const elementsMap = scene.getNonDeletedElementsMap();
        if (latestElement.startBinding) {
            updateArrowBindings(latestElement, "startBinding", elementsMap, scene, appState);
        }
        if (latestElement.endBinding) {
            updateArrowBindings(latestElement, "endBinding", elementsMap, scene, appState);
        }
    }
    else {
        (0, exports.updateBoundElements)(latestElement, scene, {
            ...options,
            changedElements: new Map([[latestElement.id, latestElement]]),
        });
    }
};
exports.updateBindings = updateBindings;
const doesNeedUpdate = (boundElement, changedElement) => {
    return (boundElement.startBinding?.elementId === changedElement.id ||
        boundElement.endBinding?.elementId === changedElement.id);
};
const getSimultaneouslyUpdatedElementIds = (simultaneouslyUpdated) => {
    return new Set((simultaneouslyUpdated || []).map((element) => element.id));
};
const getHeadingForElbowArrowSnap = (p, otherPoint, bindableElement, aabb, origPoint, elementsMap, zoom) => {
    const otherPointHeading = (0, heading_1.vectorToHeading)((0, math_1.vectorFromPoint)(otherPoint, p));
    if (!bindableElement || !aabb) {
        return otherPointHeading;
    }
    const distance = getDistanceForBinding(origPoint, bindableElement, elementsMap, zoom);
    if (!distance) {
        return (0, heading_1.vectorToHeading)((0, math_1.vectorFromPoint)(p, (0, bounds_2.elementCenterPoint)(bindableElement, elementsMap)));
    }
    return (0, heading_1.headingForPointFromElement)(bindableElement, aabb, p);
};
exports.getHeadingForElbowArrowSnap = getHeadingForElbowArrowSnap;
const getDistanceForBinding = (point, bindableElement, elementsMap, zoom) => {
    const distance = (0, distance_1.distanceToElement)(bindableElement, elementsMap, point);
    const bindDistance = (0, exports.maxBindingDistance_simple)(zoom);
    return distance > bindDistance ? null : distance;
};
const bindPointToSnapToElementOutline = (arrowElement, bindableElement, startOrEnd, elementsMap, customIntersector, isMidpointSnappingEnabled = true) => {
    const elbowed = (0, typeChecks_1.isElbowArrow)(arrowElement);
    const point = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrowElement, startOrEnd === "start" ? 0 : -1, elementsMap);
    if (arrowElement.points.length < 2) {
        // New arrow creation, so no snapping
        return point;
    }
    const edgePoint = (0, typeChecks_1.isRectanguloidElement)(bindableElement) && elbowed
        ? (0, exports.avoidRectangularCorner)(arrowElement, bindableElement, elementsMap, point)
        : point;
    const adjacentPoint = customIntersector && !elbowed
        ? customIntersector[1]
        : linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrowElement, startOrEnd === "start" ? 1 : -2, elementsMap);
    const bindingGap = (0, exports.getBindingGap)(bindableElement, arrowElement);
    const aabb = (0, bounds_2.aabbForElement)(bindableElement, elementsMap);
    const bindableCenter = (0, bounds_1.getCenterForBounds)(aabb);
    let intersection = null;
    if (elbowed) {
        const isHorizontal = (0, heading_1.headingIsHorizontal)((0, heading_1.headingForPointFromElement)(bindableElement, aabb, point));
        const snapPoint = isMidpointSnappingEnabled
            ? (0, exports.snapToMid)(bindableElement, elementsMap, edgePoint, 0.05, arrowElement)
            : undefined;
        const resolved = snapPoint || point;
        const otherPoint = (0, math_1.pointFrom)(isHorizontal ? bindableCenter[0] : resolved[0], !isHorizontal ? bindableCenter[1] : resolved[1]);
        const intersector = customIntersector ??
            (0, math_1.lineSegment)(otherPoint, (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorNormalize)((0, math_1.vectorFromPoint)(resolved, otherPoint)), Math.max(bindableElement.width, bindableElement.height) * 2), otherPoint));
        intersection = (0, collision_1.intersectElementWithLineSegment)(bindableElement, elementsMap, intersector, bindingGap).sort(math_1.pointDistanceSq)[0];
        if (!intersection) {
            const anotherPoint = (0, math_1.pointFrom)(!isHorizontal ? bindableCenter[0] : resolved[0], isHorizontal ? bindableCenter[1] : resolved[1]);
            const anotherIntersector = (0, math_1.lineSegment)(anotherPoint, (0, math_1.pointFromVector)((0, math_1.vectorScale)((0, math_1.vectorNormalize)((0, math_1.vectorFromPoint)(resolved, anotherPoint)), Math.max(bindableElement.width, bindableElement.height) * 2), anotherPoint));
            intersection = (0, collision_1.intersectElementWithLineSegment)(bindableElement, elementsMap, anotherIntersector, exports.BASE_BINDING_GAP_ELBOW).sort(math_1.pointDistanceSq)[0];
        }
    }
    else {
        let intersector = customIntersector;
        if (!intersector) {
            const halfVector = (0, math_1.vectorScale)((0, math_1.vectorNormalize)((0, math_1.vectorFromPoint)(edgePoint, adjacentPoint)), (0, math_1.pointDistance)(edgePoint, adjacentPoint) +
                Math.max(bindableElement.width, bindableElement.height) +
                bindingGap * 2);
            intersector =
                customIntersector ??
                    (0, math_1.lineSegment)((0, math_1.pointFromVector)(halfVector, adjacentPoint), (0, math_1.pointFromVector)((0, math_1.vectorScale)(halfVector, -1), adjacentPoint));
        }
        intersection =
            (0, math_1.pointDistance)(edgePoint, adjacentPoint) < 1
                ? edgePoint
                : (0, collision_1.intersectElementWithLineSegment)(bindableElement, elementsMap, intersector, bindingGap).sort((g, h) => (0, math_1.pointDistanceSq)(g, adjacentPoint) -
                    (0, math_1.pointDistanceSq)(h, adjacentPoint))[0];
    }
    if (!intersection ||
        // Too close to determine vector from intersection to edgePoint
        (0, math_1.pointDistanceSq)(edgePoint, intersection) < math_1.PRECISION) {
        return edgePoint;
    }
    return intersection;
};
exports.bindPointToSnapToElementOutline = bindPointToSnapToElementOutline;
const avoidRectangularCorner = (arrowElement, bindTarget, elementsMap, p) => {
    const center = (0, bounds_2.elementCenterPoint)(bindTarget, elementsMap);
    const nonRotatedPoint = (0, math_1.pointRotateRads)(p, center, -bindTarget.angle);
    const bindingGap = (0, exports.getBindingGap)(bindTarget, arrowElement);
    if (nonRotatedPoint[0] < bindTarget.x && nonRotatedPoint[1] < bindTarget.y) {
        // Top left
        if (nonRotatedPoint[1] - bindTarget.y > -bindingGap) {
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x - bindingGap, bindTarget.y), center, bindTarget.angle);
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x, bindTarget.y - bindingGap), center, bindTarget.angle);
    }
    else if (nonRotatedPoint[0] < bindTarget.x &&
        nonRotatedPoint[1] > bindTarget.y + bindTarget.height) {
        // Bottom left
        if (nonRotatedPoint[0] - bindTarget.x > -bindingGap) {
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x, bindTarget.y + bindTarget.height + bindingGap), center, bindTarget.angle);
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x - bindingGap, bindTarget.y + bindTarget.height), center, bindTarget.angle);
    }
    else if (nonRotatedPoint[0] > bindTarget.x + bindTarget.width &&
        nonRotatedPoint[1] > bindTarget.y + bindTarget.height) {
        // Bottom right
        if (nonRotatedPoint[0] - bindTarget.x < bindTarget.width + bindingGap) {
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x + bindTarget.width, bindTarget.y + bindTarget.height + bindingGap), center, bindTarget.angle);
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x + bindTarget.width + bindingGap, bindTarget.y + bindTarget.height), center, bindTarget.angle);
    }
    else if (nonRotatedPoint[0] > bindTarget.x + bindTarget.width &&
        nonRotatedPoint[1] < bindTarget.y) {
        // Top right
        if (nonRotatedPoint[0] - bindTarget.x < bindTarget.width + bindingGap) {
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x + bindTarget.width, bindTarget.y - bindingGap), center, bindTarget.angle);
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(bindTarget.x + bindTarget.width + bindingGap, bindTarget.y), center, bindTarget.angle);
    }
    return p;
};
exports.avoidRectangularCorner = avoidRectangularCorner;
const snapToMid = (bindTarget, elementsMap, p, tolerance = 0.05, arrowElement) => {
    const { x, y, width, height, angle } = bindTarget;
    const center = (0, bounds_2.elementCenterPoint)(bindTarget, elementsMap, -0.1, -0.1);
    const nonRotated = (0, math_1.pointRotateRads)(p, center, -angle);
    const bindingGap = arrowElement ? (0, exports.getBindingGap)(bindTarget, arrowElement) : 0;
    // snap-to-center point is adaptive to element size, but we don't want to go
    // above and below certain px distance
    const verticalThreshold = (0, math_1.clamp)(tolerance * height, 5, 80);
    const horizontalThreshold = (0, math_1.clamp)(tolerance * width, 5, 80);
    // Too close to the center makes it hard to resolve direction precisely
    if ((0, math_1.pointDistance)(center, nonRotated) < bindingGap) {
        return undefined;
    }
    if (nonRotated[0] <= x + width / 2 &&
        nonRotated[1] > center[1] - verticalThreshold &&
        nonRotated[1] < center[1] + verticalThreshold) {
        // LEFT
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x - bindingGap, center[1]), center, angle);
    }
    else if (nonRotated[1] <= y + height / 2 &&
        nonRotated[0] > center[0] - horizontalThreshold &&
        nonRotated[0] < center[0] + horizontalThreshold) {
        // TOP
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(center[0], y - bindingGap), center, angle);
    }
    else if (nonRotated[0] >= x + width / 2 &&
        nonRotated[1] > center[1] - verticalThreshold &&
        nonRotated[1] < center[1] + verticalThreshold) {
        // RIGHT
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + width + bindingGap, center[1]), center, angle);
    }
    else if (nonRotated[1] >= y + height / 2 &&
        nonRotated[0] > center[0] - horizontalThreshold &&
        nonRotated[0] < center[0] + horizontalThreshold) {
        // DOWN
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(center[0], y + height + bindingGap), center, angle);
    }
    else if (bindTarget.type === "diamond") {
        const distance = bindingGap;
        const topLeft = (0, math_1.pointFrom)(x + width / 4 - distance, y + height / 4 - distance);
        const topRight = (0, math_1.pointFrom)(x + (3 * width) / 4 + distance, y + height / 4 - distance);
        const bottomLeft = (0, math_1.pointFrom)(x + width / 4 - distance, y + (3 * height) / 4 + distance);
        const bottomRight = (0, math_1.pointFrom)(x + (3 * width) / 4 + distance, y + (3 * height) / 4 + distance);
        if ((0, math_1.pointDistance)(topLeft, nonRotated) <
            Math.max(horizontalThreshold, verticalThreshold)) {
            return (0, math_1.pointRotateRads)(topLeft, center, angle);
        }
        if ((0, math_1.pointDistance)(topRight, nonRotated) <
            Math.max(horizontalThreshold, verticalThreshold)) {
            return (0, math_1.pointRotateRads)(topRight, center, angle);
        }
        if ((0, math_1.pointDistance)(bottomLeft, nonRotated) <
            Math.max(horizontalThreshold, verticalThreshold)) {
            return (0, math_1.pointRotateRads)(bottomLeft, center, angle);
        }
        if ((0, math_1.pointDistance)(bottomRight, nonRotated) <
            Math.max(horizontalThreshold, verticalThreshold)) {
            return (0, math_1.pointRotateRads)(bottomRight, center, angle);
        }
    }
    return undefined;
};
exports.snapToMid = snapToMid;
const extractBinding = (arrow, startOrEnd, elementsMap) => {
    const binding = arrow[startOrEnd];
    if (!binding) {
        return {
            element: null,
            fixedPoint: null,
            focusPoint: null,
            binding,
            mode: null,
        };
    }
    const element = elementsMap.get(binding.elementId);
    return {
        element,
        fixedPoint: binding.fixedPoint,
        focusPoint: (0, exports.getGlobalFixedPointForBindableElement)((0, exports.normalizeFixedPoint)(binding.fixedPoint), element, elementsMap),
        binding,
        mode: binding.mode,
    };
};
const elementArea = (element) => element.width * element.height;
const updateBoundPoint = (arrow, startOrEnd, binding, bindableElement, elementsMap, dragging) => {
    if (binding == null ||
        // We only need to update the other end if this is a 2 point line element
        (binding.elementId !== bindableElement.id && arrow.points.length > 2) ||
        // Initial arrow created on pointer down needs to not update the points
        (0, math_1.pointsEqual)(arrow.points[arrow.points.length - 1], (0, math_1.pointFrom)(0, 0))) {
        return null;
    }
    const focusPoint = (0, exports.getGlobalFixedPointForBindableElement)((0, exports.normalizeFixedPoint)(binding.fixedPoint), bindableElement, elementsMap);
    // 0. Short-circuit for inside binding as it doesn't require any
    // calculations and is not affected by other bindings
    if (binding.mode === "inside") {
        return linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, focusPoint[0], focusPoint[1], null);
    }
    const { element: otherBindable, focusPoint: otherFocusPoint } = extractBinding(arrow, startOrEnd === "startBinding" ? "endBinding" : "startBinding", elementsMap);
    const otherArrowPoint = linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, startOrEnd === "startBinding" ? 1 : -2, elementsMap);
    const otherFocusPointOrArrowPoint = arrow.points.length === 2
        ? otherFocusPoint || otherArrowPoint
        : otherArrowPoint;
    const intersector = otherFocusPointOrArrowPoint &&
        (0, math_1.lineSegment)(focusPoint, otherFocusPointOrArrowPoint);
    const otherOutlinePoint = otherBindable &&
        intersector &&
        (0, collision_1.intersectElementWithLineSegment)(otherBindable, elementsMap, intersector, (0, exports.getBindingGap)(otherBindable, arrow)).sort((a, b) => (0, math_1.pointDistanceSq)(a, focusPoint) - (0, math_1.pointDistanceSq)(b, focusPoint))[0];
    const outlinePoint = intersector &&
        (0, collision_1.intersectElementWithLineSegment)(bindableElement, elementsMap, intersector, (0, exports.getBindingGap)(bindableElement, arrow)).sort((a, b) => (0, math_1.pointDistanceSq)(a, otherFocusPointOrArrowPoint) -
            (0, math_1.pointDistanceSq)(b, otherFocusPointOrArrowPoint))[0];
    const startHasArrowhead = arrow.startArrowhead !== null;
    const endHasArrowhead = arrow.endArrowhead !== null;
    const resolvedTarget = (!startHasArrowhead && !endHasArrowhead) ||
        (startOrEnd === "startBinding" && startHasArrowhead) ||
        (startOrEnd === "endBinding" && endHasArrowhead)
        ? focusPoint
        : outlinePoint || focusPoint;
    // 1. Handle case when the outline point (or focus point) is inside
    // the other shape by short-circuiting to the focus point, otherwise
    // the arrow would invert
    if (otherBindable &&
        outlinePoint &&
        !dragging &&
        // Arbitrary threshold to handle wireframing use cases
        elementArea(otherBindable) < elementArea(bindableElement) * 2 &&
        (0, collision_1.hitElementItself)({
            element: otherBindable,
            point: outlinePoint,
            elementsMap,
            threshold: (0, exports.getBindingGap)(otherBindable, arrow),
            overrideShouldTestInside: true,
        })) {
        return linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, resolvedTarget[0], resolvedTarget[1], null);
    }
    const otherTargetPoint = otherBindable
        ? otherOutlinePoint || otherFocusPoint || otherArrowPoint
        : otherArrowPoint;
    const arrowTooShort = (0, math_1.pointDistance)(otherTargetPoint, outlinePoint || focusPoint) <=
        exports.BASE_ARROW_MIN_LENGTH;
    // 2. If the arrow is unconnected at the other end, just check arrow size
    // and short-circuit to the focus point if the arrow is too short to
    // avoid inversion
    if (!otherBindable) {
        return linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, arrowTooShort ? focusPoint[0] : outlinePoint?.[0] ?? focusPoint[0], arrowTooShort ? focusPoint[1] : outlinePoint?.[1] ?? focusPoint[1], null);
    }
    // 3. If the arrow is too short while connected on both ends and
    // the other arrow endpoint will not be inside the bindable, just
    // check the arrow size and make a decision based on that
    if (arrowTooShort) {
        return linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, resolvedTarget?.[0] || focusPoint[0], resolvedTarget?.[1] || focusPoint[1], null);
    }
    // 4. In the general case, snap to the outline if possible
    return linearElementEditor_1.LinearElementEditor.createPointAt(arrow, elementsMap, outlinePoint?.[0] || focusPoint[0], outlinePoint?.[1] || focusPoint[1], null);
};
exports.updateBoundPoint = updateBoundPoint;
const calculateFixedPointForElbowArrowBinding = (linearElement, hoveredElement, startOrEnd, elementsMap, shouldSnapToOutline = true, isMidpointSnappingEnabled = true) => {
    const bounds = [
        hoveredElement.x,
        hoveredElement.y,
        hoveredElement.x + hoveredElement.width,
        hoveredElement.y + hoveredElement.height,
    ];
    const snappedPoint = shouldSnapToOutline
        ? (0, exports.bindPointToSnapToElementOutline)(linearElement, hoveredElement, startOrEnd, elementsMap, undefined, isMidpointSnappingEnabled)
        : linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(linearElement, startOrEnd === "start" ? 0 : -1, elementsMap);
    const globalMidPoint = (0, math_1.pointFrom)(bounds[0] + (bounds[2] - bounds[0]) / 2, bounds[1] + (bounds[3] - bounds[1]) / 2);
    const nonRotatedSnappedGlobalPoint = (0, math_1.pointRotateRads)(snappedPoint, globalMidPoint, -hoveredElement.angle);
    return {
        fixedPoint: (0, exports.normalizeFixedPoint)([
            (nonRotatedSnappedGlobalPoint[0] - hoveredElement.x) /
                hoveredElement.width,
            (nonRotatedSnappedGlobalPoint[1] - hoveredElement.y) /
                hoveredElement.height,
        ]),
    };
};
exports.calculateFixedPointForElbowArrowBinding = calculateFixedPointForElbowArrowBinding;
const calculateFixedPointForNonElbowArrowBinding = (linearElement, hoveredElement, startOrEnd, elementsMap, focusPoint) => {
    const edgePoint = focusPoint
        ? focusPoint
        : linearElementEditor_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(linearElement, startOrEnd === "start" ? 0 : -1, elementsMap);
    const elementCenter = (0, bounds_2.elementCenterPoint)(hoveredElement, elementsMap);
    // Rotate the point to account for element rotation
    const nonRotatedPoint = (0, math_1.pointRotateRads)(edgePoint, elementCenter, -hoveredElement.angle);
    // Calculate the ratio relative to the element's bounds
    const fixedPointX = (nonRotatedPoint[0] - hoveredElement.x) / hoveredElement.width;
    const fixedPointY = (nonRotatedPoint[1] - hoveredElement.y) / hoveredElement.height;
    return {
        fixedPoint: (0, exports.normalizeFixedPoint)([fixedPointX, fixedPointY]),
    };
};
exports.calculateFixedPointForNonElbowArrowBinding = calculateFixedPointForNonElbowArrowBinding;
const fixDuplicatedBindingsAfterDuplication = (duplicatedElements, origIdToDuplicateId, duplicateElementsMap) => {
    for (const duplicateElement of duplicatedElements) {
        if ("boundElements" in duplicateElement && duplicateElement.boundElements) {
            Object.assign(duplicateElement, {
                boundElements: duplicateElement.boundElements.reduce((acc, binding) => {
                    const newBindingId = origIdToDuplicateId.get(binding.id);
                    if (newBindingId) {
                        acc.push({ ...binding, id: newBindingId });
                    }
                    return acc;
                }, []),
            });
        }
        if ("containerId" in duplicateElement && duplicateElement.containerId) {
            Object.assign(duplicateElement, {
                containerId: origIdToDuplicateId.get(duplicateElement.containerId) ?? null,
            });
        }
        if ("endBinding" in duplicateElement && duplicateElement.endBinding) {
            const newEndBindingId = origIdToDuplicateId.get(duplicateElement.endBinding.elementId);
            Object.assign(duplicateElement, {
                endBinding: newEndBindingId
                    ? {
                        ...duplicateElement.endBinding,
                        elementId: newEndBindingId,
                    }
                    : null,
            });
        }
        if ("startBinding" in duplicateElement && duplicateElement.startBinding) {
            const newEndBindingId = origIdToDuplicateId.get(duplicateElement.startBinding.elementId);
            Object.assign(duplicateElement, {
                startBinding: newEndBindingId
                    ? {
                        ...duplicateElement.startBinding,
                        elementId: newEndBindingId,
                    }
                    : null,
            });
        }
        if ((0, typeChecks_1.isElbowArrow)(duplicateElement)) {
            Object.assign(duplicateElement, (0, elbowArrow_1.updateElbowArrowPoints)(duplicateElement, duplicateElementsMap, {
                points: [
                    duplicateElement.points[0],
                    duplicateElement.points[duplicateElement.points.length - 1],
                ],
            }));
        }
    }
};
exports.fixDuplicatedBindingsAfterDuplication = fixDuplicatedBindingsAfterDuplication;
const fixBindingsAfterDeletion = (sceneElements, deletedElements) => {
    const elements = (0, common_1.arrayToMap)(sceneElements);
    for (const element of deletedElements) {
        BoundElement.unbindAffected(elements, element, (element, updates) => (0, mutateElement_1.mutateElement)(element, elements, updates));
        BindableElement.unbindAffected(elements, element, (element, updates) => (0, mutateElement_1.mutateElement)(element, elements, updates));
    }
};
exports.fixBindingsAfterDeletion = fixBindingsAfterDeletion;
const newBoundElements = (boundElements, idsToRemove, elementsToAdd = []) => {
    if (!boundElements) {
        return null;
    }
    const nextBoundElements = boundElements.filter((boundElement) => !idsToRemove.has(boundElement.id));
    nextBoundElements.push(...elementsToAdd.map((x) => ({ id: x.id, type: x.type })));
    return nextBoundElements;
};
exports.bindingProperties = new Set([
    "boundElements",
    "frameId",
    "containerId",
    "startBinding",
    "endBinding",
]);
/**
 * Tries to visit each bound element (does not have to be found).
 */
const boundElementsVisitor = (elements, element, visit) => {
    if ((0, typeChecks_1.isBindableElement)(element)) {
        // create new instance so that possible mutations won't play a role in visiting order
        const boundElements = element.boundElements?.slice() ?? [];
        // last added text should be the one we keep (~previous are duplicates)
        boundElements.forEach(({ id }) => {
            visit(elements.get(id), "boundElements", id);
        });
    }
};
/**
 * Tries to visit each bindable element (does not have to be found).
 */
const bindableElementsVisitor = (elements, element, visit) => {
    const result = [];
    if (element.frameId) {
        const id = element.frameId;
        result.push(visit(elements.get(id), "frameId", id));
    }
    if ((0, typeChecks_1.isBoundToContainer)(element)) {
        const id = element.containerId;
        result.push(visit(elements.get(id), "containerId", id));
    }
    if ((0, typeChecks_1.isArrowElement)(element)) {
        if (element.startBinding) {
            const id = element.startBinding.elementId;
            result.push(visit(elements.get(id), "startBinding", id));
        }
        if (element.endBinding) {
            const id = element.endBinding.elementId;
            result.push(visit(elements.get(id), "endBinding", id));
        }
    }
    return result;
};
/**
 * Bound element containing bindings to `frameId`, `containerId`, `startBinding` or `endBinding`.
 */
class BoundElement {
    /**
     * Unbind the affected non deleted bindable elements (removing element from `boundElements`).
     * - iterates non deleted bindable elements (`containerId` | `startBinding.elementId` | `endBinding.elementId`) of the current element
     * - prepares updates to unbind each bindable element's `boundElements` from the current element
     */
    static unbindAffected(elements, boundElement, updateElementWith) {
        if (!boundElement) {
            return;
        }
        bindableElementsVisitor(elements, boundElement, (bindableElement) => {
            // bindable element is deleted, this is fine
            if (!bindableElement || bindableElement.isDeleted) {
                return;
            }
            boundElementsVisitor(elements, bindableElement, (_, __, boundElementId) => {
                if (boundElementId === boundElement.id) {
                    updateElementWith(bindableElement, {
                        boundElements: newBoundElements(bindableElement.boundElements, new Set([boundElementId])),
                    });
                }
            });
        });
    }
    /**
     * Rebind the next affected non deleted bindable elements (adding element to `boundElements`).
     * - iterates non deleted bindable elements (`containerId` | `startBinding.elementId` | `endBinding.elementId`) of the current element
     * - prepares updates to rebind each bindable element's `boundElements` to the current element
     *
     * NOTE: rebind expects that affected elements were previously unbound with `BoundElement.unbindAffected`
     */
    static rebindAffected = (elements, boundElement, updateElementWith) => {
        // don't try to rebind element that is deleted
        if (!boundElement || boundElement.isDeleted) {
            return;
        }
        bindableElementsVisitor(elements, boundElement, (bindableElement, bindingProp) => {
            // unbind from bindable elements, as bindings from non deleted elements into deleted elements are incorrect
            if (!bindableElement || bindableElement.isDeleted) {
                updateElementWith(boundElement, { [bindingProp]: null });
                return;
            }
            // frame bindings are unidirectional, there is nothing to rebind
            if (bindingProp === "frameId") {
                return;
            }
            if (bindableElement.boundElements?.find((x) => x.id === boundElement.id)) {
                return;
            }
            if ((0, typeChecks_1.isArrowElement)(boundElement)) {
                // rebind if not found!
                updateElementWith(bindableElement, {
                    boundElements: newBoundElements(bindableElement.boundElements, new Set(), new Array(boundElement)),
                });
            }
            if ((0, typeChecks_1.isTextElement)(boundElement)) {
                if (!bindableElement.boundElements?.find((x) => x.type === "text")) {
                    // rebind only if there is no other text bound already
                    updateElementWith(bindableElement, {
                        boundElements: newBoundElements(bindableElement.boundElements, new Set(), new Array(boundElement)),
                    });
                }
                else {
                    // unbind otherwise
                    updateElementWith(boundElement, { [bindingProp]: null });
                }
            }
        });
    };
}
exports.BoundElement = BoundElement;
/**
 * Bindable element containing bindings to `boundElements`.
 */
class BindableElement {
    /**
     * Unbind the affected non deleted bound elements (resetting `containerId`, `startBinding`, `endBinding` to `null`).
     * - iterates through non deleted `boundElements` of the current element
     * - prepares updates to unbind each bound element from the current element
     */
    static unbindAffected(elements, bindableElement, updateElementWith) {
        if (!bindableElement) {
            return;
        }
        boundElementsVisitor(elements, bindableElement, (boundElement) => {
            // bound element is deleted, this is fine
            if (!boundElement || boundElement.isDeleted) {
                return;
            }
            bindableElementsVisitor(elements, boundElement, (_, bindingProp, bindableElementId) => {
                // making sure there is an element to be unbound
                if (bindableElementId === bindableElement.id) {
                    updateElementWith(boundElement, { [bindingProp]: null });
                }
            });
        });
    }
    /**
     * Rebind the affected non deleted bound elements (for now setting only `containerId`, as we cannot rebind arrows atm).
     * - iterates through non deleted `boundElements` of the current element
     * - prepares updates to rebind each bound element to the current element or unbind it from `boundElements` in case of conflicts
     *
     * NOTE: rebind expects that affected elements were previously unbound with `BindaleElement.unbindAffected`
     */
    static rebindAffected = (elements, bindableElement, updateElementWith) => {
        // don't try to rebind element that is deleted (i.e. updated as deleted)
        if (!bindableElement || bindableElement.isDeleted) {
            return;
        }
        boundElementsVisitor(elements, bindableElement, (boundElement, _, boundElementId) => {
            // unbind from bindable elements, as bindings from non deleted elements into deleted elements are incorrect
            if (!boundElement || boundElement.isDeleted) {
                updateElementWith(bindableElement, {
                    boundElements: newBoundElements(bindableElement.boundElements, new Set([boundElementId])),
                });
                return;
            }
            if ((0, typeChecks_1.isTextElement)(boundElement)) {
                const boundElements = bindableElement.boundElements?.slice() ?? [];
                // check if this is the last element in the array, if not, there is an previously bound text which should be unbound
                if (boundElements.reverse().find((x) => x.type === "text")?.id ===
                    boundElement.id) {
                    if (boundElement.containerId !== bindableElement.id) {
                        // rebind if not bound already!
                        updateElementWith(boundElement, {
                            containerId: bindableElement.id,
                        });
                    }
                }
                else {
                    if (boundElement.containerId !== null) {
                        // unbind if not unbound already
                        updateElementWith(boundElement, {
                            containerId: null,
                        });
                    }
                    // unbind from boundElements as the element got bound to some other element in the meantime
                    updateElementWith(bindableElement, {
                        boundElements: newBoundElements(bindableElement.boundElements, new Set([boundElement.id])),
                    });
                }
            }
        });
    };
}
exports.BindableElement = BindableElement;
const getGlobalFixedPointForBindableElement = (fixedPointRatio, element, elementsMap) => {
    const [fixedX, fixedY] = (0, exports.normalizeFixedPoint)(fixedPointRatio);
    return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.width * fixedX, element.y + element.height * fixedY), (0, bounds_2.elementCenterPoint)(element, elementsMap), element.angle);
};
exports.getGlobalFixedPointForBindableElement = getGlobalFixedPointForBindableElement;
const getGlobalFixedPoints = (arrow, elementsMap) => {
    const startElement = arrow.startBinding &&
        elementsMap.get(arrow.startBinding.elementId);
    const endElement = arrow.endBinding &&
        elementsMap.get(arrow.endBinding.elementId);
    const startPoint = startElement && arrow.startBinding
        ? (0, exports.getGlobalFixedPointForBindableElement)(arrow.startBinding.fixedPoint, startElement, elementsMap)
        : (0, math_1.pointFrom)(arrow.x + arrow.points[0][0], arrow.y + arrow.points[0][1]);
    const endPoint = endElement && arrow.endBinding
        ? (0, exports.getGlobalFixedPointForBindableElement)(arrow.endBinding.fixedPoint, endElement, elementsMap)
        : (0, math_1.pointFrom)(arrow.x + arrow.points[arrow.points.length - 1][0], arrow.y + arrow.points[arrow.points.length - 1][1]);
    return [startPoint, endPoint];
};
exports.getGlobalFixedPoints = getGlobalFixedPoints;
const getArrowLocalFixedPoints = (arrow, elementsMap) => {
    const [startPoint, endPoint] = (0, exports.getGlobalFixedPoints)(arrow, elementsMap);
    return [
        linearElementEditor_1.LinearElementEditor.pointFromAbsoluteCoords(arrow, startPoint, elementsMap),
        linearElementEditor_1.LinearElementEditor.pointFromAbsoluteCoords(arrow, endPoint, elementsMap),
    ];
};
exports.getArrowLocalFixedPoints = getArrowLocalFixedPoints;
const isFixedPoint = (fixedPoint) => {
    return (Array.isArray(fixedPoint) &&
        fixedPoint.length === 2 &&
        fixedPoint.every((coord) => Number.isFinite(coord)));
};
exports.isFixedPoint = isFixedPoint;
const normalizeFixedPoint = (fixedPoint) => {
    if (!(0, exports.isFixedPoint)(fixedPoint)) {
        return [0.5001, 0.5001];
    }
    const EPSILON = 0.0001;
    // Do not allow a precise 0.5 for fixed point ratio
    // to avoid jumping arrow heading due to floating point imprecision
    if (Math.abs(fixedPoint[0] - 0.5) < EPSILON ||
        Math.abs(fixedPoint[1] - 0.5) < EPSILON) {
        return fixedPoint.map((ratio) => Math.abs(ratio - 0.5) < EPSILON ? 0.5001 : ratio);
    }
    return fixedPoint;
};
exports.normalizeFixedPoint = normalizeFixedPoint;
const getShapeType = (element) => {
    if (element.type === "ellipse" || element.type === "diamond") {
        return element.type;
    }
    return "rectangle";
};
// Define sector configurations for different shape types
const SHAPE_CONFIGS = {
    // rectangle: 15° corners, 75° edges
    rectangle: [
        { centerAngle: 0, sectorWidth: 75, side: "right" },
        { centerAngle: 45, sectorWidth: 15, side: "bottom-right" },
        { centerAngle: 90, sectorWidth: 75, side: "bottom" },
        { centerAngle: 135, sectorWidth: 15, side: "bottom-left" },
        { centerAngle: 180, sectorWidth: 75, side: "left" },
        { centerAngle: 225, sectorWidth: 15, side: "top-left" },
        { centerAngle: 270, sectorWidth: 75, side: "top" },
        { centerAngle: 315, sectorWidth: 15, side: "top-right" },
    ],
    // diamond: 15° vertices, 75° edges
    diamond: [
        { centerAngle: 0, sectorWidth: 15, side: "right" },
        { centerAngle: 45, sectorWidth: 75, side: "bottom-right" },
        { centerAngle: 90, sectorWidth: 15, side: "bottom" },
        { centerAngle: 135, sectorWidth: 75, side: "bottom-left" },
        { centerAngle: 180, sectorWidth: 15, side: "left" },
        { centerAngle: 225, sectorWidth: 75, side: "top-left" },
        { centerAngle: 270, sectorWidth: 15, side: "top" },
        { centerAngle: 315, sectorWidth: 75, side: "top-right" },
    ],
    // ellipse: 15° cardinal points, 75° diagonals
    ellipse: [
        { centerAngle: 0, sectorWidth: 15, side: "right" },
        { centerAngle: 45, sectorWidth: 75, side: "bottom-right" },
        { centerAngle: 90, sectorWidth: 15, side: "bottom" },
        { centerAngle: 135, sectorWidth: 75, side: "bottom-left" },
        { centerAngle: 180, sectorWidth: 15, side: "left" },
        { centerAngle: 225, sectorWidth: 75, side: "top-left" },
        { centerAngle: 270, sectorWidth: 15, side: "top" },
        { centerAngle: 315, sectorWidth: 75, side: "top-right" },
    ],
};
const getSectorBoundaries = (config) => {
    return config.map((sector, index) => {
        const halfWidth = sector.sectorWidth / 2;
        let start = sector.centerAngle - halfWidth;
        let end = sector.centerAngle + halfWidth;
        // normalize angles to [0, 360) range
        start = ((start % 360) + 360) % 360;
        end = ((end % 360) + 360) % 360;
        return { start, end, side: sector.side };
    });
};
// determine which side a point falls into using adaptive sectors
const getShapeSideAdaptive = (fixedPoint, shapeType) => {
    const [x, y] = fixedPoint;
    // convert to centered coordinates
    const centerX = x - 0.5;
    const centerY = y - 0.5;
    // calculate angle
    let angle = Math.atan2(centerY, centerX);
    if (angle < 0) {
        angle += 2 * Math.PI;
    }
    const degrees = (angle * 180) / Math.PI;
    // get sector configuration for this shape type
    const config = SHAPE_CONFIGS[shapeType];
    const boundaries = getSectorBoundaries(config);
    // find which sector the angle falls into
    for (const boundary of boundaries) {
        if (boundary.start <= boundary.end) {
            // Normal case: sector doesn't cross 0°
            if (degrees >= boundary.start && degrees <= boundary.end) {
                return boundary.side;
            }
        }
        else if (degrees >= boundary.start || degrees <= boundary.end) {
            return boundary.side;
        }
    }
    // fallback - find nearest sector center
    let minDiff = Infinity;
    let nearestSide = config[0].side;
    for (const sector of config) {
        let diff = Math.abs(degrees - sector.centerAngle);
        // handle wraparound
        if (diff > 180) {
            diff = 360 - diff;
        }
        if (diff < minDiff) {
            minDiff = diff;
            nearestSide = sector.side;
        }
    }
    return nearestSide;
};
const getBindingSideMidPoint = (binding, elementsMap) => {
    const bindableElement = elementsMap.get(binding.elementId);
    if (!bindableElement ||
        bindableElement.isDeleted ||
        !(0, typeChecks_1.isBindableElement)(bindableElement)) {
        return null;
    }
    const center = (0, bounds_2.elementCenterPoint)(bindableElement, elementsMap);
    const shapeType = getShapeType(bindableElement);
    const side = getShapeSideAdaptive((0, exports.normalizeFixedPoint)(binding.fixedPoint), shapeType);
    // small offset to avoid precision issues in elbow
    const OFFSET = 0.01;
    if (bindableElement.type === "diamond") {
        const [sides, corners] = (0, utils_1.deconstructDiamondElement)(bindableElement);
        const [bottomRight, bottomLeft, topLeft, topRight] = sides;
        let x;
        let y;
        switch (side) {
            case "left": {
                // left vertex - use the center of the left corner curve
                if (corners.length >= 3) {
                    const leftCorner = corners[2];
                    const midPoint = leftCorner[1];
                    x = midPoint[0] - OFFSET;
                    y = midPoint[1];
                }
                else {
                    // fallback for non-rounded diamond
                    const midPoint = getMidPoint(bottomLeft[1], topLeft[0]);
                    x = midPoint[0] - OFFSET;
                    y = midPoint[1];
                }
                break;
            }
            case "right": {
                if (corners.length >= 1) {
                    const rightCorner = corners[0];
                    const midPoint = rightCorner[1];
                    x = midPoint[0] + OFFSET;
                    y = midPoint[1];
                }
                else {
                    const midPoint = getMidPoint(topRight[1], bottomRight[0]);
                    x = midPoint[0] + OFFSET;
                    y = midPoint[1];
                }
                break;
            }
            case "top": {
                if (corners.length >= 4) {
                    const topCorner = corners[3];
                    const midPoint = topCorner[1];
                    x = midPoint[0];
                    y = midPoint[1] - OFFSET;
                }
                else {
                    const midPoint = getMidPoint(topLeft[1], topRight[0]);
                    x = midPoint[0];
                    y = midPoint[1] - OFFSET;
                }
                break;
            }
            case "bottom": {
                if (corners.length >= 2) {
                    const bottomCorner = corners[1];
                    const midPoint = bottomCorner[1];
                    x = midPoint[0];
                    y = midPoint[1] + OFFSET;
                }
                else {
                    const midPoint = getMidPoint(bottomRight[1], bottomLeft[0]);
                    x = midPoint[0];
                    y = midPoint[1] + OFFSET;
                }
                break;
            }
            case "top-right": {
                const midPoint = getMidPoint(topRight[0], topRight[1]);
                x = midPoint[0] + OFFSET * 0.707;
                y = midPoint[1] - OFFSET * 0.707;
                break;
            }
            case "bottom-right": {
                const midPoint = getMidPoint(bottomRight[0], bottomRight[1]);
                x = midPoint[0] + OFFSET * 0.707;
                y = midPoint[1] + OFFSET * 0.707;
                break;
            }
            case "bottom-left": {
                const midPoint = getMidPoint(bottomLeft[0], bottomLeft[1]);
                x = midPoint[0] - OFFSET * 0.707;
                y = midPoint[1] + OFFSET * 0.707;
                break;
            }
            case "top-left": {
                const midPoint = getMidPoint(topLeft[0], topLeft[1]);
                x = midPoint[0] - OFFSET * 0.707;
                y = midPoint[1] - OFFSET * 0.707;
                break;
            }
            default: {
                return null;
            }
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, bindableElement.angle);
    }
    if (bindableElement.type === "ellipse") {
        const ellipseCenterX = bindableElement.x + bindableElement.width / 2;
        const ellipseCenterY = bindableElement.y + bindableElement.height / 2;
        const radiusX = bindableElement.width / 2;
        const radiusY = bindableElement.height / 2;
        let x;
        let y;
        switch (side) {
            case "top": {
                x = ellipseCenterX;
                y = ellipseCenterY - radiusY - OFFSET;
                break;
            }
            case "right": {
                x = ellipseCenterX + radiusX + OFFSET;
                y = ellipseCenterY;
                break;
            }
            case "bottom": {
                x = ellipseCenterX;
                y = ellipseCenterY + radiusY + OFFSET;
                break;
            }
            case "left": {
                x = ellipseCenterX - radiusX - OFFSET;
                y = ellipseCenterY;
                break;
            }
            case "top-right": {
                const angle = -Math.PI / 4;
                const ellipseX = radiusX * Math.cos(angle);
                const ellipseY = radiusY * Math.sin(angle);
                x = ellipseCenterX + ellipseX + OFFSET * 0.707;
                y = ellipseCenterY + ellipseY - OFFSET * 0.707;
                break;
            }
            case "bottom-right": {
                const angle = Math.PI / 4;
                const ellipseX = radiusX * Math.cos(angle);
                const ellipseY = radiusY * Math.sin(angle);
                x = ellipseCenterX + ellipseX + OFFSET * 0.707;
                y = ellipseCenterY + ellipseY + OFFSET * 0.707;
                break;
            }
            case "bottom-left": {
                const angle = (3 * Math.PI) / 4;
                const ellipseX = radiusX * Math.cos(angle);
                const ellipseY = radiusY * Math.sin(angle);
                x = ellipseCenterX + ellipseX - OFFSET * 0.707;
                y = ellipseCenterY + ellipseY + OFFSET * 0.707;
                break;
            }
            case "top-left": {
                const angle = (-3 * Math.PI) / 4;
                const ellipseX = radiusX * Math.cos(angle);
                const ellipseY = radiusY * Math.sin(angle);
                x = ellipseCenterX + ellipseX - OFFSET * 0.707;
                y = ellipseCenterY + ellipseY - OFFSET * 0.707;
                break;
            }
            default: {
                return null;
            }
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, bindableElement.angle);
    }
    if ((0, typeChecks_1.isRectangularElement)(bindableElement)) {
        const [sides, corners] = (0, utils_1.deconstructRectanguloidElement)(bindableElement);
        const [top, right, bottom, left] = sides;
        let x;
        let y;
        switch (side) {
            case "top": {
                const midPoint = getMidPoint(top[0], top[1]);
                x = midPoint[0];
                y = midPoint[1] - OFFSET;
                break;
            }
            case "right": {
                const midPoint = getMidPoint(right[0], right[1]);
                x = midPoint[0] + OFFSET;
                y = midPoint[1];
                break;
            }
            case "bottom": {
                const midPoint = getMidPoint(bottom[0], bottom[1]);
                x = midPoint[0];
                y = midPoint[1] + OFFSET;
                break;
            }
            case "left": {
                const midPoint = getMidPoint(left[0], left[1]);
                x = midPoint[0] - OFFSET;
                y = midPoint[1];
                break;
            }
            case "top-left": {
                if (corners.length >= 1) {
                    const corner = corners[0];
                    const p1 = corner[0];
                    const p2 = corner[3];
                    const midPoint = getMidPoint(p1, p2);
                    x = midPoint[0] - OFFSET * 0.707;
                    y = midPoint[1] - OFFSET * 0.707;
                }
                else {
                    x = bindableElement.x - OFFSET;
                    y = bindableElement.y - OFFSET;
                }
                break;
            }
            case "top-right": {
                if (corners.length >= 2) {
                    const corner = corners[1];
                    const p1 = corner[0];
                    const p2 = corner[3];
                    const midPoint = getMidPoint(p1, p2);
                    x = midPoint[0] + OFFSET * 0.707;
                    y = midPoint[1] - OFFSET * 0.707;
                }
                else {
                    x = bindableElement.x + bindableElement.width + OFFSET;
                    y = bindableElement.y - OFFSET;
                }
                break;
            }
            case "bottom-right": {
                if (corners.length >= 3) {
                    const corner = corners[2];
                    const p1 = corner[0];
                    const p2 = corner[3];
                    const midPoint = getMidPoint(p1, p2);
                    x = midPoint[0] + OFFSET * 0.707;
                    y = midPoint[1] + OFFSET * 0.707;
                }
                else {
                    x = bindableElement.x + bindableElement.width + OFFSET;
                    y = bindableElement.y + bindableElement.height + OFFSET;
                }
                break;
            }
            case "bottom-left": {
                if (corners.length >= 4) {
                    const corner = corners[3];
                    const p1 = corner[0];
                    const p2 = corner[3];
                    const midPoint = getMidPoint(p1, p2);
                    x = midPoint[0] - OFFSET * 0.707;
                    y = midPoint[1] + OFFSET * 0.707;
                }
                else {
                    x = bindableElement.x - OFFSET;
                    y = bindableElement.y + bindableElement.height + OFFSET;
                }
                break;
            }
            default: {
                return null;
            }
        }
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, bindableElement.angle);
    }
    return null;
};
exports.getBindingSideMidPoint = getBindingSideMidPoint;
const getMidPoint = (p1, p2) => {
    return (0, math_1.pointFrom)((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2);
};
