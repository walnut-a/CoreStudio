"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionWrapTextInContainer = exports.actionBindText = exports.actionUnbindText = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const register_1 = require("./register");
exports.actionUnbindText = (0, register_1.register)({
    name: "unbindText",
    label: "labels.unbindText",
    trackEvent: { category: "element" },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        return selectedElements.some((element) => (0, element_3.hasBoundTextElement)(element));
    },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        const elementsMap = app.scene.getNonDeletedElementsMap();
        selectedElements.forEach((element) => {
            const boundTextElement = (0, element_2.getBoundTextElement)(element, elementsMap);
            if (boundTextElement) {
                const { width, height } = (0, element_4.measureText)(boundTextElement.originalText, (0, common_1.getFontString)(boundTextElement), boundTextElement.lineHeight);
                const originalContainerHeight = (0, element_1.getOriginalContainerHeightFromCache)(element.id);
                (0, element_1.resetOriginalContainerCache)(element.id);
                const { x, y } = (0, element_2.computeBoundTextPosition)(element, boundTextElement, elementsMap);
                app.scene.mutateElement(boundTextElement, {
                    containerId: null,
                    width,
                    height,
                    text: boundTextElement.originalText,
                    x,
                    y,
                });
                app.scene.mutateElement(element, {
                    boundElements: element.boundElements?.filter((ele) => ele.id !== boundTextElement.id),
                    height: originalContainerHeight
                        ? originalContainerHeight
                        : element.height,
                });
            }
        });
        return {
            elements,
            appState,
            captureUpdate: element_7.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
exports.actionBindText = (0, register_1.register)({
    name: "bindText",
    label: "labels.bindText",
    trackEvent: { category: "element" },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        if (selectedElements.length === 2) {
            const textElement = (0, element_3.isTextElement)(selectedElements[0]) ||
                (0, element_3.isTextElement)(selectedElements[1]);
            let bindingContainer;
            if ((0, element_3.isTextBindableContainer)(selectedElements[0])) {
                bindingContainer = selectedElements[0];
            }
            else if ((0, element_3.isTextBindableContainer)(selectedElements[1])) {
                bindingContainer = selectedElements[1];
            }
            if (textElement &&
                bindingContainer &&
                (0, element_2.getBoundTextElement)(bindingContainer, app.scene.getNonDeletedElementsMap()) === null) {
                return true;
            }
        }
        return false;
    },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        let textElement;
        let container;
        if ((0, element_3.isTextElement)(selectedElements[0]) &&
            (0, element_3.isTextBindableContainer)(selectedElements[1])) {
            textElement = selectedElements[0];
            container = selectedElements[1];
        }
        else {
            textElement = selectedElements[1];
            container = selectedElements[0];
        }
        app.scene.mutateElement(textElement, {
            containerId: container.id,
            verticalAlign: common_1.VERTICAL_ALIGN.MIDDLE,
            textAlign: common_1.TEXT_ALIGN.CENTER,
            autoResize: true,
            angle: ((0, element_3.isArrowElement)(container) ? 0 : container?.angle ?? 0),
        });
        app.scene.mutateElement(container, {
            boundElements: (container.boundElements || []).concat({
                type: "text",
                id: textElement.id,
            }),
        });
        const originalContainerHeight = container.height;
        (0, element_2.redrawTextBoundingBox)(textElement, container, app.scene);
        // overwritting the cache with original container height so
        // it can be restored when unbind
        (0, element_1.updateOriginalContainerCache)(container.id, originalContainerHeight);
        return {
            elements: pushTextAboveContainer(elements, container, textElement),
            appState: { ...appState, selectedElementIds: { [container.id]: true } },
            captureUpdate: element_7.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
const pushTextAboveContainer = (elements, container, textElement) => {
    const updatedElements = elements.slice();
    const textElementIndex = updatedElements.findIndex((ele) => ele.id === textElement.id);
    updatedElements.splice(textElementIndex, 1);
    const containerIndex = updatedElements.findIndex((ele) => ele.id === container.id);
    updatedElements.splice(containerIndex + 1, 0, textElement);
    (0, element_5.syncMovedIndices)(updatedElements, (0, common_1.arrayToMap)([container, textElement]));
    return updatedElements;
};
const pushContainerBelowText = (elements, container, textElement) => {
    const updatedElements = elements.slice();
    const containerIndex = updatedElements.findIndex((ele) => ele.id === container.id);
    updatedElements.splice(containerIndex, 1);
    const textElementIndex = updatedElements.findIndex((ele) => ele.id === textElement.id);
    updatedElements.splice(textElementIndex, 0, container);
    (0, element_5.syncMovedIndices)(updatedElements, (0, common_1.arrayToMap)([container, textElement]));
    return updatedElements;
};
exports.actionWrapTextInContainer = (0, register_1.register)({
    name: "wrapTextInContainer",
    label: "labels.createContainerFromText",
    trackEvent: { category: "element" },
    predicate: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        const someTextElements = selectedElements.some((el) => (0, element_3.isTextElement)(el) && !(0, element_1.isBoundToContainer)(el));
        return selectedElements.length > 0 && someTextElements;
    },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        let updatedElements = elements.slice();
        const containerIds = {};
        for (const textElement of selectedElements) {
            if ((0, element_3.isTextElement)(textElement) && !(0, element_1.isBoundToContainer)(textElement)) {
                const container = (0, element_6.newElement)({
                    type: "rectangle",
                    backgroundColor: appState.currentItemBackgroundColor,
                    boundElements: [
                        ...(textElement.boundElements || []),
                        { id: textElement.id, type: "text" },
                    ],
                    angle: textElement.angle,
                    fillStyle: appState.currentItemFillStyle,
                    strokeColor: appState.currentItemStrokeColor,
                    roughness: appState.currentItemRoughness,
                    strokeWidth: appState.currentItemStrokeWidth,
                    strokeStyle: appState.currentItemStrokeStyle,
                    roundness: appState.currentItemRoundness === "round"
                        ? {
                            type: (0, element_3.isUsingAdaptiveRadius)("rectangle")
                                ? common_1.ROUNDNESS.ADAPTIVE_RADIUS
                                : common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                        }
                        : null,
                    opacity: 100,
                    locked: false,
                    x: textElement.x - common_1.BOUND_TEXT_PADDING,
                    y: textElement.y - common_1.BOUND_TEXT_PADDING,
                    width: (0, element_2.computeContainerDimensionForBoundText)(textElement.width, "rectangle"),
                    height: (0, element_2.computeContainerDimensionForBoundText)(textElement.height, "rectangle"),
                    groupIds: textElement.groupIds,
                    frameId: textElement.frameId,
                });
                // update bindings
                if (textElement.boundElements?.length) {
                    const linearElementIds = textElement.boundElements
                        .filter((ele) => ele.type === "arrow")
                        .map((el) => el.id);
                    const linearElements = updatedElements.filter((ele) => linearElementIds.includes(ele.id));
                    linearElements.forEach((ele) => {
                        let startBinding = ele.startBinding;
                        let endBinding = ele.endBinding;
                        if (startBinding?.elementId === textElement.id) {
                            startBinding = {
                                ...startBinding,
                                elementId: container.id,
                            };
                        }
                        if (endBinding?.elementId === textElement.id) {
                            endBinding = { ...endBinding, elementId: container.id };
                        }
                        if (startBinding || endBinding) {
                            app.scene.mutateElement(ele, {
                                startBinding,
                                endBinding,
                            });
                        }
                    });
                }
                app.scene.mutateElement(textElement, {
                    containerId: container.id,
                    verticalAlign: common_1.VERTICAL_ALIGN.MIDDLE,
                    boundElements: null,
                    textAlign: common_1.TEXT_ALIGN.CENTER,
                    autoResize: true,
                });
                (0, element_2.redrawTextBoundingBox)(textElement, container, app.scene);
                updatedElements = pushContainerBelowText([...updatedElements, container], container, textElement);
                containerIds[container.id] = true;
            }
        }
        return {
            elements: updatedElements,
            appState: {
                ...appState,
                selectedElementIds: containerIds,
            },
            captureUpdate: element_7.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
