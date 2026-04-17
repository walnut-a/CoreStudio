"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProdEnv = exports.isDevEnv = exports.isTestEnv = exports.toArray = exports.toIterable = exports.arrayToList = exports.arrayToObject = exports.arrayToMapWithIndex = exports.arrayToMap = exports.getUpdatedTimestamp = exports.bytesToHexString = exports.preventUnload = exports.focusNearestParent = exports.getNearestScrollableContainer = exports.supportsEmoji = exports.getVersion = exports.nFormatter = exports.resolvablePromise = exports.mapFind = exports.findLastIndex = exports.findIndex = exports.muteFSAbortError = exports.tupleToCoors = exports.isRTL = exports.getGlobalCSSVariable = exports.sceneCoordsToViewportCoords = exports.viewportCoordsToSceneCoords = exports.exitFullScreen = exports.allowFullScreen = exports.isFullScreen = exports.updateActiveTool = exports.isSelectionLikeTool = exports.distance = exports.removeSelection = exports.selectNode = exports.chunk = exports.easeToValuesRAF = exports.easeOut = exports.throttleRAF = exports.debounce = exports.nextAnimationFrame = exports.getFontString = exports.getFontFamilyString = exports.isWritableElement = exports.isInteractive = exports.isInputLike = exports.isToolIcon = exports.capitalizeString = exports.getDateTime = exports.setDateTimeForTests = void 0;
exports.oneOf = exports.setFeatureFlag = exports.getFeatureFlag = exports.reduceToCommonValue = exports.sizeOf = exports.isReadonlyArray = exports.castArray = exports.escapeDoubleQuotes = exports.safelyParseJSON = exports.isAnyTrue = exports.promiseTry = exports.normalizeEOL = exports.updateStable = exports.cloneJSON = exports.isMemberOf = exports.memoize = exports.assertNever = exports.composeEventHandlers = exports.isShallowEqual = exports.queryFocusableElements = exports.isPromiseLike = exports.isRunningInIframe = exports.getFrame = exports.isPrimitive = exports.updateObject = exports.wrapEvent = exports.isServerEnv = void 0;
exports.invariant = invariant;
exports.addEventListener = addEventListener;
exports.getSvgPathFromStroke = getSvgPathFromStroke;
exports.toBrandedType = toBrandedType;
const math_1 = require("@excalidraw/math");
const constants_1 = require("./constants");
let mockDateTime = null;
const setDateTimeForTests = (dateTime) => {
    mockDateTime = dateTime;
};
exports.setDateTimeForTests = setDateTimeForTests;
const getDateTime = () => {
    if (mockDateTime) {
        return mockDateTime;
    }
    const date = new Date();
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hr = `${date.getHours()}`.padStart(2, "0");
    const min = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day}-${hr}${min}`;
};
exports.getDateTime = getDateTime;
const capitalizeString = (str) => str.charAt(0).toUpperCase() + str.slice(1);
exports.capitalizeString = capitalizeString;
const isToolIcon = (target) => target instanceof HTMLElement && target.className.includes("ToolIcon");
exports.isToolIcon = isToolIcon;
const isInputLike = (target) => (target instanceof HTMLElement && target.dataset.type === "wysiwyg") ||
    target instanceof HTMLBRElement || // newline in wysiwyg
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;
exports.isInputLike = isInputLike;
const isInteractive = (target) => {
    return ((0, exports.isInputLike)(target) ||
        (target instanceof Element && !!target.closest("label, button")));
};
exports.isInteractive = isInteractive;
const isWritableElement = (target) => (target instanceof HTMLElement && target.dataset.type === "wysiwyg") ||
    target instanceof HTMLBRElement || // newline in wysiwyg
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLInputElement &&
        (target.type === "text" ||
            target.type === "number" ||
            target.type === "password" ||
            target.type === "search")) ||
    (target instanceof HTMLElement && target.closest(".cm-editor") !== null);
exports.isWritableElement = isWritableElement;
const getFontFamilyString = ({ fontFamily, }) => {
    for (const [fontFamilyString, id] of Object.entries(constants_1.FONT_FAMILY)) {
        if (id === fontFamily) {
            return `${fontFamilyString}${(0, constants_1.getFontFamilyFallbacks)(id)
                .map((x) => `, ${x}`)
                .join("")}`;
        }
    }
    return constants_1.WINDOWS_EMOJI_FALLBACK_FONT;
};
exports.getFontFamilyString = getFontFamilyString;
/** returns fontSize+fontFamily string for assignment to DOM elements */
const getFontString = ({ fontSize, fontFamily, }) => {
    return `${fontSize}px ${(0, exports.getFontFamilyString)({ fontFamily })}`;
};
exports.getFontString = getFontString;
/** executes callback in the frame that's after the current one */
const nextAnimationFrame = async (cb) => {
    requestAnimationFrame(() => requestAnimationFrame(cb));
};
exports.nextAnimationFrame = nextAnimationFrame;
const debounce = (fn, timeout) => {
    let handle = 0;
    let lastArgs = null;
    const ret = (...args) => {
        lastArgs = args;
        clearTimeout(handle);
        handle = window.setTimeout(() => {
            lastArgs = null;
            fn(...args);
        }, timeout);
    };
    ret.flush = () => {
        clearTimeout(handle);
        if (lastArgs) {
            const _lastArgs = lastArgs;
            lastArgs = null;
            fn(..._lastArgs);
        }
    };
    ret.cancel = () => {
        lastArgs = null;
        clearTimeout(handle);
    };
    return ret;
};
exports.debounce = debounce;
// throttle callback to execute once per animation frame using the latest args
const throttleRAF = (fn) => {
    let timerId = null;
    let lastArgs = null;
    const scheduleFunc = () => {
        timerId = window.requestAnimationFrame(() => {
            timerId = null;
            const args = lastArgs;
            lastArgs = null;
            if (args) {
                fn(...args);
            }
        });
    };
    const ret = (...args) => {
        lastArgs = args;
        if (timerId === null) {
            scheduleFunc();
        }
    };
    ret.flush = () => {
        if (timerId !== null) {
            cancelAnimationFrame(timerId);
            timerId = null;
        }
        if (lastArgs) {
            fn(...lastArgs);
            lastArgs = null;
        }
    };
    ret.cancel = () => {
        lastArgs = null;
        if (timerId !== null) {
            cancelAnimationFrame(timerId);
            timerId = null;
        }
    };
    return ret;
};
exports.throttleRAF = throttleRAF;
/**
 * Exponential ease-out method
 *
 * @param {number} k - The value to be tweened.
 * @returns {number} The tweened value.
 */
const easeOut = (k) => {
    return 1 - Math.pow(1 - k, 4);
};
exports.easeOut = easeOut;
const easeOutInterpolate = (from, to, progress) => {
    return (to - from) * (0, exports.easeOut)(progress) + from;
};
/**
 * Animates values from `fromValues` to `toValues` using the requestAnimationFrame API.
 * Executes the `onStep` callback on each step with the interpolated values.
 * Returns a function that can be called to cancel the animation.
 *
 * @example
 * // Example usage:
 * const fromValues = { x: 0, y: 0 };
 * const toValues = { x: 100, y: 200 };
 * const onStep = ({x, y}) => {
 *   setState(x, y)
 * };
 * const onCancel = () => {
 *   console.log("Animation canceled");
 * };
 *
 * const cancelAnimation = easeToValuesRAF({
 *   fromValues,
 *   toValues,
 *   onStep,
 *   onCancel,
 * });
 *
 * // To cancel the animation:
 * cancelAnimation();
 */
const easeToValuesRAF = ({ fromValues, toValues, onStep, duration = 250, interpolateValue, onStart, onEnd, onCancel, }) => {
    let canceled = false;
    let frameId = 0;
    let startTime;
    function step(timestamp) {
        if (canceled) {
            return;
        }
        if (startTime === undefined) {
            startTime = timestamp;
            onStart?.();
        }
        const elapsed = Math.min(timestamp - startTime, duration);
        const factor = (0, exports.easeOut)(elapsed / duration);
        const newValues = {};
        Object.keys(fromValues).forEach((key) => {
            const _key = key;
            const result = ((toValues[_key] - fromValues[_key]) * factor +
                fromValues[_key]);
            newValues[_key] = result;
        });
        onStep(newValues);
        if (elapsed < duration) {
            const progress = elapsed / duration;
            const newValues = {};
            Object.keys(fromValues).forEach((key) => {
                const _key = key;
                const startValue = fromValues[_key];
                const endValue = toValues[_key];
                let result;
                result = interpolateValue
                    ? interpolateValue(startValue, endValue, progress, _key)
                    : easeOutInterpolate(startValue, endValue, progress);
                if (result == null) {
                    result = easeOutInterpolate(startValue, endValue, progress);
                }
                newValues[_key] = result;
            });
            onStep(newValues);
            frameId = window.requestAnimationFrame(step);
        }
        else {
            onStep(toValues);
            onEnd?.();
        }
    }
    frameId = window.requestAnimationFrame(step);
    return () => {
        onCancel?.();
        canceled = true;
        window.cancelAnimationFrame(frameId);
    };
};
exports.easeToValuesRAF = easeToValuesRAF;
// https://github.com/lodash/lodash/blob/es/chunk.js
const chunk = (array, size) => {
    if (!array.length || size < 1) {
        return [];
    }
    let index = 0;
    let resIndex = 0;
    const result = Array(Math.ceil(array.length / size));
    while (index < array.length) {
        result[resIndex++] = array.slice(index, (index += size));
    }
    return result;
};
exports.chunk = chunk;
const selectNode = (node) => {
    const selection = window.getSelection();
    if (selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
    }
};
exports.selectNode = selectNode;
const removeSelection = () => {
    const selection = window.getSelection();
    if (selection) {
        selection.removeAllRanges();
    }
};
exports.removeSelection = removeSelection;
const distance = (x, y) => Math.abs(x - y);
exports.distance = distance;
const isSelectionLikeTool = (type) => {
    return type === "selection" || type === "lasso";
};
exports.isSelectionLikeTool = isSelectionLikeTool;
const updateActiveTool = (appState, data) => {
    if (data.type === "custom") {
        return {
            ...appState.activeTool,
            type: "custom",
            customType: data.customType,
            locked: data.locked ?? appState.activeTool.locked,
        };
    }
    return {
        ...appState.activeTool,
        lastActiveTool: data.lastActiveToolBeforeEraser === undefined
            ? appState.activeTool.lastActiveTool
            : data.lastActiveToolBeforeEraser,
        type: data.type,
        customType: null,
        locked: data.locked ?? appState.activeTool.locked,
        fromSelection: data.fromSelection ?? false,
    };
};
exports.updateActiveTool = updateActiveTool;
const isFullScreen = () => document.fullscreenElement?.nodeName === "HTML";
exports.isFullScreen = isFullScreen;
const allowFullScreen = () => document.documentElement.requestFullscreen();
exports.allowFullScreen = allowFullScreen;
const exitFullScreen = () => document.exitFullscreen();
exports.exitFullScreen = exitFullScreen;
const viewportCoordsToSceneCoords = ({ clientX, clientY }, { zoom, offsetLeft, offsetTop, scrollX, scrollY, }) => {
    const x = (clientX - offsetLeft) / zoom.value - scrollX;
    const y = (clientY - offsetTop) / zoom.value - scrollY;
    return { x, y };
};
exports.viewportCoordsToSceneCoords = viewportCoordsToSceneCoords;
const sceneCoordsToViewportCoords = ({ sceneX, sceneY }, { zoom, offsetLeft, offsetTop, scrollX, scrollY, }) => {
    const x = (sceneX + scrollX) * zoom.value + offsetLeft;
    const y = (sceneY + scrollY) * zoom.value + offsetTop;
    return { x, y };
};
exports.sceneCoordsToViewportCoords = sceneCoordsToViewportCoords;
const getGlobalCSSVariable = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
exports.getGlobalCSSVariable = getGlobalCSSVariable;
const RS_LTR_CHARS = "A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF" +
    "\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF";
const RS_RTL_CHARS = "\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC";
const RE_RTL_CHECK = new RegExp(`^[^${RS_LTR_CHARS}]*[${RS_RTL_CHARS}]`);
/**
 * Checks whether first directional character is RTL. Meaning whether it starts
 *  with RTL characters, or indeterminate (numbers etc.) characters followed by
 *  RTL.
 * See https://github.com/excalidraw/excalidraw/pull/1722#discussion_r436340171
 */
const isRTL = (text) => RE_RTL_CHECK.test(text);
exports.isRTL = isRTL;
const tupleToCoors = (xyTuple) => {
    const [x, y] = xyTuple;
    return { x, y };
};
exports.tupleToCoors = tupleToCoors;
/** use as a rejectionHandler to mute filesystem Abort errors */
const muteFSAbortError = (error) => {
    if (error?.name === "AbortError") {
        console.warn(error);
        return;
    }
    throw error;
};
exports.muteFSAbortError = muteFSAbortError;
const findIndex = (array, cb, fromIndex = 0) => {
    if (fromIndex < 0) {
        fromIndex = array.length + fromIndex;
    }
    fromIndex = Math.min(array.length, Math.max(fromIndex, 0));
    let index = fromIndex - 1;
    while (++index < array.length) {
        if (cb(array[index], index, array)) {
            return index;
        }
    }
    return -1;
};
exports.findIndex = findIndex;
const findLastIndex = (array, cb, fromIndex = array.length - 1) => {
    if (fromIndex < 0) {
        fromIndex = array.length + fromIndex;
    }
    fromIndex = Math.min(array.length - 1, Math.max(fromIndex, 0));
    let index = fromIndex + 1;
    while (--index > -1) {
        if (cb(array[index], index, array)) {
            return index;
        }
    }
    return -1;
};
exports.findLastIndex = findLastIndex;
/** returns the first non-null mapped value */
const mapFind = (collection, iteratee) => {
    for (let idx = 0; idx < collection.length; idx++) {
        const result = iteratee(collection[idx], idx);
        if (result != null) {
            return result;
        }
    }
    return undefined;
};
exports.mapFind = mapFind;
const resolvablePromise = () => {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    promise.resolve = resolve;
    promise.reject = reject;
    return promise;
};
exports.resolvablePromise = resolvablePromise;
//https://stackoverflow.com/a/9462382/8418
const nFormatter = (num, digits) => {
    const si = [
        { value: 1, symbol: "b" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    let index;
    for (index = si.length - 1; index > 0; index--) {
        if (num >= si[index].value) {
            break;
        }
    }
    return ((num / si[index].value).toFixed(digits).replace(rx, "$1") + si[index].symbol);
};
exports.nFormatter = nFormatter;
const getVersion = () => {
    return (document.querySelector('meta[name="version"]')?.content ||
        constants_1.DEFAULT_VERSION);
};
exports.getVersion = getVersion;
// Adapted from https://github.com/Modernizr/Modernizr/blob/master/feature-detects/emoji.js
const supportsEmoji = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return false;
    }
    const offset = 12;
    ctx.fillStyle = "#f00";
    ctx.textBaseline = "top";
    ctx.font = "32px Arial";
    // Modernizr used 🐨, but it is sort of supported on Windows 7.
    // Luckily 😀 isn't supported.
    ctx.fillText("😀", 0, 0);
    return ctx.getImageData(offset, offset, 1, 1).data[0] !== 0;
};
exports.supportsEmoji = supportsEmoji;
const getNearestScrollableContainer = (element) => {
    let parent = element.parentElement;
    while (parent) {
        if (parent === document.body) {
            return document;
        }
        const { overflowY } = window.getComputedStyle(parent);
        const hasScrollableContent = parent.scrollHeight > parent.clientHeight;
        if (hasScrollableContent &&
            (overflowY === "auto" ||
                overflowY === "scroll" ||
                overflowY === "overlay")) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return document;
};
exports.getNearestScrollableContainer = getNearestScrollableContainer;
const focusNearestParent = (element) => {
    let parent = element.parentElement;
    while (parent) {
        if (parent.tabIndex > -1) {
            parent.focus();
            return;
        }
        parent = parent.parentElement;
    }
};
exports.focusNearestParent = focusNearestParent;
const preventUnload = (event) => {
    event.preventDefault();
    // NOTE: modern browsers no longer allow showing a custom message here
    event.returnValue = "";
};
exports.preventUnload = preventUnload;
const bytesToHexString = (bytes) => {
    return Array.from(bytes)
        .map((byte) => `0${byte.toString(16)}`.slice(-2))
        .join("");
};
exports.bytesToHexString = bytesToHexString;
const getUpdatedTimestamp = () => ((0, exports.isTestEnv)() ? 1 : Date.now());
exports.getUpdatedTimestamp = getUpdatedTimestamp;
/**
 * Transforms array of objects containing `id` attribute,
 * or array of ids (strings), into a Map, keyd by `id`.
 */
const arrayToMap = (items) => {
    if (items instanceof Map) {
        return items;
    }
    return items.reduce((acc, element) => {
        acc.set(typeof element === "string" ? element : element.id, element);
        return acc;
    }, new Map());
};
exports.arrayToMap = arrayToMap;
const arrayToMapWithIndex = (elements) => elements.reduce((acc, element, idx) => {
    acc.set(element.id, [element, idx]);
    return acc;
}, new Map());
exports.arrayToMapWithIndex = arrayToMapWithIndex;
/**
 * Transform array into an object, use only when array order is irrelevant.
 */
const arrayToObject = (array, groupBy) => array.reduce((acc, value, idx) => {
    acc[groupBy ? groupBy(value) : idx] = value;
    return acc;
}, {});
exports.arrayToObject = arrayToObject;
/**
 * Creates a circular doubly linked list by adding `prev` and `next` props to the existing array nodes.
 */
const arrayToList = (array) => array.reduce((acc, curr, index) => {
    const node = { ...curr, prev: null, next: null };
    // no-op for first item, we don't want circular references on a single item
    if (index !== 0) {
        const prevNode = acc[index - 1];
        node.prev = prevNode;
        prevNode.next = node;
        if (index === array.length - 1) {
            // make the references circular and connect head & tail
            const firstNode = acc[0];
            node.next = firstNode;
            firstNode.prev = node;
        }
    }
    acc.push(node);
    return acc;
}, []);
exports.arrayToList = arrayToList;
/**
 * Converts a readonly array or map into an iterable.
 * Useful for avoiding entry allocations when iterating object / map on each iteration.
 */
const toIterable = (values) => {
    return Array.isArray(values) ? values : values.values();
};
exports.toIterable = toIterable;
/**
 * Converts a readonly array or map into an array.
 */
const toArray = (values) => {
    return Array.isArray(values) ? values : Array.from((0, exports.toIterable)(values));
};
exports.toArray = toArray;
const isTestEnv = () => import.meta.env.MODE === constants_1.ENV.TEST;
exports.isTestEnv = isTestEnv;
const isDevEnv = () => import.meta.env.MODE === constants_1.ENV.DEVELOPMENT;
exports.isDevEnv = isDevEnv;
const isProdEnv = () => import.meta.env.MODE === constants_1.ENV.PRODUCTION;
exports.isProdEnv = isProdEnv;
const isServerEnv = () => typeof process !== "undefined" && !!process?.env?.NODE_ENV;
exports.isServerEnv = isServerEnv;
const wrapEvent = (name, nativeEvent) => {
    return new CustomEvent(name, {
        detail: {
            nativeEvent,
        },
        cancelable: true,
    });
};
exports.wrapEvent = wrapEvent;
const updateObject = (obj, updates) => {
    let didChange = false;
    for (const key in updates) {
        const value = updates[key];
        if (typeof value !== "undefined") {
            if (obj[key] === value &&
                // if object, always update because its attrs could have changed
                (typeof value !== "object" || value === null)) {
                continue;
            }
            didChange = true;
        }
    }
    if (!didChange) {
        return obj;
    }
    return {
        ...obj,
        ...updates,
    };
};
exports.updateObject = updateObject;
const isPrimitive = (val) => {
    const type = typeof val;
    return val == null || (type !== "object" && type !== "function");
};
exports.isPrimitive = isPrimitive;
const getFrame = () => {
    try {
        return window.self === window.top ? "top" : "iframe";
    }
    catch (error) {
        return "iframe";
    }
};
exports.getFrame = getFrame;
const isRunningInIframe = () => (0, exports.getFrame)() === "iframe";
exports.isRunningInIframe = isRunningInIframe;
const isPromiseLike = (value) => {
    return (!!value &&
        typeof value === "object" &&
        "then" in value &&
        "catch" in value &&
        "finally" in value);
};
exports.isPromiseLike = isPromiseLike;
const queryFocusableElements = (container) => {
    const focusableElements = container?.querySelectorAll("button, a, input, select, textarea, div[tabindex], label[tabindex]");
    return focusableElements
        ? Array.from(focusableElements).filter((element) => element.tabIndex > -1 && !element.disabled)
        : [];
};
exports.queryFocusableElements = queryFocusableElements;
/** use as a fallback after identity check (for perf reasons) */
const _defaultIsShallowComparatorFallback = (a, b) => {
    // consider two empty arrays equal
    if (Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === 0 &&
        b.length === 0) {
        return true;
    }
    return a === b;
};
/**
 * Returns whether object/array is shallow equal.
 * Considers empty object/arrays as equal (whether top-level or second-level).
 */
const isShallowEqual = (objA, objB, comparators, debug = false) => {
    const aKeys = Object.keys(objA);
    const bKeys = Object.keys(objB);
    if (aKeys.length !== bKeys.length) {
        if (debug) {
            console.warn(`%cisShallowEqual: objects don't have same properties ->`, "color: #8B4000", objA, objB);
        }
        return false;
    }
    if (comparators && Array.isArray(comparators)) {
        for (const key of comparators) {
            const ret = objA[key] === objB[key] ||
                _defaultIsShallowComparatorFallback(objA[key], objB[key]);
            if (!ret) {
                if (debug) {
                    console.warn(`%cisShallowEqual: ${key} not equal ->`, "color: #8B4000", objA[key], objB[key]);
                }
                return false;
            }
        }
        return true;
    }
    return aKeys.every((key) => {
        const comparator = comparators?.[key];
        const ret = comparator
            ? comparator(objA[key], objB[key])
            : objA[key] === objB[key] ||
                _defaultIsShallowComparatorFallback(objA[key], objB[key]);
        if (!ret && debug) {
            console.warn(`%cisShallowEqual: ${key} not equal ->`, "color: #8B4000", objA[key], objB[key]);
        }
        return ret;
    });
};
exports.isShallowEqual = isShallowEqual;
// taken from Radix UI
// https://github.com/radix-ui/primitives/blob/main/packages/core/primitive/src/primitive.tsx
const composeEventHandlers = (originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) => {
    return function handleEvent(event) {
        originalEventHandler?.(event);
        if (!checkForDefaultPrevented ||
            !event?.defaultPrevented) {
            return ourEventHandler?.(event);
        }
    };
};
exports.composeEventHandlers = composeEventHandlers;
/**
 * supply `null` as message if non-never value is valid, you just need to
 * typecheck against it
 */
const assertNever = (value, message, softAssert) => {
    if (!message) {
        return value;
    }
    if (softAssert) {
        console.error(message);
        return value;
    }
    throw new Error(message);
};
exports.assertNever = assertNever;
function invariant(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
/**
 * Memoizes on values of `opts` object (strict equality).
 */
const memoize = (func) => {
    let lastArgs;
    let lastResult;
    const ret = function (opts) {
        const currentArgs = Object.entries(opts);
        if (lastArgs) {
            let argsAreEqual = true;
            for (const [key, value] of currentArgs) {
                if (lastArgs.get(key) !== value) {
                    argsAreEqual = false;
                    break;
                }
            }
            if (argsAreEqual) {
                return lastResult;
            }
        }
        const result = func(opts);
        lastArgs = new Map(currentArgs);
        lastResult = result;
        return result;
    };
    ret.clear = () => {
        lastArgs = undefined;
        lastResult = undefined;
    };
    return ret;
};
exports.memoize = memoize;
/** Checks if value is inside given collection. Useful for type-safety. */
const isMemberOf = (
/** Set/Map/Array/Object */
collection, 
/** value to look for */
value) => {
    return collection instanceof Set || collection instanceof Map
        ? collection.has(value)
        : "includes" in collection
            ? collection.includes(value)
            : collection.hasOwnProperty(value);
};
exports.isMemberOf = isMemberOf;
const cloneJSON = (obj) => JSON.parse(JSON.stringify(obj));
exports.cloneJSON = cloneJSON;
const updateStable = (prevValue, nextValue) => {
    if ((0, exports.isShallowEqual)(prevValue, nextValue)) {
        return prevValue;
    }
    return nextValue;
};
exports.updateStable = updateStable;
// implem
function addEventListener(
/**
 * allows for falsy values so you don't have to type check when adding
 * event listeners to optional elements
 */
target, type, listener, options) {
    if (!target) {
        return () => { };
    }
    target?.addEventListener?.(type, listener, options);
    return () => {
        target?.removeEventListener?.(type, listener, options);
    };
}
function getSvgPathFromStroke(points, closed = true) {
    const len = points.length;
    if (len < 4) {
        return ``;
    }
    let a = points[0];
    let b = points[1];
    const c = points[2];
    let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${(0, math_1.average)(b[0], c[0]).toFixed(2)},${(0, math_1.average)(b[1], c[1]).toFixed(2)} T`;
    for (let i = 2, max = len - 1; i < max; i++) {
        a = points[i];
        b = points[i + 1];
        result += `${(0, math_1.average)(a[0], b[0]).toFixed(2)},${(0, math_1.average)(a[1], b[1]).toFixed(2)} `;
    }
    if (closed) {
        result += "Z";
    }
    return result;
}
const normalizeEOL = (str) => {
    return str.replace(/\r?\n|\r/g, "\n");
};
exports.normalizeEOL = normalizeEOL;
function toBrandedType(value) {
    return value;
}
// -----------------------------------------------------------------------------
// Promise.try, adapted from https://github.com/sindresorhus/p-try
const promiseTry = async (fn, ...args) => {
    return new Promise((resolve) => {
        resolve(fn(...args));
    });
};
exports.promiseTry = promiseTry;
const isAnyTrue = (...args) => Math.max(...args.map((arg) => (arg ? 1 : 0))) > 0;
exports.isAnyTrue = isAnyTrue;
const safelyParseJSON = (json) => {
    try {
        return JSON.parse(json);
    }
    catch {
        return null;
    }
};
exports.safelyParseJSON = safelyParseJSON;
/**
 * use when you need to render unsafe string as HTML attribute, but MAKE SURE
 * the attribute is double-quoted when constructing the HTML string
 */
const escapeDoubleQuotes = (str) => {
    return str.replace(/"/g, "&quot;");
};
exports.escapeDoubleQuotes = escapeDoubleQuotes;
const castArray = (value) => Array.isArray(value) ? value : [value];
exports.castArray = castArray;
/** hack for Array.isArray type guard not working with readonly value[] */
const isReadonlyArray = (value) => {
    return Array.isArray(value);
};
exports.isReadonlyArray = isReadonlyArray;
const sizeOf = (value) => {
    return (0, exports.isReadonlyArray)(value)
        ? value.length
        : value instanceof Map || value instanceof Set
            ? value.size
            : Object.keys(value).length;
};
exports.sizeOf = sizeOf;
const reduceToCommonValue = (collection, getValue) => {
    if ((0, exports.sizeOf)(collection) === 0) {
        return null;
    }
    const valueExtractor = getValue || ((item) => item);
    let commonValue = null;
    for (const item of collection) {
        const value = valueExtractor(item);
        if ((commonValue === null || commonValue === value) && value != null) {
            commonValue = value;
        }
        else {
            return null;
        }
    }
    return commonValue;
};
exports.reduceToCommonValue = reduceToCommonValue;
const FEATURE_FLAGS_STORAGE_KEY = "excalidraw-feature-flags";
const DEFAULT_FEATURE_FLAGS = {
    COMPLEX_BINDINGS: false,
};
let featureFlags = null;
const getFeatureFlag = (flag) => {
    if (!featureFlags) {
        try {
            const serializedFlags = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY);
            if (serializedFlags) {
                const flags = JSON.parse(serializedFlags);
                featureFlags = flags ?? DEFAULT_FEATURE_FLAGS;
            }
        }
        catch { }
    }
    return (featureFlags || DEFAULT_FEATURE_FLAGS)[flag];
};
exports.getFeatureFlag = getFeatureFlag;
const setFeatureFlag = (flag, value) => {
    try {
        featureFlags = {
            ...(featureFlags || DEFAULT_FEATURE_FLAGS),
            [flag]: value,
        };
        localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(featureFlags));
    }
    catch (e) {
        console.error("unable to set feature flag", e);
    }
};
exports.setFeatureFlag = setFeatureFlag;
const oneOf = (needle, haystack) => {
    return haystack.includes(needle);
};
exports.oneOf = oneOf;
