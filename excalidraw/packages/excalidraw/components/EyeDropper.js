"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EyeDropper = exports.activeEyeDropperAtom = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const common_1 = require("@excalidraw/common");
const ui_appState_1 = require("../context/ui-appState");
const editor_jotai_1 = require("../editor-jotai");
const useCreatePortalContainer_1 = require("../hooks/useCreatePortalContainer");
const useOutsideClick_1 = require("../hooks/useOutsideClick");
const useStable_1 = require("../hooks/useStable");
const scene_1 = require("../scene");
const App_1 = require("./App");
require("./EyeDropper.scss");
exports.activeEyeDropperAtom = (0, editor_jotai_1.atom)(null);
const EyeDropper = ({ onCancel, onChange, onSelect, colorPickerType }) => {
    const eyeDropperContainer = (0, useCreatePortalContainer_1.useCreatePortalContainer)({
        className: "excalidraw-eye-dropper-backdrop",
        parentSelector: ".excalidraw-eye-dropper-container",
    });
    const appState = (0, ui_appState_1.useUIAppState)();
    const elements = (0, App_1.useExcalidrawElements)();
    const app = (0, App_1.useApp)();
    const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
    const stableProps = (0, useStable_1.useStable)({
        app,
        onCancel,
        onChange,
        onSelect,
        selectedElements,
    });
    const { container: excalidrawContainer } = (0, App_1.useExcalidrawContainer)();
    (0, react_1.useEffect)(() => {
        const colorPreviewDiv = ref.current;
        if (!colorPreviewDiv || !app.canvas || !eyeDropperContainer) {
            return;
        }
        let isHoldingPointerDown = false;
        const ctx = app.canvas.getContext("2d");
        const getCurrentColor = ({ clientX, clientY, }) => {
            const pixel = ctx.getImageData((clientX - appState.offsetLeft) * window.devicePixelRatio, (clientY - appState.offsetTop) * window.devicePixelRatio, 1, 1).data;
            return (0, common_1.rgbToHex)(pixel[0], pixel[1], pixel[2]);
        };
        const mouseMoveListener = ({ clientX, clientY, altKey, }) => {
            // FIXME swap offset when the preview gets outside viewport
            colorPreviewDiv.style.top = `${clientY + 20}px`;
            colorPreviewDiv.style.left = `${clientX + 20}px`;
            const currentColor = getCurrentColor({ clientX, clientY });
            if (isHoldingPointerDown) {
                stableProps.onChange(colorPickerType, currentColor, stableProps.selectedElements, { altKey });
            }
            colorPreviewDiv.style.background = currentColor;
        };
        const onCancel = () => {
            stableProps.onCancel();
        };
        const onSelect = (color, event) => {
            stableProps.onSelect(color, event);
        };
        const pointerDownListener = (event) => {
            isHoldingPointerDown = true;
            // NOTE we can't event.preventDefault() as that would stop
            // pointermove events
            event.stopImmediatePropagation();
        };
        const pointerUpListener = (event) => {
            isHoldingPointerDown = false;
            // since we're not preventing default on pointerdown, the focus would
            // goes back to `body` so we want to refocus the editor container instead
            excalidrawContainer?.focus();
            event.stopImmediatePropagation();
            event.preventDefault();
            onSelect(getCurrentColor(event), event);
        };
        const keyDownListener = (event) => {
            if (event.key === common_1.KEYS.ESCAPE) {
                event.preventDefault();
                event.stopImmediatePropagation();
                onCancel();
            }
        };
        // -------------------------------------------------------------------------
        eyeDropperContainer.tabIndex = -1;
        // focus container so we can listen on keydown events
        eyeDropperContainer.focus();
        // init color preview else it would show only after the first mouse move
        mouseMoveListener({
            clientX: stableProps.app.lastViewportPosition.x,
            clientY: stableProps.app.lastViewportPosition.y,
            altKey: false,
        });
        eyeDropperContainer.addEventListener(common_1.EVENT.KEYDOWN, keyDownListener);
        eyeDropperContainer.addEventListener(common_1.EVENT.POINTER_DOWN, pointerDownListener);
        eyeDropperContainer.addEventListener(common_1.EVENT.POINTER_UP, pointerUpListener);
        window.addEventListener("pointermove", mouseMoveListener, {
            passive: true,
        });
        window.addEventListener(common_1.EVENT.BLUR, onCancel);
        return () => {
            isHoldingPointerDown = false;
            eyeDropperContainer.removeEventListener(common_1.EVENT.KEYDOWN, keyDownListener);
            eyeDropperContainer.removeEventListener(common_1.EVENT.POINTER_DOWN, pointerDownListener);
            eyeDropperContainer.removeEventListener(common_1.EVENT.POINTER_UP, pointerUpListener);
            window.removeEventListener("pointermove", mouseMoveListener);
            window.removeEventListener(common_1.EVENT.BLUR, onCancel);
        };
    }, [
        stableProps,
        app.canvas,
        eyeDropperContainer,
        colorPickerType,
        excalidrawContainer,
        appState.offsetLeft,
        appState.offsetTop,
    ]);
    const ref = (0, react_1.useRef)(null);
    (0, useOutsideClick_1.useOutsideClick)(ref, () => {
        onCancel();
    }, (event) => {
        if (event.target.closest(".excalidraw-eye-dropper-trigger, .excalidraw-eye-dropper-backdrop")) {
            return true;
        }
        // consider all other clicks as outside
        return false;
    });
    if (!eyeDropperContainer) {
        return null;
    }
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsx)("div", { ref: ref, className: "excalidraw-eye-dropper-preview" }), eyeDropperContainer);
};
exports.EyeDropper = EyeDropper;
