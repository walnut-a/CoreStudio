"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = exports.Pointer = exports.Keyboard = void 0;
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const App_1 = require("../../components/App");
const dom_1 = require("../queries/dom");
const test_utils_1 = require("../test-utils");
const api_1 = require("./api");
// so that window.h is available when App.tsx is not imported as well.
(0, App_1.createTestHook)();
const { h } = window;
let altKey = false;
let shiftKey = false;
let ctrlKey = false;
class Keyboard {
    static withModifierKeys = (modifiers, cb) => {
        const prevAltKey = altKey;
        const prevShiftKey = shiftKey;
        const prevCtrlKey = ctrlKey;
        altKey = !!modifiers.alt;
        shiftKey = !!modifiers.shift;
        ctrlKey = !!modifiers.ctrl;
        try {
            cb();
        }
        finally {
            altKey = prevAltKey;
            shiftKey = prevShiftKey;
            ctrlKey = prevCtrlKey;
        }
    };
    static keyDown = (key, target = document) => {
        test_utils_1.fireEvent.keyDown(target, {
            key,
            ctrlKey,
            shiftKey,
            altKey,
        });
    };
    static keyUp = (key, target = document) => {
        test_utils_1.fireEvent.keyUp(target, {
            key,
            ctrlKey,
            shiftKey,
            altKey,
        });
    };
    static keyPress = (key, target) => {
        Keyboard.keyDown(key, target);
        Keyboard.keyUp(key, target);
    };
    static codeDown = (code) => {
        test_utils_1.fireEvent.keyDown(document, {
            code,
            ctrlKey,
            shiftKey,
            altKey,
        });
    };
    static codeUp = (code) => {
        test_utils_1.fireEvent.keyUp(document, {
            code,
            ctrlKey,
            shiftKey,
            altKey,
        });
    };
    static codePress = (code) => {
        Keyboard.codeDown(code);
        Keyboard.codeUp(code);
    };
    static undo = () => {
        Keyboard.withModifierKeys({ ctrl: true }, () => {
            Keyboard.keyPress("z");
        });
    };
    static redo = () => {
        Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
            Keyboard.keyPress("z");
        });
    };
    static exitTextEditor = (textarea) => {
        test_utils_1.fireEvent.keyDown(textarea, { key: common_1.KEYS.ESCAPE });
    };
}
exports.Keyboard = Keyboard;
const getElementPointForSelection = (element, elementsMap) => {
    const { x, y, width, angle } = element;
    const target = (0, math_1.pointFrom)(x +
        ((0, element_4.isLinearElement)(element) || (0, element_4.isFreeDrawElement)(element) ? 0 : width / 2), y);
    let center;
    if ((0, element_4.isLinearElement)(element)) {
        const bounds = (0, element_1.getElementPointsCoords)(element, element.points);
        center = (0, math_1.pointFrom)((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2);
    }
    else {
        center = (0, element_1.elementCenterPoint)(element, elementsMap);
    }
    if ((0, element_4.isTextElement)(element)) {
        return center;
    }
    return (0, math_1.pointRotateRads)(target, center, angle);
};
class Pointer {
    pointerType;
    pointerId;
    clientX = 0;
    clientY = 0;
    static activePointers = [];
    static resetAll() {
        Pointer.activePointers.forEach((pointer) => pointer.reset());
    }
    constructor(pointerType, pointerId = 1) {
        this.pointerType = pointerType;
        this.pointerId = pointerId;
        Pointer.activePointers.push(this);
    }
    reset() {
        this.clientX = 0;
        this.clientY = 0;
    }
    getPosition() {
        return [this.clientX, this.clientY];
    }
    restorePosition(x = 0, y = 0) {
        this.clientX = x;
        this.clientY = y;
        test_utils_1.fireEvent.pointerMove(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    getEvent() {
        return {
            clientX: this.clientX,
            clientY: this.clientY,
            pointerType: this.pointerType,
            pointerId: this.pointerId,
            altKey,
            shiftKey,
            ctrlKey,
        };
    }
    // incremental (moving by deltas)
    // ---------------------------------------------------------------------------
    move(dx, dy) {
        if (dx !== 0 || dy !== 0) {
            this.clientX += dx;
            this.clientY += dy;
            test_utils_1.fireEvent.pointerMove(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
        }
    }
    down(dx = 0, dy = 0) {
        this.move(dx, dy);
        test_utils_1.fireEvent.pointerDown(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    up(dx = 0, dy = 0) {
        this.move(dx, dy);
        test_utils_1.fireEvent.pointerUp(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    click(dx = 0, dy = 0) {
        this.down(dx, dy);
        this.up();
    }
    doubleClick(dx = 0, dy = 0) {
        this.move(dx, dy);
        test_utils_1.fireEvent.doubleClick(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    // absolute coords
    // ---------------------------------------------------------------------------
    moveTo(x = this.clientX, y = this.clientY) {
        this.clientX = x;
        this.clientY = y;
        // fire "mousemove" to update editor cursor position
        test_utils_1.fireEvent.mouseMove(document, this.getEvent());
        test_utils_1.fireEvent.pointerMove(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    downAt(x = this.clientX, y = this.clientY) {
        this.clientX = x;
        this.clientY = y;
        test_utils_1.fireEvent.pointerDown(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    upAt(x = this.clientX, y = this.clientY) {
        this.clientX = x;
        this.clientY = y;
        test_utils_1.fireEvent.pointerUp(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    clickAt(x, y) {
        this.downAt(x, y);
        this.upAt();
    }
    rightClickAt(x, y) {
        test_utils_1.fireEvent.contextMenu(test_utils_1.GlobalTestState.interactiveCanvas, {
            button: 2,
            clientX: x,
            clientY: y,
        });
    }
    doubleClickAt(x, y) {
        this.moveTo(x, y);
        test_utils_1.fireEvent.doubleClick(test_utils_1.GlobalTestState.interactiveCanvas, this.getEvent());
    }
    // ---------------------------------------------------------------------------
    select(
    /** if multiple elements supplied, they're shift-selected */
    elements) {
        api_1.API.clearSelection();
        Keyboard.withModifierKeys({ shift: true }, () => {
            elements = Array.isArray(elements) ? elements : [elements];
            elements.forEach((element) => {
                this.reset();
                this.click(...getElementPointForSelection(element, h.app.scene.getElementsMapIncludingDeleted()));
            });
        });
        this.reset();
    }
    clickOn(element) {
        this.reset();
        this.click(...getElementPointForSelection(element, h.app.scene.getElementsMapIncludingDeleted()));
        this.reset();
    }
    doubleClickOn(element) {
        this.reset();
        this.doubleClick(...getElementPointForSelection(element, h.app.scene.getElementsMapIncludingDeleted()));
        this.reset();
    }
}
exports.Pointer = Pointer;
const mouse = new Pointer("mouse");
const transform = (element, handle, mouseMove, keyboardModifiers = {}) => {
    const elements = Array.isArray(element) ? element : [element];
    (0, test_utils_1.act)(() => {
        h.setState({
            selectedElementIds: elements.reduce((acc, e) => ({
                ...acc,
                [e.id]: true,
            }), {}),
        });
    });
    let handleCoords;
    if (elements.length === 1) {
        handleCoords = (0, element_3.getTransformHandles)(elements[0], h.state.zoom, (0, common_1.arrayToMap)(h.elements), "mouse", {})[handle];
    }
    else {
        const [x1, y1, x2, y2] = (0, element_1.getCommonBounds)(elements);
        const isFrameSelected = elements.some(element_4.isFrameLikeElement);
        const transformHandles = (0, element_3.getTransformHandlesFromCoords)([x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2], 0, h.state.zoom, "mouse", isFrameSelected ? element_3.OMIT_SIDES_FOR_FRAME : element_3.OMIT_SIDES_FOR_MULTIPLE_ELEMENTS);
        handleCoords = transformHandles[handle];
    }
    if (!handleCoords) {
        throw new Error(`There is no "${handle}" handle for this selection`);
    }
    const clientX = handleCoords[0] + handleCoords[2] / 2;
    const clientY = handleCoords[1] + handleCoords[3] / 2;
    Keyboard.withModifierKeys(keyboardModifiers, () => {
        mouse.reset();
        mouse.down(clientX, clientY);
        mouse.move(mouseMove[0], mouseMove[1]);
        mouse.up();
    });
};
const proxy = (element) => {
    return new Proxy({}, {
        get(target, prop) {
            const currentElement = h.elements.find(({ id }) => id === element.id);
            if (prop === "get") {
                if (currentElement.hasOwnProperty("get")) {
                    throw new Error("trying to get `get` test property, but ExcalidrawElement seems to define its own");
                }
                return () => currentElement;
            }
            return currentElement[prop];
        },
    });
};
class UI {
    static clickTool = (toolName) => {
        test_utils_1.fireEvent.click(test_utils_1.GlobalTestState.renderResult.getByToolName(toolName));
    };
    static clickLabeledElement = (label) => {
        const element = document.querySelector(`[aria-label='${label}']`);
        if (!element) {
            throw new Error(`No labeled element found: ${label}`);
        }
        test_utils_1.fireEvent.click(element);
    };
    static clickOnTestId = (testId) => {
        const element = document.querySelector(`[data-testid='${testId}']`);
        // const element = GlobalTestState.renderResult.queryByTestId(testId);
        if (!element) {
            throw new Error(`No element with testid "${testId}" found`);
        }
        test_utils_1.fireEvent.click(element);
    };
    static clickByTitle = (title) => {
        test_utils_1.fireEvent.click(test_utils_1.screen.getByTitle(title));
    };
    /**
     * Creates an Excalidraw element, and returns a proxy that wraps it so that
     * accessing props will return the latest ones from the object existing in
     * the app's elements array. This is because across the app lifecycle we tend
     * to recreate element objects and the returned reference will become stale.
     *
     * If you need to get the actual element, not the proxy, call `get()` method
     * on the proxy object.
     */
    static createElement(type, { position = 0, x = position, y = position, size = 10, width: initialWidth = size, height: initialHeight = initialWidth, angle = 0, points: initialPoints, } = {}) {
        const width = initialWidth ?? initialHeight ?? size;
        const height = initialHeight ?? size;
        const points = initialPoints ?? [
            (0, math_1.pointFrom)(0, 0),
            (0, math_1.pointFrom)(width, height),
        ];
        UI.clickTool(type);
        if (type === "text") {
            const clickY = h.state.gridModeEnabled
                ? y
                : y +
                    (0, element_1.getLineHeightInPx)(h.state.currentItemFontSize, (0, common_1.getLineHeight)(h.state.currentItemFontFamily)) /
                        2;
            mouse.reset();
            mouse.click(x, clickY);
        }
        else if ((type === "line" || type === "arrow") && points.length > 2) {
            points.forEach((point) => {
                mouse.reset();
                mouse.click(x + point[0], y + point[1]);
            });
            Keyboard.keyPress(common_1.KEYS.ESCAPE);
        }
        else if (type === "freedraw" && points.length > 2) {
            const firstPoint = points[0];
            mouse.reset();
            mouse.down(x + firstPoint[0], y + firstPoint[1]);
            points
                .slice(1)
                .forEach((point) => mouse.moveTo(x + point[0], y + point[1]));
            mouse.upAt();
            Keyboard.keyPress(common_1.KEYS.ESCAPE);
        }
        else {
            mouse.reset();
            mouse.down(x, y);
            mouse.reset();
            mouse.up(x + width, y + height);
        }
        const origElement = h.elements[h.elements.length - 1];
        if (angle !== 0) {
            (0, test_utils_1.act)(() => {
                h.app.scene.mutateElement(origElement, { angle });
            });
        }
        return proxy(origElement);
    }
    static async editText(element, text) {
        const openedEditor = document.querySelector(dom_1.TEXT_EDITOR_SELECTOR);
        if (!openedEditor) {
            mouse.select(element);
            Keyboard.keyPress(common_1.KEYS.ENTER);
        }
        const editor = await (0, dom_1.getTextEditor)();
        if (!editor) {
            throw new Error("Can't find wysiwyg text editor in the dom");
        }
        test_utils_1.fireEvent.input(editor, { target: { value: text } });
        (0, test_utils_1.act)(() => {
            editor.blur();
        });
        return (0, element_4.isTextElement)(element)
            ? element
            : proxy(h.elements[h.elements.length - 1]);
    }
    static updateInput = (input, value) => {
        (0, test_utils_1.act)(() => {
            input.focus();
            test_utils_1.fireEvent.change(input, { target: { value: String(value) } });
            input.blur();
        });
    };
    static resize(element, handle, mouseMove, keyboardModifiers = {}) {
        return transform(element, handle, mouseMove, keyboardModifiers);
    }
    static crop(element, handle, naturalWidth, naturalHeight, mouseMove, keepAspectRatio = false) {
        const handleCoords = (0, element_3.getTransformHandles)(element, h.state.zoom, (0, common_1.arrayToMap)(h.elements), "mouse", {})[handle];
        const clientX = handleCoords[0] + handleCoords[2] / 2;
        const clientY = handleCoords[1] + handleCoords[3] / 2;
        const mutations = (0, element_2.cropElement)(element, h.scene.getNonDeletedElementsMap(), handle, naturalWidth, naturalHeight, clientX + mouseMove[0], clientY + mouseMove[1], keepAspectRatio ? element.width / element.height : undefined);
        api_1.API.updateElement(element, mutations);
    }
    static rotate(element, mouseMove, keyboardModifiers = {}) {
        return transform(element, "rotation", mouseMove, keyboardModifiers);
    }
    static group(elements) {
        mouse.select(elements);
        Keyboard.withModifierKeys({ ctrl: true }, () => {
            Keyboard.keyPress(common_1.KEYS.G);
        });
    }
    static ungroup(elements) {
        mouse.select(elements);
        Keyboard.withModifierKeys({ ctrl: true, shift: true }, () => {
            Keyboard.keyPress(common_1.KEYS.G);
        });
    }
    static queryContextMenu = () => {
        return test_utils_1.GlobalTestState.renderResult.container.querySelector(".context-menu");
    };
    static queryStats = () => {
        return test_utils_1.GlobalTestState.renderResult.container.querySelector(".exc-stats");
    };
    static queryStatsProperty = (label) => {
        const elementStats = UI.queryStats()?.querySelector("#elementStats");
        expect(elementStats).not.toBeNull();
        if (elementStats) {
            return (elementStats?.querySelector(`.exc-stats__row .drag-input-container[data-testid="${label}"]`) || null);
        }
        return null;
    };
}
exports.UI = UI;
