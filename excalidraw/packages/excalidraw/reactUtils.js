"use strict";
/**
 * @param func handler taking at most single parameter (event).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRenderThrottlingEnabled = exports.withBatchedUpdatesThrottled = exports.withBatchedUpdates = void 0;
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const common_1 = require("@excalidraw/common");
const withBatchedUpdates = (func) => ((event) => {
    (0, react_dom_1.unstable_batchedUpdates)(func, event);
});
exports.withBatchedUpdates = withBatchedUpdates;
/**
 * barches React state updates and throttles the calls to a single call per
 * animation frame
 */
const withBatchedUpdatesThrottled = (func) => {
    // @ts-ignore
    return (0, common_1.throttleRAF)(((event) => {
        (0, react_dom_1.unstable_batchedUpdates)(func, event);
    }));
};
exports.withBatchedUpdatesThrottled = withBatchedUpdatesThrottled;
exports.isRenderThrottlingEnabled = (() => {
    // we don't want to throttle in react < 18 because of #5439 and it was
    // getting more complex to maintain the fix
    let IS_REACT_18_AND_UP;
    try {
        const version = react_1.version.split(".");
        IS_REACT_18_AND_UP = Number(version[0]) > 17;
    }
    catch {
        IS_REACT_18_AND_UP = false;
    }
    let hasWarned = false;
    return () => {
        if (window.EXCALIDRAW_THROTTLE_RENDER === true) {
            if (!IS_REACT_18_AND_UP) {
                if (!hasWarned) {
                    hasWarned = true;
                    console.warn("Excalidraw: render throttling is disabled on React versions < 18.");
                }
                return false;
            }
            return true;
        }
        return false;
    };
})();
