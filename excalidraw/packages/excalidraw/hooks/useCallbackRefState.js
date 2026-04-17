"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCallbackRefState = void 0;
const react_1 = require("react");
const useCallbackRefState = () => {
    const [refValue, setRefValue] = (0, react_1.useState)(null);
    const refCallback = (0, react_1.useCallback)((value) => setRefValue(value), []);
    return [refValue, refCallback];
};
exports.useCallbackRefState = useCallbackRefState;
