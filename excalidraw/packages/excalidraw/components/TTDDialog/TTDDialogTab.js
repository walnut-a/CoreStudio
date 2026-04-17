"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTDDialogTab = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const TTDDialogTab = ({ tab, children, ...rest }) => {
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Tabs.Content, { ...rest, value: tab, children: children }));
};
exports.TTDDialogTab = TTDDialogTab;
exports.TTDDialogTab.displayName = "TTDDialogTab";
