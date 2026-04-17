"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const App_1 = require("../App");
const Ellipsify_1 = require("../Ellipsify");
const RadioGroup_1 = require("../RadioGroup");
const DropdownMenuItemContentRadio = ({ value, shortcut, onChange, choices, children, name, icon, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "dropdown-menu-item-base dropdown-menu-item-bare", children: [icon && (0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu-item__icon", children: icon }), (0, jsx_runtime_1.jsx)("label", { className: "dropdown-menu-item__text", children: (0, jsx_runtime_1.jsx)(Ellipsify_1.Ellipsify, { children: children }) }), (0, jsx_runtime_1.jsx)(RadioGroup_1.RadioGroup, { name: name, value: value, onChange: onChange, choices: choices })] }), shortcut && editorInterface.formFactor !== "phone" && ((0, jsx_runtime_1.jsx)("div", { className: "dropdown-menu-item__shortcut dropdown-menu-item__shortcut--orphaned", children: shortcut }))] }));
};
DropdownMenuItemContentRadio.displayName = "DropdownMenuItemContentRadio";
exports.default = DropdownMenuItemContentRadio;
