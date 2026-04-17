"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCopyStatus = void 0;
const react_1 = require("react");
const TIMEOUT = 2000;
const useCopyStatus = () => {
    const [copyStatus, setCopyStatus] = (0, react_1.useState)(null);
    const timeoutRef = (0, react_1.useRef)(0);
    const onCopy = () => {
        clearTimeout(timeoutRef.current);
        setCopyStatus("success");
        timeoutRef.current = window.setTimeout(() => {
            setCopyStatus(null);
        }, TIMEOUT);
    };
    const resetCopyStatus = (0, react_1.useCallback)(() => {
        setCopyStatus(null);
    }, []);
    return {
        copyStatus,
        resetCopyStatus,
        onCopy,
    };
};
exports.useCopyStatus = useCopyStatus;
