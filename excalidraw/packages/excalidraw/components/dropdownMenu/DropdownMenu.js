"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const radix_ui_1 = require("radix-ui");
const common_1 = require("@excalidraw/common");
const DropdownMenuContent_1 = __importDefault(require("./DropdownMenuContent"));
const DropdownMenuGroup_1 = __importDefault(require("./DropdownMenuGroup"));
const DropdownMenuItem_1 = __importDefault(require("./DropdownMenuItem"));
const DropdownMenuItemCustom_1 = __importDefault(require("./DropdownMenuItemCustom"));
const DropdownMenuItemLink_1 = __importDefault(require("./DropdownMenuItemLink"));
const DropdownMenuSeparator_1 = __importDefault(require("./DropdownMenuSeparator"));
const DropdownMenuSub_1 = __importDefault(require("./DropdownMenuSub"));
const DropdownMenuTrigger_1 = __importDefault(require("./DropdownMenuTrigger"));
const DropdownMenuItemCheckbox_1 = __importDefault(require("./DropdownMenuItemCheckbox"));
const dropdownMenuUtils_1 = require("./dropdownMenuUtils");
require("./DropdownMenu.scss");
const DropdownMenu = ({ children, open, }) => {
    const MenuTriggerComp = (0, dropdownMenuUtils_1.getMenuTriggerComponent)(children);
    const MenuContentComp = (0, dropdownMenuUtils_1.getMenuContentComponent)(children);
    const MenuContentWithState = MenuContentComp && react_1.default.isValidElement(MenuContentComp)
        ? react_1.default.cloneElement(MenuContentComp, { open })
        : MenuContentComp;
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Root, { open: open, modal: false, children: (0, jsx_runtime_1.jsxs)("div", { className: common_1.CLASSES.DROPDOWN_MENU_EVENT_WRAPPER, style: {
                // remove this div from box layout
                display: "contents",
            }, children: [MenuTriggerComp, MenuContentWithState] }) }));
};
DropdownMenu.Trigger = DropdownMenuTrigger_1.default;
DropdownMenu.Content = DropdownMenuContent_1.default;
DropdownMenu.Item = DropdownMenuItem_1.default;
DropdownMenu.ItemCheckbox = DropdownMenuItemCheckbox_1.default;
DropdownMenu.ItemLink = DropdownMenuItemLink_1.default;
DropdownMenu.ItemCustom = DropdownMenuItemCustom_1.default;
DropdownMenu.Group = DropdownMenuGroup_1.default;
DropdownMenu.Separator = DropdownMenuSeparator_1.default;
DropdownMenu.Sub = DropdownMenuSub_1.default;
exports.default = DropdownMenu;
DropdownMenu.displayName = "DropdownMenu";
