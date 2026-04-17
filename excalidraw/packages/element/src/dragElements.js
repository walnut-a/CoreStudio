"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dragNewElement = exports.getDragOffsetXY = exports.dragSelectedElements = void 0;
const common_1 = require("@excalidraw/common");
const binding_1 = require("./binding");
const bounds_1 = require("./bounds");
const sizeHelpers_1 = require("./sizeHelpers");
const textElement_1 = require("./textElement");
const textMeasurements_1 = require("./textMeasurements");
const typeChecks_1 = require("./typeChecks");
const dragSelectedElements = (pointerDownState, _selectedElements, offset, scene, snapOffset, gridSize) => {
    if (_selectedElements.length === 1 &&
        (0, typeChecks_1.isElbowArrow)(_selectedElements[0]) &&
        (_selectedElements[0].startBinding || _selectedElements[0].endBinding)) {
        return;
    }
    const selectedElements = _selectedElements.filter((element) => {
        if ((0, typeChecks_1.isElbowArrow)(element) && element.startBinding && element.endBinding) {
            const startElement = _selectedElements.find((el) => el.id === element.startBinding?.elementId);
            const endElement = _selectedElements.find((el) => el.id === element.endBinding?.elementId);
            return startElement && endElement;
        }
        return true;
    });
    // we do not want a frame and its elements to be selected at the same time
    // but when it happens (due to some bug), we want to avoid updating element
    // in the frame twice, hence the use of set
    const elementsToUpdate = new Set(selectedElements);
    const frames = selectedElements
        .filter((e) => (0, typeChecks_1.isFrameLikeElement)(e))
        .map((f) => f.id);
    if (frames.length > 0) {
        for (const element of scene.getNonDeletedElements()) {
            if (element.frameId !== null && frames.includes(element.frameId)) {
                elementsToUpdate.add(element);
            }
        }
    }
    const origElements = [];
    for (const element of elementsToUpdate) {
        const origElement = pointerDownState.originalElements.get(element.id);
        // if original element is not set (e.g. when you duplicate during a drag
        // operation), exit to avoid undefined behavior
        if (!origElement) {
            return;
        }
        origElements.push(origElement);
    }
    const adjustedOffset = calculateOffset((0, bounds_1.getCommonBounds)(origElements), offset, snapOffset, gridSize);
    const elementsToUpdateIds = new Set(Array.from(elementsToUpdate, (el) => el.id));
    elementsToUpdate.forEach((element) => {
        const isArrow = !(0, typeChecks_1.isArrowElement)(element);
        const isStartBoundElementSelected = isArrow ||
            (element.startBinding
                ? elementsToUpdateIds.has(element.startBinding.elementId)
                : false);
        const isEndBoundElementSelected = isArrow ||
            (element.endBinding
                ? elementsToUpdateIds.has(element.endBinding.elementId)
                : false);
        if (!(0, typeChecks_1.isArrowElement)(element)) {
            updateElementCoords(pointerDownState, element, scene, adjustedOffset);
            // skip arrow labels since we calculate its position during render
            const textElement = (0, textElement_1.getBoundTextElement)(element, scene.getNonDeletedElementsMap());
            if (textElement) {
                updateElementCoords(pointerDownState, textElement, scene, adjustedOffset);
            }
            (0, binding_1.updateBoundElements)(element, scene, {
                simultaneouslyUpdated: Array.from(elementsToUpdate),
            });
        }
        else if (
        // NOTE: Add a little initial drag to the arrow dragging when the arrow
        // is the single element being dragged to avoid accidentally unbinding
        // the arrow when the user just wants to select it.
        elementsToUpdate.size > 1 ||
            Math.max(Math.abs(adjustedOffset.x), Math.abs(adjustedOffset.y)) >
                common_1.DRAGGING_THRESHOLD ||
            (!element.startBinding && !element.endBinding)) {
            updateElementCoords(pointerDownState, element, scene, adjustedOffset);
            const shouldUnbindStart = element.startBinding && !isStartBoundElementSelected;
            const shouldUnbindEnd = element.endBinding && !isEndBoundElementSelected;
            if (shouldUnbindStart || shouldUnbindEnd) {
                // NOTE: Moving the bound arrow should unbind it, otherwise we would
                // have weird situations, like 0 lenght arrow when the user moves
                // the arrow outside a filled shape suddenly forcing the arrow start
                // and end point to jump "outside" the shape.
                if (shouldUnbindStart) {
                    (0, binding_1.unbindBindingElement)(element, "start", scene);
                }
                if (shouldUnbindEnd) {
                    (0, binding_1.unbindBindingElement)(element, "end", scene);
                }
            }
        }
    });
};
exports.dragSelectedElements = dragSelectedElements;
const calculateOffset = (commonBounds, dragOffset, snapOffset, gridSize) => {
    const [x, y] = commonBounds;
    let nextX = x + dragOffset.x + snapOffset.x;
    let nextY = y + dragOffset.y + snapOffset.y;
    if (snapOffset.x === 0 || snapOffset.y === 0) {
        const [nextGridX, nextGridY] = (0, common_1.getGridPoint)(x + dragOffset.x, y + dragOffset.y, gridSize);
        if (snapOffset.x === 0) {
            nextX = nextGridX;
        }
        if (snapOffset.y === 0) {
            nextY = nextGridY;
        }
    }
    return {
        x: nextX - x,
        y: nextY - y,
    };
};
const updateElementCoords = (pointerDownState, element, scene, dragOffset) => {
    const originalElement = pointerDownState.originalElements.get(element.id) ?? element;
    const nextX = originalElement.x + dragOffset.x;
    const nextY = originalElement.y + dragOffset.y;
    scene.mutateElement(element, {
        x: nextX,
        y: nextY,
    });
};
const getDragOffsetXY = (selectedElements, x, y) => {
    const [x1, y1] = (0, bounds_1.getCommonBounds)(selectedElements);
    return [x - x1, y - y1];
};
exports.getDragOffsetXY = getDragOffsetXY;
const dragNewElement = ({ newElement, elementType, originX, originY, x, y, width, height, shouldMaintainAspectRatio, shouldResizeFromCenter, zoom, scene, widthAspectRatio = null, originOffset = null, informMutation = true, }) => {
    if (shouldMaintainAspectRatio && newElement.type !== "selection") {
        if (widthAspectRatio) {
            height = width / widthAspectRatio;
        }
        else {
            // Depending on where the cursor is at (x, y) relative to where the starting point is
            // (originX, originY), we use ONLY width or height to control size increase.
            // This allows the cursor to always "stick" to one of the sides of the bounding box.
            if (Math.abs(y - originY) > Math.abs(x - originX)) {
                ({ width, height } = (0, sizeHelpers_1.getPerfectElementSize)(elementType, height, x < originX ? -width : width));
            }
            else {
                ({ width, height } = (0, sizeHelpers_1.getPerfectElementSize)(elementType, width, y < originY ? -height : height));
            }
            if (height < 0) {
                height = -height;
            }
        }
    }
    let newX = x < originX ? originX - width : originX;
    let newY = y < originY ? originY - height : originY;
    if (shouldResizeFromCenter) {
        width += width;
        height += height;
        newX = originX - width / 2;
        newY = originY - height / 2;
    }
    let textAutoResize = null;
    if ((0, typeChecks_1.isTextElement)(newElement)) {
        height = newElement.height;
        const minWidth = (0, textMeasurements_1.getMinTextElementWidth)((0, common_1.getFontString)({
            fontSize: newElement.fontSize,
            fontFamily: newElement.fontFamily,
        }), newElement.lineHeight);
        width = Math.max(width, minWidth);
        if (Math.abs(x - originX) > common_1.TEXT_AUTOWRAP_THRESHOLD / zoom) {
            textAutoResize = {
                autoResize: false,
            };
        }
        newY = originY;
        if (shouldResizeFromCenter) {
            newX = originX - width / 2;
        }
    }
    if (width !== 0 && height !== 0) {
        let imageInitialDimension = null;
        if ((0, typeChecks_1.isImageElement)(newElement)) {
            imageInitialDimension = {
                initialWidth: width,
                initialHeight: height,
            };
        }
        scene.mutateElement(newElement, {
            x: newX + (originOffset?.x ?? 0),
            y: newY + (originOffset?.y ?? 0),
            width,
            height,
            ...textAutoResize,
            ...imageInitialDimension,
        }, { informMutation, isDragging: false });
    }
};
exports.dragNewElement = dragNewElement;
