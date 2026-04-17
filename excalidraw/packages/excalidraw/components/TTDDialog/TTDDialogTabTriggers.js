"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogTabTriggers = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const TTDDialogTabTriggers = ({ children, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.List, { className: "ttd-dialog-triggers", ...rest, children: children }));
};
exports.TTDDialogTabTriggers = TTDDialogTabTriggers;
exports.TTDDialogTabTriggers.displayName = "TTDDialogTabTriggers";
