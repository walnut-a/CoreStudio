"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStableCallback = void 0;
const react_1 = require("react");
/**
 * Returns a stable function of the same type.
 */
const useStableCallback = (userFn) => {
    const stableRef = (0, react_1.useRef)({ userFn });
    stableRef.current.userFn = userFn;
    if (!stableRef.current.stableFn) {
        stableRef.current.stableFn = ((...args) => stableRef.current.userFn(...args));
    }
    return stableRef.current.stableFn;
};
exports.useStableCallback = useStableCallback;
