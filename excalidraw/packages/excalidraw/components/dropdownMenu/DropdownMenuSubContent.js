"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const radix_ui_1 = require("radix-ui");
const react_1 = require("react");
const App_1 = require("../App");
const Island_1 = require("../Island");
const Stack_1 = __importDefault(require("../Stack"));
const BASE_ALIGN_OFFSET = -4;
const BASE_SIDE_OFFSET = 4;
const DropdownMenuSubContent = ({ children, className, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const classNames = (0, clsx_1.default)(`dropdown-menu dropdown-submenu ${className}`, {
        "dropdown-menu--mobile": editorInterface.formFactor === "phone",
    }).trim();
    const callbacksRef = (0, react_1.useCallback)((node) => {
        if (node) {
            const parentContainer = node.closest(".dropdown-menu-container");
            const parentRect = parentContainer?.getBoundingClientRect();
            if (parentRect) {
                const menuWidth = node.getBoundingClientRect().width;
                const viewportWidth = window.innerWidth;
                const spaceRemaining = viewportWidth - parentRect.right;
                if (spaceRemaining < menuWidth + 20) {
                    setSideOffset(spaceRemaining - menuWidth + BASE_ALIGN_OFFSET);
                    setAlignOffset(BASE_ALIGN_OFFSET + 8);
                }
            }
        }
    }, []);
    const [sideOffset, setSideOffset] = (0, react_1.useState)(BASE_SIDE_OFFSET);
    const [alignOffset, setAlignOffset] = (0, react_1.useState)(BASE_ALIGN_OFFSET);
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.SubContent, { className: classNames, sideOffset: sideOffset, alignOffset: alignOffset, collisionPadding: 8, ref: callbacksRef, children: editorInterface.formFactor === "phone" ? ((0, jsx_runtime_1.jsx)(Stack_1.default.Col, { className: "dropdown-menu-container", children: children })) : ((0, jsx_runtime_1.jsx)(Island_1.Island, { className: "dropdown-menu-container", padding: 2, style: { zIndex: 1 }, children: children })) }));
};
exports.default = DropdownMenuSubContent;
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";
