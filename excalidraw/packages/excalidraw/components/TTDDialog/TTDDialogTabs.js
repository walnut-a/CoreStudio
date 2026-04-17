"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const App_1 = require("../App");
const TTDDialogTabs = (props) => {
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const rootRef = (0, react_1.useRef)(null);
    const minHeightRef = (0, react_1.useRef)(0);
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.Root, { ref: rootRef, className: "ttd-dialog-tabs-root", value: props.tab, onValueChange: (
        // at least in test enviros, `tab` can be `undefined`
        tab) => {
            if (!tab) {
                return;
            }
            const modalContentNode = rootRef.current?.closest(".Modal__content");
            if (modalContentNode) {
                const currHeight = modalContentNode.offsetHeight || 0;
                if (currHeight > minHeightRef.current) {
                    minHeightRef.current = currHeight;
                    modalContentNode.style.minHeight = `min(${minHeightRef.current}px, 100%)`;
                }
            }
            if (props.dialog === "ttd" &&
                (0, common_1.isMemberOf)(["text-to-diagram", "mermaid"], tab)) {
                setAppState({
                    openDialog: { name: props.dialog, tab },
                });
            }
        }, children: props.children }));
};
TTDDialogTabs.displayName = "TTDDialogTabs";
exports.default = TTDDialogTabs;
