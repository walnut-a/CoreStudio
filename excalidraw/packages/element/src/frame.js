"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameAndChildrenSelectedTogether = exports.getElementsOverlappingFrame = exports.getFrameLikeTitle = exports.getDefaultFrameName = exports.shouldApplyFrameClip = exports.isElementInFrame = exports.getTargetFrame = exports.omitGroupsContainingFrameLikes = exports.updateFrameMembershipOfSelectedElements = exports.replaceAllElementsInFrame = exports.removeAllElementsFromFrame = exports.removeElementsFromFrame = exports.addElementsToFrame = exports.filterElementsEligibleAsFrameChildren = exports.getContainingFrame = exports.omitPartialGroups = exports.getElementsInNewFrame = exports.getElementsInResizingFrame = exports.getRootElements = exports.getFrameLikeElements = exports.getFrameChildren = exports.groupByFrameLikes = exports.groupsAreCompletelyOutOfFrame = exports.groupsAreAtLeastIntersectingTheFrame = exports.isCursorInFrame = exports.elementOverlapsWithFrame = exports.elementsAreInFrameBounds = exports.getElementsIntersectingFrame = exports.isElementContainingFrame = exports.getElementsCompletelyInFrame = exports.bindElementsToFramesAfterDuplication = void 0;
exports.isElementIntersectingFrame = isElementIntersectingFrame;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const bbox_1 = require("@excalidraw/utils/bbox");
const selection_1 = require("./selection");
const groups_1 = require("./groups");
const bounds_1 = require("./bounds");
const mutateElement_1 = require("./mutateElement");
const textElement_1 = require("./textElement");
const typeChecks_1 = require("./typeChecks");
// --------------------------- Frame State ------------------------------------
const bindElementsToFramesAfterDuplication = (nextElements, origElements, origIdToDuplicateId) => {
    const nextElementMap = (0, common_1.arrayToMap)(nextElements);
    for (const element of origElements) {
        if (element.frameId) {
            // use its frameId to get the new frameId
            const nextElementId = origIdToDuplicateId.get(element.id);
            const nextFrameId = origIdToDuplicateId.get(element.frameId);
            const nextElement = nextElementId && nextElementMap.get(nextElementId);
            if (nextElement) {
                (0, mutateElement_1.mutateElement)(nextElement, nextElementMap, {
                    frameId: nextFrameId ?? null,
                });
            }
        }
    }
};
exports.bindElementsToFramesAfterDuplication = bindElementsToFramesAfterDuplication;
function isElementIntersectingFrame(element, frame, elementsMap) {
    const frameLineSegments = (0, bounds_1.getElementLineSegments)(frame, elementsMap);
    const elementLineSegments = (0, bounds_1.getElementLineSegments)(element, elementsMap);
    const intersecting = frameLineSegments.some((frameLineSegment) => elementLineSegments.some((elementLineSegment) => (0, bbox_1.doLineSegmentsIntersect)(frameLineSegment, elementLineSegment)));
    return intersecting;
}
const getElementsCompletelyInFrame = (elements, frame, elementsMap) => (0, exports.omitGroupsContainingFrameLikes)((0, selection_1.getElementsWithinSelection)(elements, frame, elementsMap, false)).filter((element) => (!(0, typeChecks_1.isFrameLikeElement)(element) && !element.frameId) ||
    element.frameId === frame.id);
exports.getElementsCompletelyInFrame = getElementsCompletelyInFrame;
const isElementContainingFrame = (element, frame, elementsMap) => {
    return (0, selection_1.getElementsWithinSelection)([frame], element, elementsMap).some((e) => e.id === frame.id);
};
exports.isElementContainingFrame = isElementContainingFrame;
const getElementsIntersectingFrame = (elements, frame) => {
    const elementsMap = (0, common_1.arrayToMap)(elements);
    return elements.filter((element) => isElementIntersectingFrame(element, frame, elementsMap));
};
exports.getElementsIntersectingFrame = getElementsIntersectingFrame;
const elementsAreInFrameBounds = (elements, frame, elementsMap) => {
    const [frameX1, frameY1, frameX2, frameY2] = (0, bounds_1.getElementAbsoluteCoords)(frame, elementsMap);
    const [elementX1, elementY1, elementX2, elementY2] = (0, bounds_1.getCommonBounds)(elements);
    return (frameX1 <= elementX1 &&
        frameY1 <= elementY1 &&
        frameX2 >= elementX2 &&
        frameY2 >= elementY2);
};
exports.elementsAreInFrameBounds = elementsAreInFrameBounds;
const elementOverlapsWithFrame = (element, frame, elementsMap) => {
    return ((0, exports.elementsAreInFrameBounds)([element], frame, elementsMap) ||
        isElementIntersectingFrame(element, frame, elementsMap) ||
        (0, exports.isElementContainingFrame)(element, frame, elementsMap));
};
exports.elementOverlapsWithFrame = elementOverlapsWithFrame;
const isCursorInFrame = (cursorCoords, frame, elementsMap) => {
    const [fx1, fy1, fx2, fy2] = (0, bounds_1.getElementAbsoluteCoords)(frame, elementsMap);
    return (0, math_1.isPointWithinBounds)((0, math_1.pointFrom)(fx1, fy1), (0, math_1.pointFrom)(cursorCoords.x, cursorCoords.y), (0, math_1.pointFrom)(fx2, fy2));
};
exports.isCursorInFrame = isCursorInFrame;
const groupsAreAtLeastIntersectingTheFrame = (elements, groupIds, frame) => {
    const elementsMap = (0, common_1.arrayToMap)(elements);
    const elementsInGroup = groupIds.flatMap((groupId) => (0, groups_1.getElementsInGroup)(elements, groupId));
    if (elementsInGroup.length === 0) {
        return true;
    }
    return !!elementsInGroup.find((element) => (0, exports.elementsAreInFrameBounds)([element], frame, elementsMap) ||
        isElementIntersectingFrame(element, frame, elementsMap));
};
exports.groupsAreAtLeastIntersectingTheFrame = groupsAreAtLeastIntersectingTheFrame;
const groupsAreCompletelyOutOfFrame = (elements, groupIds, frame) => {
    const elementsMap = (0, common_1.arrayToMap)(elements);
    const elementsInGroup = groupIds.flatMap((groupId) => (0, groups_1.getElementsInGroup)(elements, groupId));
    if (elementsInGroup.length === 0) {
        return true;
    }
    return (elementsInGroup.find((element) => (0, exports.elementsAreInFrameBounds)([element], frame, elementsMap) ||
        isElementIntersectingFrame(element, frame, elementsMap)) === undefined);
};
exports.groupsAreCompletelyOutOfFrame = groupsAreCompletelyOutOfFrame;
// --------------------------- Frame Utils ------------------------------------
/**
 * Returns a map of frameId to frame elements. Includes empty frames.
 */
const groupByFrameLikes = (elements) => {
    const frameElementsMap = new Map();
    for (const element of elements) {
        const frameId = (0, typeChecks_1.isFrameLikeElement)(element) ? element.id : element.frameId;
        if (frameId && !frameElementsMap.has(frameId)) {
            frameElementsMap.set(frameId, (0, exports.getFrameChildren)(elements, frameId));
        }
    }
    return frameElementsMap;
};
exports.groupByFrameLikes = groupByFrameLikes;
const getFrameChildren = (allElements, frameId) => {
    const frameChildren = [];
    for (const element of allElements.values()) {
        if (element.frameId === frameId) {
            frameChildren.push(element);
        }
    }
    return frameChildren;
};
exports.getFrameChildren = getFrameChildren;
const getFrameLikeElements = (allElements) => {
    return allElements.filter((element) => (0, typeChecks_1.isFrameLikeElement)(element));
};
exports.getFrameLikeElements = getFrameLikeElements;
/**
 * Returns ExcalidrawFrameElements and non-frame-children elements.
 *
 * Considers children as root elements if they point to a frame parent
 * non-existing in the elements set.
 *
 * Considers non-frame bound elements (container or arrow labels) as root.
 */
const getRootElements = (allElements) => {
    const frameElements = (0, common_1.arrayToMap)((0, exports.getFrameLikeElements)(allElements));
    return allElements.filter((element) => frameElements.has(element.id) ||
        !element.frameId ||
        !frameElements.has(element.frameId));
};
exports.getRootElements = getRootElements;
const getElementsInResizingFrame = (allElements, frame, appState, elementsMap) => {
    const prevElementsInFrame = (0, exports.getFrameChildren)(allElements, frame.id);
    const nextElementsInFrame = new Set(prevElementsInFrame);
    const elementsCompletelyInFrame = new Set([
        ...(0, exports.getElementsCompletelyInFrame)(allElements, frame, elementsMap),
        ...prevElementsInFrame.filter((element) => (0, exports.isElementContainingFrame)(element, frame, elementsMap)),
    ]);
    const elementsNotCompletelyInFrame = prevElementsInFrame.filter((element) => !elementsCompletelyInFrame.has(element));
    // for elements that are completely in the frame
    // if they are part of some groups, then those groups are still
    // considered to belong to the frame
    const groupsToKeep = new Set(Array.from(elementsCompletelyInFrame).flatMap((element) => element.groupIds));
    for (const element of elementsNotCompletelyInFrame) {
        if (!isElementIntersectingFrame(element, frame, elementsMap)) {
            if (element.groupIds.length === 0) {
                nextElementsInFrame.delete(element);
            }
        }
        else if (element.groupIds.length > 0) {
            // group element intersects with the frame, we should keep the groups
            // that this element is part of
            for (const id of element.groupIds) {
                groupsToKeep.add(id);
            }
        }
    }
    for (const element of elementsNotCompletelyInFrame) {
        if (element.groupIds.length > 0) {
            let shouldRemoveElement = true;
            for (const id of element.groupIds) {
                if (groupsToKeep.has(id)) {
                    shouldRemoveElement = false;
                }
            }
            if (shouldRemoveElement) {
                nextElementsInFrame.delete(element);
            }
        }
    }
    const individualElementsCompletelyInFrame = Array.from(elementsCompletelyInFrame).filter((element) => element.groupIds.length === 0);
    for (const element of individualElementsCompletelyInFrame) {
        nextElementsInFrame.add(element);
    }
    const newGroupElementsCompletelyInFrame = Array.from(elementsCompletelyInFrame).filter((element) => element.groupIds.length > 0);
    const groupIds = (0, groups_1.selectGroupsFromGivenElements)(newGroupElementsCompletelyInFrame, appState);
    // new group elements
    for (const [id, isSelected] of Object.entries(groupIds)) {
        if (isSelected) {
            const elementsInGroup = (0, groups_1.getElementsInGroup)(allElements, id);
            if ((0, exports.elementsAreInFrameBounds)(elementsInGroup, frame, elementsMap)) {
                for (const element of elementsInGroup) {
                    nextElementsInFrame.add(element);
                }
            }
        }
    }
    return [...nextElementsInFrame].filter((element) => {
        return !((0, typeChecks_1.isTextElement)(element) && element.containerId);
    });
};
exports.getElementsInResizingFrame = getElementsInResizingFrame;
const getElementsInNewFrame = (elements, frame, elementsMap) => {
    return (0, exports.omitPartialGroups)((0, exports.omitGroupsContainingFrameLikes)(elements, (0, exports.getElementsCompletelyInFrame)(elements, frame, elementsMap)), frame, elementsMap);
};
exports.getElementsInNewFrame = getElementsInNewFrame;
const omitPartialGroups = (elements, frame, allElementsMap) => {
    const elementsToReturn = [];
    const checkedGroups = new Map();
    for (const element of elements) {
        let shouldOmit = false;
        if (element.groupIds.length > 0) {
            // if some partial group should be omitted, then all elements in that group should be omitted
            if (element.groupIds.some((gid) => checkedGroups.get(gid))) {
                shouldOmit = true;
            }
            else {
                const allElementsInGroup = new Set(element.groupIds.flatMap((gid) => (0, groups_1.getElementsInGroup)(allElementsMap, gid)));
                shouldOmit = !(0, exports.elementsAreInFrameBounds)(Array.from(allElementsInGroup), frame, allElementsMap);
            }
            element.groupIds.forEach((gid) => {
                checkedGroups.set(gid, shouldOmit);
            });
        }
        if (!shouldOmit) {
            elementsToReturn.push(element);
        }
    }
    return elementsToReturn;
};
exports.omitPartialGroups = omitPartialGroups;
const getContainingFrame = (element, elementsMap) => {
    if (!element.frameId) {
        return null;
    }
    return (elementsMap.get(element.frameId) ||
        null);
};
exports.getContainingFrame = getContainingFrame;
// --------------------------- Frame Operations -------------------------------
/** */
const filterElementsEligibleAsFrameChildren = (elements, frame) => {
    const otherFrames = new Set();
    const elementsMap = (0, common_1.arrayToMap)(elements);
    elements = (0, exports.omitGroupsContainingFrameLikes)(elements);
    for (const element of elements) {
        if ((0, typeChecks_1.isFrameLikeElement)(element) && element.id !== frame.id) {
            otherFrames.add(element.id);
        }
    }
    const processedGroups = new Set();
    const eligibleElements = [];
    for (const element of elements) {
        // don't add frames or their children
        if ((0, typeChecks_1.isFrameLikeElement)(element) ||
            (element.frameId && otherFrames.has(element.frameId))) {
            continue;
        }
        if (element.groupIds.length) {
            const shallowestGroupId = element.groupIds.at(-1);
            if (!processedGroups.has(shallowestGroupId)) {
                processedGroups.add(shallowestGroupId);
                const groupElements = (0, groups_1.getElementsInGroup)(elements, shallowestGroupId);
                if (groupElements.some((el) => (0, exports.elementOverlapsWithFrame)(el, frame, elementsMap))) {
                    for (const child of groupElements) {
                        eligibleElements.push(child);
                    }
                }
            }
        }
        else {
            const overlaps = (0, exports.elementOverlapsWithFrame)(element, frame, elementsMap);
            if (overlaps) {
                eligibleElements.push(element);
            }
        }
    }
    return eligibleElements;
};
exports.filterElementsEligibleAsFrameChildren = filterElementsEligibleAsFrameChildren;
/**
 * Retains (or repairs for target frame) the ordering invriant where children
 * elements come right before the parent frame:
 * [el, el, child, child, frame, el]
 *
 * @returns mutated allElements (same data structure)
 */
const addElementsToFrame = (allElements, elementsToAdd, frame, appState) => {
    const elementsMap = (0, common_1.arrayToMap)(allElements);
    const currTargetFrameChildrenMap = new Map();
    for (const element of allElements.values()) {
        if (element.frameId === frame.id) {
            currTargetFrameChildrenMap.set(element.id, true);
        }
    }
    const suppliedElementsToAddSet = new Set(elementsToAdd.map((el) => el.id));
    const finalElementsToAdd = [];
    const otherFrames = new Set();
    for (const element of elementsToAdd) {
        if ((0, typeChecks_1.isFrameLikeElement)(element) && element.id !== frame.id) {
            otherFrames.add(element.id);
        }
    }
    // - add bound text elements if not already in the array
    // - filter out elements that are already in the frame
    for (const element of (0, exports.omitGroupsContainingFrameLikes)(allElements, elementsToAdd)) {
        // don't add frames or their children
        if ((0, typeChecks_1.isFrameLikeElement)(element) ||
            (element.frameId && otherFrames.has(element.frameId))) {
            continue;
        }
        // if the element is already in another frame (which is also in elementsToAdd),
        // it means that frame and children are selected at the same time
        // => keep original frame membership, do not add to the target frame
        if (element.frameId &&
            appState.selectedElementIds[element.id] &&
            appState.selectedElementIds[element.frameId]) {
            continue;
        }
        if (!currTargetFrameChildrenMap.has(element.id)) {
            finalElementsToAdd.push(element);
        }
        const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement &&
            !suppliedElementsToAddSet.has(boundTextElement.id) &&
            !currTargetFrameChildrenMap.has(boundTextElement.id)) {
            finalElementsToAdd.push(boundTextElement);
        }
    }
    for (const element of finalElementsToAdd) {
        (0, mutateElement_1.mutateElement)(element, elementsMap, {
            frameId: frame.id,
        });
    }
    return allElements;
};
exports.addElementsToFrame = addElementsToFrame;
const removeElementsFromFrame = (elementsToRemove, elementsMap) => {
    const _elementsToRemove = new Map();
    const toRemoveElementsByFrame = new Map();
    for (const element of elementsToRemove) {
        if (element.frameId) {
            _elementsToRemove.set(element.id, element);
            const arr = toRemoveElementsByFrame.get(element.frameId) || [];
            arr.push(element);
            const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
            if (boundTextElement) {
                _elementsToRemove.set(boundTextElement.id, boundTextElement);
                arr.push(boundTextElement);
            }
            toRemoveElementsByFrame.set(element.frameId, arr);
        }
    }
    for (const [, element] of _elementsToRemove) {
        (0, mutateElement_1.mutateElement)(element, elementsMap, {
            frameId: null,
        });
    }
};
exports.removeElementsFromFrame = removeElementsFromFrame;
const removeAllElementsFromFrame = (allElements, frame) => {
    const elementsInFrame = (0, exports.getFrameChildren)(allElements, frame.id);
    (0, exports.removeElementsFromFrame)(elementsInFrame, (0, common_1.arrayToMap)(allElements));
    return allElements;
};
exports.removeAllElementsFromFrame = removeAllElementsFromFrame;
const replaceAllElementsInFrame = (allElements, nextElementsInFrame, frame, app) => {
    return (0, exports.addElementsToFrame)((0, exports.removeAllElementsFromFrame)(allElements, frame), nextElementsInFrame, frame, app.state).slice();
};
exports.replaceAllElementsInFrame = replaceAllElementsInFrame;
/** does not mutate elements, but returns new ones */
const updateFrameMembershipOfSelectedElements = (allElements, appState, app) => {
    const selectedElements = app.scene.getSelectedElements({
        selectedElementIds: appState.selectedElementIds,
        // supplying elements explicitly in case we're passed non-state elements
        elements: allElements,
    });
    const elementsToFilter = new Set(selectedElements);
    if (appState.editingGroupId) {
        for (const element of selectedElements) {
            if (element.groupIds.length === 0) {
                elementsToFilter.add(element);
            }
            else {
                element.groupIds
                    .flatMap((gid) => (0, groups_1.getElementsInGroup)(allElements, gid))
                    .forEach((element) => elementsToFilter.add(element));
            }
        }
    }
    const elementsToRemove = new Set();
    const elementsMap = (0, common_1.arrayToMap)(allElements);
    elementsToFilter.forEach((element) => {
        if (element.frameId &&
            !(0, typeChecks_1.isFrameLikeElement)(element) &&
            !(0, exports.isElementInFrame)(element, elementsMap, appState)) {
            elementsToRemove.add(element);
        }
    });
    if (elementsToRemove.size > 0) {
        (0, exports.removeElementsFromFrame)(elementsToRemove, elementsMap);
    }
    return allElements;
};
exports.updateFrameMembershipOfSelectedElements = updateFrameMembershipOfSelectedElements;
/**
 * filters out elements that are inside groups that contain a frame element
 * anywhere in the group tree
 */
const omitGroupsContainingFrameLikes = (allElements, 
/** subset of elements you want to filter. Optional perf optimization so we
 * don't have to filter all elements unnecessarily
 */
selectedElements) => {
    const uniqueGroupIds = new Set();
    const elements = selectedElements || allElements;
    for (const el of elements.values()) {
        const topMostGroupId = el.groupIds[el.groupIds.length - 1];
        if (topMostGroupId) {
            uniqueGroupIds.add(topMostGroupId);
        }
    }
    const rejectedGroupIds = new Set();
    for (const groupId of uniqueGroupIds) {
        if ((0, groups_1.getElementsInGroup)(allElements, groupId).some((el) => (0, typeChecks_1.isFrameLikeElement)(el))) {
            rejectedGroupIds.add(groupId);
        }
    }
    const ret = [];
    for (const element of elements.values()) {
        if (!rejectedGroupIds.has(element.groupIds[element.groupIds.length - 1])) {
            ret.push(element);
        }
    }
    return ret;
};
exports.omitGroupsContainingFrameLikes = omitGroupsContainingFrameLikes;
/**
 * depending on the appState, return target frame, which is the frame the given element
 * is going to be added to or remove from
 */
const getTargetFrame = (element, elementsMap, appState) => {
    const _element = (0, typeChecks_1.isTextElement)(element)
        ? (0, textElement_1.getContainerElement)(element, elementsMap) || element
        : element;
    // if the element and its containing frame are both selected, then
    // the containing frame is the target frame
    if (_element.frameId &&
        appState.selectedElementIds[_element.id] &&
        appState.selectedElementIds[_element.frameId]) {
        return (0, exports.getContainingFrame)(_element, elementsMap);
    }
    return appState.selectedElementIds[_element.id] &&
        appState.selectedElementsAreBeingDragged
        ? appState.frameToHighlight
        : (0, exports.getContainingFrame)(_element, elementsMap);
};
exports.getTargetFrame = getTargetFrame;
// TODO: this a huge bottleneck for large scenes, optimise
// given an element, return if the element is in some frame
const isElementInFrame = (element, allElementsMap, appState, opts) => {
    const frame = opts?.targetFrame ?? (0, exports.getTargetFrame)(element, allElementsMap, appState);
    if (!frame) {
        return false;
    }
    const _element = (0, typeChecks_1.isTextElement)(element)
        ? (0, textElement_1.getContainerElement)(element, allElementsMap) || element
        : element;
    const setGroupsInFrame = (isInFrame) => {
        if (opts?.checkedGroups) {
            _element.groupIds.forEach((groupId) => {
                opts.checkedGroups?.set(groupId, isInFrame);
            });
        }
    };
    if (
    // if the element is not selected, or it is selected but not being dragged,
    // frame membership won't update, so return true
    !appState.selectedElementIds[_element.id] ||
        !appState.selectedElementsAreBeingDragged ||
        // if both frame and element are selected, won't update membership, so return true
        (appState.selectedElementIds[_element.id] &&
            appState.selectedElementIds[frame.id])) {
        return true;
    }
    if (_element.groupIds.length === 0) {
        return (0, exports.elementOverlapsWithFrame)(_element, frame, allElementsMap);
    }
    for (const gid of _element.groupIds) {
        if (opts?.checkedGroups?.has(gid)) {
            return opts.checkedGroups.get(gid);
        }
    }
    const allElementsInGroup = new Set(_element.groupIds
        .filter((gid) => {
        if (opts?.checkedGroups) {
            return !opts.checkedGroups.has(gid);
        }
        return true;
    })
        .flatMap((gid) => (0, groups_1.getElementsInGroup)(allElementsMap, gid)));
    if (appState.editingGroupId && appState.selectedElementsAreBeingDragged) {
        const selectedElements = new Set((0, selection_1.getSelectedElements)(allElementsMap, appState));
        const editingGroupOverlapsFrame = appState.frameToHighlight !== null;
        if (editingGroupOverlapsFrame) {
            return true;
        }
        selectedElements.forEach((selectedElement) => {
            allElementsInGroup.delete(selectedElement);
        });
    }
    for (const elementInGroup of allElementsInGroup) {
        if ((0, typeChecks_1.isFrameLikeElement)(elementInGroup)) {
            setGroupsInFrame(false);
            return false;
        }
    }
    for (const elementInGroup of allElementsInGroup) {
        if ((0, exports.elementOverlapsWithFrame)(elementInGroup, frame, allElementsMap)) {
            setGroupsInFrame(true);
            return true;
        }
    }
    return false;
};
exports.isElementInFrame = isElementInFrame;
const shouldApplyFrameClip = (element, frame, appState, elementsMap, checkedGroups) => {
    if (!appState.frameRendering || !appState.frameRendering.clip) {
        return false;
    }
    // for individual elements, only clip when the element is
    // a. overlapping with the frame, or
    // b. containing the frame, for example when an element is used as a background
    //    and is therefore bigger than the frame and completely contains the frame
    const shouldClipElementItself = isElementIntersectingFrame(element, frame, elementsMap) ||
        (0, exports.isElementContainingFrame)(element, frame, elementsMap);
    if (shouldClipElementItself) {
        for (const groupId of element.groupIds) {
            checkedGroups?.set(groupId, true);
        }
        return true;
    }
    // if an element is outside the frame, but is part of a group that has some elements
    // "in" the frame, we should clip the element
    if (!shouldClipElementItself &&
        element.groupIds.length > 0 &&
        !(0, exports.elementsAreInFrameBounds)([element], frame, elementsMap)) {
        let shouldClip = false;
        // if no elements are being dragged, we can skip the geometry check
        // because we know if the element is in the given frame or not
        if (!appState.selectedElementsAreBeingDragged) {
            shouldClip = element.frameId === frame.id;
            for (const groupId of element.groupIds) {
                checkedGroups?.set(groupId, shouldClip);
            }
        }
        else {
            shouldClip = (0, exports.isElementInFrame)(element, elementsMap, appState, {
                targetFrame: frame,
                checkedGroups,
            });
        }
        for (const groupId of element.groupIds) {
            checkedGroups?.set(groupId, shouldClip);
        }
        return shouldClip;
    }
    return false;
};
exports.shouldApplyFrameClip = shouldApplyFrameClip;
const DEFAULT_FRAME_NAME = "Frame";
const DEFAULT_AI_FRAME_NAME = "AI Frame";
const getDefaultFrameName = (element) => {
    // TODO name frames "AI" only if specific to AI frames
    return (0, typeChecks_1.isFrameElement)(element) ? DEFAULT_FRAME_NAME : DEFAULT_AI_FRAME_NAME;
};
exports.getDefaultFrameName = getDefaultFrameName;
const getFrameLikeTitle = (element) => {
    return element.name === null ? (0, exports.getDefaultFrameName)(element) : element.name;
};
exports.getFrameLikeTitle = getFrameLikeTitle;
const getElementsOverlappingFrame = (elements, frame, elementsMap) => {
    return elements.filter((el) => 
    // exclude elements which are overlapping, but are in a different frame,
    // and thus invisible in target frame
    (!el.frameId || el.frameId === frame.id) &&
        (0, bounds_1.doBoundsIntersect)((0, bounds_1.getElementBounds)(el, elementsMap), (0, bounds_1.getElementBounds)(frame, elementsMap)));
};
exports.getElementsOverlappingFrame = getElementsOverlappingFrame;
const frameAndChildrenSelectedTogether = (selectedElements) => {
    const selectedElementsMap = (0, common_1.arrayToMap)(selectedElements);
    return (selectedElements.length > 1 &&
        selectedElements.some((element) => element.frameId && selectedElementsMap.has(element.frameId)));
};
exports.frameAndChildrenSelectedTogether = frameAndChildrenSelectedTogether;
