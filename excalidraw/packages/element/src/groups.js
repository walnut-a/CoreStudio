"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectedElementsByGroup = exports.getNewGroupIdsForDuplication = exports.isInGroup = exports.elementsAreInSameGroup = exports.getNonDeletedGroupIds = exports.getMaximumGroups = exports.removeFromSelectedGroups = exports.addToGroup = exports.getSelectedGroupIdForElement = exports.getElementsInGroup = exports.isElementInGroup = exports.editGroupForSelectedElement = exports.selectGroupsFromGivenElements = exports.getSelectedGroupIds = exports.getSelectedGroupForElement = exports.isSelectedViaGroup = exports.selectGroupsForSelectedElements = exports.selectGroup = void 0;
const textElement_1 = require("./textElement");
const typeChecks_1 = require("./typeChecks");
const selection_1 = require("./selection");
const selectGroup = (groupId, appState, elements) => {
    const elementsInGroup = elements.reduce((acc, element) => {
        if (element.groupIds.includes(groupId)) {
            acc[element.id] = true;
        }
        return acc;
    }, {});
    if (Object.keys(elementsInGroup).length < 2) {
        if (appState.selectedGroupIds[groupId] ||
            appState.editingGroupId === groupId) {
            return {
                selectedElementIds: appState.selectedElementIds,
                selectedGroupIds: { ...appState.selectedGroupIds, [groupId]: false },
                editingGroupId: null,
            };
        }
        return appState;
    }
    return {
        editingGroupId: appState.editingGroupId,
        selectedGroupIds: { ...appState.selectedGroupIds, [groupId]: true },
        selectedElementIds: {
            ...appState.selectedElementIds,
            ...elementsInGroup,
        },
    };
};
exports.selectGroup = selectGroup;
exports.selectGroupsForSelectedElements = (function () {
    let lastSelectedElements = null;
    let lastElements = null;
    let lastReturnValue = null;
    const _selectGroups = (selectedElements, elements, appState, prevAppState) => {
        if (lastReturnValue !== undefined &&
            elements === lastElements &&
            selectedElements === lastSelectedElements &&
            appState.editingGroupId === lastReturnValue?.editingGroupId) {
            return lastReturnValue;
        }
        const selectedGroupIds = {};
        // Gather all the groups withing selected elements
        for (const selectedElement of selectedElements) {
            let groupIds = selectedElement.groupIds;
            if (appState.editingGroupId) {
                // handle the case where a group is nested within a group
                const indexOfEditingGroup = groupIds.indexOf(appState.editingGroupId);
                if (indexOfEditingGroup > -1) {
                    groupIds = groupIds.slice(0, indexOfEditingGroup);
                }
            }
            if (groupIds.length > 0) {
                const lastSelectedGroup = groupIds[groupIds.length - 1];
                selectedGroupIds[lastSelectedGroup] = true;
            }
        }
        // Gather all the elements within selected groups
        const groupElementsIndex = {};
        const selectedElementIdsInGroups = elements.reduce((acc, element) => {
            if (element.isDeleted) {
                return acc;
            }
            const groupId = element.groupIds.find((id) => selectedGroupIds[id]);
            if (groupId) {
                acc[element.id] = true;
                // Populate the index
                if (!Array.isArray(groupElementsIndex[groupId])) {
                    groupElementsIndex[groupId] = [element.id];
                }
                else {
                    groupElementsIndex[groupId].push(element.id);
                }
            }
            return acc;
        }, {});
        for (const groupId of Object.keys(groupElementsIndex)) {
            // If there is one element in the group, and the group is selected or it's being edited, it's not a group
            if (groupElementsIndex[groupId].length < 2) {
                if (selectedGroupIds[groupId]) {
                    selectedGroupIds[groupId] = false;
                }
            }
        }
        lastElements = elements;
        lastSelectedElements = selectedElements;
        lastReturnValue = {
            editingGroupId: appState.editingGroupId,
            selectedGroupIds,
            selectedElementIds: (0, selection_1.makeNextSelectedElementIds)({
                ...appState.selectedElementIds,
                ...selectedElementIdsInGroups,
            }, prevAppState),
        };
        return lastReturnValue;
    };
    /**
     * When you select an element, you often want to actually select the whole group it's in, unless
     * you're currently editing that group.
     */
    const selectGroupsForSelectedElements = (appState, elements, prevAppState, 
    /**
     * supply null in cases where you don't have access to App instance and
     * you don't care about optimizing selectElements retrieval
     */
    app) => {
        const selectedElements = app
            ? app.scene.getSelectedElements({
                selectedElementIds: appState.selectedElementIds,
                // supplying elements explicitly in case we're passed non-state elements
                elements,
            })
            : (0, selection_1.getSelectedElements)(elements, appState);
        if (!selectedElements.length) {
            return {
                selectedGroupIds: {},
                editingGroupId: null,
                selectedElementIds: (0, selection_1.makeNextSelectedElementIds)(appState.selectedElementIds, prevAppState),
            };
        }
        return _selectGroups(selectedElements, elements, appState, prevAppState);
    };
    selectGroupsForSelectedElements.clearCache = () => {
        lastElements = null;
        lastSelectedElements = null;
        lastReturnValue = null;
    };
    return selectGroupsForSelectedElements;
})();
/**
 * If the element's group is selected, don't render an individual
 * selection border around it.
 */
const isSelectedViaGroup = (appState, element) => (0, exports.getSelectedGroupForElement)(appState, element) != null;
exports.isSelectedViaGroup = isSelectedViaGroup;
const getSelectedGroupForElement = (appState, element) => element.groupIds
    .filter((groupId) => groupId !== appState.editingGroupId)
    .find((groupId) => appState.selectedGroupIds[groupId]);
exports.getSelectedGroupForElement = getSelectedGroupForElement;
const getSelectedGroupIds = (appState) => Object.entries(appState.selectedGroupIds)
    .filter(([groupId, isSelected]) => isSelected)
    .map(([groupId, isSelected]) => groupId);
exports.getSelectedGroupIds = getSelectedGroupIds;
// given a list of elements, return the the actual group ids that should be selected
// or used to update the elements
const selectGroupsFromGivenElements = (elements, appState) => {
    let nextAppState = {
        ...appState,
        selectedGroupIds: {},
    };
    for (const element of elements) {
        let groupIds = element.groupIds;
        if (appState.editingGroupId) {
            const indexOfEditingGroup = groupIds.indexOf(appState.editingGroupId);
            if (indexOfEditingGroup > -1) {
                groupIds = groupIds.slice(0, indexOfEditingGroup);
            }
        }
        if (groupIds.length > 0) {
            const groupId = groupIds[groupIds.length - 1];
            nextAppState = {
                ...nextAppState,
                ...(0, exports.selectGroup)(groupId, nextAppState, elements),
            };
        }
    }
    return nextAppState.selectedGroupIds;
};
exports.selectGroupsFromGivenElements = selectGroupsFromGivenElements;
const editGroupForSelectedElement = (appState, element) => {
    return {
        ...appState,
        editingGroupId: element.groupIds.length ? element.groupIds[0] : null,
        selectedGroupIds: {},
        selectedElementIds: {
            [element.id]: true,
        },
    };
};
exports.editGroupForSelectedElement = editGroupForSelectedElement;
const isElementInGroup = (element, groupId) => element.groupIds.includes(groupId);
exports.isElementInGroup = isElementInGroup;
const getElementsInGroup = (elements, groupId) => {
    const elementsInGroup = [];
    for (const element of elements.values()) {
        if ((0, exports.isElementInGroup)(element, groupId)) {
            elementsInGroup.push(element);
        }
    }
    return elementsInGroup;
};
exports.getElementsInGroup = getElementsInGroup;
const getSelectedGroupIdForElement = (element, selectedGroupIds) => element.groupIds.find((groupId) => selectedGroupIds[groupId]);
exports.getSelectedGroupIdForElement = getSelectedGroupIdForElement;
const addToGroup = (prevGroupIds, newGroupId, editingGroupId) => {
    // insert before the editingGroupId, or push to the end.
    const groupIds = [...prevGroupIds];
    const positionOfEditingGroupId = editingGroupId
        ? groupIds.indexOf(editingGroupId)
        : -1;
    const positionToInsert = positionOfEditingGroupId > -1 ? positionOfEditingGroupId : groupIds.length;
    groupIds.splice(positionToInsert, 0, newGroupId);
    return groupIds;
};
exports.addToGroup = addToGroup;
const removeFromSelectedGroups = (groupIds, selectedGroupIds) => groupIds.filter((groupId) => !selectedGroupIds[groupId]);
exports.removeFromSelectedGroups = removeFromSelectedGroups;
const getMaximumGroups = (elements, elementsMap) => {
    const groups = new Map();
    elements.forEach((element) => {
        const groupId = element.groupIds.length === 0
            ? element.id
            : element.groupIds[element.groupIds.length - 1];
        const currentGroupMembers = groups.get(groupId) || [];
        // Include bound text if present when grouping
        const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            currentGroupMembers.push(boundTextElement);
        }
        groups.set(groupId, [...currentGroupMembers, element]);
    });
    return Array.from(groups.values());
};
exports.getMaximumGroups = getMaximumGroups;
const getNonDeletedGroupIds = (elements) => {
    const nonDeletedGroupIds = new Set();
    for (const [, element] of elements) {
        // defensive check
        if (element.isDeleted) {
            continue;
        }
        // defensive fallback
        for (const groupId of element.groupIds ?? []) {
            nonDeletedGroupIds.add(groupId);
        }
    }
    return nonDeletedGroupIds;
};
exports.getNonDeletedGroupIds = getNonDeletedGroupIds;
const elementsAreInSameGroup = (elements) => {
    const allGroups = elements.flatMap((element) => element.groupIds);
    const groupCount = new Map();
    let maxGroup = 0;
    for (const group of allGroups) {
        groupCount.set(group, (groupCount.get(group) ?? 0) + 1);
        if (groupCount.get(group) > maxGroup) {
            maxGroup = groupCount.get(group);
        }
    }
    return maxGroup === elements.length;
};
exports.elementsAreInSameGroup = elementsAreInSameGroup;
const isInGroup = (element) => {
    return element.groupIds.length > 0;
};
exports.isInGroup = isInGroup;
const getNewGroupIdsForDuplication = (groupIds, editingGroupId, mapper) => {
    const copy = [...groupIds];
    const positionOfEditingGroupId = editingGroupId
        ? groupIds.indexOf(editingGroupId)
        : -1;
    const endIndex = positionOfEditingGroupId > -1 ? positionOfEditingGroupId : groupIds.length;
    for (let index = 0; index < endIndex; index++) {
        copy[index] = mapper(copy[index]);
    }
    return copy;
};
exports.getNewGroupIdsForDuplication = getNewGroupIdsForDuplication;
// given a list of selected elements, return the element grouped by their immediate group selected state
// in the case if only one group is selected and all elements selected are within the group, it will respect group hierarchy in accordance to their nested grouping order
const getSelectedElementsByGroup = (selectedElements, elementsMap, appState) => {
    const selectedGroupIds = (0, exports.getSelectedGroupIds)(appState);
    const unboundElements = selectedElements.filter((element) => !(0, typeChecks_1.isBoundToContainer)(element));
    const groups = new Map();
    const elements = new Map();
    // helper function to add an element to the elements map
    const addToElementsMap = (element) => {
        // elements
        const currentElementMembers = elements.get(element.id) || [];
        const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            currentElementMembers.push(boundTextElement);
        }
        elements.set(element.id, [...currentElementMembers, element]);
    };
    // helper function to add an element to the groups map
    const addToGroupsMap = (element, groupId) => {
        // groups
        const currentGroupMembers = groups.get(groupId) || [];
        const boundTextElement = (0, textElement_1.getBoundTextElement)(element, elementsMap);
        if (boundTextElement) {
            currentGroupMembers.push(boundTextElement);
        }
        groups.set(groupId, [...currentGroupMembers, element]);
    };
    // helper function to handle the case where a single group is selected
    // and all elements selected are within the group, it will respect group hierarchy in accordance to
    // their nested grouping order
    const handleSingleSelectedGroupCase = (element, selectedGroupId) => {
        const indexOfSelectedGroupId = element.groupIds.indexOf(selectedGroupId, 0);
        const nestedGroupCount = element.groupIds.slice(0, indexOfSelectedGroupId).length;
        return nestedGroupCount > 0
            ? addToGroupsMap(element, element.groupIds[indexOfSelectedGroupId - 1])
            : addToElementsMap(element);
    };
    const isAllInSameGroup = selectedElements.every((element) => (0, exports.isSelectedViaGroup)(appState, element));
    unboundElements.forEach((element) => {
        const selectedGroupId = (0, exports.getSelectedGroupIdForElement)(element, appState.selectedGroupIds);
        if (!selectedGroupId) {
            addToElementsMap(element);
        }
        else if (selectedGroupIds.length === 1 && isAllInSameGroup) {
            handleSingleSelectedGroupCase(element, selectedGroupId);
        }
        else {
            addToGroupsMap(element, selectedGroupId);
        }
    });
    return Array.from(groups.values()).concat(Array.from(elements.values()));
};
exports.getSelectedElementsByGroup = getSelectedElementsByGroup;
