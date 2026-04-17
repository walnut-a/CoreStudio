"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textWysiwyg = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const element_10 = require("@excalidraw/element");
const element_11 = require("@excalidraw/element");
const actions_1 = require("../actions");
const clipboard_1 = require("../clipboard");
const actionProperties_1 = require("../actions/actionProperties");
const actionCanvas_1 = require("../actions/actionCanvas");
const getTransform = (width, height, angle, appState, maxWidth, maxHeight) => {
    const { zoom } = appState;
    const degree = (180 * angle) / Math.PI;
    let translateX = (width * (zoom.value - 1)) / 2;
    let translateY = (height * (zoom.value - 1)) / 2;
    if (width > maxWidth && zoom.value !== 1) {
        translateX = (maxWidth * (zoom.value - 1)) / 2;
    }
    if (height > maxHeight && zoom.value !== 1) {
        translateY = (maxHeight * (zoom.value - 1)) / 2;
    }
    return `translate(${translateX}px, ${translateY}px) scale(${zoom.value}) rotate(${degree}deg)`;
};
const getLineDirection = (text, offset) => {
    const hardLineStart = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
    const hardLineEnd = text.indexOf("\n", offset);
    const hardLineText = text.slice(hardLineStart, hardLineEnd === -1 ? text.length : hardLineEnd);
    return (0, common_1.isRTL)(hardLineText) ? "rtl" : "ltr";
};
const getCaretBoundaryOffsets = (text) => {
    const offsets = [0];
    let offset = 0;
    for (const char of Array.from(text)) {
        offset += char.length;
        offsets.push(offset);
    }
    return offsets;
};
const getLineCaretOffsetFromNativeLayout = ({ text, font, lineHeightPx, direction, targetX, }) => {
    if (!text || !document.body || typeof document.createRange !== "function") {
        return null;
    }
    const offsets = getCaretBoundaryOffsets(text);
    const mirror = document.createElement("div");
    const textNode = document.createTextNode(text);
    const range = document.createRange();
    const positions = [];
    mirror.dir = direction;
    Object.assign(mirror.style, {
        position: "fixed",
        top: "0",
        left: "0",
        margin: 0,
        padding: 0,
        border: 0,
        opacity: "0",
        pointerEvents: "none",
        whiteSpace: "pre",
        font,
        lineHeight: `${lineHeightPx}px`,
    });
    mirror.append(textNode);
    document.body.append(mirror);
    try {
        for (const offset of offsets) {
            range.setStart(textNode, offset);
            range.setEnd(textNode, offset);
            const caretRect = range.getBoundingClientRect();
            if (!Number.isFinite(caretRect.left)) {
                return null;
            }
            positions.push(caretRect.left);
        }
    }
    catch {
        return null;
    }
    finally {
        mirror.remove();
    }
    const leftEdge = Math.min(...positions);
    let closestOffset = offsets[0];
    let closestDistance = Infinity;
    for (let index = 0; index < offsets.length; index++) {
        const distance = Math.abs(positions[index] - leftEdge - targetX);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestOffset = offsets[index];
        }
    }
    return closestOffset;
};
const textWysiwyg = ({ id, onChange, onSubmit, getViewportCoords, element, canvas, excalidrawContainer, app, autoSelect = true, initialCaretSceneCoords = null, }) => {
    let currentTextLayout = null;
    const textPropertiesUpdated = (updatedTextElement, editable) => {
        if (!editable.style.fontFamily || !editable.style.fontSize) {
            return false;
        }
        const currentFont = editable.style.fontFamily.replace(/"/g, "");
        if ((0, common_1.getFontFamilyString)({ fontFamily: updatedTextElement.fontFamily }) !==
            currentFont) {
            return true;
        }
        if (`${updatedTextElement.fontSize}px` !== editable.style.fontSize) {
            return true;
        }
        return false;
    };
    let LAST_THEME = app.state.theme;
    const updateWysiwygStyle = () => {
        LAST_THEME = app.state.theme;
        const appState = app.state;
        const updatedTextElement = app.scene.getElement(id);
        if (!updatedTextElement) {
            return;
        }
        const { textAlign, verticalAlign } = updatedTextElement;
        const elementsMap = app.scene.getNonDeletedElementsMap();
        if (updatedTextElement && (0, element_11.isTextElement)(updatedTextElement)) {
            let coordX = updatedTextElement.x;
            let coordY = updatedTextElement.y;
            const container = (0, element_4.getContainerElement)(updatedTextElement, app.scene.getNonDeletedElementsMap());
            let width = updatedTextElement.width;
            // set to element height by default since that's
            // what is going to be used for unbounded text
            let height = updatedTextElement.height;
            let maxWidth = updatedTextElement.width;
            let maxHeight = updatedTextElement.height;
            if (container && updatedTextElement.containerId) {
                if ((0, element_11.isArrowElement)(container)) {
                    const boundTextCoords = element_2.LinearElementEditor.getBoundTextElementPosition(container, updatedTextElement, elementsMap);
                    coordX = boundTextCoords.x;
                    coordY = boundTextCoords.y;
                }
                const propertiesUpdated = textPropertiesUpdated(updatedTextElement, editable);
                let originalContainerData;
                if (propertiesUpdated) {
                    originalContainerData = (0, element_1.updateOriginalContainerCache)(container.id, container.height);
                }
                else {
                    originalContainerData = element_1.originalContainerCache[container.id];
                    if (!originalContainerData) {
                        originalContainerData = (0, element_1.updateOriginalContainerCache)(container.id, container.height);
                    }
                }
                maxWidth = (0, element_4.getBoundTextMaxWidth)(container, updatedTextElement);
                maxHeight = (0, element_4.getBoundTextMaxHeight)(container, updatedTextElement);
                // autogrow container height if text exceeds
                if (!(0, element_11.isArrowElement)(container) && height > maxHeight) {
                    const targetContainerHeight = (0, element_4.computeContainerDimensionForBoundText)(height, container.type);
                    app.scene.mutateElement(container, { height: targetContainerHeight });
                    (0, element_1.updateBoundElements)(container, app.scene);
                    return;
                }
                else if (
                // autoshrink container height until original container height
                // is reached when text is removed
                !(0, element_11.isArrowElement)(container) &&
                    container.height > originalContainerData.height &&
                    height < maxHeight) {
                    const targetContainerHeight = (0, element_4.computeContainerDimensionForBoundText)(height, container.type);
                    app.scene.mutateElement(container, { height: targetContainerHeight });
                    (0, element_1.updateBoundElements)(container, app.scene);
                }
                else {
                    const { x, y } = (0, element_4.computeBoundTextPosition)(container, updatedTextElement, elementsMap);
                    coordX = x;
                    coordY = y;
                }
            }
            const [viewportX, viewportY] = getViewportCoords(coordX, coordY);
            if (!container) {
                maxWidth = (appState.width - 8 - viewportX) / appState.zoom.value;
                width = Math.min(width, maxWidth);
            }
            else {
                width += 0.5;
            }
            // add 5% buffer otherwise it causes wysiwyg to jump
            height *= 1.05;
            const font = (0, common_1.getFontString)(updatedTextElement);
            const angle = (0, element_4.getTextElementAngle)(updatedTextElement, container);
            // Make sure text editor height doesn't go beyond viewport
            const editorMaxHeight = (appState.height - viewportY) / appState.zoom.value;
            Object.assign(editable.style, {
                font,
                // must be defined *after* font ¯\_(ツ)_/¯
                lineHeight: updatedTextElement.lineHeight,
                width: `${width}px`,
                height: `${height}px`,
                left: `${viewportX}px`,
                top: `${viewportY}px`,
                transform: getTransform(width, height, angle, appState, maxWidth, editorMaxHeight),
                textAlign,
                verticalAlign,
                color: appState.theme === common_1.THEME.DARK
                    ? (0, common_1.applyDarkModeFilter)(updatedTextElement.strokeColor)
                    : updatedTextElement.strokeColor,
                opacity: updatedTextElement.opacity / 100,
                maxHeight: `${editorMaxHeight}px`,
            });
            currentTextLayout = {
                angle: angle,
                font,
                height: updatedTextElement.height,
                lineHeightPx: (0, element_6.getLineHeightInPx)(updatedTextElement.fontSize, updatedTextElement.lineHeight),
                textAlign,
                width: updatedTextElement.width,
                x: coordX,
                y: coordY,
            };
            editable.scrollTop = 0;
            // For some reason updating font attribute doesn't set font family
            // hence updating font family explicitly for test environment
            if ((0, common_1.isTestEnv)()) {
                editable.style.fontFamily = (0, common_1.getFontFamilyString)(updatedTextElement);
            }
            app.scene.mutateElement(updatedTextElement, { x: coordX, y: coordY });
        }
    };
    const editable = document.createElement("textarea");
    editable.dir = "auto";
    editable.tabIndex = 0;
    editable.dataset.type = "wysiwyg";
    // prevent line wrapping on Safari
    editable.wrap = "off";
    editable.classList.add("excalidraw-wysiwyg");
    let whiteSpace = "pre";
    let wordBreak = "normal";
    if ((0, element_11.isBoundToContainer)(element) || !element.autoResize) {
        whiteSpace = "pre-wrap";
        wordBreak = "break-word";
    }
    Object.assign(editable.style, {
        position: "absolute",
        display: "inline-block",
        minHeight: "1em",
        backfaceVisibility: "hidden",
        margin: 0,
        padding: 0,
        border: 0,
        outline: 0,
        resize: "none",
        background: "transparent",
        overflow: "hidden",
        // must be specified because in dark mode canvas creates a stacking context
        zIndex: "var(--zIndex-wysiwyg)",
        wordBreak,
        // prevent line wrapping (`whitespace: nowrap` doesn't work on FF)
        whiteSpace,
        overflowWrap: "break-word",
        boxSizing: "content-box",
    });
    editable.value = element.originalText;
    updateWysiwygStyle();
    const getCaretIndexFromInitialSceneCoords = () => {
        if (!initialCaretSceneCoords || !currentTextLayout) {
            return null;
        }
        const layout = currentTextLayout;
        const center = (0, math_1.pointFrom)(layout.x + layout.width / 2, layout.y + layout.height / 2);
        const [unrotatedX, unrotatedY] = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(initialCaretSceneCoords.x, initialCaretSceneCoords.y), center, -layout.angle);
        const localX = unrotatedX - layout.x;
        const localY = unrotatedY - layout.y;
        const lines = (0, element_10.getWrappedTextLines)(editable.value, layout.font, whiteSpace === "pre-wrap" ? layout.width : Infinity);
        const lineIndex = Math.max(0, Math.min(lines.length - 1, Math.floor(localY / layout.lineHeightPx)));
        const line = lines[lineIndex];
        const direction = getLineDirection(editable.value, line.start);
        const lineWidth = (0, element_7.getLineWidth)(line.text, layout.font);
        const lineStartX = layout.textAlign === "center"
            ? (layout.width - lineWidth) / 2
            : layout.textAlign === "right"
                ? layout.width - lineWidth
                : 0;
        const relativeX = localX - lineStartX;
        if (!line.text) {
            return line.start;
        }
        const lineCaretOffset = getLineCaretOffsetFromNativeLayout({
            text: line.text,
            font: layout.font,
            lineHeightPx: layout.lineHeightPx,
            direction,
            targetX: relativeX,
        });
        return line.start + (lineCaretOffset || 0);
    };
    let pendingInitialSelection = (() => {
        const caretIndex = getCaretIndexFromInitialSceneCoords();
        if (caretIndex === null) {
            return null;
        }
        return {
            start: caretIndex,
            end: caretIndex,
        };
    })();
    if (onChange) {
        editable.onpaste = async (event) => {
            // we need to synchronously get the MIME types so we can preventDefault()
            // in the same tick (FF requires that)
            const mimeTypes = (0, clipboard_1.parseDataTransferEventMimeTypes)(event);
            let dataList = null;
            // when copy/pasting excalidraw elements, only paste the text content
            //
            // Note that these custom MIME types only work within the same family
            // of browsers, so won't work e.g. between chrome and firefox. We could
            // parse the text/plain for existence of excalidraw instead, but this
            // is an edge case
            if (mimeTypes.has(common_1.MIME_TYPES.excalidrawClipboard) ||
                mimeTypes.has(common_1.MIME_TYPES.excalidraw)) {
                // must be called in the same tick
                event.preventDefault();
                dataList = await (0, clipboard_1.parseDataTransferEvent)(event);
                try {
                    const parsed = await (0, clipboard_1.parseClipboard)(dataList);
                    if (parsed.elements) {
                        const text = (0, element_1.getTextFromElements)(parsed.elements);
                        if (text) {
                            const { selectionStart, selectionEnd, value } = editable;
                            editable.value =
                                value.slice(0, selectionStart) +
                                    text +
                                    value.slice(selectionEnd);
                            const newPos = selectionStart + text.length;
                            editable.selectionStart = editable.selectionEnd = newPos;
                            editable.dispatchEvent(new Event("input"));
                        }
                    }
                    // if excalidraw elements don't contain any text elements,
                    // don't paste anything
                    return;
                }
                catch {
                    console.warn("failed to parse excalidraw clipboard data");
                }
            }
            dataList = dataList || (await (0, clipboard_1.parseDataTransferEvent)(event));
            const textItem = dataList.findByType(common_1.MIME_TYPES.text);
            if (!textItem) {
                return;
            }
            const text = (0, element_8.normalizeText)(textItem.value);
            if (!text) {
                return;
            }
            const container = (0, element_4.getContainerElement)(element, app.scene.getNonDeletedElementsMap());
            const font = (0, common_1.getFontString)({
                fontSize: app.state.currentItemFontSize,
                fontFamily: app.state.currentItemFontFamily,
            });
            if (container) {
                const boundTextElement = (0, element_4.getBoundTextElement)(container, app.scene.getNonDeletedElementsMap());
                const wrappedText = (0, element_9.wrapText)(`${editable.value}${text}`, font, (0, element_4.getBoundTextMaxWidth)(container, boundTextElement));
                const width = (0, element_5.getTextWidth)(wrappedText, font);
                editable.style.width = `${width}px`;
            }
        };
        editable.oninput = () => {
            const normalized = (0, element_8.normalizeText)(editable.value);
            if (editable.value !== normalized) {
                const selectionStart = editable.selectionStart;
                editable.value = normalized;
                // put the cursor at some position close to where it was before
                // normalization (otherwise it'll end up at the end of the text)
                editable.selectionStart = selectionStart;
                editable.selectionEnd = selectionStart;
            }
            onChange(editable.value);
        };
    }
    editable.onkeydown = (event) => {
        if (!event.shiftKey && actionCanvas_1.actionZoomIn.keyTest(event)) {
            event.preventDefault();
            app.actionManager.executeAction(actionCanvas_1.actionZoomIn);
            updateWysiwygStyle();
        }
        else if (!event.shiftKey && actionCanvas_1.actionZoomOut.keyTest(event)) {
            event.preventDefault();
            app.actionManager.executeAction(actionCanvas_1.actionZoomOut);
            updateWysiwygStyle();
        }
        else if (!event.shiftKey && actionCanvas_1.actionResetZoom.keyTest(event)) {
            event.preventDefault();
            app.actionManager.executeAction(actionCanvas_1.actionResetZoom);
            updateWysiwygStyle();
        }
        else if (actionProperties_1.actionDecreaseFontSize.keyTest(event)) {
            app.actionManager.executeAction(actionProperties_1.actionDecreaseFontSize);
        }
        else if (actionProperties_1.actionIncreaseFontSize.keyTest(event)) {
            app.actionManager.executeAction(actionProperties_1.actionIncreaseFontSize);
        }
        else if (event.key === common_1.KEYS.ESCAPE) {
            event.preventDefault();
            submittedViaKeyboard = true;
            handleSubmit();
        }
        else if (actions_1.actionSaveToActiveFile.keyTest(event)) {
            event.preventDefault();
            handleSubmit();
            app.actionManager.executeAction(actions_1.actionSaveToActiveFile);
        }
        else if (event.key === common_1.KEYS.ENTER && event[common_1.KEYS.CTRL_OR_CMD]) {
            event.preventDefault();
            if (event.isComposing || event.keyCode === 229) {
                return;
            }
            submittedViaKeyboard = true;
            handleSubmit();
        }
        else if (event.key === common_1.KEYS.TAB ||
            (event[common_1.KEYS.CTRL_OR_CMD] &&
                (event.code === common_1.CODES.BRACKET_LEFT ||
                    event.code === common_1.CODES.BRACKET_RIGHT))) {
            event.preventDefault();
            if (event.isComposing) {
                return;
            }
            else if (event.shiftKey || event.code === common_1.CODES.BRACKET_LEFT) {
                outdent();
            }
            else {
                indent();
            }
            // We must send an input event to resize the element
            editable.dispatchEvent(new Event("input"));
        }
    };
    const TAB_SIZE = 4;
    const TAB = " ".repeat(TAB_SIZE);
    const RE_LEADING_TAB = new RegExp(`^ {1,${TAB_SIZE}}`);
    const indent = () => {
        const { selectionStart, selectionEnd } = editable;
        const linesStartIndices = getSelectedLinesStartIndices();
        let value = editable.value;
        linesStartIndices.forEach((startIndex) => {
            const startValue = value.slice(0, startIndex);
            const endValue = value.slice(startIndex);
            value = `${startValue}${TAB}${endValue}`;
        });
        editable.value = value;
        editable.selectionStart = selectionStart + TAB_SIZE;
        editable.selectionEnd = selectionEnd + TAB_SIZE * linesStartIndices.length;
    };
    const outdent = () => {
        const { selectionStart, selectionEnd } = editable;
        const linesStartIndices = getSelectedLinesStartIndices();
        const removedTabs = [];
        let value = editable.value;
        linesStartIndices.forEach((startIndex) => {
            const tabMatch = value
                .slice(startIndex, startIndex + TAB_SIZE)
                .match(RE_LEADING_TAB);
            if (tabMatch) {
                const startValue = value.slice(0, startIndex);
                const endValue = value.slice(startIndex + tabMatch[0].length);
                // Delete a tab from the line
                value = `${startValue}${endValue}`;
                removedTabs.push(startIndex);
            }
        });
        editable.value = value;
        if (removedTabs.length) {
            if (selectionStart > removedTabs[removedTabs.length - 1]) {
                editable.selectionStart = Math.max(selectionStart - TAB_SIZE, removedTabs[removedTabs.length - 1]);
            }
            else {
                // If the cursor is before the first tab removed, ex:
                // Line| #1
                //     Line #2
                // Lin|e #3
                // we should reset the selectionStart to his initial value.
                editable.selectionStart = selectionStart;
            }
            editable.selectionEnd = Math.max(editable.selectionStart, selectionEnd - TAB_SIZE * removedTabs.length);
        }
    };
    /**
     * @returns indices of start positions of selected lines, in reverse order
     */
    const getSelectedLinesStartIndices = () => {
        let { selectionStart, selectionEnd, value } = editable;
        // chars before selectionStart on the same line
        const startOffset = value.slice(0, selectionStart).match(/[^\n]*$/)[0]
            .length;
        // put caret at the start of the line
        selectionStart = selectionStart - startOffset;
        const selected = value.slice(selectionStart, selectionEnd);
        return selected
            .split("\n")
            .reduce((startIndices, line, idx, lines) => startIndices.concat(idx
            ? // curr line index is prev line's start + prev line's length + \n
                startIndices[idx - 1] + lines[idx - 1].length + 1
            : // first selected line
                selectionStart), [])
            .reverse();
    };
    const stopEvent = (event) => {
        if (event.target instanceof HTMLCanvasElement) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    // using a state variable instead of passing it to the handleSubmit callback
    // so that we don't need to create separate a callback for event handlers
    let submittedViaKeyboard = false;
    const handleSubmit = () => {
        // prevent double submit
        if (isDestroyed) {
            return;
        }
        isDestroyed = true;
        // cleanup must be run before onSubmit otherwise when app blurs the wysiwyg
        // it'd get stuck in an infinite loop of blur→onSubmit after we re-focus the
        // wysiwyg on update
        cleanup();
        const updateElement = app.scene.getElement(element.id);
        if (!updateElement) {
            return;
        }
        const container = (0, element_4.getContainerElement)(updateElement, app.scene.getNonDeletedElementsMap());
        if (container) {
            if (editable.value.trim()) {
                const boundTextElementId = (0, element_4.getBoundTextElementId)(container);
                if (!boundTextElementId || boundTextElementId !== element.id) {
                    app.scene.mutateElement(container, {
                        boundElements: (container.boundElements || []).concat({
                            type: "text",
                            id: element.id,
                        }),
                    });
                }
                else if ((0, element_11.isArrowElement)(container)) {
                    // updating an arrow label may change bounds, prevent stale cache:
                    (0, element_3.bumpVersion)(container);
                }
            }
            else {
                app.scene.mutateElement(container, {
                    boundElements: container.boundElements?.filter((ele) => !(0, element_11.isTextElement)(ele)),
                });
            }
            (0, element_4.redrawTextBoundingBox)(updateElement, container, app.scene);
        }
        onSubmit({
            viaKeyboard: submittedViaKeyboard,
            nextOriginalText: editable.value,
        });
    };
    const cleanup = () => {
        // remove events to ensure they don't late-fire
        editable.onblur = null;
        editable.oninput = null;
        editable.onkeydown = null;
        if (observer) {
            observer.disconnect();
        }
        window.removeEventListener("resize", updateWysiwygStyle);
        window.removeEventListener("wheel", stopEvent, true);
        window.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", bindBlurEvent);
        window.removeEventListener("blur", handleSubmit);
        window.removeEventListener("beforeunload", handleSubmit);
        unbindUpdate();
        unsubOnChange();
        unbindOnScroll();
        editable.remove();
    };
    const bindBlurEvent = (event) => {
        window.removeEventListener("pointerup", bindBlurEvent);
        // Deferred so that the pointerdown that initiates the wysiwyg doesn't
        // trigger the blur on ensuing pointerup.
        // Also to handle cases such as picking a color which would trigger a blur
        // in that same tick.
        const target = event?.target;
        const isPropertiesTrigger = target instanceof HTMLElement &&
            target.classList.contains("properties-trigger");
        const isPropertiesContent = (target instanceof HTMLElement || target instanceof SVGElement) &&
            !!target.closest(".properties-content");
        const inShapeActionsMenu = (target instanceof HTMLElement || target instanceof SVGElement) &&
            (!!target.closest(`.${common_1.CLASSES.SHAPE_ACTIONS_MENU}`) ||
                !!target.closest(".compact-shape-actions-island"));
        setTimeout(() => {
            // If we interacted within shape actions menu or its popovers/triggers,
            // keep submit disabled and don't steal focus back to textarea.
            if (inShapeActionsMenu || isPropertiesTrigger || isPropertiesContent) {
                return;
            }
            // Otherwise, re-enable submit on blur and refocus the editor.
            editable.onblur = handleSubmit;
            editable.focus();
            if (pendingInitialSelection) {
                editable.setSelectionRange(pendingInitialSelection.start, pendingInitialSelection.end);
                pendingInitialSelection = null;
            }
        });
    };
    const temporarilyDisableSubmit = () => {
        editable.onblur = null;
        window.addEventListener("pointerup", bindBlurEvent);
        // handle edge-case where pointerup doesn't fire e.g. due to user
        // alt-tabbing away
        window.addEventListener("blur", handleSubmit);
    };
    // prevent blur when changing properties from the menu
    const onPointerDown = (event) => {
        const target = event?.target;
        // panning canvas
        if (event.button === common_1.POINTER_BUTTON.WHEEL) {
            // trying to pan by clicking inside text area itself -> handle here
            if (target instanceof HTMLTextAreaElement) {
                event.preventDefault();
                app.handleCanvasPanUsingWheelOrSpaceDrag(event);
            }
            temporarilyDisableSubmit();
            return;
        }
        const isPropertiesTrigger = target instanceof HTMLElement &&
            target.classList.contains("properties-trigger");
        const isPropertiesContent = (target instanceof HTMLElement || target instanceof SVGElement) &&
            !!target.closest(".properties-content");
        if (((event.target instanceof HTMLElement ||
            event.target instanceof SVGElement) &&
            (event.target.closest(`.${common_1.CLASSES.SHAPE_ACTIONS_MENU}, .${common_1.CLASSES.ZOOM_ACTIONS}`) ||
                event.target.closest(".compact-shape-actions-island")) &&
            !(0, common_1.isWritableElement)(event.target)) ||
            isPropertiesTrigger ||
            isPropertiesContent) {
            temporarilyDisableSubmit();
        }
        else if (event.target instanceof HTMLCanvasElement &&
            // Vitest simply ignores stopPropagation, capture-mode, or rAF
            // so without introducing crazier hacks, nothing we can do
            !(0, common_1.isTestEnv)()) {
            // On mobile, blur event doesn't seem to always fire correctly,
            // so we want to also submit on pointerdown outside the wysiwyg.
            // Done in the next frame to prevent pointerdown from creating a new text
            // immediately (if tools locked) so that users on mobile have chance
            // to submit first (to hide virtual keyboard).
            // Note: revisit if we want to differ this behavior on Desktop
            requestAnimationFrame(() => {
                handleSubmit();
            });
        }
    };
    // FIXME after we start emitting updates from Store for appState.theme
    const unsubOnChange = app.onChangeEmitter.on((elements) => {
        if (app.state.theme !== LAST_THEME) {
            updateWysiwygStyle();
        }
    });
    // handle updates of textElement properties of editing element
    const unbindUpdate = app.scene.onUpdate(() => {
        updateWysiwygStyle();
        const isPopupOpened = !!document.activeElement?.closest(".properties-content");
        if (!isPopupOpened) {
            editable.focus();
        }
    });
    const unbindOnScroll = app.onScrollChangeEmitter.on(() => {
        updateWysiwygStyle();
    });
    // ---------------------------------------------------------------------------
    let isDestroyed = false;
    if (autoSelect && !pendingInitialSelection) {
        // select on init (focusing is done separately inside the bindBlurEvent()
        // because we need it to happen *after* the blur event from `pointerdown`)
        editable.select();
    }
    bindBlurEvent();
    // reposition wysiwyg in case of canvas is resized. Using ResizeObserver
    // is preferred so we catch changes from host, where window may not resize.
    let observer = null;
    if (canvas && "ResizeObserver" in window) {
        observer = new window.ResizeObserver(() => {
            updateWysiwygStyle();
        });
        observer.observe(canvas);
    }
    else {
        window.addEventListener("resize", updateWysiwygStyle);
    }
    editable.onpointerdown = (event) => event.stopPropagation();
    // rAF (+ capture to by doubly sure) so we don't catch te pointerdown that
    // triggered the wysiwyg
    requestAnimationFrame(() => {
        window.addEventListener("pointerdown", onPointerDown, { capture: true });
    });
    window.addEventListener("beforeunload", handleSubmit);
    excalidrawContainer
        ?.querySelector(".excalidraw-textEditorContainer")
        .appendChild(editable);
    return handleSubmit;
};
exports.textWysiwyg = textWysiwyg;
