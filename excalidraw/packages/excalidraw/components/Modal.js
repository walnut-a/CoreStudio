"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const common_1 = require("@excalidraw/common");
const useCreatePortalContainer_1 = require("../hooks/useCreatePortalContainer");
require("./Modal.scss");
const Modal = (props) => {
    const { closeOnClickOutside = true } = props;
    const modalRoot = (0, useCreatePortalContainer_1.useCreatePortalContainer)({
        className: "excalidraw-modal-container",
    });
    const animationsDisabledRef = (0, react_1.useRef)(document.body.classList.contains("excalidraw-animations-disabled"));
    if (!modalRoot) {
        return null;
    }
    const handleKeydown = (event) => {
        if (event.key === common_1.KEYS.ESCAPE) {
            event.nativeEvent.stopImmediatePropagation();
            event.stopPropagation();
            props.onCloseRequest();
        }
    };
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("Modal", props.className, {
            "animations-disabled": animationsDisabledRef.current,
        }), role: "dialog", "aria-modal": "true", onKeyDown: handleKeydown, "aria-labelledby": props.labelledBy, children: [(0, jsx_runtime_1.jsx)("div", { className: "Modal__background", onClick: closeOnClickOutside ? props.onCloseRequest : undefined }), (0, jsx_runtime_1.jsx)("div", { className: "Modal__content", style: { "--max-width": `${props.maxWidth}px` }, tabIndex: 0, children: props.children })] }), modalRoot);
};
exports.Modal = Modal;
