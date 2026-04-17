"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionTogglePolygon = exports.actionToggleLinearEditor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_2 = require("@excalidraw/element");
const CommandPalette_1 = require("../components/CommandPalette/CommandPalette");
const ToolButton_1 = require("../components/ToolButton");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const ButtonIcon_1 = require("../components/ButtonIcon");
const mutateElement_1 = require("../../element/src/mutateElement");
const register_1 = require("./register");
exports.actionToggleLinearEditor = (0, register_1.register)({
    name: "toggleLinearEditor",
    category: CommandPalette_1.DEFAULT_CATEGORIES.elements,
    label: (elements, appState, app) => {
        const selectedElement = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
        })[0];
        return selectedElement?.type === "arrow"
            ? "labels.lineEditor.editArrow"
            : "labels.lineEditor.edit";
    },
    keywords: ["line"],
    trackEvent: {
        category: "element",
    },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        if (!appState.selectedLinearElement?.isEditing &&
            selectedElements.length === 1 &&
            (0, element_1.isLinearElement)(selectedElements[0]) &&
            !(0, element_1.isElbowArrow)(selectedElements[0])) {
            return true;
        }
        return false;
    },
    perform(elements, appState, _, app) {
        const selectedElement = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
            includeBoundTextElement: true,
        })[0];
        (0, common_1.invariant)(selectedElement, "No selected element found");
        (0, common_1.invariant)(appState.selectedLinearElement, "No selected linear element found");
        (0, common_1.invariant)(selectedElement.id === appState.selectedLinearElement.elementId, "Selected element ID and linear editor elementId does not match");
        const selectedLinearElement = {
            ...appState.selectedLinearElement,
            isEditing: !appState.selectedLinearElement.isEditing,
        };
        return {
            appState: {
                ...appState,
                selectedLinearElement,
            },
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ appState, updateData, app }) => {
        const selectedElement = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
        })[0];
        if (!selectedElement) {
            return null;
        }
        const label = (0, i18n_1.t)(selectedElement.type === "arrow"
            ? "labels.lineEditor.editArrow"
            : "labels.lineEditor.edit");
        return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", icon: icons_1.lineEditorIcon, title: label, "aria-label": label, onClick: () => updateData(null) }));
    },
});
exports.actionTogglePolygon = (0, register_1.register)({
    name: "togglePolygon",
    category: CommandPalette_1.DEFAULT_CATEGORIES.elements,
    icon: icons_1.polygonIcon,
    keywords: ["loop"],
    label: (elements, appState, app) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
        });
        const allPolygons = !selectedElements.some((element) => !(0, element_1.isLineElement)(element) || !element.polygon);
        return allPolygons
            ? "labels.polygon.breakPolygon"
            : "labels.polygon.convertToPolygon";
    },
    trackEvent: {
        category: "element",
    },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
        });
        return (selectedElements.length > 0 &&
            selectedElements.every((element) => (0, element_1.isLineElement)(element) && element.points.length >= 4));
    },
    perform(elements, appState, _, app) {
        const selectedElements = app.scene.getSelectedElements(appState);
        if (selectedElements.some((element) => !(0, element_1.isLineElement)(element))) {
            return false;
        }
        const targetElements = selectedElements;
        // if one element not a polygon, convert all to polygon
        const nextPolygonState = targetElements.some((element) => !element.polygon);
        const targetElementsMap = (0, common_1.arrayToMap)(targetElements);
        return {
            elements: elements.map((element) => {
                if (!targetElementsMap.has(element.id) || !(0, element_1.isLineElement)(element)) {
                    return element;
                }
                return (0, mutateElement_1.newElementWith)(element, {
                    backgroundColor: nextPolygonState
                        ? element.backgroundColor
                        : "transparent",
                    ...(0, element_2.toggleLinePolygonState)(element, nextPolygonState),
                });
            }),
            appState,
            captureUpdate: element_2.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ appState, updateData, app }) => {
        const selectedElements = app.scene.getSelectedElements({
            selectedElementIds: appState.selectedElementIds,
        });
        if (selectedElements.length === 0 ||
            selectedElements.some((element) => !(0, element_1.isLineElement)(element) ||
                // only show polygon button if every selected element is already
                // a polygon, effectively showing this button only to allow for
                // disabling the polygon state
                !element.polygon ||
                element.points.length < 3)) {
            return null;
        }
        const allPolygon = selectedElements.every((element) => (0, element_1.isLineElement)(element) && element.polygon);
        const label = (0, i18n_1.t)(allPolygon
            ? "labels.polygon.breakPolygon"
            : "labels.polygon.convertToPolygon");
        return ((0, jsx_runtime_1.jsx)(ButtonIcon_1.ButtonIcon, { icon: icons_1.polygonIcon, title: label, "aria-label": label, active: allPolygon, onClick: () => updateData(null), style: { marginLeft: "auto" } }));
    },
});
