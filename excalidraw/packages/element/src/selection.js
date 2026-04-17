"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveTextElement = exports.getSelectionStateForElements = exports.makeNextSelectedElementIds = exports.getTargetElements = exports.getSelectedElements = exports.isSomeElementSelected = exports.getVisibleAndNonSelectedElements = exports.getElementsWithinSelection = exports.excludeElementsInFramesFromSelection = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const bounds_1 = require("./bounds");
const collision_1 = require("./collision");
const sizeHelpers_1 = require("./sizeHelpers");
const typeChecks_1 = require("./typeChecks");
const frame_1 = require("./frame");
const linearElementEditor_1 = require("./linearElementEditor");
const groups_1 = require("./groups");
const textElement_1 = require("./textElement");
const shouldIgnoreElementFromSelection = (element) => element.locked || (0, typeChecks_1.isBoundToContainer)(element);
const excludeElementsFromFrames = (selectedElements, framesInSelection) => {
    return selectedElements.filter((element) => {
        if (element.frameId && framesInSelection.has(element.frameId)) {
            return false;
        }
        return true;
    });
};
/**
 * Frames and their containing elements are not to be selected at the same time.
 * Given an array of selected elements, if there are frames and their containing elements
 * we only keep the frames.
 * @param selectedElements
 */
const excludeElementsInFramesFromSelection = (selectedElements) => {
    const framesInSelection = new Set();
    selectedElements.forEach((element) => {
        if ((0, typeChecks_1.isFrameLikeElement)(element)) {
            framesInSelection.add(element.id);
        }
    });
    return excludeElementsFromFrames(selectedElements, framesInSelection);
};
exports.excludeElementsInFramesFromSelection = excludeElementsInFramesFromSelection;
const getElementsWithinSelection = (elements, selection, elementsMap, 
// TODO remove (this flag is effectively unused AFAIK)
excludeElementsInFrames = true, boxSelectionMode = "contain") => {
    const [selectionStartX, selectionStartY, selectionEndX, selectionEndY] = (0, bounds_1.getElementAbsoluteCoords)(selection, elementsMap);
    const selectionX1 = Math.min(selectionStartX, selectionEndX);
    const selectionY1 = Math.min(selectionStartY, selectionEndY);
    const selectionX2 = Math.max(selectionStartX, selectionEndX);
    const selectionY2 = Math.max(selectionStartY, selectionEndY);
    const selectionBounds = [
        selectionX1,
        selectionY1,
        selectionX2,
        selectionY2,
    ];
    const selectionEdges = [
        (0, math_1.lineSegment)((0, math_1.pointFrom)(selectionX1, selectionY1), (0, math_1.pointFrom)(selectionX2, selectionY1)),
        (0, math_1.lineSegment)((0, math_1.pointFrom)(selectionX2, selectionY1), (0, math_1.pointFrom)(selectionX2, selectionY2)),
        (0, math_1.lineSegment)((0, math_1.pointFrom)(selectionX2, selectionY2), (0, math_1.pointFrom)(selectionX1, selectionY2)),
        (0, math_1.lineSegment)((0, math_1.pointFrom)(selectionX1, selectionY2), (0, math_1.pointFrom)(selectionX1, selectionY1)),
    ];
    const framesInSelection = excludeElementsInFrames
        ? new Set()
        : null;
    let elementsInSelection = [];
    for (const element of elements) {
        if (shouldIgnoreElementFromSelection(element)) {
            continue;
        }
        const strokeWidth = element.strokeWidth;
        let labelAABB = null;
        let elementAABB = (0, bounds_1.getElementBounds)(element, elementsMap);
        elementAABB = [
            elementAABB[0] - strokeWidth / 2,
            elementAABB[1] - strokeWidth / 2,
            elementAABB[2] + strokeWidth / 2,
            elementAABB[3] + strokeWidth / 2,
        ];
        // Whether the element bounds should include the bound text element bounds
        const boundTextElement = (0, typeChecks_1.isArrowElement)(element) && (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            const { x, y } = linearElementEditor_1.LinearElementEditor.getBoundTextElementPosition(element, boundTextElement, elementsMap);
            labelAABB = [
                x,
                y,
                x + boundTextElement.width,
                y + boundTextElement.height,
            ];
        }
        // Clip element bounds by its containing frame (if any), since only the
        // visible (frame-clipped) portion of the element is relevant for selection.
        const associatedFrame = (0, frame_1.getContainingFrame)(element, elementsMap);
        if (associatedFrame &&
            (0, frame_1.isElementIntersectingFrame)(element, associatedFrame, elementsMap)) {
            const frameAABB = (0, bounds_1.getElementBounds)(associatedFrame, elementsMap);
            elementAABB = [
                Math.max(elementAABB[0], frameAABB[0]),
                Math.max(elementAABB[1], frameAABB[1]),
                Math.min(elementAABB[2], frameAABB[2]),
                Math.min(elementAABB[3], frameAABB[3]),
            ];
            labelAABB = labelAABB
                ? [
                    Math.max(labelAABB[0], frameAABB[0]),
                    Math.max(labelAABB[1], frameAABB[1]),
                    Math.min(labelAABB[2], frameAABB[2]),
                    Math.min(labelAABB[3], frameAABB[3]),
                ]
                : null;
        }
        const commonAABB = labelAABB
            ? [
                Math.min(labelAABB[0], elementAABB[0]),
                Math.min(labelAABB[1], elementAABB[1]),
                Math.max(labelAABB[2], elementAABB[2]),
                Math.max(labelAABB[3], elementAABB[3]),
            ]
            : elementAABB;
        // ============== Evaluation ==============
        // 1. If the selection box WRAPs the element's AABB, then add it to the
        //    selection and move on, regardless of the selection mode.
        //
        //    PERF: This trick only works with axis-aligned box selection and the
        //          current convex element shapes!
        if ((0, bounds_1.boundsContainBounds)(selectionBounds, commonAABB)) {
            if (framesInSelection && (0, typeChecks_1.isFrameLikeElement)(element)) {
                framesInSelection.add(element.id);
            }
            else {
                elementsInSelection.push(element);
                continue;
            }
        }
        // 2. Handle the case where the label is overlapped by the selection box
        if (boxSelectionMode === "overlap" &&
            labelAABB &&
            (0, bounds_1.doBoundsIntersect)(selectionBounds, labelAABB)) {
            elementsInSelection.push(element);
            continue;
        }
        // 3. Handle the case where the selection is not wrapping the element, but
        //    it does intersect the element's outline (non-AABB).
        if (boxSelectionMode === "overlap" &&
            (0, bounds_1.doBoundsIntersect)(selectionBounds, elementAABB)) {
            let hasIntersection = false;
            // Preliminary check potential intersection imprecision
            if ((0, typeChecks_1.isLinearElement)(element) || (0, typeChecks_1.isFreeDrawElement)(element)) {
                const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
                hasIntersection = element.points.some((point) => {
                    const rotatedPoint = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + point[0], element.y + point[1]), center, element.angle);
                    return (0, bounds_1.pointInsideBounds)(rotatedPoint, selectionBounds);
                });
            }
            else {
                const nonRotatedElementBounds = (0, bounds_1.getElementBounds)(element, elementsMap, true);
                const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
                hasIntersection = [
                    (0, math_1.pointRotateRads)((0, math_1.pointFrom)((nonRotatedElementBounds[0] + nonRotatedElementBounds[2]) / 2, nonRotatedElementBounds[1]), center, element.angle),
                    (0, math_1.pointRotateRads)((0, math_1.pointFrom)(nonRotatedElementBounds[2], (nonRotatedElementBounds[1] + nonRotatedElementBounds[3]) / 2), center, element.angle),
                    (0, math_1.pointRotateRads)((0, math_1.pointFrom)((nonRotatedElementBounds[0] + nonRotatedElementBounds[2]) / 2, nonRotatedElementBounds[3]), center, element.angle),
                    (0, math_1.pointRotateRads)((0, math_1.pointFrom)(nonRotatedElementBounds[0], (nonRotatedElementBounds[1] + nonRotatedElementBounds[3]) / 2), center, element.angle),
                ].some((point) => {
                    return (0, bounds_1.pointInsideBounds)((0, math_1.pointRotateRads)(point, center, element.angle), selectionBounds);
                });
            }
            if (!hasIntersection) {
                hasIntersection = selectionEdges.some((selectionEdge) => (0, collision_1.intersectElementWithLineSegment)(element, elementsMap, selectionEdge, strokeWidth / 2, true).length > 0);
            }
            if (hasIntersection) {
                if (framesInSelection && (0, typeChecks_1.isFrameLikeElement)(element)) {
                    framesInSelection.add(element.id);
                }
                elementsInSelection.push(element);
                continue;
            }
        }
        // 4. We don't need to handle when the selection is inside the element
        //    as it is separately handled in App.
    }
    elementsInSelection = framesInSelection
        ? excludeElementsFromFrames(elementsInSelection, framesInSelection)
        : elementsInSelection;
    elementsInSelection = elementsInSelection.filter((element) => {
        const containingFrame = (0, frame_1.getContainingFrame)(element, elementsMap);
        if (containingFrame) {
            return (0, frame_1.elementOverlapsWithFrame)(element, containingFrame, elementsMap);
        }
        return true;
    });
    return elementsInSelection;
};
exports.getElementsWithinSelection = getElementsWithinSelection;
const getVisibleAndNonSelectedElements = (elements, selectedElements, appState, elementsMap) => {
    const selectedElementsSet = new Set(selectedElements.map((element) => element.id));
    return elements.filter((element) => {
        const isVisible = (0, sizeHelpers_1.isElementInViewport)(element, appState.width, appState.height, appState, elementsMap);
        return !selectedElementsSet.has(element.id) && isVisible;
    });
};
exports.getVisibleAndNonSelectedElements = getVisibleAndNonSelectedElements;
// FIXME move this into the editor instance to keep utility methods stateless
exports.isSomeElementSelected = (function () {
    let lastElements = null;
    let lastSelectedElementIds = null;
    let isSelected = null;
    const ret = (elements, appState) => {
        if (isSelected != null &&
            elements === lastElements &&
            appState.selectedElementIds === lastSelectedElementIds) {
            return isSelected;
        }
        isSelected = elements.some((element) => appState.selectedElementIds[element.id]);
        lastElements = elements;
        lastSelectedElementIds = appState.selectedElementIds;
        return isSelected;
    };
    ret.clearCache = () => {
        lastElements = null;
        lastSelectedElementIds = null;
        isSelected = null;
    };
    return ret;
})();
const getSelectedElements = (elements, appState, opts) => {
    const addedElements = new Set();
    const selectedElements = [];
    for (const element of elements.values()) {
        if (appState.selectedElementIds[element.id]) {
            selectedElements.push(element);
            addedElements.add(element.id);
            continue;
        }
        if (opts?.includeBoundTextElement &&
            (0, typeChecks_1.isBoundToContainer)(element) &&
            appState.selectedElementIds[element?.containerId]) {
            selectedElements.push(element);
            addedElements.add(element.id);
            continue;
        }
    }
    if (opts?.includeElementsInFrames) {
        const elementsToInclude = [];
        selectedElements.forEach((element) => {
            if ((0, typeChecks_1.isFrameLikeElement)(element)) {
                (0, frame_1.getFrameChildren)(elements, element.id).forEach((e) => !addedElements.has(e.id) && elementsToInclude.push(e));
            }
            elementsToInclude.push(element);
        });
        return elementsToInclude;
    }
    return selectedElements;
};
exports.getSelectedElements = getSelectedElements;
const getTargetElements = (elements, appState) => appState.editingTextElement
    ? [appState.editingTextElement]
    : appState.newElement
        ? [appState.newElement]
        : (0, exports.getSelectedElements)(elements, appState, {
            includeBoundTextElement: true,
        });
exports.getTargetElements = getTargetElements;
/**
 * returns prevState's selectedElementids if no change from previous, so as to
 * retain reference identity for memoization
 */
const makeNextSelectedElementIds = (nextSelectedElementIds, prevState) => {
    if ((0, common_1.isShallowEqual)(prevState.selectedElementIds, nextSelectedElementIds)) {
        return prevState.selectedElementIds;
    }
    return nextSelectedElementIds;
};
exports.makeNextSelectedElementIds = makeNextSelectedElementIds;
const _getLinearElementEditor = (targetElements, allElements) => {
    const linears = targetElements.filter(typeChecks_1.isLinearElement);
    if (linears.length === 1) {
        const linear = linears[0];
        const boundElements = linear.boundElements?.map((def) => def.id) ?? [];
        const onlySingleLinearSelected = targetElements.every((el) => el.id === linear.id || boundElements.includes(el.id));
        if (onlySingleLinearSelected) {
            return new linearElementEditor_1.LinearElementEditor(linear, (0, common_1.arrayToMap)(allElements));
        }
    }
    return null;
};
const getSelectionStateForElements = (targetElements, allElements, appState) => {
    return {
        selectedLinearElement: _getLinearElementEditor(targetElements, allElements),
        ...(0, groups_1.selectGroupsForSelectedElements)({
            editingGroupId: appState.editingGroupId,
            selectedElementIds: (0, exports.excludeElementsInFramesFromSelection)(targetElements).reduce((acc, element) => {
                if (!(0, typeChecks_1.isBoundToContainer)(element)) {
                    acc[element.id] = true;
                }
                return acc;
            }, {}),
        }, allElements, appState, null),
    };
};
exports.getSelectionStateForElements = getSelectionStateForElements;
/**
 * Returns editing or single-selected text element, if any.
 */
const getActiveTextElement = (selectedElements, appState) => {
    const activeTextElement = appState.editingTextElement ||
        (selectedElements.length === 1 &&
            (0, typeChecks_1.isTextElement)(selectedElements[0]) &&
            selectedElements[0]);
    return activeTextElement || null;
};
exports.getActiveTextElement = getActiveTextElement;
