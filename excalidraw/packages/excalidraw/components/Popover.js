"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Popover = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const common_1 = require("@excalidraw/common");
const clsx_1 = __importDefault(require("clsx"));
require("./Popover.scss");
const Popover = ({ children, left, top, onCloseRequest, fitInViewport = false, offsetLeft = 0, offsetTop = 0, viewportWidth = window.innerWidth, viewportHeight = window.innerHeight, className, }) => {
    const popoverRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const container = popoverRef.current;
        if (!container) {
            return;
        }
        // focus popover only if the caller didn't focus on something else nested
        // within the popover, which should take precedence. Fixes cases
        // like color picker listening to keydown events on containers nested
        // in the popover.
        if (!container.contains(document.activeElement)) {
            container.focus();
        }
        const handleKeyDown = (event) => {
            if (event.key === common_1.KEYS.TAB) {
                const focusableElements = (0, common_1.queryFocusableElements)(container);
                const { activeElement } = document;
                const currentIndex = focusableElements.findIndex((element) => element === activeElement);
                if (activeElement === container) {
                    if (event.shiftKey) {
                        focusableElements[focusableElements.length - 1]?.focus();
                    }
                    else {
                        focusableElements[0].focus();
                    }
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
                else if (currentIndex === 0 && event.shiftKey) {
                    focusableElements[focusableElements.length - 1]?.focus();
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
                else if (currentIndex === focusableElements.length - 1 &&
                    !event.shiftKey) {
                    focusableElements[0]?.focus();
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }
            }
        };
        container.addEventListener("keydown", handleKeyDown);
        return () => container.removeEventListener("keydown", handleKeyDown);
    }, []);
    const lastInitializedPosRef = (0, react_1.useRef)(null);
    // ensure the popover doesn't overflow the viewport
    (0, react_1.useLayoutEffect)(() => {
        if (fitInViewport && popoverRef.current && top != null && left != null) {
            const container = popoverRef.current;
            const { width, height } = container.getBoundingClientRect();
            // hack for StrictMode so this effect only runs once for
            // the same top/left position, otherwise
            // we'd potentically reposition twice (once for viewport overflow)
            // and once for top/left position afterwards
            if (lastInitializedPosRef.current?.top === top &&
                lastInitializedPosRef.current?.left === left) {
                return;
            }
            lastInitializedPosRef.current = { top, left };
            if (width >= viewportWidth) {
                container.style.width = `${viewportWidth}px`;
                container.style.left = "0px";
                container.style.overflowX = "scroll";
            }
            else if (left + width - offsetLeft > viewportWidth) {
                container.style.left = `${viewportWidth - width - 10}px`;
            }
            else {
                container.style.left = `${left}px`;
            }
            if (height >= viewportHeight) {
                container.style.height = `${viewportHeight - 20}px`;
                container.style.top = "10px";
                container.style.overflowY = "scroll";
            }
            else if (top + height - offsetTop > viewportHeight) {
                container.style.top = `${viewportHeight - height}px`;
            }
            else {
                container.style.top = `${top}px`;
            }
        }
    }, [
        top,
        left,
        fitInViewport,
        viewportWidth,
        viewportHeight,
        offsetLeft,
        offsetTop,
    ]);
    (0, react_1.useEffect)(() => {
        if (onCloseRequest) {
            const handler = (event) => {
                if (!popoverRef.current?.contains(event.target)) {
                    (0, react_dom_1.unstable_batchedUpdates)(() => onCloseRequest(event));
                }
            };
            document.addEventListener("pointerdown", handler, false);
            return () => document.removeEventListener("pointerdown", handler, false);
        }
    }, [onCloseRequest]);
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("popover", className), ref: popoverRef, tabIndex: -1, children: children }));
};
exports.Popover = Popover;
