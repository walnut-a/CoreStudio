"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionDuplicateSelection = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const shortcut_1 = require("../shortcut");
const App_1 = require("../components/App");
const register_1 = require("./register");
exports.actionDuplicateSelection = (0, register_1.register)({
    name: "duplicateSelection",
    label: "labels.duplicateSelection",
    icon: icons_1.DuplicateIcon,
    trackEvent: { category: "element" },
    perform: (elements, appState, formData, app) => {
        if (appState.selectedElementsAreBeingDragged) {
            return false;
        }
        // duplicate selected point(s) if editing a line
        if (appState.selectedLinearElement?.isEditing) {
            // TODO: Invariants should be checked here instead of duplicateSelectedPoints()
            try {
                const newAppState = element_2.LinearElementEditor.duplicateSelectedPoints(appState, app.scene);
                return {
                    elements,
                    appState: newAppState,
                    captureUpdate: element_6.CaptureUpdateAction.IMMEDIATELY,
                };
            }
            catch {
                return false;
            }
        }
        let { duplicatedElements, elementsWithDuplicates } = (0, element_5.duplicateElements)({
            type: "in-place",
            elements,
            idsOfElementsToDuplicate: (0, common_1.arrayToMap)((0, element_3.getSelectedElements)(elements, appState, {
                includeBoundTextElement: true,
                includeElementsInFrames: true,
            })),
            appState,
            randomizeSeed: true,
            overrides: ({ origElement, origIdToDuplicateId }) => {
                const duplicateFrameId = origElement.frameId && origIdToDuplicateId.get(origElement.frameId);
                return {
                    x: origElement.x + common_1.DEFAULT_GRID_SIZE / 2,
                    y: origElement.y + common_1.DEFAULT_GRID_SIZE / 2,
                    frameId: duplicateFrameId ?? origElement.frameId,
                };
            },
        });
        if (app.props.onDuplicate && elementsWithDuplicates) {
            const mappedElements = app.props.onDuplicate(elementsWithDuplicates, elements);
            if (mappedElements) {
                elementsWithDuplicates = mappedElements;
            }
        }
        return {
            elements: (0, element_4.syncMovedIndices)(elementsWithDuplicates, (0, common_1.arrayToMap)(duplicatedElements)),
            appState: {
                ...appState,
                ...(0, element_3.getSelectionStateForElements)(duplicatedElements, (0, element_1.getNonDeletedElements)(elementsWithDuplicates), appState),
            },
            captureUpdate: element_6.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.D,
    PanelComponent: ({ elements, appState, updateData, app }) => {
        const isMobile = (0, App_1.useStylesPanelMode)() === "mobile";
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.DuplicateIcon, title: `${(0, i18n_1.t)("labels.duplicateSelection")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+D")}`, "aria-label": (0, i18n_1.t)("labels.duplicateSelection"), onClick: () => updateData(null), disabled: !(0, scene_1.isSomeElementSelected)((0, element_1.getNonDeletedElements)(elements), appState), style: {
                ...(isMobile && appState.openPopup !== "compactOtherProperties"
                    ? common_1.MOBILE_ACTION_BUTTON_BG
                    : {}),
            } }));
    },
});
