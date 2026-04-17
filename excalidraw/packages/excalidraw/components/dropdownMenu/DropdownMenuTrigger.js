"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const radix_ui_1 = require("radix-ui");
const App_1 = require("../App");
const MenuTrigger = ({ className = "", children, onToggle, title, ...rest }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const classNames = (0, clsx_1.default)(`dropdown-menu-button ${className}`, "zen-mode-transition", {
        "dropdown-menu-button--mobile": editorInterface.formFactor === "phone",
    }).trim();
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Trigger, { className: classNames, onClick: onToggle, type: "button", "data-testid": "dropdown-menu-button", title: title, ...rest, children: children }));
};
exports.default = MenuTrigger;
MenuTrigger.displayName = "DropdownMenuTrigger";
