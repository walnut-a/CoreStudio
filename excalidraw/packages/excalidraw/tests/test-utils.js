"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripIgnoredNodesFromErrorMessage = exports.trimErrorStack = exports.checkpointHistory = exports.assertElements = exports.getCloneByOrigId = exports.togglePopover = exports.toggleMenu = exports.assertSelectedElements = exports.restoreOriginalGetBoundingClientRect = exports.withExcalidrawDimensions = exports.mockBoundingClientRect = exports.GlobalTestState = exports.render = exports.unmountComponent = void 0;
require("pepjs");
const react_1 = require("@testing-library/react");
const react_2 = require("@testing-library/react");
Object.defineProperty(exports, "unmountComponent", { enumerable: true, get: function () { return react_2.cleanup; } });
const ansicolor_1 = __importDefault(require("ansicolor"));
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const app_constants_1 = require("../../../excalidraw-app/app_constants");
const ui_1 = require("./helpers/ui");
const toolQueries = __importStar(require("./queries/toolQueries"));
const customQueries = {
    ...react_2.queries,
    ...toolQueries,
};
const renderApp = async (ui, options) => {
    // when tests reuse Pointer instances let's reset the last
    // pointer poisitions so there's no leak between tests
    ui_1.Pointer.resetAll();
    if (options?.localStorageData) {
        initLocalStorage(options.localStorageData);
        delete options.localStorageData;
    }
    const renderResult = (0, react_2.render)(ui, {
        queries: customQueries,
        ...options,
    });
    GlobalTestState.renderResult = renderResult;
    Object.defineProperty(GlobalTestState, "canvas", {
        // must be a getter because at the time of ExcalidrawApp render the
        // child App component isn't likely mounted yet (and thus canvas not
        // present in DOM)
        get() {
            return renderResult.container.querySelector("canvas.static");
        },
    });
    Object.defineProperty(GlobalTestState, "interactiveCanvas", {
        // must be a getter because at the time of ExcalidrawApp render the
        // child App component isn't likely mounted yet (and thus canvas not
        // present in DOM)
        get() {
            return renderResult.container.querySelector("canvas.interactive");
        },
    });
    await (0, react_2.waitFor)(() => {
        const canvas = renderResult.container.querySelector("canvas.static");
        if (!canvas) {
            throw new Error("not initialized yet");
        }
        const interactiveCanvas = renderResult.container.querySelector("canvas.interactive");
        if (!interactiveCanvas) {
            throw new Error("not initialized yet");
        }
        // hack-awaiting app.initialScene() which solves some test race conditions
        // (later we may switch this with proper event listener)
        if (window.h.state.isLoading) {
            throw new Error("still loading");
        }
    });
    return renderResult;
};
exports.render = renderApp;
// re-export everything
__exportStar(require("@testing-library/react"), exports);
/**
 * For state-sharing across test helpers.
 * NOTE: there shouldn't be concurrency issues as each test is running in its
 *  own process and thus gets its own instance of this module when running
 *  tests in parallel.
 */
class GlobalTestState {
    /**
     * automatically updated on each call to render()
     */
    static renderResult = null;
    /**
     * retrieves static canvas for currently rendered app instance
     */
    static get canvas() {
        return null;
    }
    /**
     * retrieves interactive canvas for currently rendered app instance
     */
    static get interactiveCanvas() {
        return null;
    }
}
exports.GlobalTestState = GlobalTestState;
const initLocalStorage = (data) => {
    if (data.elements) {
        localStorage.setItem(app_constants_1.STORAGE_KEYS.LOCAL_STORAGE_ELEMENTS, JSON.stringify(data.elements));
    }
    if (data.appState) {
        localStorage.setItem(app_constants_1.STORAGE_KEYS.LOCAL_STORAGE_APP_STATE, JSON.stringify(data.appState));
    }
};
const originalGetBoundingClientRect = global.window.HTMLDivElement.prototype.getBoundingClientRect;
const mockBoundingClientRect = ({ top = 0, left = 0, bottom = 0, right = 0, width = 1920, height = 1080, x = 0, y = 0, toJSON = () => { }, } = {
    top: 10,
    left: 20,
    bottom: 10,
    right: 10,
    width: 200,
    x: 10,
    y: 20,
    height: 100,
}) => {
    // override getBoundingClientRect as by default it will always return all values as 0 even if customized in html
    global.window.HTMLDivElement.prototype.getBoundingClientRect = () => ({
        top,
        left,
        bottom,
        right,
        width,
        height,
        x,
        y,
        toJSON,
    });
};
exports.mockBoundingClientRect = mockBoundingClientRect;
const withExcalidrawDimensions = async (dimensions, cb) => {
    const { h } = window;
    (0, exports.mockBoundingClientRect)(dimensions);
    (0, react_1.act)(() => {
        h.app.refreshEditorInterface();
        h.app.refresh();
    });
    await cb();
    (0, exports.restoreOriginalGetBoundingClientRect)();
    (0, react_1.act)(() => {
        h.app.refreshEditorInterface();
        h.app.refresh();
    });
};
exports.withExcalidrawDimensions = withExcalidrawDimensions;
const restoreOriginalGetBoundingClientRect = () => {
    global.window.HTMLDivElement.prototype.getBoundingClientRect =
        originalGetBoundingClientRect;
};
exports.restoreOriginalGetBoundingClientRect = restoreOriginalGetBoundingClientRect;
const assertSelectedElements = (...elements) => {
    const { h } = window;
    const selectedElementIds = (0, element_1.getSelectedElements)(h.app.getSceneElements(), h.state).map((el) => el.id);
    const ids = elements
        .flat()
        .map((item) => (typeof item === "string" ? item : item.id));
    expect(selectedElementIds.length).toBe(ids.length);
    expect(selectedElementIds).toEqual(expect.arrayContaining(ids));
};
exports.assertSelectedElements = assertSelectedElements;
const toggleMenu = (container) => {
    // open menu
    react_2.fireEvent.click(container.querySelector(".dropdown-menu-button"));
};
exports.toggleMenu = toggleMenu;
const togglePopover = (label) => {
    // Needed for radix-ui/react-popover as tests fail due to resize observer not being present
    global.ResizeObserver = class ResizeObserver {
        constructor(cb) {
            this.cb = cb;
        }
        observe() { }
        unobserve() { }
        disconnect() { }
    };
    ui_1.UI.clickLabeledElement(label);
};
exports.togglePopover = togglePopover;
expect.extend({
    toBeNonNaNNumber(received) {
        const pass = typeof received === "number" && !isNaN(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a non-NaN number`,
                pass: true,
            };
        }
        return {
            message: () => `expected ${received} to be a non-NaN number`,
            pass: false,
        };
    },
});
/**
 * Serializer for IEE754 float pointing numbers to avoid random failures due to tiny precision differences
 */
expect.addSnapshotSerializer({
    serialize(val, config, indentation, depth, refs, printer) {
        return printer(val.toFixed(5), config, indentation, depth, refs);
    },
    test(val) {
        return (typeof val === "number" &&
            Number.isFinite(val) &&
            !Number.isNaN(val) &&
            !Number.isInteger(val));
    },
});
const getCloneByOrigId = (origId, returnNullIfNotExists = false) => {
    const clonedElement = window.h.elements?.find((el) => el[common_1.ORIG_ID] === origId);
    if (clonedElement) {
        return clonedElement;
    }
    if (returnNullIfNotExists !== true) {
        throw new Error(`cloned element not found for origId: ${origId}`);
    }
    return null;
};
exports.getCloneByOrigId = getCloneByOrigId;
/**
 * Assertion helper that strips the actual elements of extra attributes
 * so that diffs are easier to read in case of failure.
 *
 * Asserts element order as well, and selected element ids
 * (when `selected: true` set for given element).
 *
 * If testing cloned elements, you can use { `[ORIG_ID]: origElement.id }
 * If you need to refer to cloned element properties, you can use
 * `getCloneByOrigId()`, e.g.: `{ frameId: getCloneByOrigId(origFrame.id)?.id }`
 */
const assertElements = (actualElements, 
/** array order matters */
expectedElements) => {
    const h = window.h;
    const expectedElementsWithIds = expectedElements.map((el) => {
        if ("id" in el) {
            return el;
        }
        const actualElement = actualElements.find((act) => act[common_1.ORIG_ID] === el[common_1.ORIG_ID]);
        if (actualElement) {
            return { ...el, id: actualElement.id };
        }
        return {
            ...el,
            id: "UNKNOWN_ID",
        };
    });
    const map_expectedElements = (0, common_1.arrayToMap)(expectedElementsWithIds);
    const selectedElementIds = expectedElementsWithIds.reduce((acc, el) => {
        if (el.selected) {
            acc[el.id] = true;
        }
        return acc;
    }, {});
    const mappedActualElements = actualElements.map((el) => {
        const expectedElement = map_expectedElements.get(el.id);
        if (expectedElement) {
            const pickedAttrs = {};
            for (const key of Object.keys(expectedElement)) {
                if (key === "selected") {
                    delete expectedElement.selected;
                    continue;
                }
                pickedAttrs[key] = el[key];
            }
            if (common_1.ORIG_ID in expectedElement) {
                // @ts-ignore
                pickedAttrs[common_1.ORIG_ID] = el[common_1.ORIG_ID];
            }
            return pickedAttrs;
        }
        return el;
    });
    try {
        // testing order separately for even easier diffs
        expect(actualElements.map((x) => x.id)).toEqual(expectedElementsWithIds.map((x) => x.id));
    }
    catch (err) {
        let errStr = "\n\nmismatched element order\n\n";
        errStr += `actual:   ${ansicolor_1.default.lightGray(`[${err.actual
            .map((id, index) => {
            const act = actualElements[index];
            return `${id === err.expected[index] ? ansicolor_1.default.green(id) : ansicolor_1.default.red(id)} (${act.type.slice(0, 4)}${common_1.ORIG_ID in act ? ` ↳ ${act[common_1.ORIG_ID]}` : ""})`;
        })
            .join(", ")}]`)}\n${ansicolor_1.default.lightGray(`expected: [${err.expected
            .map((exp, index) => {
            const expEl = actualElements.find((el) => el.id === exp);
            const origEl = expEl &&
                actualElements.find((el) => el.id === expEl[common_1.ORIG_ID]);
            return expEl
                ? `${exp === err.actual[index]
                    ? ansicolor_1.default.green(expEl.id)
                    : ansicolor_1.default.red(expEl.id)} (${expEl.type.slice(0, 4)}${origEl ? ` ↳ ${origEl.id}` : ""})`
                : exp;
        })
            .join(", ")}]\n`)}`;
        throw (0, exports.trimErrorStack)(new Error(errStr), 1);
    }
    expect(mappedActualElements).toEqual(expect.arrayContaining(expectedElementsWithIds));
    expect(h.state.selectedElementIds).toEqual(selectedElementIds);
};
exports.assertElements = assertElements;
const stripProps = (deltas, props) => Object.entries(deltas).reduce((acc, curr) => {
    const { inserted, deleted, ...rest } = curr[1];
    for (const prop of props) {
        delete inserted[prop];
        delete deleted[prop];
    }
    acc[curr[0]] = {
        inserted,
        deleted,
        ...rest,
    };
    return acc;
}, {});
const checkpointHistory = (history, name) => {
    expect(history.undoStack.map((x) => ({
        ...x,
        elements: {
            ...x.elements,
            added: stripProps(x.elements.added, ["seed", "versionNonce"]),
            removed: stripProps(x.elements.removed, ["seed", "versionNonce"]),
            updated: stripProps(x.elements.updated, ["seed", "versionNonce"]),
        },
    }))).toMatchSnapshot(`[${name}] undo stack`);
    expect(history.redoStack.map((x) => ({
        ...x,
        elements: {
            ...x.elements,
            added: stripProps(x.elements.added, ["seed", "versionNonce"]),
            removed: stripProps(x.elements.removed, ["seed", "versionNonce"]),
            updated: stripProps(x.elements.updated, ["seed", "versionNonce"]),
        },
    }))).toMatchSnapshot(`[${name}] redo stack`);
};
exports.checkpointHistory = checkpointHistory;
/**
 * removes one or more leading stack trace lines (leading to files) from the
 * error stack trace
 */
const trimErrorStack = (error, range = 1) => {
    const stack = error.stack?.split("\n");
    if (stack) {
        stack.splice(1, range);
        error.stack = stack.join("\n");
    }
    return error;
};
exports.trimErrorStack = trimErrorStack;
const stripIgnoredNodesFromErrorMessage = (error) => {
    error.message = error.message.replace(/\s+Ignored nodes:[\s\S]+/, "");
    return error;
};
exports.stripIgnoredNodesFromErrorMessage = stripIgnoredNodesFromErrorMessage;
