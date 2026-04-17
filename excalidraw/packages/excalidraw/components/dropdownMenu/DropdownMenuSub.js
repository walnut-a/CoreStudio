"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const DropdownMenuSubContent_1 = __importDefault(require("./DropdownMenuSubContent"));
const DropdownMenuSubTrigger_1 = __importDefault(require("./DropdownMenuSubTrigger"));
const dropdownMenuUtils_1 = require("./dropdownMenuUtils");
const DropdownMenuSub = ({ children }) => {
    const MenuTriggerComp = (0, dropdownMenuUtils_1.getSubMenuTriggerComponent)(children);
    const MenuContentComp = (0, dropdownMenuUtils_1.getSubMenuContentComponent)(children);
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.DropdownMenu.Sub, { children: [MenuTriggerComp, MenuContentComp] }));
};
DropdownMenuSub.Trigger = DropdownMenuSubTrigger_1.default;
DropdownMenuSub.Content = DropdownMenuSubContent_1.default;
DropdownMenuSub.displayName = "DropdownMenuSub";
exports.default = DropdownMenuSub;
