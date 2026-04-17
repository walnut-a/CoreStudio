"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("../editor-jotai");
const useCallbackRefState_1 = require("../hooks/useCallbackRefState");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Island_1 = require("./Island");
const LibraryMenu_1 = require("./LibraryMenu");
const Modal_1 = require("./Modal");
const icons_1 = require("./icons");
require("./Dialog.scss");
function getDialogSize(size) {
    if (size && typeof size === "number") {
        return size;
    }
    switch (size) {
        case "small":
            return 550;
        case "wide":
            return 1024;
        case "regular":
        default:
            return 800;
    }
}
const Dialog = (props) => {
    const [islandNode, setIslandNode] = (0, useCallbackRefState_1.useCallbackRefState)();
    const [lastActiveElement] = (0, react_1.useState)(document.activeElement);
    const { id } = (0, App_1.useExcalidrawContainer)();
    const isFullscreen = (0, App_1.useEditorInterface)().formFactor === "phone";
    (0, react_1.useEffect)(() => {
        if (!islandNode) {
            return;
        }
        const focusableElements = (0, common_1.queryFocusableElements)(islandNode);
        setTimeout(() => {
            if (focusableElements.length > 0 && props.autofocus !== false) {
                // If there's an element other than close, focus it.
                (focusableElements[1] || focusableElements[0]).focus();
            }
        });
        const handleKeyDown = (event) => {
            if (event.key === common_1.KEYS.TAB) {
                const focusableElements = (0, common_1.queryFocusableElements)(islandNode);
                const { activeElement } = document;
                const currentIndex = focusableElements.findIndex((element) => element === activeElement);
                if (currentIndex === 0 && event.shiftKey) {
                    focusableElements[focusableElements.length - 1].focus();
                    event.preventDefault();
                }
                else if (currentIndex === focusableElements.length - 1 &&
                    !event.shiftKey) {
                    focusableElements[0].focus();
                    event.preventDefault();
                }
            }
        };
        islandNode.addEventListener("keydown", handleKeyDown);
        return () => islandNode.removeEventListener("keydown", handleKeyDown);
    }, [islandNode, props.autofocus]);
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const setIsLibraryMenuOpen = (0, editor_jotai_1.useSetAtom)(LibraryMenu_1.isLibraryMenuOpenAtom);
    const onClose = () => {
        setAppState({ openMenu: null });
        setIsLibraryMenuOpen(false);
        lastActiveElement.focus();
        props.onCloseRequest();
    };
    return ((0, jsx_runtime_1.jsx)(Modal_1.Modal, { className: (0, clsx_1.default)("Dialog", props.className, {
            "Dialog--fullscreen": isFullscreen,
        }), labelledBy: "dialog-title", maxWidth: getDialogSize(props.size), onCloseRequest: onClose, closeOnClickOutside: props.closeOnClickOutside, children: (0, jsx_runtime_1.jsxs)(Island_1.Island, { ref: setIslandNode, children: [props.title && ((0, jsx_runtime_1.jsx)("h2", { id: `${id}-dialog-title`, className: "Dialog__title", children: (0, jsx_runtime_1.jsx)("span", { className: "Dialog__titleContent", children: props.title }) })), isFullscreen && ((0, jsx_runtime_1.jsx)("button", { className: "Dialog__close", onClick: onClose, title: (0, i18n_1.t)("buttons.close"), "aria-label": (0, i18n_1.t)("buttons.close"), type: "button", children: icons_1.CloseIcon })), (0, jsx_runtime_1.jsx)("div", { className: "Dialog__content", children: props.children })] }) }));
};
exports.Dialog = Dialog;
