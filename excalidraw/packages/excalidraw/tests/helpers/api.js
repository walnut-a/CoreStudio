"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.API = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const common_2 = require("@excalidraw/common");
const blob_1 = require("../../data/blob");
const App_1 = require("../../components/App");
const appState_1 = require("../../appState");
const test_utils_1 = require("../test-utils");
const readFile = util_1.default.promisify(fs_1.default.readFile);
// so that window.h is available when App.tsx is not imported as well.
(0, App_1.createTestHook)();
const { h } = window;
class API {
    static updateScene = (...args) => {
        (0, test_utils_1.act)(() => {
            h.app.updateScene(...args);
        });
    };
    static setAppState = (state, cb) => {
        (0, test_utils_1.act)(() => {
            h.setState(state, cb);
        });
    };
    static setElements = (elements) => {
        (0, test_utils_1.act)(() => {
            h.elements = elements;
        });
    };
    static setSelectedElements = (elements, editingGroupId) => {
        (0, test_utils_1.act)(() => {
            h.setState({
                ...(0, element_4.selectGroupsForSelectedElements)({
                    editingGroupId: editingGroupId ?? null,
                    selectedElementIds: elements.reduce((acc, element) => {
                        acc[element.id] = true;
                        return acc;
                    }, {}),
                }, elements, h.state, h.app)
            });
        });
    };
    // eslint-disable-next-line prettier/prettier
    static updateElement = (...args) => {
        (0, test_utils_1.act)(() => {
            h.app.scene.mutateElement(...args);
        });
    };
    static getSelectedElements = (includeBoundTextElement = false, includeElementsInFrames = false) => {
        return (0, element_3.getSelectedElements)(h.elements, h.state, {
            includeBoundTextElement,
            includeElementsInFrames,
        });
    };
    static getSelectedElement = () => {
        const selectedElements = API.getSelectedElements();
        if (selectedElements.length !== 1) {
            throw new Error(`expected 1 selected element; got ${selectedElements.length}`);
        }
        return selectedElements[0];
    };
    static getUndoStack = () => {
        // @ts-ignore
        return h.history.undoStack;
    };
    static getRedoStack = () => {
        // @ts-ignore
        return h.history.redoStack;
    };
    static getSnapshot = () => {
        return Array.from(h.store.snapshot.elements.values());
    };
    static clearSelection = () => {
        (0, test_utils_1.act)(() => {
            // @ts-ignore
            h.app.clearSelection(null);
        });
        expect(API.getSelectedElements().length).toBe(0);
    };
    static getElement = (element) => {
        return h.app.scene.getElementsMapIncludingDeleted().get(element.id) || element;
    };
    static createElement = ({ 
    // @ts-ignore
    type = "rectangle", id, x = 0, y = x, width = 100, height = width, isDeleted = false, groupIds = [], ...rest }) => {
        let element = null;
        const appState = h?.state || (0, appState_1.getDefaultAppState)();
        const base = {
            seed: 1,
            x,
            y,
            width,
            height,
            frameId: rest.frameId ?? null,
            index: rest.index ?? null,
            angle: (rest.angle ?? 0),
            strokeColor: rest.strokeColor ?? appState.currentItemStrokeColor,
            backgroundColor: rest.backgroundColor ?? appState.currentItemBackgroundColor,
            fillStyle: rest.fillStyle ?? appState.currentItemFillStyle,
            strokeWidth: rest.strokeWidth ?? appState.currentItemStrokeWidth,
            strokeStyle: rest.strokeStyle ?? appState.currentItemStrokeStyle,
            roundness: (rest.roundness === undefined
                ? appState.currentItemRoundness === "round"
                : rest.roundness)
                ? {
                    type: (0, element_2.isLinearElementType)(type)
                        ? common_1.ROUNDNESS.PROPORTIONAL_RADIUS
                        : common_1.ROUNDNESS.ADAPTIVE_RADIUS,
                }
                : null,
            roughness: rest.roughness ?? appState.currentItemRoughness,
            opacity: rest.opacity ?? appState.currentItemOpacity,
            boundElements: rest.boundElements ?? null,
            locked: rest.locked ?? false,
        };
        switch (type) {
            case "rectangle":
            case "diamond":
            case "ellipse":
                element = (0, element_1.newElement)({
                    type: type,
                    ...base,
                });
                break;
            case "embeddable":
                element = (0, element_1.newEmbeddableElement)({
                    type: "embeddable",
                    ...base,
                });
                break;
            case "iframe":
                element = (0, element_1.newIframeElement)({
                    type: "iframe",
                    ...base,
                });
                break;
            case "text":
                const fontSize = rest.fontSize ?? appState.currentItemFontSize;
                const fontFamily = rest.fontFamily ?? appState.currentItemFontFamily;
                element = (0, element_1.newTextElement)({
                    ...base,
                    text: rest.text || "test",
                    fontSize,
                    fontFamily,
                    textAlign: rest.textAlign ?? appState.currentItemTextAlign,
                    verticalAlign: rest.verticalAlign ?? common_1.DEFAULT_VERTICAL_ALIGN,
                    containerId: rest.containerId ?? undefined,
                });
                element.width = width;
                element.height = height;
                break;
            case "freedraw":
                element = (0, element_1.newFreeDrawElement)({
                    type: type,
                    simulatePressure: true,
                    points: rest.points,
                    ...base,
                });
                break;
            case "arrow":
                element = (0, element_1.newArrowElement)({
                    ...base,
                    width,
                    height,
                    type,
                    points: rest.points ?? [
                        (0, math_1.pointFrom)(0, 0),
                        (0, math_1.pointFrom)(100, 100),
                    ],
                    elbowed: rest.elbowed ?? false,
                });
                break;
            case "line":
                element = (0, element_1.newLinearElement)({
                    ...base,
                    width,
                    height,
                    type,
                    points: rest.points ?? [
                        (0, math_1.pointFrom)(0, 0),
                        (0, math_1.pointFrom)(100, 100),
                    ],
                });
                break;
            case "image":
                element = (0, element_1.newImageElement)({
                    ...base,
                    width,
                    height,
                    type,
                    fileId: rest.fileId ?? null,
                    status: rest.status || "saved",
                    scale: rest.scale || [1, 1],
                });
                break;
            case "frame":
                element = (0, element_1.newFrameElement)({ ...base, width, height });
                break;
            case "magicframe":
                element = (0, element_1.newMagicFrameElement)({ ...base, width, height });
                break;
            default:
                (0, common_1.assertNever)(type, `API.createElement: unimplemented element type ${type}}`);
                break;
        }
        if (element.type === "arrow") {
            element.startBinding = rest.startBinding ?? null;
            element.endBinding = rest.endBinding ?? null;
            element.startArrowhead = rest.startArrowhead ?? null;
            element.endArrowhead = rest.endArrowhead ?? null;
        }
        if (id) {
            element.id = id;
        }
        if (isDeleted) {
            element.isDeleted = isDeleted;
        }
        if (groupIds) {
            element.groupIds = groupIds;
        }
        return element;
    };
    static createTextContainer = (opts) => {
        const rectangle = API.createElement({
            type: "rectangle",
            frameId: opts?.frameId || null,
            groupIds: opts?.groupIds,
        });
        const text = API.createElement({
            type: "text",
            text: opts?.label?.text || "sample-text",
            width: 50,
            height: 20,
            fontSize: common_2.FONT_SIZES.sm,
            containerId: rectangle.id,
            frameId: opts?.label?.frameId === undefined
                ? opts?.frameId ?? null
                : opts?.label?.frameId ?? null,
            groupIds: opts?.label?.groupIds === undefined
                ? opts?.groupIds
                : opts?.label?.groupIds,
        });
        h.app.scene.mutateElement(rectangle, {
            boundElements: [{ type: "text", id: text.id }],
        });
        return [rectangle, text];
    };
    static createLabeledArrow = (opts) => {
        const arrow = API.createElement({
            type: "arrow",
            frameId: opts?.frameId || null,
        });
        const text = API.createElement({
            type: "text",
            width: 50,
            height: 20,
            containerId: arrow.id,
            frameId: opts?.label?.frameId === undefined
                ? opts?.frameId ?? null
                : opts?.label?.frameId ?? null,
        });
        h.app.scene.mutateElement(arrow, {
            boundElements: [{ type: "text", id: text.id }],
        });
        return [arrow, text];
    };
    static readFile = async (filepath, encoding) => {
        filepath = path_1.default.isAbsolute(filepath)
            ? filepath
            : path_1.default.resolve(path_1.default.join(__dirname, "../", filepath));
        return readFile(filepath, { encoding });
    };
    static loadFile = async (filepath) => {
        const { base, ext } = path_1.default.parse(filepath);
        return new File([await API.readFile(filepath, null)], base, {
            type: (0, blob_1.getMimeType)(ext),
        });
    };
    static drop = async (items) => {
        const fileDropEvent = test_utils_1.createEvent.drop(test_utils_1.GlobalTestState.interactiveCanvas);
        const dataTransferFileItems = items.filter(i => i.kind === "file");
        const files = dataTransferFileItems.map(item => item.file);
        // https://developer.mozilla.org/en-US/docs/Web/API/FileList/item
        files.item = (index) => files[index];
        Object.defineProperty(fileDropEvent, "dataTransfer", {
            value: {
                // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/files
                files,
                // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/items
                items: items.map((item, idx) => {
                    if (item.kind === "string") {
                        return {
                            kind: "string",
                            type: item.type,
                            // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsString
                            getAsString: (cb) => cb(item.value),
                        };
                    }
                    return {
                        kind: "file",
                        type: item.type || item.file.type,
                        // https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/getAsFile
                        getAsFile: () => item.file,
                    };
                }),
                // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/getData
                getData: (type) => {
                    return items.find((item) => item.type === "string" && item.type === type) || "";
                },
                // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer/types
                types: Array.from(new Set(items.map((item) => item.kind === "file" ? "Files" : item.type))),
            },
        });
        Object.defineProperty(fileDropEvent, "clientX", {
            value: 0,
        });
        Object.defineProperty(fileDropEvent, "clientY", {
            value: 0,
        });
        await (0, test_utils_1.fireEvent)(test_utils_1.GlobalTestState.interactiveCanvas, fileDropEvent);
    };
    static executeAction = (action) => {
        (0, test_utils_1.act)(() => {
            h.app.actionManager.executeAction(action);
        });
    };
}
exports.API = API;
