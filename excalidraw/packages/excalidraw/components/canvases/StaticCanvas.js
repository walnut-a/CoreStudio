"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const reactUtils_1 = require("../../reactUtils");
const staticScene_1 = require("../../renderer/staticScene");
const StaticCanvas = (props) => {
    const wrapperRef = (0, react_1.useRef)(null);
    const isComponentMounted = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        props.canvas.style.width = `${props.appState.width}px`;
        props.canvas.style.height = `${props.appState.height}px`;
        props.canvas.width = props.appState.width * props.scale;
        props.canvas.height = props.appState.height * props.scale;
    }, [props.appState.height, props.appState.width, props.canvas, props.scale]);
    (0, react_1.useEffect)(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) {
            return;
        }
        const canvas = props.canvas;
        if (!isComponentMounted.current) {
            isComponentMounted.current = true;
            wrapper.replaceChildren(canvas);
            canvas.classList.add("excalidraw__canvas", "static");
        }
        (0, staticScene_1.renderStaticScene)({
            canvas,
            rc: props.rc,
            scale: props.scale,
            elementsMap: props.elementsMap,
            allElementsMap: props.allElementsMap,
            visibleElements: props.visibleElements,
            appState: props.appState,
            renderConfig: props.renderConfig,
        }, (0, reactUtils_1.isRenderThrottlingEnabled)());
    });
    return (0, jsx_runtime_1.jsx)("div", { className: "excalidraw__canvas-wrapper", ref: wrapperRef });
};
const getRelevantAppStateProps = (appState) => {
    const relevantAppStateProps = {
        zoom: appState.zoom,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        width: appState.width,
        height: appState.height,
        viewModeEnabled: appState.viewModeEnabled,
        openDialog: appState.openDialog,
        hoveredElementIds: appState.hoveredElementIds,
        offsetLeft: appState.offsetLeft,
        offsetTop: appState.offsetTop,
        theme: appState.theme,
        shouldCacheIgnoreZoom: appState.shouldCacheIgnoreZoom,
        viewBackgroundColor: appState.viewBackgroundColor,
        exportScale: appState.exportScale,
        selectedElementsAreBeingDragged: appState.selectedElementsAreBeingDragged,
        gridSize: appState.gridSize,
        gridStep: appState.gridStep,
        frameRendering: appState.frameRendering,
        selectedElementIds: appState.selectedElementIds,
        frameToHighlight: appState.frameToHighlight,
        editingGroupId: appState.editingGroupId,
        currentHoveredFontFamily: appState.currentHoveredFontFamily,
        croppingElementId: appState.croppingElementId,
        suggestedBinding: appState.suggestedBinding,
    };
    return relevantAppStateProps;
};
const areEqual = (prevProps, nextProps) => {
    if (prevProps.sceneNonce !== nextProps.sceneNonce ||
        prevProps.scale !== nextProps.scale ||
        // we need to memoize on elementsMap because they may have renewed
        // even if sceneNonce didn't change (e.g. we filter elements out based
        // on appState)
        prevProps.elementsMap !== nextProps.elementsMap ||
        prevProps.visibleElements !== nextProps.visibleElements) {
        return false;
    }
    return ((0, common_1.isShallowEqual)(
    // asserting AppState because we're being passed the whole AppState
    // but resolve to only the StaticCanvas-relevant props
    getRelevantAppStateProps(prevProps.appState), getRelevantAppStateProps(nextProps.appState)) && (0, common_1.isShallowEqual)(prevProps.renderConfig, nextProps.renderConfig));
};
exports.default = react_1.default.memo(StaticCanvas, areEqual);
