"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepCopyElement = exports.duplicateElements = exports.duplicateElement = void 0;
const common_1 = require("@excalidraw/common");
const groups_1 = require("./groups");
const frame_1 = require("./frame");
const sortElements_1 = require("./sortElements");
const mutateElement_1 = require("./mutateElement");
const typeChecks_1 = require("./typeChecks");
const textElement_1 = require("./textElement");
const binding_1 = require("./binding");
/**
 * Duplicate an element, often used in the alt-drag operation.
 * Note that this method has gotten a bit complicated since the
 * introduction of gruoping/ungrouping elements.
 * @param editingGroupId The current group being edited. The new
 *                       element will inherit this group and its
 *                       parents.
 * @param groupIdMapForOperation A Map that maps old group IDs to
 *                               duplicated ones. If you are duplicating
 *                               multiple elements at once, share this map
 *                               amongst all of them
 * @param element Element to duplicate
 */
const duplicateElement = (editingGroupId, groupIdMapForOperation, element, randomizeSeed) => {
    const copy = (0, exports.deepCopyElement)(element);
    if ((0, common_1.isTestEnv)()) {
        __test__defineOrigId(copy, element.id);
    }
    copy.id = (0, common_1.randomId)();
    copy.updated = (0, common_1.getUpdatedTimestamp)();
    if (randomizeSeed) {
        copy.seed = (0, common_1.randomInteger)();
        (0, mutateElement_1.bumpVersion)(copy);
    }
    copy.groupIds = (0, groups_1.getNewGroupIdsForDuplication)(copy.groupIds, editingGroupId, (groupId) => {
        if (!groupIdMapForOperation.has(groupId)) {
            groupIdMapForOperation.set(groupId, (0, common_1.randomId)());
        }
        return groupIdMapForOperation.get(groupId);
    });
    return copy;
};
exports.duplicateElement = duplicateElement;
const duplicateElements = (opts) => {
    let { elements } = opts;
    const appState = "appState" in opts
        ? opts.appState
        : {
            editingGroupId: null,
            selectedGroupIds: {},
        };
    // Ids of elements that have already been processed so we don't push them
    // into the array twice if we end up backtracking when retrieving
    // discontiguous group of elements (can happen due to a bug, or in edge
    // cases such as a group containing deleted elements which were not selected).
    //
    // This is not enough to prevent duplicates, so we do a second loop afterwards
    // to remove them.
    //
    // For convenience we mark even the newly created ones even though we don't
    // loop over them.
    const processedIds = new Map();
    const groupIdMap = new Map();
    const duplicatedElements = [];
    const origElements = [];
    const origIdToDuplicateId = new Map();
    const duplicateIdToOrigElement = new Map();
    const duplicateElementsMap = new Map();
    const elementsMap = (0, common_1.arrayToMap)(elements);
    const _idsOfElementsToDuplicate = opts.type === "in-place"
        ? opts.idsOfElementsToDuplicate
        : new Map(elements.map((el) => [el.id, el]));
    // For sanity
    if (opts.type === "in-place") {
        for (const groupId of Object.keys(opts.appState.selectedGroupIds)) {
            elements
                .filter((el) => el.groupIds?.includes(groupId))
                .forEach((el) => _idsOfElementsToDuplicate.set(el.id, el));
        }
    }
    elements = (0, sortElements_1.normalizeElementOrder)(elements);
    const elementsWithDuplicates = elements.slice();
    // helper functions
    // -------------------------------------------------------------------------
    // Used for the heavy lifing of copying a single element, a group of elements
    // an element with bound text etc.
    const copyElements = (element) => {
        const elements = (0, common_1.castArray)(element);
        const _newElements = elements.reduce((acc, element) => {
            if (processedIds.has(element.id)) {
                return acc;
            }
            processedIds.set(element.id, true);
            const newElement = (0, exports.duplicateElement)(appState.editingGroupId, groupIdMap, element, opts.randomizeSeed);
            processedIds.set(newElement.id, true);
            duplicateElementsMap.set(newElement.id, newElement);
            origIdToDuplicateId.set(element.id, newElement.id);
            duplicateIdToOrigElement.set(newElement.id, element);
            origElements.push(element);
            duplicatedElements.push(newElement);
            acc.push(newElement);
            return acc;
        }, []);
        return (Array.isArray(element) ? _newElements : _newElements[0] || null);
    };
    // Helper to position cloned elements in the Z-order the product needs it
    const insertBeforeOrAfterIndex = (index, elements) => {
        if (!elements) {
            return;
        }
        if (index > elementsWithDuplicates.length - 1) {
            elementsWithDuplicates.push(...(0, common_1.castArray)(elements));
            return;
        }
        elementsWithDuplicates.splice(index + 1, 0, ...(0, common_1.castArray)(elements));
    };
    const frameIdsToDuplicate = new Set(elements
        .filter((el) => _idsOfElementsToDuplicate.has(el.id) && (0, typeChecks_1.isFrameLikeElement)(el))
        .map((el) => el.id));
    for (const element of elements) {
        if (processedIds.has(element.id)) {
            continue;
        }
        if (!_idsOfElementsToDuplicate.has(element.id)) {
            continue;
        }
        // groups
        // -------------------------------------------------------------------------
        const groupId = (0, groups_1.getSelectedGroupForElement)(appState, element);
        if (groupId) {
            const groupElements = (0, groups_1.getElementsInGroup)(elements, groupId).flatMap((element) => (0, typeChecks_1.isFrameLikeElement)(element)
                ? [...(0, frame_1.getFrameChildren)(elements, element.id), element]
                : [element]);
            const targetIndex = (0, common_1.findLastIndex)(elementsWithDuplicates, (el) => {
                return el.groupIds?.includes(groupId);
            });
            insertBeforeOrAfterIndex(targetIndex, copyElements(groupElements));
            continue;
        }
        // frame duplication
        // -------------------------------------------------------------------------
        if (element.frameId && frameIdsToDuplicate.has(element.frameId)) {
            continue;
        }
        if ((0, typeChecks_1.isFrameLikeElement)(element)) {
            const frameId = element.id;
            const frameChildren = (0, frame_1.getFrameChildren)(elements, frameId);
            const targetIndex = (0, common_1.findLastIndex)(elementsWithDuplicates, (el) => {
                return el.frameId === frameId || el.id === frameId;
            });
            insertBeforeOrAfterIndex(targetIndex, copyElements([...frameChildren, element]));
            continue;
        }
        // text container
        // -------------------------------------------------------------------------
        if ((0, typeChecks_1.hasBoundTextElement)(element)) {
            const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
            const targetIndex = (0, common_1.findLastIndex)(elementsWithDuplicates, (el) => {
                return (el.id === element.id ||
                    ("containerId" in el && el.containerId === element.id));
            });
            if (boundTextElement) {
                insertBeforeOrAfterIndex(targetIndex, copyElements([element, boundTextElement]));
            }
            else {
                insertBeforeOrAfterIndex(targetIndex, copyElements(element));
            }
            continue;
        }
        if ((0, typeChecks_1.isBoundToContainer)(element)) {
            const container = (0, textElement_1.getContainerElement)(element, elementsMap);
            const targetIndex = (0, common_1.findLastIndex)(elementsWithDuplicates, (el) => {
                return el.id === element.id || el.id === container?.id;
            });
            if (container) {
                insertBeforeOrAfterIndex(targetIndex, copyElements([container, element]));
            }
            else {
                insertBeforeOrAfterIndex(targetIndex, copyElements(element));
            }
            continue;
        }
        // default duplication (regular elements)
        // -------------------------------------------------------------------------
        insertBeforeOrAfterIndex((0, common_1.findLastIndex)(elementsWithDuplicates, (el) => el.id === element.id), copyElements(element));
    }
    // ---------------------------------------------------------------------------
    (0, binding_1.fixDuplicatedBindingsAfterDuplication)(duplicatedElements, origIdToDuplicateId, duplicateElementsMap);
    (0, frame_1.bindElementsToFramesAfterDuplication)(elementsWithDuplicates, origElements, origIdToDuplicateId);
    if (opts.overrides) {
        for (const duplicateElement of duplicatedElements) {
            const origElement = duplicateIdToOrigElement.get(duplicateElement.id);
            if (origElement) {
                Object.assign(duplicateElement, opts.overrides({
                    duplicateElement,
                    origElement,
                    origIdToDuplicateId,
                }));
            }
        }
    }
    return {
        duplicatedElements,
        duplicateElementsMap,
        elementsWithDuplicates,
        origIdToDuplicateId,
    };
};
exports.duplicateElements = duplicateElements;
// Simplified deep clone for the purpose of cloning ExcalidrawElement.
//
// Only clones plain objects and arrays. Doesn't clone Date, RegExp, Map, Set,
// Typed arrays and other non-null objects.
//
// Adapted from https://github.com/lukeed/klona
//
// The reason for `deepCopyElement()` wrapper is type safety (only allow
// passing ExcalidrawElement as the top-level argument).
const _deepCopyElement = (val, depth = 0) => {
    // only clone non-primitives
    if (val == null || typeof val !== "object") {
        return val;
    }
    const objectType = Object.prototype.toString.call(val);
    if (objectType === "[object Object]") {
        const tmp = typeof val.constructor === "function"
            ? Object.create(Object.getPrototypeOf(val))
            : {};
        for (const key in val) {
            if (val.hasOwnProperty(key)) {
                // don't copy non-serializable objects like these caches. They'll be
                // populated when the element is rendered.
                if (depth === 0 && (key === "shape" || key === "canvas")) {
                    continue;
                }
                tmp[key] = _deepCopyElement(val[key], depth + 1);
            }
        }
        return tmp;
    }
    if (Array.isArray(val)) {
        let k = val.length;
        const arr = new Array(k);
        while (k--) {
            arr[k] = _deepCopyElement(val[k], depth + 1);
        }
        return arr;
    }
    // we're not cloning non-array & non-plain-object objects because we
    // don't support them on excalidraw elements yet. If we do, we need to make
    // sure we start cloning them, so let's warn about it.
    if (import.meta.env.DEV) {
        if (objectType !== "[object Object]" &&
            objectType !== "[object Array]" &&
            objectType.startsWith("[object ")) {
            console.warn(`_deepCloneElement: unexpected object type ${objectType}. This value will not be cloned!`);
        }
    }
    return val;
};
/**
 * Clones ExcalidrawElement data structure. Does not regenerate id, nonce, or
 * any value. The purpose is to to break object references for immutability
 * reasons, whenever we want to keep the original element, but ensure it's not
 * mutated.
 *
 * Only clones plain objects and arrays. Doesn't clone Date, RegExp, Map, Set,
 * Typed arrays and other non-null objects.
 */
const deepCopyElement = (val) => {
    return _deepCopyElement(val);
};
exports.deepCopyElement = deepCopyElement;
const __test__defineOrigId = (clonedObj, origId) => {
    Object.defineProperty(clonedObj, common_1.ORIG_ID, {
        value: origId,
        writable: false,
        enumerable: false,
    });
};
