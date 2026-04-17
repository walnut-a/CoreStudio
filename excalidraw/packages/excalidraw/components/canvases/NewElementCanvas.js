"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const reactUtils_1 = require("../../reactUtils");
const renderNewElementScene_1 = require("../../renderer/renderNewElementScene");
const NewElementCanvas = (props) => {
    const canvasRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!canvasRef.current) {
            return;
        }
        (0, renderNewElementScene_1.renderNewElementScene)({
            canvas: canvasRef.current,
            scale: props.scale,
            newElement: props.appState.newElement,
            elementsMap: props.elementsMap,
            allElementsMap: props.allElementsMap,
            rc: props.rc,
            renderConfig: props.renderConfig,
            appState: props.appState,
        }, (0, reactUtils_1.isRenderThrottlingEnabled)());
    });
    return ((0, jsx_runtime_1.jsx)("canvas", { className: "excalidraw__canvas", style: {
            width: props.appState.width,
            height: props.appState.height,
        }, width: props.appState.width * props.scale, height: props.appState.height * props.scale, ref: canvasRef }));
};
exports.default = NewElementCanvas;
