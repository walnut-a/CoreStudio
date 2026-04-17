"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogSubmitShortcut = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const shortcut_1 = require("../../shortcut");
const TTDDialogSubmitShortcut = () => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ttd-dialog-submit-shortcut", children: [(0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-submit-shortcut__key", children: (0, shortcut_1.getShortcutKey)("CtrlOrCmd") }), (0, jsx_runtime_1.jsx)("div", { className: "ttd-dialog-submit-shortcut__key", children: (0, shortcut_1.getShortcutKey)("Enter") })] }));
};
exports.TTDDialogSubmitShortcut = TTDDialogSubmitShortcut;
