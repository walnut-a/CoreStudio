"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertiesPopover = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importDefault(require("react"));
const common_1 = require("@excalidraw/common");
const App_1 = require("./App");
const Island_1 = require("./Island");
exports.PropertiesPopover = react_1.default.forwardRef(({ className, container, children, style, onClose, onKeyDown, onFocusOutside, onPointerLeave, onPointerDownOutside, preventAutoFocusOnTouch = false, }, ref) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const isMobilePortrait = editorInterface.formFactor === "phone" && !editorInterface.isLandscape;
    return ((0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Portal, { container: container, children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Content, { ref: ref, className: (0, clsx_1.default)("focus-visible-none", className), "data-prevent-outside-click": true, side: isMobilePortrait ? "bottom" : "right", align: isMobilePortrait ? "center" : "start", alignOffset: -16, sideOffset: 20, collisionBoundary: container ?? undefined, style: {
                zIndex: "var(--zIndex-ui-styles-popup)",
                marginLeft: editorInterface.formFactor === "phone" ? "0.5rem" : undefined,
            }, onPointerLeave: onPointerLeave, onKeyDown: onKeyDown, onFocusOutside: onFocusOutside, onPointerDownOutside: onPointerDownOutside, onOpenAutoFocus: (e) => {
                // prevent auto-focus on touch devices to avoid keyboard popup
                if (preventAutoFocusOnTouch && editorInterface.isTouchScreen) {
                    e.preventDefault();
                }
            }, onCloseAutoFocus: (e) => {
                e.stopPropagation();
                // prevents focusing the trigger
                e.preventDefault();
                // return focus to excalidraw container unless
                // user focuses an interactive element, such as a button, or
                // enters the text editor by clicking on canvas with the text tool
                if (container && !(0, common_1.isInteractive)(document.activeElement)) {
                    container.focus();
                }
                onClose();
            }, children: [(0, jsx_runtime_1.jsx)(Island_1.Island, { padding: 3, style: style, children: children }), (0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Arrow, { width: 20, height: 10, style: {
                        fill: "var(--popup-bg-color)",
                        filter: "drop-shadow(rgba(0, 0, 0, 0.05) 0px 3px 2px)",
                    } })] }) }));
});
