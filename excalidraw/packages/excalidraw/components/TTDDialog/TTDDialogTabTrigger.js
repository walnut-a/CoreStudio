"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogTabTrigger = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const TTDDialogTabTrigger = ({ children, tab, onSelect, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.Trigger, { value: tab, asChild: true, onSelect: onSelect, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "ttd-dialog-tab-trigger", ...rest, children: children }) }));
};
exports.TTDDialogTabTrigger = TTDDialogTabTrigger;
exports.TTDDialogTabTrigger.displayName = "TTDDialogTabTrigger";
