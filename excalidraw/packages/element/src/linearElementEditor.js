"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinearElementEditor = void 0;
const math_1 = require("@excalidraw/math");
const shape_1 = require("@excalidraw/utils/shape");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const binding_1 = require("./binding");
const bounds_1 = require("./bounds");
const heading_1 = require("./heading");
const mutateElement_1 = require("./mutateElement");
const textElement_1 = require("./textElement");
const typeChecks_1 = require("./typeChecks");
const shape_2 = require("./shape");
const sizeHelpers_1 = require("./sizeHelpers");
const typeChecks_2 = require("./typeChecks");
/**
 * Normalizes line points so that the start point is at [0,0]. This is
 * expected in various parts of the codebase.
 *
 * Also returns the offsets - [0,0] if no normalization needed.
 *
 * @private
 */
const getNormalizedPoints = ({ points, }) => {
    const offsetX = points[0][0];
    const offsetY = points[0][1];
    return {
        points: points.map((p) => {
            return (0, math_1.pointFrom)(p[0] - offsetX, p[1] - offsetY);
        }),
        offsetX,
        offsetY,
    };
};
class LinearElementEditor {
    elementId;
    /** indices */
    selectedPointsIndices;
    initialState;
    /** whether you're dragging a point */
    isDragging;
    lastUncommittedPoint;
    lastCommittedPoint;
    pointerOffset;
    hoverPointIndex;
    segmentMidPointHoveredCoords;
    hoveredFocusPointBinding;
    draggedFocusPointBinding;
    elbowed;
    customLineAngle;
    isEditing;
    // @deprecated renamed to initialState because the data is used during linear
    // element click creation as well (with multiple pointer down events)
    // @ts-ignore
    pointerDownState;
    constructor(element, elementsMap, isEditing = false) {
        this.elementId = element.id;
        if (!(0, math_1.pointsEqual)(element.points[0], (0, math_1.pointFrom)(0, 0))) {
            console.error("Linear element is not normalized", Error().stack);
            (0, mutateElement_1.mutateElement)(element, elementsMap, LinearElementEditor.getNormalizeElementPointsAndCoords(element));
        }
        this.selectedPointsIndices = null;
        this.lastUncommittedPoint = null;
        this.lastCommittedPoint = null;
        this.isDragging = false;
        this.pointerOffset = { x: 0, y: 0 };
        this.initialState = {
            prevSelectedPointsIndices: null,
            lastClickedPoint: -1,
            origin: null,
            segmentMidpoint: {
                value: null,
                index: null,
                added: false,
            },
            arrowStartIsInside: false,
            altFocusPoint: null,
        };
        this.hoverPointIndex = -1;
        this.segmentMidPointHoveredCoords = null;
        this.hoveredFocusPointBinding = null;
        this.draggedFocusPointBinding = null;
        this.elbowed = (0, typeChecks_1.isElbowArrow)(element) && element.elbowed;
        this.customLineAngle = null;
        this.isEditing = isEditing;
    }
    // ---------------------------------------------------------------------------
    // static methods
    // ---------------------------------------------------------------------------
    static POINT_HANDLE_SIZE = 10;
    /**
     * @param id the `elementId` from the instance of this class (so that we can
     *  statically guarantee this method returns an ExcalidrawLinearElement)
     */
    static getElement(id, elementsMap) {
        const element = elementsMap.get(id);
        if (element) {
            return element;
        }
        return null;
    }
    static handleBoxSelection(event, appState, setState, elementsMap) {
        if (!appState.selectedLinearElement?.isEditing ||
            !appState.selectionElement) {
            return false;
        }
        const { selectedLinearElement } = appState;
        const { selectedPointsIndices, elementId } = selectedLinearElement;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        if (!element) {
            return false;
        }
        const [selectionX1, selectionY1, selectionX2, selectionY2] = (0, bounds_1.getElementAbsoluteCoords)(appState.selectionElement, elementsMap);
        const pointsSceneCoords = LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
        const nextSelectedPoints = pointsSceneCoords
            .reduce((acc, point, index) => {
            if ((point[0] >= selectionX1 &&
                point[0] <= selectionX2 &&
                point[1] >= selectionY1 &&
                point[1] <= selectionY2) ||
                (event.shiftKey && selectedPointsIndices?.includes(index))) {
                acc.push(index);
            }
            return acc;
        }, [])
            .filter((index) => {
            if ((0, typeChecks_1.isElbowArrow)(element) &&
                index !== 0 &&
                index !== element.points.length - 1) {
                return false;
            }
            return true;
        });
        setState({
            selectedLinearElement: {
                ...selectedLinearElement,
                selectedPointsIndices: nextSelectedPoints.length
                    ? nextSelectedPoints
                    : null,
            },
        });
    }
    static handlePointerMove(event, app, scenePointerX, scenePointerY, linearElementEditor) {
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const elements = app.scene.getNonDeletedElements();
        const { elementId } = linearElementEditor;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        (0, common_1.invariant)(element, "Element being dragged must exist in the scene");
        (0, common_1.invariant)(element.points.length > 1, "Element must have at least 2 points");
        const idx = element.points.length - 1;
        const point = element.points[idx];
        const pivotPoint = element.points[idx - 1];
        const customLineAngle = linearElementEditor.customLineAngle ??
            determineCustomLinearAngle(pivotPoint, element.points[idx]);
        // Determine if point movement should happen and how much
        let deltaX = 0;
        let deltaY = 0;
        if ((0, common_1.shouldRotateWithDiscreteAngle)(event)) {
            const [width, height] = LinearElementEditor._getShiftLockedDelta(element, elementsMap, pivotPoint, (0, math_1.pointFrom)(scenePointerX, scenePointerY), event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(), customLineAngle);
            const target = (0, math_1.pointFrom)(width + pivotPoint[0], height + pivotPoint[1]);
            deltaX = target[0] - point[0];
            deltaY = target[1] - point[1];
        }
        else {
            const newDraggingPointPosition = LinearElementEditor.createPointAt(element, elementsMap, scenePointerX - linearElementEditor.pointerOffset.x, scenePointerY - linearElementEditor.pointerOffset.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize());
            deltaX = newDraggingPointPosition[0] - point[0];
            deltaY = newDraggingPointPosition[1] - point[1];
        }
        // Apply the point movement if needed
        let suggestedBinding = null;
        const { positions, updates } = pointDraggingUpdates([idx], deltaX, deltaY, scenePointerX, scenePointerY, elementsMap, element, elements, app, (0, common_1.shouldRotateWithDiscreteAngle)(event), event.altKey, linearElementEditor);
        LinearElementEditor.movePoints(element, app.scene, positions, {
            startBinding: updates?.startBinding,
            endBinding: updates?.endBinding,
            moveMidPointsWithElement: updates?.moveMidPointsWithElement,
        }, {
            isBindingEnabled: app.state.isBindingEnabled,
            isMidpointSnappingEnabled: app.state.isMidpointSnappingEnabled,
        });
        // Set the suggested binding from the updates if available
        if ((0, typeChecks_1.isBindingElement)(element, false)) {
            if ((0, binding_1.isBindingEnabled)(app.state)) {
                suggestedBinding = updates?.suggestedBinding ?? null;
            }
        }
        // Move the arrow over the bindable object in terms of z-index
        if ((0, typeChecks_1.isBindingElement)(element)) {
            (0, element_1.moveArrowAboveBindable)(LinearElementEditor.getPointGlobalCoordinates(element, element.points[element.points.length - 1], elementsMap), element, elements, elementsMap, app.scene);
        }
        // PERF: Avoid state updates if not absolutely necessary
        if (app.state.selectedLinearElement?.customLineAngle === customLineAngle &&
            linearElementEditor.initialState.altFocusPoint &&
            (!suggestedBinding ||
                (0, common_1.isShallowEqual)(app.state.suggestedBinding ?? [], suggestedBinding))) {
            return null;
        }
        const startBindingElement = (0, typeChecks_1.isBindingElement)(element) &&
            element.startBinding &&
            elementsMap.get(element.startBinding.elementId);
        const newLinearElementEditor = {
            ...linearElementEditor,
            customLineAngle,
            initialState: {
                ...linearElementEditor.initialState,
                altFocusPoint: !linearElementEditor.initialState.altFocusPoint &&
                    startBindingElement &&
                    updates?.suggestedBinding?.element.id !== startBindingElement.id
                    ? (0, element_1.projectFixedPointOntoDiagonal)(element, (0, math_1.pointFrom)(element.x, element.y), startBindingElement, "start", elementsMap, app.state.zoom, app.state.isMidpointSnappingEnabled)
                    : linearElementEditor.initialState.altFocusPoint,
            },
        };
        return {
            selectedLinearElement: newLinearElementEditor,
            suggestedBinding,
        };
    }
    static handlePointDragging(event, app, scenePointerX, scenePointerY, linearElementEditor) {
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const elements = app.scene.getNonDeletedElements();
        const { elbowed, elementId, initialState } = linearElementEditor;
        const selectedPointsIndices = Array.from(linearElementEditor.selectedPointsIndices ?? []);
        let { lastClickedPoint } = initialState;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        (0, common_1.invariant)(element, "Element being dragged must exist in the scene");
        (0, common_1.invariant)(element.points.length > 1, "Element must have at least 2 points");
        (0, common_1.invariant)(selectedPointsIndices, "There must be selected points in order to drag them");
        if (elbowed) {
            selectedPointsIndices.some((pointIdx, idx) => {
                if (pointIdx > 0 && pointIdx !== element.points.length - 1) {
                    selectedPointsIndices[idx] = element.points.length - 1;
                    lastClickedPoint = element.points.length - 1;
                    return true;
                }
                return false;
            });
        }
        if (lastClickedPoint < 0 ||
            !selectedPointsIndices.includes(lastClickedPoint) ||
            !element.points[lastClickedPoint]) {
            console.error(`There must be a valid lastClickedPoint in order to drag it. selectedPointsIndices(${JSON.stringify(selectedPointsIndices)}) points(0..${element.points.length - 1}) lastClickedPoint(${lastClickedPoint})`);
            // Fall back to the actual last point as a last resort.
            lastClickedPoint = element.points.length - 1;
        }
        // point that's being dragged (out of all selected points)
        const draggingPoint = element.points[lastClickedPoint];
        // The adjacent point to the one dragged point
        const pivotPoint = element.points[lastClickedPoint === 0 ? 1 : lastClickedPoint - 1];
        const singlePointDragged = selectedPointsIndices.length === 1;
        const customLineAngle = linearElementEditor.customLineAngle ??
            determineCustomLinearAngle(pivotPoint, element.points[lastClickedPoint]);
        const startIsSelected = selectedPointsIndices.includes(0);
        const endIsSelected = selectedPointsIndices.includes(element.points.length - 1);
        // Determine if point movement should happen and how much
        let deltaX = 0;
        let deltaY = 0;
        if ((0, common_1.shouldRotateWithDiscreteAngle)(event) && singlePointDragged) {
            const [width, height] = LinearElementEditor._getShiftLockedDelta(element, elementsMap, pivotPoint, (0, math_1.pointFrom)(scenePointerX, scenePointerY), event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize(), customLineAngle);
            const target = (0, math_1.pointFrom)(width + pivotPoint[0], height + pivotPoint[1]);
            deltaX = target[0] - draggingPoint[0];
            deltaY = target[1] - draggingPoint[1];
        }
        else {
            const newDraggingPointPosition = LinearElementEditor.createPointAt(element, elementsMap, scenePointerX - linearElementEditor.pointerOffset.x, scenePointerY - linearElementEditor.pointerOffset.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize());
            deltaX = newDraggingPointPosition[0] - draggingPoint[0];
            deltaY = newDraggingPointPosition[1] - draggingPoint[1];
        }
        // Apply the point movement if needed
        let suggestedBinding = null;
        const { positions, updates } = pointDraggingUpdates(selectedPointsIndices, deltaX, deltaY, scenePointerX, scenePointerY, elementsMap, element, elements, app, (0, common_1.shouldRotateWithDiscreteAngle)(event) && singlePointDragged, event.altKey, linearElementEditor);
        LinearElementEditor.movePoints(element, app.scene, positions, {
            startBinding: updates?.startBinding,
            endBinding: updates?.endBinding,
            moveMidPointsWithElement: updates?.moveMidPointsWithElement,
        }, {
            isBindingEnabled: app.state.isBindingEnabled,
            isMidpointSnappingEnabled: app.state.isMidpointSnappingEnabled,
        });
        // Set the suggested binding from the updates if available
        if ((0, typeChecks_1.isBindingElement)(element, false)) {
            if ((0, binding_1.isBindingEnabled)(app.state) && (startIsSelected || endIsSelected)) {
                suggestedBinding = updates?.suggestedBinding ?? null;
            }
        }
        // Move the arrow over the bindable object in terms of z-index
        if ((0, typeChecks_1.isBindingElement)(element) && startIsSelected !== endIsSelected) {
            (0, element_1.moveArrowAboveBindable)(LinearElementEditor.getPointGlobalCoordinates(element, startIsSelected
                ? element.points[0]
                : element.points[element.points.length - 1], elementsMap), element, elements, elementsMap, app.scene);
        }
        // Attached text might need to update if arrow dimensions change
        const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            (0, textElement_1.handleBindTextResize)(element, app.scene, false);
        }
        // Update selected points for elbow arrows because elbow arrows add and
        // remove points as they route
        const newSelectedPointsIndices = elbowed
            ? endIsSelected
                ? [element.points.length - 1]
                : [0]
            : selectedPointsIndices;
        const newLastClickedPoint = elbowed
            ? newSelectedPointsIndices[0]
            : lastClickedPoint;
        const newSelectedMidPointHoveredCoords = !startIsSelected && !endIsSelected
            ? LinearElementEditor.getPointGlobalCoordinates(element, draggingPoint, elementsMap)
            : null;
        const newHoverPointIndex = newLastClickedPoint;
        const startBindingElement = (0, typeChecks_1.isBindingElement)(element) &&
            element.startBinding &&
            elementsMap.get(element.startBinding.elementId);
        const endBindingElement = (0, typeChecks_1.isBindingElement)(element) &&
            element.endBinding &&
            elementsMap.get(element.endBinding.elementId);
        const altFocusPointBindableElement = endIsSelected && // The "other" end (i.e. "end") is dragged
            startBindingElement &&
            updates?.suggestedBinding?.element.id !== startBindingElement.id // The end point is not hovering the start bindable + it's binding gap
            ? startBindingElement
            : startIsSelected && // The "other" end (i.e. "start") is dragged
                endBindingElement &&
                updates?.suggestedBinding?.element.id !== endBindingElement.id // The start point is not hovering the end bindable + it's binding gap
                ? endBindingElement
                : null;
        const newLinearElementEditor = {
            ...linearElementEditor,
            selectedPointsIndices: newSelectedPointsIndices,
            initialState: {
                ...linearElementEditor.initialState,
                lastClickedPoint: newLastClickedPoint,
                altFocusPoint: !linearElementEditor.initialState.altFocusPoint && // We only set it once per arrow drag
                    (0, typeChecks_1.isBindingElement)(element) &&
                    altFocusPointBindableElement
                    ? (0, element_1.projectFixedPointOntoDiagonal)(element, (0, math_1.pointFrom)(element.x, element.y), altFocusPointBindableElement, "start", elementsMap, app.state.zoom, app.state.isMidpointSnappingEnabled)
                    : linearElementEditor.initialState.altFocusPoint,
            },
            segmentMidPointHoveredCoords: newSelectedMidPointHoveredCoords,
            hoverPointIndex: newHoverPointIndex,
            isDragging: true,
            customLineAngle,
        };
        return {
            selectedLinearElement: newLinearElementEditor,
            suggestedBinding,
        };
    }
    static handlePointerUp(event, editingLinearElement, appState, scene) {
        const elementsMap = scene.getNonDeletedElementsMap();
        const { elementId, selectedPointsIndices, isDragging, initialState: pointerDownState, } = editingLinearElement;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        if (!element) {
            return editingLinearElement;
        }
        if (isDragging && selectedPointsIndices) {
            for (const selectedPoint of selectedPointsIndices) {
                if (selectedPoint === 0 ||
                    selectedPoint === element.points.length - 1) {
                    if ((0, element_1.isPathALoop)(element.points, appState.zoom.value)) {
                        if ((0, typeChecks_2.isLineElement)(element)) {
                            scene.mutateElement(element, {
                                ...(0, shape_2.toggleLinePolygonState)(element, true),
                            }, {
                                informMutation: false,
                                isDragging: false,
                            });
                        }
                        LinearElementEditor.movePoints(element, scene, new Map([
                            [
                                selectedPoint,
                                {
                                    point: selectedPoint === 0
                                        ? element.points[element.points.length - 1]
                                        : element.points[0],
                                },
                            ],
                        ]));
                    }
                }
            }
        }
        return {
            ...editingLinearElement,
            segmentMidPointHoveredCoords: null,
            hoverPointIndex: -1,
            // if clicking without previously dragging a point(s), and not holding
            // shift, deselect all points except the one clicked. If holding shift,
            // toggle the point.
            selectedPointsIndices: isDragging || event.shiftKey
                ? !isDragging &&
                    event.shiftKey &&
                    pointerDownState.prevSelectedPointsIndices?.includes(pointerDownState.lastClickedPoint)
                    ? selectedPointsIndices &&
                        selectedPointsIndices.filter((pointIndex) => pointIndex !== pointerDownState.lastClickedPoint)
                    : selectedPointsIndices
                : selectedPointsIndices?.includes(pointerDownState.lastClickedPoint)
                    ? [pointerDownState.lastClickedPoint]
                    : selectedPointsIndices,
            isDragging: false,
            customLineAngle: null,
            initialState: {
                ...editingLinearElement.initialState,
                origin: null,
                arrowStartIsInside: false,
            },
        };
    }
    static getEditorMidPoints = (element, elementsMap, appState) => {
        const boundText = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        // Since its not needed outside editor unless 2 pointer lines or bound text
        if (!(0, typeChecks_1.isElbowArrow)(element) &&
            !appState.selectedLinearElement?.isEditing &&
            element.points.length > 2 &&
            !boundText) {
            return [];
        }
        const points = LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
        let index = 0;
        const midpoints = [];
        while (index < points.length - 1) {
            if (LinearElementEditor.isSegmentTooShort(element, element.points[index], element.points[index + 1], index, appState.zoom, elementsMap)) {
                midpoints.push(null);
                index++;
                continue;
            }
            const segmentMidPoint = LinearElementEditor.getSegmentMidPoint(element, index + 1, elementsMap);
            midpoints.push(segmentMidPoint);
            index++;
        }
        return midpoints;
    };
    static getSegmentMidpointHitCoords = (linearElementEditor, scenePointer, appState, elementsMap) => {
        const { elementId } = linearElementEditor;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        if (!element) {
            return null;
        }
        const clickedPointIndex = LinearElementEditor.getPointIndexUnderCursor(element, elementsMap, appState.zoom, scenePointer.x, scenePointer.y);
        if (!(0, typeChecks_1.isElbowArrow)(element) && clickedPointIndex >= 0) {
            return null;
        }
        const points = LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
        if (points.length >= 3 &&
            !appState.selectedLinearElement?.isEditing &&
            !(0, typeChecks_1.isElbowArrow)(element)) {
            return null;
        }
        const threshold = (LinearElementEditor.POINT_HANDLE_SIZE + 1) / appState.zoom.value;
        const existingSegmentMidpointHitCoords = linearElementEditor.segmentMidPointHoveredCoords;
        if (existingSegmentMidpointHitCoords) {
            const distance = (0, math_1.pointDistance)((0, math_1.pointFrom)(existingSegmentMidpointHitCoords[0], existingSegmentMidpointHitCoords[1]), (0, math_1.pointFrom)(scenePointer.x, scenePointer.y));
            if (distance <= threshold) {
                return existingSegmentMidpointHitCoords;
            }
        }
        let index = 0;
        const midPoints = LinearElementEditor.getEditorMidPoints(element, elementsMap, appState);
        while (index < midPoints.length) {
            if (midPoints[index] !== null) {
                const distance = (0, math_1.pointDistance)(midPoints[index], (0, math_1.pointFrom)(scenePointer.x, scenePointer.y));
                if (distance <= threshold) {
                    return midPoints[index];
                }
            }
            index++;
        }
        return null;
    };
    static isSegmentTooShort(element, startPoint, endPoint, index, zoom, elementsMap) {
        if ((0, typeChecks_1.isElbowArrow)(element)) {
            if (index >= 0 && index < element.points.length) {
                return ((0, math_1.pointDistance)(startPoint, endPoint) * zoom.value <
                    LinearElementEditor.POINT_HANDLE_SIZE / 2);
            }
            return false;
        }
        let distance = (0, math_1.pointDistance)(startPoint, endPoint);
        if (element.points.length > 2 && element.roundness) {
            const [lines, curves] = (0, element_1.deconstructLinearOrFreeDrawElement)(element, elementsMap);
            (0, common_1.invariant)(lines.length === 0 && curves.length > 0, "Only linears built out of curves are supported");
            (0, common_1.invariant)(lines.length + curves.length >= index, "Invalid segment index while calculating mid point");
            distance = (0, math_1.curveLength)(curves[index]);
        }
        return distance * zoom.value < LinearElementEditor.POINT_HANDLE_SIZE * 4;
    }
    static getSegmentMidPoint(element, index, elementsMap) {
        if ((0, typeChecks_1.isElbowArrow)(element)) {
            (0, common_1.invariant)(element.points.length >= index, "Invalid segment index while calculating elbow arrow mid point");
            const p = (0, math_1.pointCenter)(element.points[index - 1], element.points[index]);
            return (0, math_1.pointFrom)(element.x + p[0], element.y + p[1]);
        }
        const [lines, curves] = (0, element_1.deconstructLinearOrFreeDrawElement)(element, elementsMap);
        (0, common_1.invariant)((lines.length === 0 && curves.length > 0) ||
            (lines.length > 0 && curves.length === 0), "Only linears built out of either segments or curves are supported");
        (0, common_1.invariant)(lines.length + curves.length >= index, "Invalid segment index while calculating mid point");
        if (lines.length) {
            const segment = lines[index - 1];
            return (0, math_1.pointCenter)(segment[0], segment[1]);
        }
        if (curves.length) {
            const segment = curves[index - 1];
            return (0, math_1.curvePointAtLength)(segment, 0.5);
        }
        (0, common_1.invariant)(false, "Invalid segment type while calculating mid point");
    }
    static getSegmentMidPointIndex(linearElementEditor, appState, midPoint, elementsMap) {
        const element = LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
        if (!element) {
            return -1;
        }
        const midPoints = LinearElementEditor.getEditorMidPoints(element, elementsMap, appState);
        let index = 0;
        while (index < midPoints.length) {
            if (LinearElementEditor.arePointsEqual(midPoint, midPoints[index])) {
                return index + 1;
            }
            index++;
        }
        return -1;
    }
    static handlePointerDown(event, app, store, scenePointer, linearElementEditor, scene) {
        const appState = app.state;
        const elementsMap = scene.getNonDeletedElementsMap();
        const ret = {
            didAddPoint: false,
            hitElement: null,
            linearElementEditor: null,
        };
        if (!linearElementEditor) {
            return ret;
        }
        const { elementId } = linearElementEditor;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        if (!element) {
            return ret;
        }
        const segmentMidpoint = LinearElementEditor.getSegmentMidpointHitCoords(linearElementEditor, scenePointer, appState, elementsMap);
        const point = (0, math_1.pointFrom)(scenePointer.x, scenePointer.y);
        let segmentMidpointIndex = null;
        if (segmentMidpoint) {
            segmentMidpointIndex = LinearElementEditor.getSegmentMidPointIndex(linearElementEditor, appState, segmentMidpoint, elementsMap);
        }
        else if (event.altKey && appState.selectedLinearElement?.isEditing) {
            if (linearElementEditor.lastUncommittedPoint == null) {
                scene.mutateElement(element, {
                    points: [
                        ...element.points,
                        LinearElementEditor.createPointAt(element, elementsMap, scenePointer.x, scenePointer.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize()),
                    ],
                });
                ret.didAddPoint = true;
            }
            store.scheduleCapture();
            ret.linearElementEditor = {
                ...linearElementEditor,
                initialState: {
                    prevSelectedPointsIndices: linearElementEditor.selectedPointsIndices,
                    lastClickedPoint: -1,
                    origin: point,
                    segmentMidpoint: {
                        value: segmentMidpoint,
                        index: segmentMidpointIndex,
                        added: false,
                    },
                    arrowStartIsInside: !!app.state.newElement &&
                        (app.state.bindMode === "inside" || app.state.bindMode === "skip"),
                    altFocusPoint: null,
                },
                selectedPointsIndices: [element.points.length - 1],
                lastUncommittedPoint: null,
            };
            ret.didAddPoint = true;
            return ret;
        }
        const clickedPointIndex = LinearElementEditor.getPointIndexUnderCursor(element, elementsMap, appState.zoom, scenePointer.x, scenePointer.y);
        // if we clicked on a point, set the element as hitElement otherwise
        // it would get deselected if the point is outside the hitbox area
        if (clickedPointIndex >= 0 || segmentMidpoint) {
            ret.hitElement = element;
        }
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const targetPoint = clickedPointIndex > -1 &&
            (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + element.points[clickedPointIndex][0], element.y + element.points[clickedPointIndex][1]), (0, math_1.pointFrom)(cx, cy), element.angle);
        const nextSelectedPointsIndices = clickedPointIndex > -1 || event.shiftKey
            ? event.shiftKey ||
                linearElementEditor.selectedPointsIndices?.includes(clickedPointIndex)
                ? normalizeSelectedPoints([
                    ...(linearElementEditor.selectedPointsIndices || []),
                    clickedPointIndex,
                ])
                : [clickedPointIndex]
            : null;
        ret.linearElementEditor = {
            ...linearElementEditor,
            initialState: {
                prevSelectedPointsIndices: linearElementEditor.selectedPointsIndices,
                lastClickedPoint: clickedPointIndex,
                origin: point,
                segmentMidpoint: {
                    value: segmentMidpoint,
                    index: segmentMidpointIndex,
                    added: false,
                },
                arrowStartIsInside: !!app.state.newElement &&
                    (app.state.bindMode === "inside" || app.state.bindMode === "skip"),
                altFocusPoint: null,
            },
            selectedPointsIndices: nextSelectedPointsIndices,
            pointerOffset: targetPoint
                ? {
                    x: scenePointer.x - targetPoint[0],
                    y: scenePointer.y - targetPoint[1],
                }
                : { x: 0, y: 0 },
        };
        return ret;
    }
    static arePointsEqual(point1, point2) {
        if (!point1 && !point2) {
            return true;
        }
        if (!point1 || !point2) {
            return false;
        }
        return (0, math_1.pointsEqual)(point1, point2);
    }
    static handlePointerMoveInEditMode(event, scenePointerX, scenePointerY, app) {
        const appState = app.state;
        if (!appState.selectedLinearElement?.isEditing) {
            return null;
        }
        const { elementId, lastUncommittedPoint } = appState.selectedLinearElement;
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        if (!element) {
            return appState.selectedLinearElement;
        }
        const { points } = element;
        const lastPoint = points[points.length - 1];
        if (!event.altKey) {
            if (lastPoint === lastUncommittedPoint) {
                LinearElementEditor.deletePoints(element, app, [points.length - 1]);
            }
            return appState.selectedLinearElement?.lastUncommittedPoint
                ? {
                    ...appState.selectedLinearElement,
                    lastUncommittedPoint: null,
                }
                : appState.selectedLinearElement;
        }
        let newPoint;
        if ((0, common_1.shouldRotateWithDiscreteAngle)(event) && points.length >= 2) {
            const anchor = points[points.length - 2];
            const [width, height] = LinearElementEditor._getShiftLockedDelta(element, elementsMap, anchor, (0, math_1.pointFrom)(scenePointerX, scenePointerY), event[common_1.KEYS.CTRL_OR_CMD] ? null : app.getEffectiveGridSize());
            newPoint = (0, math_1.pointFrom)(width + anchor[0], height + anchor[1]);
        }
        else {
            newPoint = LinearElementEditor.createPointAt(element, elementsMap, scenePointerX - appState.selectedLinearElement.pointerOffset.x, scenePointerY - appState.selectedLinearElement.pointerOffset.y, event[common_1.KEYS.CTRL_OR_CMD] || (0, typeChecks_1.isElbowArrow)(element)
                ? null
                : app.getEffectiveGridSize());
        }
        if (lastPoint === lastUncommittedPoint) {
            LinearElementEditor.movePoints(element, app.scene, new Map([
                [
                    element.points.length - 1,
                    {
                        point: newPoint,
                    },
                ],
            ]));
        }
        else {
            LinearElementEditor.addPoints(element, app.scene, [newPoint]);
        }
        return {
            ...appState.selectedLinearElement,
            lastUncommittedPoint: element.points[element.points.length - 1],
        };
    }
    /** scene coords */
    static getPointGlobalCoordinates(element, p, elementsMap) {
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const { x, y } = element;
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + p[0], y + p[1]), (0, math_1.pointFrom)(cx, cy), element.angle);
    }
    /** scene coords */
    static getPointsGlobalCoordinates(element, elementsMap) {
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return element.points.map((p) => {
            const { x, y } = element;
            return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + p[0], y + p[1]), (0, math_1.pointFrom)(cx, cy), element.angle);
        });
    }
    static getPointAtIndexGlobalCoordinates(element, indexMaybeFromEnd, // -1 for last element
    elementsMap) {
        const index = indexMaybeFromEnd < 0
            ? element.points.length + indexMaybeFromEnd
            : indexMaybeFromEnd;
        const [, , , , cx, cy] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const center = (0, math_1.pointFrom)(cx, cy);
        const p = element.points[index];
        const { x, y } = element;
        return p
            ? (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x + p[0], y + p[1]), center, element.angle)
            : (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x, y), center, element.angle);
    }
    static pointFromAbsoluteCoords(element, absoluteCoords, elementsMap) {
        if ((0, typeChecks_1.isElbowArrow)(element)) {
            // No rotation for elbow arrows
            return (0, math_1.pointFrom)(absoluteCoords[0] - element.x, absoluteCoords[1] - element.y);
        }
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const [x, y] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(absoluteCoords[0], absoluteCoords[1]), (0, math_1.pointFrom)(cx, cy), -element.angle);
        return (0, math_1.pointFrom)(x - element.x, y - element.y);
    }
    static getPointIndexUnderCursor(element, elementsMap, zoom, x, y) {
        const pointHandles = LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
        let idx = pointHandles.length;
        // loop from right to left because points on the right are rendered over
        // points on the left, thus should take precedence when clicking, if they
        // overlap
        while (--idx > -1) {
            const p = pointHandles[idx];
            if ((0, math_1.pointDistance)((0, math_1.pointFrom)(x, y), (0, math_1.pointFrom)(p[0], p[1])) * zoom.value <
                // +1px to account for outline stroke
                LinearElementEditor.POINT_HANDLE_SIZE + 1) {
                return idx;
            }
        }
        return -1;
    }
    static createPointAt(element, elementsMap, scenePointerX, scenePointerY, gridSize) {
        const pointerOnGrid = (0, common_1.getGridPoint)(scenePointerX, scenePointerY, gridSize);
        const [x1, y1, x2, y2] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const [rotatedX, rotatedY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(pointerOnGrid[0], pointerOnGrid[1]), (0, math_1.pointFrom)(cx, cy), -element.angle);
        return (0, math_1.pointFrom)(rotatedX - element.x, rotatedY - element.y);
    }
    /**
     * Normalizes line points so that the start point is at [0,0]. This is
     * expected in various parts of the codebase.
     *
     * Also returns normalized x and y coords to account for the normalization
     * of the points.
     */
    static getNormalizeElementPointsAndCoords(element) {
        const { points, offsetX, offsetY } = getNormalizedPoints(element);
        return {
            points,
            x: element.x + offsetX,
            y: element.y + offsetY,
        };
    }
    // element-mutating methods
    // ---------------------------------------------------------------------------
    static duplicateSelectedPoints(appState, scene) {
        (0, common_1.invariant)(appState.selectedLinearElement?.isEditing, "Not currently editing a linear element");
        const elementsMap = scene.getNonDeletedElementsMap();
        const { selectedPointsIndices, elementId } = appState.selectedLinearElement;
        const element = LinearElementEditor.getElement(elementId, elementsMap);
        (0, common_1.invariant)(element, "The linear element does not exist in the provided Scene");
        (0, common_1.invariant)(selectedPointsIndices != null, "There are no selected points to duplicate");
        const { points } = element;
        const nextSelectedIndices = [];
        let pointAddedToEnd = false;
        let indexCursor = -1;
        const nextPoints = points.reduce((acc, p, index) => {
            ++indexCursor;
            acc.push(p);
            const isSelected = selectedPointsIndices.includes(index);
            if (isSelected) {
                const nextPoint = points[index + 1];
                if (!nextPoint) {
                    pointAddedToEnd = true;
                }
                acc.push(nextPoint
                    ? (0, math_1.pointFrom)((p[0] + nextPoint[0]) / 2, (p[1] + nextPoint[1]) / 2)
                    : (0, math_1.pointFrom)(p[0], p[1]));
                nextSelectedIndices.push(indexCursor + 1);
                ++indexCursor;
            }
            return acc;
        }, []);
        scene.mutateElement(element, { points: nextPoints });
        // temp hack to ensure the line doesn't move when adding point to the end,
        // potentially expanding the bounding box
        if (pointAddedToEnd) {
            const lastPoint = element.points[element.points.length - 1];
            LinearElementEditor.movePoints(element, scene, new Map([
                [
                    element.points.length - 1,
                    { point: (0, math_1.pointFrom)(lastPoint[0] + 30, lastPoint[1] + 30) },
                ],
            ]));
        }
        return {
            ...appState,
            selectedLinearElement: {
                ...appState.selectedLinearElement,
                selectedPointsIndices: nextSelectedIndices,
            },
        };
    }
    static deletePoints(element, app, pointIndices) {
        const isUncommittedPoint = app.state.selectedLinearElement?.isEditing &&
            app.state.selectedLinearElement?.lastUncommittedPoint ===
                element.points[element.points.length - 1];
        const nextPoints = element.points.filter((_, idx) => {
            return !pointIndices.includes(idx);
        });
        const isPolygon = (0, typeChecks_2.isLineElement)(element) && element.polygon;
        // keep polygon intact if deleting start/end point or uncommitted point
        if (isPolygon &&
            (isUncommittedPoint ||
                pointIndices.includes(0) ||
                pointIndices.includes(element.points.length - 1))) {
            nextPoints[0] = (0, math_1.pointFrom)(nextPoints[nextPoints.length - 1][0], nextPoints[nextPoints.length - 1][1]);
        }
        const { points: normalizedPoints, offsetX, offsetY, } = getNormalizedPoints({ points: nextPoints });
        LinearElementEditor._updatePoints(element, app.scene, normalizedPoints, offsetX, offsetY);
    }
    static addPoints(element, scene, addedPoints) {
        const nextPoints = [...element.points, ...addedPoints];
        if ((0, typeChecks_2.isLineElement)(element) && element.polygon) {
            nextPoints[0] = (0, math_1.pointFrom)(nextPoints[nextPoints.length - 1][0], nextPoints[nextPoints.length - 1][1]);
        }
        const { points: normalizedPoints, offsetX, offsetY, } = getNormalizedPoints({ points: nextPoints });
        LinearElementEditor._updatePoints(element, scene, normalizedPoints, offsetX, offsetY);
    }
    static movePoints(element, scene, pointUpdates, otherUpdates, options) {
        const { points } = element;
        // if polygon, move start and end points together
        if ((0, typeChecks_2.isLineElement)(element) && element.polygon) {
            const firstPointUpdate = pointUpdates.get(0);
            const lastPointUpdate = pointUpdates.get(points.length - 1);
            if (firstPointUpdate) {
                pointUpdates.set(points.length - 1, {
                    point: (0, math_1.pointFrom)(firstPointUpdate.point[0], firstPointUpdate.point[1]),
                    isDragging: firstPointUpdate.isDragging,
                });
            }
            else if (lastPointUpdate) {
                pointUpdates.set(0, {
                    point: (0, math_1.pointFrom)(lastPointUpdate.point[0], lastPointUpdate.point[1]),
                    isDragging: lastPointUpdate.isDragging,
                });
            }
        }
        // in case we're moving start point, instead of modifying its position
        // which would break the invariant of it being at [0,0], we move
        // all the other points in the opposite direction by delta to
        // offset it. We do the same with actual element.x/y position, so
        // this hacks are completely transparent to the user.
        const updatedOriginPoint = pointUpdates.get(0)?.point ?? (0, math_1.pointFrom)(0, 0);
        const [offsetX, offsetY] = updatedOriginPoint;
        const nextPoints = (0, typeChecks_1.isElbowArrow)(element)
            ? [
                pointUpdates.get(0)?.point ?? points[0],
                pointUpdates.get(points.length - 1)?.point ??
                    points[points.length - 1],
            ]
            : points.map((p, idx) => {
                const current = pointUpdates.get(idx)?.point ?? p;
                if (otherUpdates?.moveMidPointsWithElement &&
                    idx !== 0 &&
                    idx !== points.length - 1 &&
                    !pointUpdates.has(idx)) {
                    return current;
                }
                return (0, math_1.pointFrom)(current[0] - offsetX, current[1] - offsetY);
            });
        LinearElementEditor._updatePoints(element, scene, nextPoints, offsetX, offsetY, otherUpdates, {
            isDragging: Array.from(pointUpdates.values()).some((t) => t.isDragging),
            isBindingEnabled: options?.isBindingEnabled,
            isMidpointSnappingEnabled: options?.isMidpointSnappingEnabled,
        });
    }
    static shouldAddMidpoint(linearElementEditor, pointerCoords, appState, elementsMap) {
        const element = LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
        // Elbow arrows don't allow midpoints
        if (element && (0, typeChecks_1.isElbowArrow)(element)) {
            return false;
        }
        if (!element) {
            return false;
        }
        const { segmentMidpoint } = linearElementEditor.initialState;
        if (segmentMidpoint.added ||
            segmentMidpoint.value === null ||
            segmentMidpoint.index === null ||
            linearElementEditor.initialState.origin === null) {
            return false;
        }
        const origin = linearElementEditor.initialState.origin;
        const dist = (0, math_1.pointDistance)(origin, (0, math_1.pointFrom)(pointerCoords.x, pointerCoords.y));
        if (!appState.selectedLinearElement?.isEditing &&
            dist < common_1.DRAGGING_THRESHOLD / appState.zoom.value) {
            return false;
        }
        return true;
    }
    static addMidpoint(linearElementEditor, pointerCoords, app, snapToGrid, scene) {
        const elementsMap = scene.getNonDeletedElementsMap();
        const element = LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
        if (!element) {
            return;
        }
        const { segmentMidpoint } = linearElementEditor.initialState;
        const ret = {
            pointerDownState: linearElementEditor.initialState,
            selectedPointsIndices: linearElementEditor.selectedPointsIndices,
        };
        const midpoint = LinearElementEditor.createPointAt(element, elementsMap, pointerCoords.x, pointerCoords.y, snapToGrid && !(0, typeChecks_1.isElbowArrow)(element) ? app.getEffectiveGridSize() : null);
        const points = [
            ...element.points.slice(0, segmentMidpoint.index),
            midpoint,
            ...element.points.slice(segmentMidpoint.index),
        ];
        scene.mutateElement(element, { points });
        ret.pointerDownState = {
            ...linearElementEditor.initialState,
            segmentMidpoint: {
                ...linearElementEditor.initialState.segmentMidpoint,
                added: true,
            },
            lastClickedPoint: segmentMidpoint.index,
        };
        ret.selectedPointsIndices = [segmentMidpoint.index];
        return ret;
    }
    static _updatePoints(element, scene, nextPoints, offsetX, offsetY, otherUpdates, options) {
        if ((0, typeChecks_1.isElbowArrow)(element)) {
            const updates = {};
            if (otherUpdates?.startBinding !== undefined) {
                updates.startBinding = otherUpdates.startBinding;
            }
            if (otherUpdates?.endBinding !== undefined) {
                updates.endBinding = otherUpdates.endBinding;
            }
            updates.points = Array.from(nextPoints);
            scene.mutateElement(element, updates, {
                informMutation: true,
                isDragging: options?.isDragging ?? false,
                isBindingEnabled: options?.isBindingEnabled,
                isMidpointSnappingEnabled: options?.isMidpointSnappingEnabled,
            });
        }
        else {
            // TODO do we need to get precise coords here just to calc centers?
            const nextCoords = (0, bounds_1.getElementPointsCoords)(element, nextPoints);
            const prevCoords = (0, bounds_1.getElementPointsCoords)(element, element.points);
            const nextCenterX = (nextCoords[0] + nextCoords[2]) / 2;
            const nextCenterY = (nextCoords[1] + nextCoords[3]) / 2;
            const prevCenterX = (prevCoords[0] + prevCoords[2]) / 2;
            const prevCenterY = (prevCoords[1] + prevCoords[3]) / 2;
            const dX = prevCenterX - nextCenterX;
            const dY = prevCenterY - nextCenterY;
            const rotatedOffset = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(offsetX, offsetY), (0, math_1.pointFrom)(dX, dY), element.angle);
            scene.mutateElement(element, {
                ...otherUpdates,
                points: nextPoints,
                x: element.x + rotatedOffset[0],
                y: element.y + rotatedOffset[1],
            });
        }
    }
    static _getShiftLockedDelta(element, elementsMap, referencePoint, scenePointer, gridSize, customLineAngle) {
        const referencePointCoords = LinearElementEditor.getPointGlobalCoordinates(element, referencePoint, elementsMap);
        if ((0, typeChecks_1.isElbowArrow)(element)) {
            return [
                scenePointer[0] - referencePointCoords[0],
                scenePointer[1] - referencePointCoords[1],
            ];
        }
        const [gridX, gridY] = (0, common_1.getGridPoint)(scenePointer[0], scenePointer[1], gridSize);
        const { width, height } = (0, sizeHelpers_1.getLockedLinearCursorAlignSize)(referencePointCoords[0], referencePointCoords[1], gridX, gridY, customLineAngle);
        return (0, math_1.pointRotateRads)((0, math_1.pointFrom)(width, height), (0, math_1.pointFrom)(0, 0), -element.angle);
    }
    static getBoundTextElementPosition = (element, boundTextElement, elementsMap) => {
        const points = LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
        if (points.length < 2) {
            (0, mutateElement_1.mutateElement)(boundTextElement, elementsMap, { isDeleted: true });
        }
        let x = 0;
        let y = 0;
        if (element.points.length % 2 === 1) {
            const index = Math.floor(element.points.length / 2);
            const midPoint = LinearElementEditor.getPointGlobalCoordinates(element, element.points[index], elementsMap);
            x = midPoint[0] - boundTextElement.width / 2;
            y = midPoint[1] - boundTextElement.height / 2;
        }
        else {
            const index = element.points.length / 2 - 1;
            const midSegmentMidpoint = LinearElementEditor.getSegmentMidPoint(element, index + 1, elementsMap);
            x = midSegmentMidpoint[0] - boundTextElement.width / 2;
            y = midSegmentMidpoint[1] - boundTextElement.height / 2;
        }
        return { x, y };
    };
    static getMinMaxXYWithBoundText = (element, elementsMap, elementBounds, boundTextElement) => {
        let [x1, y1, x2, y2] = elementBounds;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const { x: boundTextX1, y: boundTextY1 } = LinearElementEditor.getBoundTextElementPosition(element, boundTextElement, elementsMap);
        const boundTextX2 = boundTextX1 + boundTextElement.width;
        const boundTextY2 = boundTextY1 + boundTextElement.height;
        const centerPoint = (0, math_1.pointFrom)(cx, cy);
        const topLeftRotatedPoint = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), centerPoint, element.angle);
        const topRightRotatedPoint = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), centerPoint, element.angle);
        const counterRotateBoundTextTopLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(boundTextX1, boundTextY1), centerPoint, -element.angle);
        const counterRotateBoundTextTopRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(boundTextX2, boundTextY1), centerPoint, -element.angle);
        const counterRotateBoundTextBottomLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(boundTextX1, boundTextY2), centerPoint, -element.angle);
        const counterRotateBoundTextBottomRight = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(boundTextX2, boundTextY2), centerPoint, -element.angle);
        if (topLeftRotatedPoint[0] < topRightRotatedPoint[0] &&
            topLeftRotatedPoint[1] >= topRightRotatedPoint[1]) {
            x1 = Math.min(x1, counterRotateBoundTextBottomLeft[0]);
            x2 = Math.max(x2, Math.max(counterRotateBoundTextTopRight[0], counterRotateBoundTextBottomRight[0]));
            y1 = Math.min(y1, counterRotateBoundTextTopLeft[1]);
            y2 = Math.max(y2, counterRotateBoundTextBottomRight[1]);
        }
        else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0] &&
            topLeftRotatedPoint[1] > topRightRotatedPoint[1]) {
            x1 = Math.min(x1, counterRotateBoundTextBottomRight[0]);
            x2 = Math.max(x2, Math.max(counterRotateBoundTextTopLeft[0], counterRotateBoundTextTopRight[0]));
            y1 = Math.min(y1, counterRotateBoundTextBottomLeft[1]);
            y2 = Math.max(y2, counterRotateBoundTextTopRight[1]);
        }
        else if (topLeftRotatedPoint[0] >= topRightRotatedPoint[0]) {
            x1 = Math.min(x1, counterRotateBoundTextTopRight[0]);
            x2 = Math.max(x2, counterRotateBoundTextBottomLeft[0]);
            y1 = Math.min(y1, counterRotateBoundTextBottomRight[1]);
            y2 = Math.max(y2, counterRotateBoundTextTopLeft[1]);
        }
        else if (topLeftRotatedPoint[1] <= topRightRotatedPoint[1]) {
            x1 = Math.min(x1, Math.min(counterRotateBoundTextTopRight[0], counterRotateBoundTextTopLeft[0]));
            x2 = Math.max(x2, counterRotateBoundTextBottomRight[0]);
            y1 = Math.min(y1, counterRotateBoundTextTopRight[1]);
            y2 = Math.max(y2, counterRotateBoundTextBottomLeft[1]);
        }
        return [x1, y1, x2, y2, cx, cy];
    };
    static getElementAbsoluteCoords = (element, elementsMap, includeBoundText = false) => {
        const shape = shape_2.ShapeCache.generateElementShape(element, null);
        // first element is always the curve
        const ops = (0, shape_1.getCurvePathOps)(shape[0]);
        const [minX, minY, maxX, maxY] = (0, bounds_1.getMinMaxXYFromCurvePathOps)(ops);
        const x1 = minX + element.x;
        const y1 = minY + element.y;
        const x2 = maxX + element.x;
        const y2 = maxY + element.y;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const boundTextElement = includeBoundText && (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            return LinearElementEditor.getMinMaxXYWithBoundText(element, elementsMap, [x1, y1, x2, y2], boundTextElement);
        }
        return [x1, y1, x2, y2, cx, cy];
    };
    static moveFixedSegment(linearElement, index, x, y, scene) {
        const elementsMap = scene.getNonDeletedElementsMap();
        const element = LinearElementEditor.getElement(linearElement.elementId, elementsMap);
        if (!element || !(0, typeChecks_1.isElbowArrow)(element)) {
            return linearElement;
        }
        if (index && index > 0 && index < element.points.length) {
            const isHorizontal = (0, heading_1.headingIsHorizontal)((0, heading_1.vectorToHeading)((0, math_1.vectorFromPoint)(element.points[index], element.points[index - 1])));
            const fixedSegments = (element.fixedSegments ?? []).reduce((segments, s) => {
                segments[s.index] = s;
                return segments;
            }, {});
            fixedSegments[index] = {
                index,
                start: (0, math_1.pointFrom)(!isHorizontal ? x - element.x : element.points[index - 1][0], isHorizontal ? y - element.y : element.points[index - 1][1]),
                end: (0, math_1.pointFrom)(!isHorizontal ? x - element.x : element.points[index][0], isHorizontal ? y - element.y : element.points[index][1]),
            };
            const nextFixedSegments = Object.values(fixedSegments).sort((a, b) => a.index - b.index);
            const offset = nextFixedSegments
                .map((segment) => segment.index)
                .reduce((count, idx) => (idx < index ? count + 1 : count), 0);
            scene.mutateElement(element, {
                fixedSegments: nextFixedSegments,
            });
            const point = (0, math_1.pointFrom)(element.x +
                (element.fixedSegments[offset].start[0] +
                    element.fixedSegments[offset].end[0]) /
                    2, element.y +
                (element.fixedSegments[offset].start[1] +
                    element.fixedSegments[offset].end[1]) /
                    2);
            return {
                ...linearElement,
                segmentMidPointHoveredCoords: point,
                initialState: {
                    ...linearElement.initialState,
                    segmentMidpoint: {
                        added: false,
                        index: element.fixedSegments[offset].index,
                        value: point,
                    },
                },
            };
        }
        return linearElement;
    }
    static deleteFixedSegment(element, scene, index) {
        scene.mutateElement(element, {
            fixedSegments: element.fixedSegments?.filter((segment) => segment.index !== index),
        });
    }
}
exports.LinearElementEditor = LinearElementEditor;
const normalizeSelectedPoints = (points) => {
    let nextPoints = [
        ...new Set(points.filter((p) => p !== null && p !== -1)),
    ];
    nextPoints = nextPoints.sort((a, b) => a - b);
    return nextPoints.length ? nextPoints : null;
};
const pointDraggingUpdates = (selectedPointsIndices, deltaX, deltaY, scenePointerX, scenePointerY, elementsMap, element, elements, app, angleLocked, altKey, linearElementEditor) => {
    const naiveDraggingPoints = new Map(selectedPointsIndices.map((pointIndex) => {
        return [
            pointIndex,
            {
                point: (0, math_1.pointFrom)(element.points[pointIndex][0] + deltaX, element.points[pointIndex][1] + deltaY),
                isDragging: true,
            },
        ];
    }));
    // Linear elements have no special logic
    if (!(0, typeChecks_1.isArrowElement)(element)) {
        return {
            positions: naiveDraggingPoints,
        };
    }
    const startIsDragged = selectedPointsIndices.includes(0);
    const endIsDragged = selectedPointsIndices.includes(element.points.length - 1);
    const { start, end } = (0, binding_1.getBindingStrategyForDraggingBindingElementEndpoints)(element, naiveDraggingPoints, scenePointerX, scenePointerY, elementsMap, elements, app.state, {
        newArrow: !!app.state.newElement,
        angleLocked,
        altKey,
    });
    if ((0, typeChecks_1.isElbowArrow)(element)) {
        const suggestedBindingElement = startIsDragged
            ? start.element
            : endIsDragged
                ? end.element
                : null;
        return {
            positions: naiveDraggingPoints,
            updates: {
                suggestedBinding: suggestedBindingElement
                    ? {
                        element: suggestedBindingElement,
                        midPoint: app.state.isMidpointSnappingEnabled
                            ? (0, binding_1.snapToMid)(suggestedBindingElement, elementsMap, (0, math_1.pointFrom)(scenePointerX - linearElementEditor.pointerOffset.x, scenePointerY - linearElementEditor.pointerOffset.y))
                            : undefined,
                    }
                    : null,
            },
        };
    }
    // Handle the case where neither endpoint is being dragged
    // but we need to update bound endpoints
    if (!startIsDragged && !endIsDragged) {
        const nextArrow = {
            ...element,
            points: element.points.map((p, idx) => {
                return naiveDraggingPoints.get(idx)?.point ?? p;
            }),
        };
        const positions = new Map(naiveDraggingPoints);
        if (element.startBinding) {
            const startBindable = elementsMap.get(element.startBinding.elementId);
            if (startBindable) {
                const startPoint = (0, binding_1.updateBoundPoint)(nextArrow, "startBinding", element.startBinding, startBindable, elementsMap) ?? null;
                if (startPoint) {
                    positions.set(0, { point: startPoint, isDragging: true });
                }
            }
        }
        if (element.endBinding) {
            const endBindable = elementsMap.get(element.endBinding.elementId);
            if (endBindable) {
                const endPoint = (0, binding_1.updateBoundPoint)(nextArrow, "endBinding", element.endBinding, endBindable, elementsMap) ?? null;
                if (endPoint) {
                    positions.set(element.points.length - 1, {
                        point: endPoint,
                        isDragging: true,
                    });
                }
            }
        }
        return {
            positions,
        };
    }
    if (startIsDragged === endIsDragged) {
        return {
            positions: naiveDraggingPoints,
        };
    }
    // Generate the next bindings for the arrow
    const updates = {
        suggestedBinding: null,
    };
    if (start.mode === null) {
        updates.startBinding = null;
    }
    else if (start.mode) {
        updates.startBinding = {
            elementId: start.element.id,
            mode: start.mode,
            ...(0, binding_1.calculateFixedPointForNonElbowArrowBinding)(element, start.element, "start", elementsMap, start.focusPoint),
        };
        if (startIsDragged &&
            (updates.startBinding.mode === "orbit" ||
                !(0, common_1.getFeatureFlag)("COMPLEX_BINDINGS"))) {
            updates.suggestedBinding = start.element
                ? {
                    element: start.element,
                    midPoint: (0, element_1.getSnapOutlineMidPoint)((0, math_1.pointFrom)(scenePointerX - linearElementEditor.pointerOffset.x, scenePointerY - linearElementEditor.pointerOffset.y), start.element, elementsMap, app.state.zoom),
                }
                : null;
        }
    }
    else if (startIsDragged) {
        updates.suggestedBinding = app.state.suggestedBinding;
    }
    if (end.mode === null) {
        updates.endBinding = null;
    }
    else if (end.mode) {
        updates.endBinding = {
            elementId: end.element.id,
            mode: end.mode,
            ...(0, binding_1.calculateFixedPointForNonElbowArrowBinding)(element, end.element, "end", elementsMap, end.focusPoint),
        };
        if (endIsDragged &&
            (updates.endBinding.mode === "orbit" ||
                !(0, common_1.getFeatureFlag)("COMPLEX_BINDINGS"))) {
            updates.suggestedBinding = end.element
                ? {
                    element: end.element,
                    midPoint: (0, element_1.getSnapOutlineMidPoint)((0, math_1.pointFrom)(scenePointerX - linearElementEditor.pointerOffset.x, scenePointerY - linearElementEditor.pointerOffset.y), end.element, elementsMap, app.state.zoom),
                }
                : null;
        }
    }
    else if (endIsDragged) {
        updates.suggestedBinding = app.state.suggestedBinding;
    }
    // Simulate the updated arrow for the bind point calculation
    const offsetStartLocalPoint = startIsDragged
        ? (0, math_1.pointFrom)(element.points[0][0] + deltaX, element.points[0][1] + deltaY)
        : element.points[0];
    const offsetEndLocalPoint = endIsDragged
        ? (0, math_1.pointFrom)(element.points[element.points.length - 1][0] + deltaX, element.points[element.points.length - 1][1] + deltaY)
        : element.points[element.points.length - 1];
    const nextArrow = {
        ...element,
        points: [
            offsetStartLocalPoint,
            ...element.points.slice(1, -1),
            offsetEndLocalPoint,
        ],
        startBinding: updates.startBinding === undefined
            ? element.startBinding
            : updates.startBinding === null
                ? null
                : updates.startBinding,
        endBinding: updates.endBinding === undefined
            ? element.endBinding
            : updates.endBinding === null
                ? null
                : updates.endBinding,
    };
    // Needed to handle a special case where an existing arrow is dragged over
    // the same element it is bound to on the other side
    const startIsDraggingOverEndElement = element.endBinding &&
        nextArrow.startBinding &&
        startIsDragged &&
        nextArrow.startBinding.elementId === element.endBinding.elementId;
    const endIsDraggingOverStartElement = element.startBinding &&
        nextArrow.endBinding &&
        endIsDragged &&
        element.startBinding.elementId === nextArrow.endBinding.elementId;
    // We need to update the non-dragged point too if bound,
    // so we look up the old binding to trigger updateBoundPoint
    const endBindable = nextArrow.endBinding
        ? end.element ??
            elementsMap.get(nextArrow.endBinding.elementId)
        : null;
    const endLocalPoint = startIsDraggingOverEndElement
        ? nextArrow.points[nextArrow.points.length - 1]
        : endIsDraggingOverStartElement &&
            app.state.bindMode !== "inside" &&
            (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")
            ? nextArrow.points[0]
            : endBindable
                ? (0, binding_1.updateBoundPoint)(nextArrow, "endBinding", nextArrow.endBinding, endBindable, elementsMap, endIsDragged) || nextArrow.points[nextArrow.points.length - 1]
                : nextArrow.points[nextArrow.points.length - 1];
    // We need to keep the simulated next arrow up-to-date, because
    // updateBoundPoint looks at the opposite point
    nextArrow.points[nextArrow.points.length - 1] = endLocalPoint;
    // We need to update the non-dragged point too if bound,
    // so we look up the old binding to trigger updateBoundPoint
    const startBindable = nextArrow.startBinding
        ? start.element ??
            elementsMap.get(nextArrow.startBinding.elementId)
        : null;
    const startLocalPoint = endIsDraggingOverStartElement && (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")
        ? nextArrow.points[0]
        : startIsDraggingOverEndElement &&
            app.state.bindMode !== "inside" &&
            (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")
            ? endLocalPoint
            : startBindable
                ? (0, binding_1.updateBoundPoint)(nextArrow, "startBinding", nextArrow.startBinding, startBindable, elementsMap, startIsDragged) || nextArrow.points[0]
                : nextArrow.points[0];
    const endChanged = !startIsDraggingOverEndElement &&
        !(endIsDraggingOverStartElement &&
            app.state.bindMode !== "inside" &&
            (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) &&
        !!endBindable;
    const startChanged = (0, math_1.pointDistance)(startLocalPoint, nextArrow.points[0]) !== 0;
    const indicesSet = new Set(selectedPointsIndices);
    if (startBindable && startChanged) {
        indicesSet.add(0);
    }
    if (endBindable && endChanged) {
        indicesSet.add(element.points.length - 1);
    }
    const indices = Array.from(indicesSet);
    return {
        updates,
        positions: new Map(indices.map((idx) => {
            return [
                idx,
                idx === 0
                    ? {
                        point: startLocalPoint,
                        isDragging: true,
                    }
                    : idx === element.points.length - 1
                        ? {
                            point: endLocalPoint,
                            isDragging: true,
                        }
                        : naiveDraggingPoints.get(idx),
            ];
        })),
    };
};
const determineCustomLinearAngle = (pivotPoint, draggedPoint) => Math.atan2(draggedPoint[1] - pivotPoint[1], draggedPoint[0] - pivotPoint[0]);
