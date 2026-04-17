"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const radix_ui_1 = require("radix-ui");
const useOutsideClick_1 = require("../../hooks/useOutsideClick");
const useStable_1 = require("../../hooks/useStable");
const App_1 = require("../App");
const Island_1 = require("../Island");
const Stack_1 = __importDefault(require("../Stack"));
const common_2 = require("./common");
const MenuContent = ({ children, onClickOutside, className = "", onSelect, open = true, align = "end", style, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const menuRef = (0, react_1.useRef)(null);
    const callbacksRef = (0, useStable_1.useStable)({ onClickOutside });
    (0, useOutsideClick_1.useOutsideClick)(menuRef, (0, react_1.useCallback)((event) => {
        // prevents closing if clicking on the trigger button
        if (!menuRef.current
            ?.closest(`.${common_1.CLASSES.DROPDOWN_MENU_EVENT_WRAPPER}`)
            ?.contains(event.target)) {
            callbacksRef.onClickOutside?.();
        }
    }, [callbacksRef]));
    (0, react_1.useEffect)(() => {
        if (!open) {
            return;
        }
        const onKeyDown = (event) => {
            if (event.key === common_1.KEYS.ESCAPE) {
                event.stopImmediatePropagation();
                callbacksRef.onClickOutside?.();
            }
        };
        const option = {
            // so that we can stop propagation of the event before it reaches
            // event handlers that were bound before this one
            capture: true,
        };
        document.addEventListener(common_1.EVENT.KEYDOWN, onKeyDown, option);
        return () => {
            document.removeEventListener(common_1.EVENT.KEYDOWN, onKeyDown, option);
        };
    }, [callbacksRef, open]);
    const classNames = (0, clsx_1.default)(`dropdown-menu ${className}`, {
        "dropdown-menu--mobile": editorInterface.formFactor === "phone",
    }).trim();
    return ((0, jsx_runtime_1.jsx)(common_2.DropdownMenuContentPropsContext.Provider, { value: { onSelect }, children: (0, jsx_runtime_1.jsx)(radix_ui_1.DropdownMenu.Content, { ref: menuRef, className: classNames, style: style, "data-testid": "dropdown-menu", align: align, sideOffset: 8, onCloseAutoFocus: (event) => event.preventDefault(), children: editorInterface.formFactor === "phone" ? ((0, jsx_runtime_1.jsx)(Stack_1.default.Col, { className: "dropdown-menu-container", children: children })) : ((0, jsx_runtime_1.jsx)(Island_1.Island, { className: "dropdown-menu-container", padding: 2, children: children })) }) }));
};
MenuContent.displayName = "DropdownMenuContent";
exports.default = MenuContent;
