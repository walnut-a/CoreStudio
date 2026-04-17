"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionSelectAll = void 0;
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const icons_1 = require("../components/icons");
const register_1 = require("./register");
exports.actionSelectAll = (0, register_1.register)({
    name: "selectAll",
    label: "labels.selectAll",
    icon: icons_1.selectAllIcon,
    trackEvent: { category: "canvas" },
    viewMode: false,
    perform: (elements, appState, value, app) => {
        if (appState.selectedLinearElement?.isEditing) {
            return false;
        }
        const selectedElementIds = elements
            .filter((element) => !element.isDeleted &&
            !((0, element_3.isTextElement)(element) && element.containerId) &&
            !element.locked)
            .reduce((map, element) => {
            map[element.id] = true;
            return map;
        }, {});
        return {
            appState: {
                ...appState,
                ...(0, element_4.selectGroupsForSelectedElements)({
                    editingGroupId: null,
                    selectedElementIds,
                }, (0, element_1.getNonDeletedElements)(elements), appState, app),
                selectedLinearElement: 
                // single linear element selected
                Object.keys(selectedElementIds).length === 1 &&
                    (0, element_3.isLinearElement)(elements[0])
                    ? new element_2.LinearElementEditor(elements[0], (0, common_1.arrayToMap)(elements))
                    : null,
            },
            captureUpdate: element_5.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.A,
});
