"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementCanvasButtons = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const App_1 = require("../components/App");
require("./ElementCanvasButtons.scss");
const CONTAINER_PADDING = 5;
const getContainerCoords = (element, appState, elementsMap) => {
    const [x1, y1] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap);
    const { x: viewportX, y: viewportY } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: x1 + element.width, sceneY: y1 }, appState);
    const x = viewportX - appState.offsetLeft + 10;
    const y = viewportY - appState.offsetTop;
    return { x, y };
};
const ElementCanvasButtons = ({ children, element, elementsMap, }) => {
    const appState = (0, App_1.useExcalidrawAppState)();
    if (appState.contextMenu ||
        appState.newElement ||
        appState.resizingElement ||
        appState.isRotating ||
        appState.openMenu ||
        appState.viewModeEnabled) {
        return null;
    }
    const { x, y } = getContainerCoords(element, appState, elementsMap);
    return ((0, jsx_runtime_1.jsx)("div", { className: "excalidraw-canvas-buttons", style: {
            top: `${y}px`,
            left: `${x}px`,
            // width: CONTAINER_WIDTH,
            padding: CONTAINER_PADDING,
        }, children: children }));
};
exports.ElementCanvasButtons = ElementCanvasButtons;
