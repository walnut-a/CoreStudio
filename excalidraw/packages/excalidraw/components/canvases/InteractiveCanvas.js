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
exports.INTERACTIVE_SCENE_ANIMATION_KEY = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../../i18n");
const interactiveScene_1 = require("../../renderer/interactiveScene");
const animation_1 = require("../../renderer/animation");
exports.INTERACTIVE_SCENE_ANIMATION_KEY = "animateInteractiveScene";
const InteractiveCanvas = (props) => {
    const isComponentMounted = (0, react_1.useRef)(false);
    const rendererParams = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!isComponentMounted.current) {
            isComponentMounted.current = true;
            return;
        }
        const remotePointerButton = new Map();
        const remotePointerViewportCoords = new Map();
        const remoteSelectedElementIds = new Map();
        const remotePointerUsernames = new Map();
        const remotePointerUserStates = new Map();
        props.appState.collaborators.forEach((user, socketId) => {
            if (user.selectedElementIds) {
                for (const id of Object.keys(user.selectedElementIds)) {
                    if (!remoteSelectedElementIds.has(id)) {
                        remoteSelectedElementIds.set(id, []);
                    }
                    remoteSelectedElementIds.get(id).push(socketId);
                }
            }
            if (!user.pointer || user.pointer.renderCursor === false) {
                return;
            }
            if (user.username) {
                remotePointerUsernames.set(socketId, user.username);
            }
            if (user.userState) {
                remotePointerUserStates.set(socketId, user.userState);
            }
            remotePointerViewportCoords.set(socketId, (0, common_1.sceneCoordsToViewportCoords)({
                sceneX: user.pointer.x,
                sceneY: user.pointer.y,
            }, props.appState));
            remotePointerButton.set(socketId, user.button);
        });
        const selectionColor = (props.containerRef?.current &&
            getComputedStyle(props.containerRef.current).getPropertyValue("--color-selection")) ||
            "#6965db";
        rendererParams.current = {
            app: props.app,
            canvas: props.canvas,
            elementsMap: props.elementsMap,
            visibleElements: props.visibleElements,
            selectedElements: props.selectedElements,
            allElementsMap: props.allElementsMap,
            scale: window.devicePixelRatio,
            appState: props.appState,
            renderConfig: {
                remotePointerViewportCoords,
                remotePointerButton,
                remoteSelectedElementIds,
                remotePointerUsernames,
                remotePointerUserStates,
                selectionColor,
                renderScrollbars: props.renderScrollbars,
                // NOTE not memoized on so we don't rerender on cursor move
                lastViewportPosition: props.app.lastViewportPosition,
            },
            editorInterface: props.editorInterface,
            callback: props.renderInteractiveSceneCallback,
            animationState: {
                bindingHighlight: undefined,
            },
            deltaTime: 0,
        };
        if (!animation_1.AnimationController.running(exports.INTERACTIVE_SCENE_ANIMATION_KEY)) {
            animation_1.AnimationController.start(exports.INTERACTIVE_SCENE_ANIMATION_KEY, ({ deltaTime, state }) => {
                const nextAnimationState = (0, interactiveScene_1.renderInteractiveScene)({
                    ...rendererParams.current,
                    deltaTime,
                    animationState: state,
                }).animationState;
                if (nextAnimationState) {
                    for (const key in nextAnimationState) {
                        if (nextAnimationState[key] !== undefined) {
                            return nextAnimationState;
                        }
                    }
                }
                return undefined;
            });
        }
    });
    return ((0, jsx_runtime_1.jsx)("canvas", { className: "excalidraw__canvas interactive", style: {
            width: props.appState.width,
            height: props.appState.height,
            cursor: props.appState.viewModeEnabled &&
                props.appState.activeTool.type !== "laser"
                ? common_1.CURSOR_TYPE.GRAB
                : common_1.CURSOR_TYPE.AUTO,
        }, width: props.appState.width * props.scale, height: props.appState.height * props.scale, ref: props.handleCanvasRef, onContextMenu: props.onContextMenu, onClick: props.onClick, onPointerMove: props.onPointerMove, onPointerUp: props.onPointerUp, onPointerCancel: props.onPointerCancel, onTouchMove: props.onTouchMove, onPointerDown: props.onPointerDown, onDoubleClick: props.appState.viewModeEnabled ? undefined : props.onDoubleClick, children: (0, i18n_1.t)("labels.drawingCanvas") }));
};
const getRelevantAppStateProps = (appState) => ({
    zoom: appState.zoom,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
    width: appState.width,
    height: appState.height,
    viewModeEnabled: appState.viewModeEnabled,
    activeTool: appState.activeTool,
    openDialog: appState.openDialog,
    editingGroupId: appState.editingGroupId,
    selectedElementIds: appState.selectedElementIds,
    frameToHighlight: appState.frameToHighlight,
    offsetLeft: appState.offsetLeft,
    offsetTop: appState.offsetTop,
    theme: appState.theme,
    selectionElement: appState.selectionElement,
    selectedGroupIds: appState.selectedGroupIds,
    selectedLinearElement: appState.selectedLinearElement,
    multiElement: appState.multiElement,
    newElement: appState.newElement,
    isBindingEnabled: appState.isBindingEnabled,
    isMidpointSnappingEnabled: appState.isMidpointSnappingEnabled,
    suggestedBinding: appState.suggestedBinding,
    isRotating: appState.isRotating,
    elementsToHighlight: appState.elementsToHighlight,
    collaborators: appState.collaborators, // Necessary for collab. sessions
    activeEmbeddable: appState.activeEmbeddable,
    snapLines: appState.snapLines,
    zenModeEnabled: appState.zenModeEnabled,
    editingTextElement: appState.editingTextElement,
    isCropping: appState.isCropping,
    croppingElementId: appState.croppingElementId,
    searchMatches: appState.searchMatches,
    activeLockedId: appState.activeLockedId,
    hoveredElementIds: appState.hoveredElementIds,
    frameRendering: appState.frameRendering,
    shouldCacheIgnoreZoom: appState.shouldCacheIgnoreZoom,
    exportScale: appState.exportScale,
    currentItemArrowType: appState.currentItemArrowType,
});
const areEqual = (prevProps, nextProps) => {
    // This could be further optimised if needed, as we don't have to render interactive canvas on each scene mutation
    if (prevProps.selectionNonce !== nextProps.selectionNonce ||
        prevProps.sceneNonce !== nextProps.sceneNonce ||
        prevProps.scale !== nextProps.scale ||
        // we need to memoize on elementsMap because they may have renewed
        // even if sceneNonce didn't change (e.g. we filter elements out based
        // on appState)
        prevProps.elementsMap !== nextProps.elementsMap ||
        prevProps.visibleElements !== nextProps.visibleElements ||
        prevProps.selectedElements !== nextProps.selectedElements ||
        prevProps.renderScrollbars !== nextProps.renderScrollbars) {
        return false;
    }
    // Comparing the interactive appState for changes in case of some edge cases
    return (0, common_1.isShallowEqual)(
    // asserting AppState because we're being passed the whole AppState
    // but resolve to only the InteractiveCanvas-relevant props
    getRelevantAppStateProps(prevProps.appState), getRelevantAppStateProps(nextProps.appState));
};
exports.default = react_1.default.memo(InteractiveCanvas, areEqual);
