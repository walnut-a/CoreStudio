"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStable = void 0;
const react_1 = require("react");
const useStable = (value) => {
    const ref = (0, react_1.useRef)(value);
    Object.assign(ref.current, value);
    return ref.current;
};
exports.useStable = useStable;
