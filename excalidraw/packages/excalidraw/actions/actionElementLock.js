"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionUnlockAllElements = exports.actionToggleElementLock = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const scene_1 = require("../scene");
const register_1 = require("./register");
const shouldLock = (elements) => elements.every((el) => !el.locked);
exports.actionToggleElementLock = (0, register_1.register)({
    name: "toggleElementLock",
    label: (elements, appState, app) => {
        const selected = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: false,
        });
        return shouldLock(selected)
            ? "labels.elementLock.lock"
            : "labels.elementLock.unlock";
    },
    icon: (appState, elements) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return shouldLock(selectedElements) ? icons_1.LockedIcon : icons_1.UnlockedIcon;
    },
    trackEvent: { category: "element" },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        return (selectedElements.length > 0 &&
            !selectedElements.some((element) => element.locked && element.frameId));
    },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
            includeElementsInFrames: true,
        });
        if (!selectedElements.length) {
            return false;
        }
        const nextLockState = shouldLock(selectedElements);
        const selectedElementsMap = (0, common_1.arrayToMap)(selectedElements);
        const isAGroup = selectedElements.length > 1 && (0, element_1.elementsAreInSameGroup)(selectedElements);
        const isASingleUnit = selectedElements.length === 1 || isAGroup;
        const newGroupId = isASingleUnit ? null : (0, common_1.randomId)();
        let nextLockedMultiSelections = { ...appState.lockedMultiSelections };
        if (nextLockState) {
            nextLockedMultiSelections = {
                ...appState.lockedMultiSelections,
                ...(newGroupId ? { [newGroupId]: true } : {}),
            };
        }
        else if (isAGroup) {
            const groupId = selectedElements[0].groupIds.at(-1);
            delete nextLockedMultiSelections[groupId];
        }
        const nextElements = elements.map((element) => {
            if (!selectedElementsMap.has(element.id)) {
                return element;
            }
            let nextGroupIds = element.groupIds;
            // if locking together, add to group
            // if unlocking, remove the temporary group
            if (nextLockState) {
                if (newGroupId) {
                    nextGroupIds = [...nextGroupIds, newGroupId];
                }
            }
            else {
                nextGroupIds = nextGroupIds.filter((groupId) => !appState.lockedMultiSelections[groupId]);
            }
            return (0, element_1.newElementWith)(element, {
                locked: nextLockState,
                // do not recreate the array unncessarily
                groupIds: nextGroupIds.length !== element.groupIds.length
                    ? nextGroupIds
                    : element.groupIds,
            });
        });
        const nextElementsMap = (0, common_1.arrayToMap)(nextElements);
        const nextSelectedElementIds = nextLockState
            ? {}
            : Object.fromEntries(selectedElements.map((el) => [el.id, true]));
        const unlockedSelectedElements = selectedElements.map((el) => nextElementsMap.get(el.id) || el);
        const nextSelectedGroupIds = nextLockState
            ? {}
            : (0, element_1.selectGroupsFromGivenElements)(unlockedSelectedElements, appState);
        const activeLockedId = nextLockState
            ? newGroupId
                ? newGroupId
                : isAGroup
                    ? selectedElements[0].groupIds.at(-1)
                    : selectedElements[0].id
            : null;
        return {
            elements: nextElements,
            appState: {
                ...appState,
                selectedElementIds: nextSelectedElementIds,
                selectedGroupIds: nextSelectedGroupIds,
                selectedLinearElement: nextLockState
                    ? null
                    : appState.selectedLinearElement,
                lockedMultiSelections: nextLockedMultiSelections,
                activeLockedId,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event, appState, elements, app) => {
        return (event.key.toLocaleLowerCase() === common_1.KEYS.L &&
            event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            app.scene.getSelectedElements({
                selectedElementIds: appState.selectedElementIds,
                includeBoundTextElement: false,
            }).length > 0);
    },
});
exports.actionUnlockAllElements = (0, register_1.register)({
    name: "unlockAllElements",
    trackEvent: { category: "canvas" },
    viewMode: false,
    icon: icons_1.UnlockedIcon,
    predicate: (elements, appState) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        return (selectedElements.length === 0 &&
            elements.some((element) => element.locked));
    },
    perform: (elements, appState) => {
        const lockedElements = elements.filter((el) => el.locked);
        const nextElements = elements.map((element) => {
            if (element.locked) {
                // remove the temporary groupId if it exists
                const nextGroupIds = element.groupIds.filter((gid) => !appState.lockedMultiSelections[gid]);
                return (0, element_1.newElementWith)(element, {
                    locked: false,
                    groupIds: 
                    // do not recreate the array unncessarily
                    element.groupIds.length !== nextGroupIds.length
                        ? nextGroupIds
                        : element.groupIds,
                });
            }
            return element;
        });
        const nextElementsMap = (0, common_1.arrayToMap)(nextElements);
        const unlockedElements = lockedElements.map((el) => nextElementsMap.get(el.id) || el);
        return {
            elements: nextElements,
            appState: {
                ...appState,
                selectedElementIds: Object.fromEntries(lockedElements.map((el) => [el.id, true])),
                selectedGroupIds: (0, element_1.selectGroupsFromGivenElements)(unlockedElements, appState),
                lockedMultiSelections: {},
                activeLockedId: null,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    label: "labels.elementLock.unlockAll",
});
