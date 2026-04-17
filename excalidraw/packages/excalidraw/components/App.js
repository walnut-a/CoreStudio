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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestHook = exports.useExcalidrawAPI = exports.useExcalidrawActionManager = exports.useExcalidrawSetAppState = exports.useExcalidrawAppState = exports.useExcalidrawElements = exports.useExcalidrawContainer = exports.useStylesPanelMode = exports.useEditorInterface = exports.useAppProps = exports.useApp = exports.ExcalidrawAPISetContext = exports.ExcalidrawAPIContext = exports.ExcalidrawContainerContext = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const react_1 = __importStar(require("react"));
const react_dom_1 = require("react-dom");
const rough_1 = __importDefault(require("roughjs/bin/rough"));
const nanoid_1 = require("nanoid");
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const actions_1 = require("../actions");
const actionBoundText_1 = require("../actions/actionBoundText");
const actionCanvas_1 = require("../actions/actionCanvas");
const actionClipboard_1 = require("../actions/actionClipboard");
const actionElementLink_1 = require("../actions/actionElementLink");
const actionElementLock_1 = require("../actions/actionElementLock");
const actionFrame_1 = require("../actions/actionFrame");
const actionHistory_1 = require("../actions/actionHistory");
const actionTextAutoResize_1 = require("../actions/actionTextAutoResize");
const actionToggleViewMode_1 = require("../actions/actionToggleViewMode");
const manager_1 = require("../actions/manager");
const register_1 = require("../actions/register");
const shortcuts_1 = require("../actions/shortcuts");
const analytics_1 = require("../analytics");
const animation_frame_handler_1 = require("../animation-frame-handler");
const appState_1 = require("../appState");
const clipboard_1 = require("../clipboard");
const data_1 = require("../data");
const library_1 = __importStar(require("../data/library"));
const restore_1 = require("../data/restore");
const gesture_1 = require("../gesture");
const history_1 = require("../history");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const zoom_1 = require("../scene/zoom");
const blob_1 = require("../data/blob");
const filesystem_1 = require("../data/filesystem");
const Hyperlink_1 = require("../components/hyperlink/Hyperlink");
const fonts_1 = require("../fonts");
const editor_jotai_1 = require("../editor-jotai");
const errors_1 = require("../errors");
const snapping_1 = require("../snapping");
const Renderer_1 = require("../scene/Renderer");
const cursor_1 = require("../cursor");
const ElementCanvasButtons_1 = require("../components/ElementCanvasButtons");
const laser_trails_1 = require("../laser-trails");
const reactUtils_1 = require("../reactUtils");
const textAutoResizeHandle_1 = require("../textAutoResizeHandle");
const textWysiwyg_1 = require("../wysiwyg/textWysiwyg");
const scrollbars_1 = require("../scene/scrollbars");
const mermaid_1 = require("../mermaid");
const lasso_1 = require("../lasso");
const eraser_1 = require("../eraser");
const shortcut_1 = require("../shortcut");
const charts_1 = require("../charts");
const ConvertElementTypePopup_1 = __importStar(require("./ConvertElementTypePopup"));
const ActiveConfirmDialog_1 = require("./ActiveConfirmDialog");
const BraveMeasureTextError_1 = __importDefault(require("./BraveMeasureTextError"));
const ContextMenu_1 = require("./ContextMenu");
const EyeDropper_1 = require("./EyeDropper");
const FollowMode_1 = __importDefault(require("./FollowMode/FollowMode"));
const LayerUI_1 = __importDefault(require("./LayerUI"));
const MagicButton_1 = require("./MagicButton");
const SVGLayer_1 = require("./SVGLayer");
const SearchMenu_1 = require("./SearchMenu");
const Sidebar_1 = require("./Sidebar/Sidebar");
const canvases_1 = require("./canvases");
const NewElementCanvas_1 = __importDefault(require("./canvases/NewElementCanvas"));
const helpers_1 = require("./hyperlink/helpers");
const icons_1 = require("./icons");
const AppStateObserver_1 = require("./AppStateObserver");
const shapes_1 = require("./shapes");
const UnlockPopup_1 = __importDefault(require("./UnlockPopup"));
const AppContext = react_1.default.createContext(null);
const AppPropsContext = react_1.default.createContext(null);
const editorInterfaceContextInitialValue = {
    formFactor: "desktop",
    desktopUIMode: "full",
    userAgent: (0, common_1.createUserAgentDescriptor)(typeof navigator !== "undefined" ? navigator.userAgent : ""),
    isTouchScreen: false,
    canFitSidebar: false,
    isLandscape: true,
};
const EditorInterfaceContext = react_1.default.createContext(editorInterfaceContextInitialValue);
EditorInterfaceContext.displayName = "EditorInterfaceContext";
const editorLifecycleEventBehavior = {
    "editor:mount": { cardinality: "once", replay: "last" },
    "editor:initialize": { cardinality: "once", replay: "last" },
    "editor:unmount": { cardinality: "once", replay: "last" },
};
exports.ExcalidrawContainerContext = react_1.default.createContext({ container: null, id: null });
exports.ExcalidrawContainerContext.displayName = "ExcalidrawContainerContext";
const ExcalidrawElementsContext = react_1.default.createContext([]);
ExcalidrawElementsContext.displayName = "ExcalidrawElementsContext";
const ExcalidrawAppStateContext = react_1.default.createContext({
    ...(0, appState_1.getDefaultAppState)(),
    width: 0,
    height: 0,
    offsetLeft: 0,
    offsetTop: 0,
});
ExcalidrawAppStateContext.displayName = "ExcalidrawAppStateContext";
const ExcalidrawSetAppStateContext = react_1.default.createContext(() => {
    console.warn("Uninitialized ExcalidrawSetAppStateContext context!");
});
ExcalidrawSetAppStateContext.displayName = "ExcalidrawSetAppStateContext";
const ExcalidrawActionManagerContext = react_1.default.createContext(null);
ExcalidrawActionManagerContext.displayName = "ExcalidrawActionManagerContext";
exports.ExcalidrawAPIContext = react_1.default.createContext(null);
exports.ExcalidrawAPIContext.displayName = "ExcalidrawAPIContext";
exports.ExcalidrawAPISetContext = react_1.default.createContext(null);
exports.ExcalidrawAPISetContext.displayName = "ExcalidrawAPISetContext";
const useApp = () => (0, react_1.useContext)(AppContext);
exports.useApp = useApp;
const useAppProps = () => (0, react_1.useContext)(AppPropsContext);
exports.useAppProps = useAppProps;
const useEditorInterface = () => (0, react_1.useContext)(EditorInterfaceContext);
exports.useEditorInterface = useEditorInterface;
const useStylesPanelMode = () => (0, common_1.deriveStylesPanelMode)((0, exports.useEditorInterface)());
exports.useStylesPanelMode = useStylesPanelMode;
const useExcalidrawContainer = () => (0, react_1.useContext)(exports.ExcalidrawContainerContext);
exports.useExcalidrawContainer = useExcalidrawContainer;
const useExcalidrawElements = () => (0, react_1.useContext)(ExcalidrawElementsContext);
exports.useExcalidrawElements = useExcalidrawElements;
const useExcalidrawAppState = () => (0, react_1.useContext)(ExcalidrawAppStateContext);
exports.useExcalidrawAppState = useExcalidrawAppState;
const useExcalidrawSetAppState = () => (0, react_1.useContext)(ExcalidrawSetAppStateContext);
exports.useExcalidrawSetAppState = useExcalidrawSetAppState;
const useExcalidrawActionManager = () => (0, react_1.useContext)(ExcalidrawActionManagerContext);
exports.useExcalidrawActionManager = useExcalidrawActionManager;
/**
 * Requires wrapping your component in <ExcalidrawAPIContext.Provider>
 */
const useExcalidrawAPI = () => (0, react_1.useContext)(exports.ExcalidrawAPIContext);
exports.useExcalidrawAPI = useExcalidrawAPI;
let didTapTwice = false;
let tappedTwiceTimer = 0;
let firstTapPosition = null;
let isHoldingSpace = false;
let isPanning = false;
let isDraggingScrollBar = false;
let currentScrollBars = { horizontal: null, vertical: null };
let touchTimeout = 0;
let invalidateContextMenu = false;
/**
 * Map of youtube embed video states
 */
const YOUTUBE_VIDEO_STATES = new Map();
let IS_PLAIN_PASTE = false;
let IS_PLAIN_PASTE_TIMER = 0;
let PLAIN_PASTE_TOAST_SHOWN = false;
let lastPointerUp = null;
const gesture = {
    pointers: new Map(),
    lastCenter: null,
    initialDistance: null,
    initialScale: null,
};
class App extends react_1.default.Component {
    canvas;
    interactiveCanvas = null;
    sessionExportThemeOverride;
    rc;
    unmounted = false;
    actionManager;
    editorInterface = editorInterfaceContextInitialValue;
    stylesPanelMode = (0, common_1.deriveStylesPanelMode)(editorInterfaceContextInitialValue);
    excalidrawContainerRef = react_1.default.createRef();
    scene;
    fonts;
    renderer;
    visibleElements;
    resizeObserver;
    library;
    libraryItemsFromStorage;
    id;
    store;
    history;
    excalidrawContainerValue;
    files = {};
    imageCache = new Map();
    iFrameRefs = new Map();
    /**
     * Indicates whether the embeddable's url has been validated for rendering.
     * If value not set, indicates that the validation is pending.
     * Initially or on url change the flag is not reset so that we can guarantee
     * the validation came from a trusted source (the editor).
     **/
    embedsValidationStatus = new Map();
    /** embeds that have been inserted to DOM (as a perf optim, we don't want to
     * insert to DOM before user initially scrolls to them) */
    initializedEmbeds = new Set();
    elementsPendingErasure = new Set();
    _initialized = false;
    editorLifecycleEvents = new common_1.AppEventBus(editorLifecycleEventBehavior);
    onEvent = this.editorLifecycleEvents.on.bind(this.editorLifecycleEvents);
    appStateObserver = new AppStateObserver_1.AppStateObserver(() => this.state);
    onStateChange = this.appStateObserver.onStateChange;
    flowChartCreator = new element_1.FlowChartCreator();
    flowChartNavigator = new element_1.FlowChartNavigator();
    bindModeHandler = null;
    hitLinkElement;
    lastPointerDownEvent = null;
    lastPointerUpEvent = null;
    // TODO this is a hack and we should ideally unify touch and pointer events
    // and implement our own double click handling end-to-end (currently we're
    // using a mix of native browser for click events and manual for touch -
    // and browser doubleClick sucks to begin with)
    lastPointerUpIsDoubleClick = false;
    lastPointerMoveEvent = null;
    /** current frame pointer cords */
    lastPointerMoveCoords = null;
    lastCompletedCanvasClicks = [];
    /** previous frame pointer coords */
    previousPointerMoveCoords = null;
    lastViewportPosition = { x: 0, y: 0 };
    animationFrameHandler = new animation_frame_handler_1.AnimationFrameHandler();
    laserTrails = new laser_trails_1.LaserTrails(this.animationFrameHandler, this);
    eraserTrail = new eraser_1.EraserTrail(this.animationFrameHandler, this);
    lassoTrail = new lasso_1.LassoTrail(this.animationFrameHandler, this);
    onChangeEmitter = new common_1.Emitter();
    onPointerDownEmitter = new common_1.Emitter();
    onPointerUpEmitter = new common_1.Emitter();
    onUserFollowEmitter = new common_1.Emitter();
    onScrollChangeEmitter = new common_1.Emitter();
    missingPointerEventCleanupEmitter = new common_1.Emitter();
    onRemoveEventListenersEmitter = new common_1.Emitter();
    api;
    createExcalidrawAPI() {
        const api = {
            isDestroyed: false,
            updateScene: this.updateScene,
            applyDeltas: this.applyDeltas,
            mutateElement: this.mutateElement,
            updateLibrary: this.library.updateLibrary,
            addFiles: this.addFiles,
            resetScene: this.resetScene,
            getSceneElementsIncludingDeleted: this.getSceneElementsIncludingDeleted,
            getSceneElementsMapIncludingDeleted: this.getSceneElementsMapIncludingDeleted,
            history: {
                clear: this.resetHistory,
            },
            scrollToContent: this.scrollToContent,
            getSceneElements: this.getSceneElements,
            getAppState: () => this.state,
            getFiles: () => this.files,
            getName: this.getName,
            registerAction: (action) => {
                this.actionManager.registerAction(action);
            },
            refresh: this.refresh,
            setToast: this.setToast,
            id: this.id,
            setActiveTool: this.setActiveTool,
            setCursor: this.setCursor,
            resetCursor: this.resetCursor,
            getEditorInterface: () => this.editorInterface,
            updateFrameRendering: this.updateFrameRendering,
            toggleSidebar: this.toggleSidebar,
            onChange: (cb) => this.onChangeEmitter.on(cb),
            onIncrement: (cb) => this.store.onStoreIncrementEmitter.on(cb),
            onPointerDown: (cb) => this.onPointerDownEmitter.on(cb),
            onPointerUp: (cb) => this.onPointerUpEmitter.on(cb),
            onScrollChange: (cb) => this.onScrollChangeEmitter.on(cb),
            onUserFollow: (cb) => this.onUserFollowEmitter.on(cb),
            onStateChange: this.onStateChange,
            onEvent: this.onEvent,
        };
        return api;
    }
    constructor(props) {
        super(props);
        const defaultAppState = (0, appState_1.getDefaultAppState)();
        const { viewModeEnabled = false, zenModeEnabled = false, gridModeEnabled = false, objectsSnapModeEnabled = false, theme = defaultAppState.theme, name = `${(0, i18n_1.t)("labels.untitled")}-${(0, common_1.getDateTime)()}`, } = props;
        this.state = {
            ...defaultAppState,
            theme,
            exportWithDarkMode: theme === common_1.THEME.DARK,
            isLoading: true,
            ...this.getCanvasOffsets(),
            viewModeEnabled,
            zenModeEnabled,
            objectsSnapModeEnabled,
            gridModeEnabled: gridModeEnabled ?? defaultAppState.gridModeEnabled,
            name,
            width: window.innerWidth,
            height: window.innerHeight,
        };
        this.refreshEditorInterface();
        this.stylesPanelMode = (0, common_1.deriveStylesPanelMode)(this.editorInterface);
        this.id = (0, nanoid_1.nanoid)();
        this.library = new library_1.default(this);
        this.actionManager = new manager_1.ActionManager(this.syncActionResult, () => this.state, () => this.scene.getElementsIncludingDeleted(), this);
        this.scene = new element_1.Scene();
        this.canvas = document.createElement("canvas");
        this.rc = rough_1.default.canvas(this.canvas);
        this.renderer = new Renderer_1.Renderer(this.scene);
        this.visibleElements = [];
        this.store = new element_1.Store(this);
        this.history = new history_1.History(this.store);
        this.excalidrawContainerValue = {
            container: this.excalidrawContainerRef.current,
            id: this.id,
        };
        this.fonts = new fonts_1.Fonts(this.scene);
        this.history = new history_1.History(this.store);
        this.actionManager.registerAll(register_1.actions);
        this.actionManager.registerAction((0, actionHistory_1.createUndoAction)(this.history));
        this.actionManager.registerAction((0, actionHistory_1.createRedoAction)(this.history));
        // in case internal editor APIs call this early, otherwise we need
        // to construct this in componentDidMount because componentWillUnmount
        // will invalidate it (so in StrictMode, doing this in constructor alone
        // would be a problem)
        this.api = this.createExcalidrawAPI();
    }
    updateEditorAtom = (atom, ...args) => {
        const result = editor_jotai_1.editorJotaiStore.set(atom, ...args);
        this.triggerRender();
        return result;
    };
    onWindowMessage(event) {
        if (event.origin !== "https://player.vimeo.com" &&
            event.origin !== "https://www.youtube.com") {
            return;
        }
        let data = null;
        try {
            data = JSON.parse(event.data);
        }
        catch (e) { }
        if (!data) {
            return;
        }
        switch (event.origin) {
            case "https://player.vimeo.com":
                //Allowing for multiple instances of Excalidraw running in the window
                if (data.method === "paused") {
                    let source = null;
                    const iframes = document.body.querySelectorAll("iframe.excalidraw__embeddable");
                    if (!iframes) {
                        break;
                    }
                    for (const iframe of iframes) {
                        if (iframe.contentWindow === event.source) {
                            source = iframe.contentWindow;
                        }
                    }
                    source?.postMessage(JSON.stringify({
                        method: data.value ? "play" : "pause",
                        value: true,
                    }), "*");
                }
                break;
            case "https://www.youtube.com":
                if (data.event === "infoDelivery" &&
                    data.info &&
                    data.id &&
                    typeof data.info.playerState === "number") {
                    const id = data.id;
                    const playerState = data.info.playerState;
                    if (Object.values(common_1.YOUTUBE_STATES).includes(playerState)) {
                        YOUTUBE_VIDEO_STATES.set(id, playerState);
                    }
                }
                break;
        }
    }
    handleSkipBindMode() {
        if (this.state.selectedLinearElement?.initialState &&
            !this.state.selectedLinearElement.initialState.arrowStartIsInside) {
            (0, common_1.invariant)(this.lastPointerMoveCoords, "Missing last pointer move coords when changing bind skip mode for arrow start");
            const elementsMap = this.scene.getNonDeletedElementsMap();
            const hoveredElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(this.lastPointerMoveCoords.x, this.lastPointerMoveCoords.y), this.scene.getNonDeletedElements(), elementsMap);
            const element = element_1.LinearElementEditor.getElement(this.state.selectedLinearElement.elementId, elementsMap);
            if (element?.startBinding &&
                hoveredElement?.id === element.startBinding.elementId) {
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        initialState: {
                            ...this.state.selectedLinearElement.initialState,
                            arrowStartIsInside: true,
                        },
                    },
                });
            }
        }
        if (this.state.bindMode === "orbit") {
            if (this.bindModeHandler) {
                clearTimeout(this.bindModeHandler);
                this.bindModeHandler = null;
            }
            // PERF: It's okay since it's a single trigger from a key handler
            // or single call from pointer move handler because the bindMode check
            // will not pass the second time
            (0, react_dom_1.flushSync)(() => {
                this.setState({
                    bindMode: "skip",
                });
            });
            if (this.lastPointerMoveCoords &&
                this.state.selectedLinearElement?.selectedPointsIndices &&
                this.state.selectedLinearElement?.selectedPointsIndices.length) {
                const { x, y } = this.lastPointerMoveCoords;
                const event = this.lastPointerMoveEvent ?? this.lastPointerDownEvent?.nativeEvent;
                (0, common_1.invariant)(event, "Last event must exist");
                const deltaX = x - this.state.selectedLinearElement.pointerOffset.x;
                const deltaY = y - this.state.selectedLinearElement.pointerOffset.y;
                const newState = this.state.multiElement
                    ? element_1.LinearElementEditor.handlePointerMove(event, this, deltaX, deltaY, this.state.selectedLinearElement)
                    : element_1.LinearElementEditor.handlePointDragging(event, this, deltaX, deltaY, this.state.selectedLinearElement);
                if (newState) {
                    this.setState(newState);
                }
            }
        }
    }
    resetDelayedBindMode() {
        if (this.bindModeHandler) {
            clearTimeout(this.bindModeHandler);
            this.bindModeHandler = null;
        }
        if (this.state.bindMode !== "orbit") {
            // We need this iteration to complete binding and change
            // back to orbit mode after that
            setTimeout(() => this.setState({
                bindMode: "orbit",
            }));
        }
    }
    previousHoveredBindableElement = null;
    handleDelayedBindModeChange(arrow, hoveredElement) {
        if (arrow.isDeleted || (0, element_1.isElbowArrow)(arrow)) {
            return;
        }
        const effector = () => {
            this.bindModeHandler = null;
            (0, common_1.invariant)(this.lastPointerMoveCoords, "Expected lastPointerMoveCoords to be set");
            if (!this.state.multiElement) {
                if (!this.state.selectedLinearElement ||
                    !this.state.selectedLinearElement.selectedPointsIndices ||
                    !this.state.selectedLinearElement.selectedPointsIndices.length) {
                    return;
                }
                const startDragged = this.state.selectedLinearElement.selectedPointsIndices.includes(0);
                const endDragged = this.state.selectedLinearElement.selectedPointsIndices.includes(arrow.points.length - 1);
                // Check if the whole arrow is dragged by selecting all endpoints
                if ((!startDragged && !endDragged) || (startDragged && endDragged)) {
                    return;
                }
            }
            const { x, y } = this.lastPointerMoveCoords;
            const hoveredElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(x, y), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap());
            if (hoveredElement && this.state.bindMode !== "skip") {
                (0, common_1.invariant)(this.state.selectedLinearElement?.elementId === arrow.id, "The selectedLinearElement is expected to not change while a bind mode timeout is ticking");
                // Once the start is set to inside binding, it remains so
                const arrowStartIsInside = this.state.selectedLinearElement.initialState.arrowStartIsInside ||
                    arrow.startBinding?.elementId === hoveredElement.id;
                // Change the global binding mode
                (0, react_dom_1.flushSync)(() => {
                    (0, common_1.invariant)(this.state.selectedLinearElement, "this.state.selectedLinearElement must exist");
                    this.setState({
                        bindMode: "inside",
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            initialState: {
                                ...this.state.selectedLinearElement.initialState,
                                arrowStartIsInside,
                            },
                        },
                    });
                });
                const event = this.lastPointerMoveEvent ?? this.lastPointerDownEvent?.nativeEvent;
                (0, common_1.invariant)(event, "Last event must exist");
                const deltaX = x - this.state.selectedLinearElement.pointerOffset.x;
                const deltaY = y - this.state.selectedLinearElement.pointerOffset.y;
                const newState = this.state.multiElement
                    ? element_1.LinearElementEditor.handlePointerMove(event, this, deltaX, deltaY, this.state.selectedLinearElement)
                    : element_1.LinearElementEditor.handlePointDragging(event, this, deltaX, deltaY, this.state.selectedLinearElement);
                if (newState) {
                    this.setState(newState);
                }
            }
        };
        let isOverlapping = false;
        if (this.state.selectedLinearElement?.selectedPointsIndices) {
            const elementsMap = this.scene.getNonDeletedElementsMap();
            const startDragged = this.state.selectedLinearElement.selectedPointsIndices.includes(0);
            const endDragged = this.state.selectedLinearElement.selectedPointsIndices.includes(arrow.points.length - 1);
            const startElement = startDragged
                ? hoveredElement
                : arrow.startBinding && elementsMap.get(arrow.startBinding.elementId);
            const endElement = endDragged
                ? hoveredElement
                : arrow.endBinding && elementsMap.get(arrow.endBinding.elementId);
            const startBounds = startElement && (0, element_1.getElementBounds)(startElement, elementsMap);
            const endBounds = endElement && (0, element_1.getElementBounds)(endElement, elementsMap);
            isOverlapping = !!(startBounds &&
                endBounds &&
                startElement.id !== endElement.id &&
                (0, element_1.doBoundsIntersect)(startBounds, endBounds));
        }
        const startDragged = this.state.selectedLinearElement?.selectedPointsIndices?.includes(0);
        const endDragged = this.state.selectedLinearElement?.selectedPointsIndices?.includes(arrow.points.length - 1);
        const currentBinding = startDragged
            ? "startBinding"
            : endDragged
                ? "endBinding"
                : null;
        const otherBinding = startDragged
            ? "endBinding"
            : endDragged
                ? "startBinding"
                : null;
        const isAlreadyInsideBindingToSameElement = (otherBinding &&
            arrow[otherBinding]?.mode === "inside" &&
            arrow[otherBinding]?.elementId === hoveredElement?.id) ||
            (currentBinding &&
                arrow[currentBinding]?.mode === "inside" &&
                hoveredElement?.id === arrow[currentBinding]?.elementId);
        if (currentBinding &&
            otherBinding &&
            arrow[currentBinding]?.mode === "inside" &&
            hoveredElement?.id !== arrow[currentBinding]?.elementId &&
            arrow[otherBinding]?.elementId !== arrow[currentBinding]?.elementId) {
            // Update binding out of place to orbit mode
            this.scene.mutateElement(arrow, {
                [currentBinding]: {
                    ...arrow[currentBinding],
                    mode: "orbit",
                },
            }, {
                informMutation: false,
                isDragging: true,
            });
        }
        if (!hoveredElement ||
            (this.previousHoveredBindableElement &&
                hoveredElement.id !== this.previousHoveredBindableElement.id)) {
            // Clear the timeout if we're not hovering a bindable
            if (this.bindModeHandler) {
                clearTimeout(this.bindModeHandler);
                this.bindModeHandler = null;
            }
            // Clear the inside binding mode too
            if (this.state.bindMode === "inside") {
                (0, react_dom_1.flushSync)(() => {
                    this.setState({
                        bindMode: "orbit",
                    });
                });
            }
            this.previousHoveredBindableElement = null;
        }
        else if (!this.bindModeHandler &&
            (!this.state.newElement || !arrow.startBinding || isOverlapping) &&
            !isAlreadyInsideBindingToSameElement) {
            // We are hovering a bindable element
            this.bindModeHandler = setTimeout(effector, common_1.BIND_MODE_TIMEOUT);
        }
        this.previousHoveredBindableElement = hoveredElement;
    }
    cacheEmbeddableRef(element, ref) {
        if (ref) {
            this.iFrameRefs.set(element.id, ref);
        }
    }
    /**
     * Returns gridSize taking into account `gridModeEnabled`.
     * If disabled, returns null.
     */
    getEffectiveGridSize = () => {
        return ((0, snapping_1.isGridModeEnabled)(this) ? this.state.gridSize : null);
    };
    getTextCreationGridPoint = (x, y) => {
        const effectiveGridSize = this.getEffectiveGridSize();
        if (effectiveGridSize === null) {
            return null;
        }
        const getTextCreationGridCoordinate = (coordinate) => {
            const topLeftGridPoint = Math.floor(coordinate / effectiveGridSize) * effectiveGridSize;
            return topLeftGridPoint;
        };
        return {
            x: getTextCreationGridCoordinate(x),
            y: getTextCreationGridCoordinate(y),
        };
    };
    getHTMLIFrameElement(element) {
        return this.iFrameRefs.get(element.id);
    }
    handleIframeLikeElementHover = ({ hitElement, scenePointer, moveEvent, }) => {
        if (hitElement &&
            (0, element_1.isIframeLikeElement)(hitElement) &&
            (this.state.viewModeEnabled ||
                this.state.activeTool.type === "laser" ||
                this.isIframeLikeElementCenter(hitElement, moveEvent, scenePointer.x, scenePointer.y))) {
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
            this.setState({
                activeEmbeddable: { element: hitElement, state: "hover" },
            });
            return true;
        }
        else if (this.state.activeEmbeddable?.state === "hover") {
            this.setState({ activeEmbeddable: null });
        }
        return false;
    };
    /** @returns true if iframe-like element click handled */
    handleIframeLikeCenterClick() {
        if (!this.lastPointerDownEvent ||
            !this.lastPointerUpEvent ||
            // middle-click or something other than primary
            this.lastPointerDownEvent.button !== common_1.POINTER_BUTTON.MAIN ||
            // panning
            isHoldingSpace ||
            // wrong tool
            !(0, common_1.oneOf)(this.state.activeTool.type, ["laser", "selection", "lasso"])) {
            return false;
        }
        const viewportClickStart_scenePoint = (0, math_1.pointFrom)((0, common_1.viewportCoordsToSceneCoords)({
            clientX: this.lastPointerDownEvent.clientX,
            clientY: this.lastPointerDownEvent.clientY,
        }, this.state));
        const viewportClickEnd_scenePoint = (0, math_1.pointFrom)((0, common_1.viewportCoordsToSceneCoords)({
            clientX: this.lastPointerUpEvent.clientX,
            clientY: this.lastPointerUpEvent.clientY,
        }, this.state));
        const draggedDistance = (0, math_1.pointDistance)(viewportClickStart_scenePoint, viewportClickEnd_scenePoint);
        if (draggedDistance > common_1.DRAGGING_THRESHOLD) {
            return false;
        }
        const hitElement = this.getElementAtPosition(viewportClickStart_scenePoint[0], viewportClickStart_scenePoint[1]);
        const shouldActivate = hitElement &&
            this.lastPointerUpEvent.timeStamp - this.lastPointerDownEvent.timeStamp <=
                300 &&
            gesture.pointers.size < 2 &&
            (0, element_1.isIframeLikeElement)(hitElement) &&
            (this.state.viewModeEnabled ||
                this.state.activeTool.type === "laser" ||
                this.isIframeLikeElementCenter(hitElement, this.lastPointerUpEvent, viewportClickEnd_scenePoint[0], viewportClickEnd_scenePoint[1]));
        if (!shouldActivate) {
            return false;
        }
        const iframeLikeElement = hitElement;
        if (this.state.activeEmbeddable?.element === iframeLikeElement &&
            this.state.activeEmbeddable?.state === "active") {
            return true;
        }
        // The delay serves two purposes
        // 1. To prevent first click propagating to iframe on mobile,
        //    else the click will immediately start and stop the video
        // 2. If the user double clicks the frame center to activate it
        //    without the delay youtube will immediately open the video
        //    in fullscreen mode
        setTimeout(() => {
            this.setState({
                activeEmbeddable: { element: iframeLikeElement, state: "active" },
                selectedElementIds: { [iframeLikeElement.id]: true },
                newElement: null,
                selectionElement: null,
            });
        }, 100);
        if ((0, element_1.isIframeElement)(iframeLikeElement)) {
            return true;
        }
        const iframe = this.getHTMLIFrameElement(iframeLikeElement);
        if (!iframe?.contentWindow) {
            return true;
        }
        if (iframe.src.includes("youtube")) {
            const state = YOUTUBE_VIDEO_STATES.get(iframeLikeElement.id);
            if (!state) {
                YOUTUBE_VIDEO_STATES.set(iframeLikeElement.id, common_1.YOUTUBE_STATES.UNSTARTED);
                iframe.contentWindow.postMessage(JSON.stringify({
                    event: "listening",
                    id: iframeLikeElement.id,
                }), "*");
            }
            switch (state) {
                case common_1.YOUTUBE_STATES.PLAYING:
                case common_1.YOUTUBE_STATES.BUFFERING:
                    iframe.contentWindow?.postMessage(JSON.stringify({
                        event: "command",
                        func: "pauseVideo",
                        args: "",
                    }), "*");
                    break;
                default:
                    iframe.contentWindow?.postMessage(JSON.stringify({
                        event: "command",
                        func: "playVideo",
                        args: "",
                    }), "*");
            }
        }
        if (iframe.src.includes("player.vimeo.com")) {
            iframe.contentWindow.postMessage(JSON.stringify({
                method: "paused", //video play/pause in onWindowMessage handler
            }), "*");
        }
        return true;
    }
    isDoubleClick = (lastPointerEvent, currentPointerEvent) => {
        return (lastPointerEvent != null &&
            currentPointerEvent.timeStamp - lastPointerEvent.timeStamp <=
                common_1.TAP_TWICE_TIMEOUT);
    };
    isIframeLikeElementCenter(el, event, sceneX, sceneY) {
        return (el &&
            !event.altKey &&
            !event.shiftKey &&
            !event.metaKey &&
            !event.ctrlKey &&
            (this.state.activeEmbeddable?.element !== el ||
                this.state.activeEmbeddable?.state === "hover" ||
                !this.state.activeEmbeddable) &&
            sceneX >= el.x + el.width / 3 &&
            sceneX <= el.x + (2 * el.width) / 3 &&
            sceneY >= el.y + el.height / 3 &&
            sceneY <= el.y + (2 * el.height) / 3);
    }
    updateEmbedValidationStatus = (element, status) => {
        this.embedsValidationStatus.set(element.id, status);
        element_1.ShapeCache.delete(element);
    };
    updateEmbeddables = () => {
        const iframeLikes = new Set();
        let updated = false;
        this.scene.getNonDeletedElements().filter((element) => {
            if ((0, element_1.isEmbeddableElement)(element)) {
                iframeLikes.add(element.id);
                if (!this.embedsValidationStatus.has(element.id)) {
                    updated = true;
                    const validated = (0, element_1.embeddableURLValidator)(element.link, this.props.validateEmbeddable);
                    this.updateEmbedValidationStatus(element, validated);
                }
            }
            else if ((0, element_1.isIframeElement)(element)) {
                iframeLikes.add(element.id);
            }
            return false;
        });
        if (updated) {
            this.scene.triggerUpdate();
        }
        // GC
        this.iFrameRefs.forEach((ref, id) => {
            if (!iframeLikes.has(id)) {
                this.iFrameRefs.delete(id);
            }
        });
    };
    renderEmbeddables() {
        const scale = this.state.zoom.value;
        const normalizedWidth = this.state.width;
        const normalizedHeight = this.state.height;
        const embeddableElements = this.scene
            .getNonDeletedElements()
            .filter((el) => ((0, element_1.isEmbeddableElement)(el) &&
            this.embedsValidationStatus.get(el.id) === true) ||
            (0, element_1.isIframeElement)(el));
        return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: embeddableElements.map((el) => {
                const { x, y } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: el.x, sceneY: el.y }, this.state);
                const isVisible = (0, element_1.isElementInViewport)(el, normalizedWidth, normalizedHeight, this.state, this.scene.getNonDeletedElementsMap());
                const hasBeenInitialized = this.initializedEmbeds.has(el.id);
                if (isVisible && !hasBeenInitialized) {
                    this.initializedEmbeds.add(el.id);
                }
                const shouldRender = isVisible || hasBeenInitialized;
                if (!shouldRender) {
                    return null;
                }
                let src;
                if ((0, element_1.isIframeElement)(el)) {
                    src = null;
                    const data = (el.customData?.generationData ??
                        this.magicGenerations.get(el.id)) || {
                        status: "error",
                        message: "No generation data",
                        code: "ERR_NO_GENERATION_DATA",
                    };
                    if (data.status === "done") {
                        const html = data.html;
                        src = {
                            intrinsicSize: { w: el.width, h: el.height },
                            type: "document",
                            srcdoc: () => {
                                return html;
                            },
                        };
                    }
                    else if (data.status === "pending") {
                        src = {
                            intrinsicSize: { w: el.width, h: el.height },
                            type: "document",
                            srcdoc: () => {
                                return (0, element_1.createSrcDoc)(`
                    <style>
                      html, body {
                        width: 100%;
                        height: 100%;
                        color: ${this.state.theme === common_1.THEME.DARK ? "white" : "black"};
                      }
                      body {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        gap: 1rem;
                      }

                      .Spinner {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-left: auto;
                        margin-right: auto;
                      }

                      .Spinner svg {
                        animation: rotate 1.6s linear infinite;
                        transform-origin: center center;
                        width: 40px;
                        height: 40px;
                      }

                      .Spinner circle {
                        stroke: currentColor;
                        animation: dash 1.6s linear 0s infinite;
                        stroke-linecap: round;
                      }

                      @keyframes rotate {
                        100% {
                          transform: rotate(360deg);
                        }
                      }

                      @keyframes dash {
                        0% {
                          stroke-dasharray: 1, 300;
                          stroke-dashoffset: 0;
                        }
                        50% {
                          stroke-dasharray: 150, 300;
                          stroke-dashoffset: -200;
                        }
                        100% {
                          stroke-dasharray: 1, 300;
                          stroke-dashoffset: -280;
                        }
                      }
                    </style>
                    <div class="Spinner">
                      <svg
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          stroke-width="8"
                          fill="none"
                          stroke-miter-limit="10"
                        />
                      </svg>
                    </div>
                    <div>Generating...</div>
                  `);
                            },
                        };
                    }
                    else {
                        let message;
                        if (data.code === "ERR_GENERATION_INTERRUPTED") {
                            message = "Generation was interrupted...";
                        }
                        else {
                            message = data.message || "Generation failed";
                        }
                        src = {
                            intrinsicSize: { w: el.width, h: el.height },
                            type: "document",
                            srcdoc: () => {
                                return (0, element_1.createSrcDoc)(`
                    <style>
                    html, body {
                      height: 100%;
                    }
                      body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: ${common_1.COLOR_PALETTE.red[3]};
                      }
                      h1, h3 {
                        margin-top: 0;
                        margin-bottom: 0.5rem;
                      }
                    </style>
                    <h1>Error!</h1>
                    <h3>${message}</h3>
                  `);
                            },
                        };
                    }
                }
                else {
                    src = (0, element_1.getEmbedLink)((0, common_1.toValidURL)(el.link || ""));
                }
                const isActive = this.state.activeEmbeddable?.element === el &&
                    this.state.activeEmbeddable?.state === "active";
                const isHovered = this.state.activeEmbeddable?.element === el &&
                    this.state.activeEmbeddable?.state === "hover";
                return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("excalidraw__embeddable-container", {
                        "is-hovered": isHovered,
                    }), style: {
                        transform: isVisible
                            ? `translate(${x - this.state.offsetLeft}px, ${y - this.state.offsetTop}px) scale(${scale})`
                            : "none",
                        display: isVisible ? "block" : "none",
                        opacity: (0, element_1.getRenderOpacity)(el, (0, element_1.getContainingFrame)(el, this.scene.getNonDeletedElementsMap()), this.elementsPendingErasure, null, this.state.openDialog?.name === "elementLinkSelector"
                            ? common_1.DEFAULT_REDUCED_GLOBAL_ALPHA
                            : 1),
                        ["--embeddable-radius"]: `${(0, element_1.getCornerRadius)(Math.min(el.width, el.height), el)}px`,
                    }, children: (0, jsx_runtime_1.jsxs)("div", { 
                        //this is a hack that addresses isse with embedded excalidraw.com embeddable
                        //https://github.com/excalidraw/excalidraw/pull/6691#issuecomment-1607383938
                        /*ref={(ref) => {
                          if (!this.excalidrawContainerRef.current) {
                            return;
                          }
                          const container = this.excalidrawContainerRef.current;
                          const sh = container.scrollHeight;
                          const ch = container.clientHeight;
                          if (sh !== ch) {
                            container.style.height = `${sh}px`;
                            setTimeout(() => {
                              container.style.height = `100%`;
                            });
                          }
                        }}*/
                        className: "excalidraw__embeddable-container__inner", style: {
                            width: isVisible ? `${el.width}px` : 0,
                            height: isVisible ? `${el.height}px` : 0,
                            transform: isVisible ? `rotate(${el.angle}rad)` : "none",
                            pointerEvents: isActive
                                ? common_1.POINTER_EVENTS.enabled
                                : common_1.POINTER_EVENTS.disabled,
                        }, children: [isHovered && ((0, jsx_runtime_1.jsx)("div", { className: "excalidraw__embeddable-hint", children: (0, i18n_1.t)("buttons.embeddableInteractionButton") })), (0, jsx_runtime_1.jsx)("div", { className: "excalidraw__embeddable__outer", style: {
                                    padding: `${el.strokeWidth}px`,
                                }, children: ((0, element_1.isEmbeddableElement)(el)
                                    ? this.props.renderEmbeddable?.(el, this.state)
                                    : null) ?? ((0, jsx_runtime_1.jsx)("iframe", { ref: (ref) => this.cacheEmbeddableRef(el, ref), className: "excalidraw__embeddable", srcDoc: src?.type === "document"
                                        ? src.srcdoc(this.state.theme)
                                        : undefined, src: src?.type !== "document" ? src?.link ?? "" : undefined, 
                                    // https://stackoverflow.com/q/18470015
                                    scrolling: "no", referrerPolicy: "no-referrer-when-downgrade", title: "Excalidraw Embedded Content", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, sandbox: `${src?.sandbox?.allowSameOrigin ? "allow-same-origin" : ""} allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads` })) })] }) }, el.id));
            }) }));
    }
    getFrameNameDOMId = (frameElement) => {
        return `${this.id}-frame-name-${frameElement.id}`;
    };
    frameNameBoundsCache = {
        get: (frameElement) => {
            let bounds = this.frameNameBoundsCache._cache.get(frameElement.id);
            if (!bounds ||
                bounds.zoom !== this.state.zoom.value ||
                bounds.versionNonce !== frameElement.versionNonce) {
                const frameNameDiv = document.getElementById(this.getFrameNameDOMId(frameElement));
                if (frameNameDiv) {
                    const box = frameNameDiv.getBoundingClientRect();
                    const boxSceneTopLeft = (0, common_1.viewportCoordsToSceneCoords)({ clientX: box.x, clientY: box.y }, this.state);
                    const boxSceneBottomRight = (0, common_1.viewportCoordsToSceneCoords)({ clientX: box.right, clientY: box.bottom }, this.state);
                    bounds = {
                        x: boxSceneTopLeft.x,
                        y: boxSceneTopLeft.y,
                        width: boxSceneBottomRight.x - boxSceneTopLeft.x,
                        height: boxSceneBottomRight.y - boxSceneTopLeft.y,
                        angle: 0,
                        zoom: this.state.zoom.value,
                        versionNonce: frameElement.versionNonce,
                    };
                    this.frameNameBoundsCache._cache.set(frameElement.id, bounds);
                    return bounds;
                }
                return null;
            }
            return bounds;
        },
        /**
         * @private
         */
        _cache: new Map(),
    };
    resetEditingFrame = (frame) => {
        if (frame) {
            this.scene.mutateElement(frame, { name: frame.name?.trim() || null });
        }
        this.setState({ editingFrame: null });
    };
    renderFrameNames = () => {
        if (!this.state.frameRendering.enabled || !this.state.frameRendering.name) {
            if (this.state.editingFrame) {
                this.resetEditingFrame(null);
            }
            return null;
        }
        const isDarkTheme = this.state.theme === common_1.THEME.DARK;
        const nonDeletedFramesLikes = this.scene.getNonDeletedFramesLikes();
        const focusedSearchMatch = nonDeletedFramesLikes.length > 0
            ? this.state.searchMatches?.focusedId &&
                (0, element_1.isFrameLikeElement)(this.scene.getElement(this.state.searchMatches.focusedId))
                ? this.state.searchMatches.matches.find((sm) => sm.focus)
                : null
            : null;
        return nonDeletedFramesLikes.map((f) => {
            if (!(0, element_1.isElementInViewport)(f, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio, {
                offsetLeft: this.state.offsetLeft,
                offsetTop: this.state.offsetTop,
                scrollX: this.state.scrollX,
                scrollY: this.state.scrollY,
                zoom: this.state.zoom,
            }, this.scene.getNonDeletedElementsMap())) {
                if (this.state.editingFrame === f.id) {
                    this.resetEditingFrame(f);
                }
                // if frame not visible, don't render its name
                return null;
            }
            const { x: x1, y: y1 } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: f.x, sceneY: f.y }, this.state);
            const FRAME_NAME_EDIT_PADDING = 6;
            let frameNameJSX;
            const frameName = (0, element_1.getFrameLikeTitle)(f);
            if (f.id === this.state.editingFrame) {
                const frameNameInEdit = frameName;
                frameNameJSX = ((0, jsx_runtime_1.jsx)("input", { autoFocus: true, value: frameNameInEdit, onChange: (e) => {
                        this.scene.mutateElement(f, {
                            name: e.target.value,
                        });
                    }, onFocus: (e) => e.target.select(), onBlur: () => this.resetEditingFrame(f), onKeyDown: (event) => {
                        // for some inexplicable reason, `onBlur` triggered on ESC
                        // does not reset `state.editingFrame` despite being called,
                        // and we need to reset it here as well
                        if (event.key === common_1.KEYS.ESCAPE || event.key === common_1.KEYS.ENTER) {
                            this.resetEditingFrame(f);
                        }
                    }, style: {
                        background: isDarkTheme
                            ? (0, common_1.applyDarkModeFilter)(this.state.viewBackgroundColor)
                            : this.state.viewBackgroundColor,
                        zIndex: 2,
                        border: "none",
                        display: "block",
                        padding: `${FRAME_NAME_EDIT_PADDING}px`,
                        borderRadius: 4,
                        boxShadow: "inset 0 0 0 1px var(--color-primary)",
                        fontFamily: "Assistant",
                        fontSize: `${common_1.FRAME_STYLE.nameFontSize}px`,
                        transform: `translate(-${FRAME_NAME_EDIT_PADDING}px, ${FRAME_NAME_EDIT_PADDING}px)`,
                        color: isDarkTheme
                            ? common_1.FRAME_STYLE.nameColorDarkTheme
                            : common_1.FRAME_STYLE.nameColorLightTheme,
                        overflow: "hidden",
                        maxWidth: `${document.body.clientWidth - x1 - FRAME_NAME_EDIT_PADDING}px`,
                    }, size: frameNameInEdit.length + 1 || 1, dir: "auto", autoComplete: "off", autoCapitalize: "off", autoCorrect: "off" }));
            }
            else {
                frameNameJSX = frameName;
            }
            return ((0, jsx_runtime_1.jsx)("div", { id: this.getFrameNameDOMId(f), className: common_1.CLASSES.FRAME_NAME, style: {
                    position: "absolute",
                    // Positioning from bottom so that we don't to either
                    // calculate text height or adjust using transform (which)
                    // messes up input position when editing the frame name.
                    // This makes the positioning deterministic and we can calculate
                    // the same position when rendering to canvas / svg.
                    bottom: `${this.state.height +
                        common_1.FRAME_STYLE.nameOffsetY -
                        y1 +
                        this.state.offsetTop}px`,
                    left: `${x1 - this.state.offsetLeft}px`,
                    zIndex: 2,
                    fontSize: common_1.FRAME_STYLE.nameFontSize,
                    color: isDarkTheme
                        ? common_1.FRAME_STYLE.nameColorDarkTheme
                        : common_1.FRAME_STYLE.nameColorLightTheme,
                    lineHeight: common_1.FRAME_STYLE.nameLineHeight,
                    width: "max-content",
                    maxWidth: focusedSearchMatch?.id === f.id && focusedSearchMatch?.focus
                        ? "none"
                        : `${f.width * this.state.zoom.value}px`,
                    overflow: f.id === this.state.editingFrame ? "visible" : "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    cursor: common_1.CURSOR_TYPE.MOVE,
                    pointerEvents: this.state.viewModeEnabled
                        ? common_1.POINTER_EVENTS.disabled
                        : common_1.POINTER_EVENTS.enabled,
                }, onPointerDown: (event) => this.handleCanvasPointerDown(event), onWheel: (event) => this.handleWheel(event), onContextMenu: this.handleCanvasContextMenu, onDoubleClick: () => {
                    this.setState({
                        editingFrame: f.id,
                    });
                }, children: frameNameJSX }, f.id));
        });
    };
    toggleOverscrollBehavior(event) {
        // when pointer inside editor, disable overscroll behavior to prevent
        // panning to trigger history back/forward on MacOS Chrome
        document.documentElement.style.overscrollBehaviorX =
            event.type === "pointerenter" ? "none" : "auto";
    }
    render() {
        const selectedElements = this.scene.getSelectedElements(this.state);
        const { renderTopRightUI, renderTopLeftUI, renderCustomStats } = this.props;
        const sceneNonce = this.scene.getSceneNonce();
        const { elementsMap, visibleElements } = this.renderer.getRenderableElements({
            sceneNonce,
            zoom: this.state.zoom,
            offsetLeft: this.state.offsetLeft,
            offsetTop: this.state.offsetTop,
            scrollX: this.state.scrollX,
            scrollY: this.state.scrollY,
            height: this.state.height,
            width: this.state.width,
            editingTextElement: this.state.editingTextElement,
            newElementId: this.state.newElement?.id,
        });
        this.visibleElements = visibleElements;
        const allElementsMap = this.scene.getNonDeletedElementsMap();
        const shouldBlockPointerEvents = 
        // default back to `--ui-pointerEvents` flow if setPointerCapture
        // not supported
        "setPointerCapture" in HTMLElement.prototype
            ? false
            : this.state.selectionElement ||
                this.state.newElement ||
                this.state.selectedElementsAreBeingDragged ||
                this.state.resizingElement ||
                (this.state.activeTool.type === "laser" &&
                    // technically we can just test on this once we make it more safe
                    this.state.cursorButton === "down");
        const firstSelectedElement = selectedElements[0];
        const showShapeSwitchPanel = editor_jotai_1.editorJotaiStore.get(ConvertElementTypePopup_1.convertElementTypePopupAtom)?.type === "panel";
        return ((0, jsx_runtime_1.jsx)("div", { translate: "no", className: (0, clsx_1.default)("excalidraw excalidraw-container notranslate", {
                "excalidraw--view-mode": this.state.viewModeEnabled ||
                    this.state.openDialog?.name === "elementLinkSelector",
                "excalidraw--mobile": this.editorInterface.formFactor === "phone",
            }), style: {
                ["--ui-pointerEvents"]: shouldBlockPointerEvents
                    ? common_1.POINTER_EVENTS.disabled
                    : common_1.POINTER_EVENTS.enabled,
                ["--right-sidebar-width"]: "302px",
            }, ref: this.excalidrawContainerRef, onDrop: this.handleAppOnDrop, tabIndex: 0, onKeyDown: this.props.handleKeyboardGlobally ? undefined : this.onKeyDown, onPointerEnter: this.toggleOverscrollBehavior, onPointerLeave: this.toggleOverscrollBehavior, children: (0, jsx_runtime_1.jsx)(exports.ExcalidrawAPIContext.Provider, { value: this.api, children: (0, jsx_runtime_1.jsx)(AppContext.Provider, { value: this, children: (0, jsx_runtime_1.jsx)(AppPropsContext.Provider, { value: this.props, children: (0, jsx_runtime_1.jsx)(exports.ExcalidrawContainerContext.Provider, { value: this.excalidrawContainerValue, children: (0, jsx_runtime_1.jsx)(EditorInterfaceContext.Provider, { value: this.editorInterface, children: (0, jsx_runtime_1.jsx)(ExcalidrawSetAppStateContext.Provider, { value: this.setAppState, children: (0, jsx_runtime_1.jsx)(ExcalidrawAppStateContext.Provider, { value: this.state, children: (0, jsx_runtime_1.jsxs)(ExcalidrawElementsContext.Provider, { value: this.scene.getNonDeletedElements(), children: [(0, jsx_runtime_1.jsxs)(ExcalidrawActionManagerContext.Provider, { value: this.actionManager, children: [(0, jsx_runtime_1.jsx)(LayerUI_1.default, { canvas: this.canvas, appState: this.state, files: this.files, setAppState: this.setAppState, actionManager: this.actionManager, elements: this.scene.getNonDeletedElements(), onLockToggle: this.toggleLock, onPenModeToggle: this.togglePenMode, onHandToolToggle: this.onHandToolToggle, langCode: (0, i18n_1.getLanguage)().code, renderTopLeftUI: renderTopLeftUI, renderTopRightUI: renderTopRightUI, renderCustomStats: renderCustomStats, showExitZenModeBtn: typeof this.props?.zenModeEnabled ===
                                                                "undefined" && this.state.zenModeEnabled, UIOptions: this.props.UIOptions, onExportImage: this.onExportImage, renderWelcomeScreen: !this.state.isLoading &&
                                                                this.state.showWelcomeScreen &&
                                                                this.state.activeTool.type ===
                                                                    this.state.preferredSelectionTool.type &&
                                                                !this.state.zenModeEnabled &&
                                                                !this.scene.getElementsIncludingDeleted().length, app: this, isCollaborating: this.props.isCollaborating, generateLinkForSelection: this.props.generateLinkForSelection, children: this.props.children }), (0, jsx_runtime_1.jsx)("div", { className: "excalidraw-textEditorContainer" }), (0, jsx_runtime_1.jsx)("div", { className: "excalidraw-contextMenuContainer" }), (0, jsx_runtime_1.jsx)("div", { className: "excalidraw-eye-dropper-container" }), (0, jsx_runtime_1.jsx)(SVGLayer_1.SVGLayer, { trails: [
                                                                this.laserTrails,
                                                                this.lassoTrail,
                                                                this.eraserTrail,
                                                            ] }), selectedElements.length === 1 &&
                                                            this.state.openDialog?.name !==
                                                                "elementLinkSelector" &&
                                                            this.state.showHyperlinkPopup && ((0, jsx_runtime_1.jsx)(Hyperlink_1.Hyperlink, { element: firstSelectedElement, scene: this.scene, setAppState: this.setAppState, onLinkOpen: this.props.onLinkOpen, setToast: this.setToast, updateEmbedValidationStatus: this.updateEmbedValidationStatus }, firstSelectedElement.id)), this.props.aiEnabled !== false &&
                                                            selectedElements.length === 1 &&
                                                            (0, element_1.isMagicFrameElement)(firstSelectedElement) && ((0, jsx_runtime_1.jsx)(ElementCanvasButtons_1.ElementCanvasButtons, { element: firstSelectedElement, elementsMap: elementsMap, children: (0, jsx_runtime_1.jsx)(MagicButton_1.ElementCanvasButton, { title: (0, i18n_1.t)("labels.convertToCode"), icon: icons_1.MagicIcon, checked: false, onChange: () => this.onMagicFrameGenerate(firstSelectedElement, "button") }) })), selectedElements.length === 1 &&
                                                            (0, element_1.isIframeElement)(firstSelectedElement) &&
                                                            firstSelectedElement.customData?.generationData
                                                                ?.status === "done" && ((0, jsx_runtime_1.jsxs)(ElementCanvasButtons_1.ElementCanvasButtons, { element: firstSelectedElement, elementsMap: elementsMap, children: [(0, jsx_runtime_1.jsx)(MagicButton_1.ElementCanvasButton, { title: (0, i18n_1.t)("labels.copySource"), icon: icons_1.copyIcon, checked: false, onChange: () => this.onIframeSrcCopy(firstSelectedElement) }), (0, jsx_runtime_1.jsx)(MagicButton_1.ElementCanvasButton, { title: "Enter fullscreen", icon: icons_1.fullscreenIcon, checked: false, onChange: () => {
                                                                        const iframe = this.getHTMLIFrameElement(firstSelectedElement);
                                                                        if (iframe) {
                                                                            try {
                                                                                iframe.requestFullscreen();
                                                                                this.setState({
                                                                                    activeEmbeddable: {
                                                                                        element: firstSelectedElement,
                                                                                        state: "active",
                                                                                    },
                                                                                    selectedElementIds: {
                                                                                        [firstSelectedElement.id]: true,
                                                                                    },
                                                                                    newElement: null,
                                                                                    selectionElement: null,
                                                                                });
                                                                            }
                                                                            catch (err) {
                                                                                console.warn(err);
                                                                                this.setState({
                                                                                    errorMessage: "Couldn't enter fullscreen",
                                                                                });
                                                                            }
                                                                        }
                                                                    } })] })), this.state.contextMenu && ((0, jsx_runtime_1.jsx)(ContextMenu_1.ContextMenu, { items: this.state.contextMenu.items, top: this.state.contextMenu.top, left: this.state.contextMenu.left, actionManager: this.actionManager, onClose: (callback) => {
                                                                this.setState({ contextMenu: null }, () => {
                                                                    this.focusContainer();
                                                                    callback?.();
                                                                });
                                                            } })), (0, jsx_runtime_1.jsx)(canvases_1.StaticCanvas, { canvas: this.canvas, rc: this.rc, elementsMap: elementsMap, allElementsMap: allElementsMap, visibleElements: visibleElements, sceneNonce: sceneNonce, selectionNonce: this.state.selectionElement?.versionNonce, scale: window.devicePixelRatio, appState: this.state, renderConfig: {
                                                                imageCache: this.imageCache,
                                                                isExporting: false,
                                                                renderGrid: (0, snapping_1.isGridModeEnabled)(this),
                                                                canvasBackgroundColor: this.state.viewBackgroundColor,
                                                                embedsValidationStatus: this.embedsValidationStatus,
                                                                elementsPendingErasure: this.elementsPendingErasure,
                                                                pendingFlowchartNodes: this.flowChartCreator.pendingNodes,
                                                                theme: this.state.theme,
                                                            } }), this.state.newElement && ((0, jsx_runtime_1.jsx)(NewElementCanvas_1.default, { appState: this.state, scale: window.devicePixelRatio, rc: this.rc, elementsMap: elementsMap, allElementsMap: allElementsMap, renderConfig: {
                                                                imageCache: this.imageCache,
                                                                isExporting: false,
                                                                renderGrid: false,
                                                                canvasBackgroundColor: this.state.viewBackgroundColor,
                                                                embedsValidationStatus: this.embedsValidationStatus,
                                                                elementsPendingErasure: this.elementsPendingErasure,
                                                                pendingFlowchartNodes: null,
                                                                theme: this.state.theme,
                                                            } })), (0, jsx_runtime_1.jsx)(canvases_1.InteractiveCanvas, { app: this, containerRef: this.excalidrawContainerRef, canvas: this.interactiveCanvas, elementsMap: elementsMap, visibleElements: visibleElements, allElementsMap: allElementsMap, selectedElements: selectedElements, sceneNonce: sceneNonce, selectionNonce: this.state.selectionElement?.versionNonce, scale: window.devicePixelRatio, appState: this.state, renderScrollbars: this.props.renderScrollbars === true, editorInterface: this.editorInterface, renderInteractiveSceneCallback: this.renderInteractiveSceneCallback, handleCanvasRef: this.handleInteractiveCanvasRef, onContextMenu: this.handleCanvasContextMenu, onClick: this.handleCanvasClick, onPointerMove: this.handleCanvasPointerMove, onPointerUp: this.handleCanvasPointerUp, onPointerCancel: this.removePointer, onTouchMove: this.handleTouchMove, onPointerDown: this.handleCanvasPointerDown, onDoubleClick: this.handleCanvasDoubleClick }), this.state.userToFollow && ((0, jsx_runtime_1.jsx)(FollowMode_1.default, { width: this.state.width, height: this.state.height, userToFollow: this.state.userToFollow, onDisconnect: this.maybeUnfollowRemoteUser })), this.renderFrameNames(), this.state.activeLockedId && ((0, jsx_runtime_1.jsx)(UnlockPopup_1.default, { app: this, activeLockedId: this.state.activeLockedId })), showShapeSwitchPanel && ((0, jsx_runtime_1.jsx)(ConvertElementTypePopup_1.default, { app: this }))] }), this.renderEmbeddables()] }) }) }) }) }) }) }) }) }));
    }
    focusContainer = () => {
        this.excalidrawContainerRef.current?.focus();
    };
    getSceneElementsIncludingDeleted = () => {
        return this.scene.getElementsIncludingDeleted();
    };
    getSceneElementsMapIncludingDeleted = () => {
        return this.scene.getElementsMapIncludingDeleted();
    };
    getSceneElements = () => {
        return this.scene.getNonDeletedElements();
    };
    onInsertElements = (elements) => {
        this.addElementsFromPasteOrLibrary({
            elements,
            position: "center",
            files: null,
        });
    };
    onExportImage = async (type, elements, opts) => {
        (0, analytics_1.trackEvent)("export", type, "ui");
        const fileHandle = await (0, data_1.exportCanvas)(type, elements, this.state, this.files, {
            exportBackground: this.state.exportBackground,
            name: this.getName(),
            viewBackgroundColor: this.state.viewBackgroundColor,
            exportingFrame: opts.exportingFrame,
        })
            .catch(common_1.muteFSAbortError)
            .catch((error) => {
            console.error(error);
            this.setState({ errorMessage: error.message });
        });
        if (this.state.exportEmbedScene &&
            fileHandle &&
            (0, blob_1.isImageFileHandle)(fileHandle)) {
            this.setState({ fileHandle });
        }
    };
    magicGenerations = new Map();
    updateMagicGeneration = ({ frameElement, data, }) => {
        if (data.status === "pending") {
            // We don't wanna persist pending state to storage. It should be in-app
            // state only.
            // Thus reset so that we prefer local cache (if there was some
            // generationData set previously)
            this.scene.mutateElement(frameElement, {
                customData: { generationData: undefined },
            }, { informMutation: false, isDragging: false });
        }
        else {
            this.scene.mutateElement(frameElement, {
                customData: { generationData: data },
            }, { informMutation: false, isDragging: false });
        }
        this.magicGenerations.set(frameElement.id, data);
        this.triggerRender();
    };
    plugins = {};
    setPlugins(plugins) {
        Object.assign(this.plugins, plugins);
    }
    async onMagicFrameGenerate(magicFrame, source) {
        const generateDiagramToCode = this.plugins.diagramToCode?.generate;
        if (!generateDiagramToCode) {
            this.setState({
                errorMessage: "No diagram to code plugin found",
            });
            return;
        }
        const magicFrameChildren = (0, element_1.getElementsOverlappingFrame)(this.scene.getNonDeletedElements(), magicFrame, this.scene.getNonDeletedElementsMap()).filter((el) => !(0, element_1.isMagicFrameElement)(el));
        if (!magicFrameChildren.length) {
            if (source === "button") {
                this.setState({ errorMessage: "Cannot generate from an empty frame" });
                (0, analytics_1.trackEvent)("ai", "generate (no-children)", "d2c");
            }
            else {
                this.setActiveTool({ type: "magicframe" });
            }
            return;
        }
        const frameElement = this.insertIframeElement({
            sceneX: magicFrame.x + magicFrame.width + 30,
            sceneY: magicFrame.y,
            width: magicFrame.width,
            height: magicFrame.height,
        });
        if (!frameElement) {
            return;
        }
        this.updateMagicGeneration({
            frameElement,
            data: { status: "pending" },
        });
        this.setState({
            selectedElementIds: { [frameElement.id]: true },
        });
        (0, analytics_1.trackEvent)("ai", "generate (start)", "d2c");
        try {
            const { html } = await generateDiagramToCode({
                frame: magicFrame,
                children: magicFrameChildren,
            });
            (0, analytics_1.trackEvent)("ai", "generate (success)", "d2c");
            if (!html.trim()) {
                this.updateMagicGeneration({
                    frameElement,
                    data: {
                        status: "error",
                        code: "ERR_OAI",
                        message: "Nothing genereated :(",
                    },
                });
                return;
            }
            const parsedHtml = html.includes("<!DOCTYPE html>") && html.includes("</html>")
                ? html.slice(html.indexOf("<!DOCTYPE html>"), html.indexOf("</html>") + "</html>".length)
                : html;
            this.updateMagicGeneration({
                frameElement,
                data: { status: "done", html: parsedHtml },
            });
        }
        catch (error) {
            (0, analytics_1.trackEvent)("ai", "generate (failed)", "d2c");
            this.updateMagicGeneration({
                frameElement,
                data: {
                    status: "error",
                    code: "ERR_OAI",
                    message: error.message || "Unknown error during generation",
                },
            });
        }
    }
    onIframeSrcCopy(element) {
        if (element.customData?.generationData?.status === "done") {
            (0, clipboard_1.copyTextToSystemClipboard)(element.customData.generationData.html);
            this.setToast({
                message: "copied to clipboard",
                closable: false,
                duration: 1500,
            });
        }
    }
    onMagicframeToolSelect = () => {
        const selectedElements = this.scene.getSelectedElements({
            selectedElementIds: this.state.selectedElementIds,
        });
        if (selectedElements.length === 0) {
            this.setActiveTool({ type: common_1.TOOL_TYPE.magicframe });
            (0, analytics_1.trackEvent)("ai", "tool-select (empty-selection)", "d2c");
        }
        else {
            const selectedMagicFrame = selectedElements.length === 1 &&
                (0, element_1.isMagicFrameElement)(selectedElements[0]) &&
                selectedElements[0];
            // case: user selected elements containing frame-like(s) or are frame
            // members, we don't want to wrap into another magicframe
            // (unless the only selected element is a magic frame which we reuse)
            if (!selectedMagicFrame &&
                selectedElements.some((el) => (0, element_1.isFrameLikeElement)(el) || el.frameId)) {
                this.setActiveTool({ type: common_1.TOOL_TYPE.magicframe });
                return;
            }
            (0, analytics_1.trackEvent)("ai", "tool-select (existing selection)", "d2c");
            let frame;
            if (selectedMagicFrame) {
                // a single magicframe already selected -> use it
                frame = selectedMagicFrame;
            }
            else {
                // selected elements aren't wrapped in magic frame yet -> wrap now
                const [minX, minY, maxX, maxY] = (0, element_1.getCommonBounds)(selectedElements);
                const padding = 50;
                frame = (0, element_1.newMagicFrameElement)({
                    ...common_1.FRAME_STYLE,
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + padding * 2,
                    height: maxY - minY + padding * 2,
                    opacity: 100,
                    locked: false,
                });
                this.scene.insertElement(frame);
                for (const child of selectedElements) {
                    this.scene.mutateElement(child, { frameId: frame.id });
                }
                this.setState({
                    selectedElementIds: { [frame.id]: true },
                });
            }
            this.onMagicFrameGenerate(frame, "upstream");
        }
    };
    openEyeDropper = ({ type }) => {
        this.updateEditorAtom(EyeDropper_1.activeEyeDropperAtom, {
            swapPreviewOnAlt: true,
            colorPickerType: type === "stroke" ? "elementStroke" : "elementBackground",
            onSelect: (color, event) => {
                const shouldUpdateStrokeColor = (type === "background" && event.altKey) ||
                    (type === "stroke" && !event.altKey);
                const selectedElements = this.scene.getSelectedElements(this.state);
                if (!selectedElements.length ||
                    this.state.activeTool.type !== "selection") {
                    if (shouldUpdateStrokeColor) {
                        this.syncActionResult({
                            appState: { ...this.state, currentItemStrokeColor: color },
                            captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                        });
                    }
                    else {
                        this.syncActionResult({
                            appState: { ...this.state, currentItemBackgroundColor: color },
                            captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                        });
                    }
                }
                else {
                    this.updateScene({
                        elements: this.scene.getElementsIncludingDeleted().map((el) => {
                            if (this.state.selectedElementIds[el.id]) {
                                return (0, element_1.newElementWith)(el, {
                                    [shouldUpdateStrokeColor ? "strokeColor" : "backgroundColor"]: color,
                                });
                            }
                            return el;
                        }),
                        captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                    });
                }
            },
            keepOpenOnAlt: false,
        });
    };
    dismissLinearEditor = () => {
        setTimeout(() => {
            if (this.state.selectedLinearElement?.isEditing) {
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        isEditing: false,
                    },
                });
            }
        });
    };
    syncActionResult = (0, reactUtils_1.withBatchedUpdates)((actionResult) => {
        if (this.unmounted || actionResult === false) {
            return;
        }
        this.store.scheduleAction(actionResult.captureUpdate);
        let didUpdate = false;
        let editingTextElement = null;
        if (actionResult.elements) {
            this.scene.replaceAllElements(actionResult.elements);
            didUpdate = true;
        }
        if (actionResult.files) {
            this.addMissingFiles(actionResult.files, actionResult.replaceFiles);
            this.addNewImagesToImageCache();
        }
        if (actionResult.appState || editingTextElement || this.state.contextMenu) {
            let viewModeEnabled = actionResult?.appState?.viewModeEnabled || false;
            let zenModeEnabled = actionResult?.appState?.zenModeEnabled || false;
            const theme = actionResult?.appState?.theme || this.props.theme || common_1.THEME.LIGHT;
            const name = actionResult?.appState?.name ?? this.state.name;
            const errorMessage = actionResult?.appState?.errorMessage ?? this.state.errorMessage;
            if (typeof this.props.viewModeEnabled !== "undefined") {
                viewModeEnabled = this.props.viewModeEnabled;
            }
            if (typeof this.props.zenModeEnabled !== "undefined") {
                zenModeEnabled = this.props.zenModeEnabled;
            }
            editingTextElement = actionResult.appState?.editingTextElement || null;
            // make sure editingTextElement points to latest element reference
            if (actionResult.elements && editingTextElement) {
                actionResult.elements.forEach((element) => {
                    if (editingTextElement?.id === element.id &&
                        editingTextElement !== element &&
                        (0, element_1.isNonDeletedElement)(element) &&
                        (0, element_1.isTextElement)(element)) {
                        editingTextElement = element;
                    }
                });
            }
            if (editingTextElement?.isDeleted) {
                editingTextElement = null;
            }
            this.setState((prevAppState) => {
                const actionAppState = actionResult.appState || {};
                return {
                    ...prevAppState,
                    ...actionAppState,
                    // NOTE this will prevent opening context menu using an action
                    // or programmatically from the host, so it will need to be
                    // rewritten later
                    contextMenu: null,
                    editingTextElement,
                    viewModeEnabled,
                    zenModeEnabled,
                    theme,
                    name,
                    errorMessage,
                };
            });
            didUpdate = true;
        }
        if (!didUpdate) {
            this.scene.triggerUpdate();
        }
    });
    // Lifecycle
    onBlur = (0, reactUtils_1.withBatchedUpdates)(() => {
        isHoldingSpace = false;
        this.setState({
            isBindingEnabled: this.state.bindingPreference === "enabled",
        });
    });
    onUnload = () => {
        this.onBlur();
    };
    disableEvent = (event) => {
        event.preventDefault();
    };
    resetHistory = () => {
        this.history.clear();
    };
    resetStore = () => {
        this.store.clear();
    };
    /**
     * Resets scene & history.
     * ! Do not use to clear scene user action !
     */
    resetScene = (0, reactUtils_1.withBatchedUpdates)((opts) => {
        this.scene.replaceAllElements([]);
        this.setState((state) => ({
            ...(0, appState_1.getDefaultAppState)(),
            isLoading: opts?.resetLoadingState ? false : state.isLoading,
            theme: this.state.theme,
        }));
        this.resetStore();
        this.resetHistory();
    });
    initializeScene = async () => {
        if ("launchQueue" in window && "LaunchParams" in window) {
            window.launchQueue.setConsumer(async (launchParams) => {
                if (!launchParams.files.length) {
                    return;
                }
                const fileHandle = launchParams.files[0];
                const blob = await fileHandle.getFile();
                this.loadFileToCanvas(new File([blob], blob.name || "", { type: blob.type }), fileHandle);
            });
        }
        if (this.props.theme) {
            this.setState({ theme: this.props.theme });
        }
        if (!this.state.isLoading) {
            this.setState({ isLoading: true });
        }
        let initialData = null;
        try {
            if (typeof this.props.initialData === "function") {
                initialData = (await this.props.initialData()) || null;
            }
            else {
                initialData = (await this.props.initialData) || null;
            }
            if (initialData?.libraryItems) {
                this.library
                    .updateLibrary({
                    libraryItems: initialData.libraryItems,
                    merge: true,
                })
                    .catch((error) => {
                    console.error(error);
                });
            }
        }
        catch (error) {
            console.error(error);
            initialData = {
                appState: {
                    errorMessage: error.message ||
                        "Encountered an error during importing or restoring scene data",
                },
            };
        }
        const restoredElements = (0, restore_1.restoreElements)(initialData?.elements, null, {
            repairBindings: true,
            deleteInvisibleElements: true,
        });
        let restoredAppState = (0, restore_1.restoreAppState)(initialData?.appState, null);
        const activeTool = restoredAppState.activeTool;
        if (!restoredAppState.preferredSelectionTool.initialized) {
            restoredAppState.preferredSelectionTool = {
                type: this.editorInterface.formFactor === "phone" ? "lasso" : "selection",
                initialized: true,
            };
        }
        restoredAppState = {
            ...restoredAppState,
            theme: this.props.theme || restoredAppState.theme,
            // we're falling back to current (pre-init) state when deciding
            // whether to open the library, to handle a case where we
            // update the state outside of initialData (e.g. when loading the app
            // with a library install link, which should auto-open the library)
            openSidebar: restoredAppState?.openSidebar || this.state.openSidebar,
            activeTool: activeTool.type === "image" ||
                activeTool.type === "lasso" ||
                activeTool.type === "selection"
                ? {
                    ...activeTool,
                    type: restoredAppState.preferredSelectionTool.type,
                }
                : restoredAppState.activeTool,
            isLoading: false,
            toast: this.state.toast,
        };
        if (initialData?.scrollToContent) {
            restoredAppState = {
                ...restoredAppState,
                ...(0, scene_1.calculateScrollCenter)(restoredElements, {
                    ...restoredAppState,
                    width: this.state.width,
                    height: this.state.height,
                    offsetTop: this.state.offsetTop,
                    offsetLeft: this.state.offsetLeft,
                }),
            };
        }
        this.resetStore();
        this.resetHistory();
        this.syncActionResult({
            elements: restoredElements,
            appState: restoredAppState,
            files: initialData?.files,
            captureUpdate: element_1.CaptureUpdateAction.NEVER,
        });
        // clear the shape and image cache so that any images in initialData
        // can be loaded fresh
        this.clearImageShapeCache();
        // manually loading the font faces seems faster even in browsers that do fire the loadingdone event
        this.fonts.loadSceneFonts().then((fontFaces) => {
            this.fonts.onLoaded(fontFaces);
        });
        if ((0, element_1.isElementLink)(window.location.href)) {
            this.scrollToContent(window.location.href, { animate: false });
        }
    };
    getFormFactor = (editorWidth, editorHeight) => {
        return (this.props.UIOptions.getFormFactor?.(editorWidth, editorHeight) ??
            (0, common_1.getFormFactor)(editorWidth, editorHeight));
    };
    refreshEditorInterface = () => {
        const container = this.excalidrawContainerRef.current;
        if (!container) {
            return;
        }
        const { width: editorWidth, height: editorHeight } = container.getBoundingClientRect();
        const storedDesktopUIMode = (0, common_1.loadDesktopUIModePreference)();
        const userAgentDescriptor = (0, common_1.createUserAgentDescriptor)(typeof navigator !== "undefined" ? navigator.userAgent : "");
        // allow host app to control formFactor and desktopUIMode via props
        const sidebarBreakpoint = this.props.UIOptions.dockedSidebarBreakpoint != null
            ? this.props.UIOptions.dockedSidebarBreakpoint
            : common_1.MQ_RIGHT_SIDEBAR_MIN_WIDTH;
        const nextEditorInterface = (0, common_1.updateObject)(this.editorInterface, {
            desktopUIMode: storedDesktopUIMode ?? this.editorInterface.desktopUIMode,
            formFactor: this.getFormFactor(editorWidth, editorHeight),
            userAgent: userAgentDescriptor,
            canFitSidebar: editorWidth > sidebarBreakpoint,
            isLandscape: editorWidth > editorHeight,
        });
        this.editorInterface = nextEditorInterface;
        this.reconcileStylesPanelMode(nextEditorInterface);
    };
    reconcileStylesPanelMode = (nextEditorInterface) => {
        const nextStylesPanelMode = (0, common_1.deriveStylesPanelMode)(nextEditorInterface);
        if (nextStylesPanelMode === this.stylesPanelMode) {
            return;
        }
        const prevStylesPanelMode = this.stylesPanelMode;
        this.stylesPanelMode = nextStylesPanelMode;
        if (prevStylesPanelMode !== "full" && nextStylesPanelMode === "full") {
            this.setState((prevState) => ({
                preferredSelectionTool: {
                    type: "selection",
                    initialized: true,
                },
            }));
        }
    };
    /** TO BE USED LATER */
    setDesktopUIMode = (mode) => {
        const nextMode = (0, common_1.setDesktopUIMode)(mode);
        this.editorInterface = (0, common_1.updateObject)(this.editorInterface, {
            desktopUIMode: nextMode,
        });
        this.reconcileStylesPanelMode(this.editorInterface);
    };
    clearImageShapeCache(filesMap) {
        const files = filesMap ?? this.files;
        this.scene.getNonDeletedElements().forEach((element) => {
            if ((0, element_1.isInitializedImageElement)(element) && files[element.fileId]) {
                this.imageCache.delete(element.fileId);
                element_1.ShapeCache.delete(element);
            }
        });
    }
    async componentDidMount() {
        this.unmounted = false;
        this.api = this.createExcalidrawAPI();
        this.excalidrawContainerValue.container =
            this.excalidrawContainerRef.current;
        if ((0, common_1.isTestEnv)() || (0, common_1.isDevEnv)()) {
            const setState = this.setState.bind(this);
            Object.defineProperties(window.h, {
                state: {
                    configurable: true,
                    get: () => {
                        return this.state;
                    },
                },
                setState: {
                    configurable: true,
                    value: (...args) => {
                        return this.setState(...args);
                    },
                },
                app: {
                    configurable: true,
                    value: this,
                },
                history: {
                    configurable: true,
                    value: this.history,
                },
                store: {
                    configurable: true,
                    value: this.store,
                },
                fonts: {
                    configurable: true,
                    value: this.fonts,
                },
            });
        }
        this.store.onDurableIncrementEmitter.on((increment) => {
            this.history.record(increment.delta);
        });
        // per. optimmisation, only subscribe if there is the `onIncrement` prop registered, to avoid unnecessary computation
        if (this.props.onIncrement) {
            this.store.onStoreIncrementEmitter.on((increment) => {
                this.props.onIncrement?.(increment);
            });
        }
        this.scene.onUpdate(this.triggerRender);
        this.addEventListeners();
        if (this.props.autoFocus && this.excalidrawContainerRef.current) {
            this.focusContainer();
        }
        if (common_1.supportsResizeObserver && this.excalidrawContainerRef.current) {
            this.resizeObserver = new ResizeObserver(() => {
                this.refreshEditorInterface();
                this.updateDOMRect();
            });
            this.resizeObserver?.observe(this.excalidrawContainerRef.current);
        }
        const searchParams = new URLSearchParams(window.location.search.slice(1));
        if (searchParams.has("web-share-target")) {
            // Obtain a file that was shared via the Web Share Target API.
            this.restoreFileFromShare();
        }
        else {
            this.updateDOMRect(this.initializeScene);
        }
        // note that this check seems to always pass in localhost
        if ((0, common_1.isBrave)() && !(0, element_1.isMeasureTextSupported)()) {
            this.setState({
                errorMessage: (0, jsx_runtime_1.jsx)(BraveMeasureTextError_1.default, {}),
            });
        }
        const mountPayload = {
            excalidrawAPI: this.api,
            container: this.excalidrawContainerRef.current,
        };
        this.editorLifecycleEvents.emit("editor:mount", mountPayload);
        this.props.onMount?.(mountPayload);
        this.props.onExcalidrawAPI?.(this.api);
    }
    componentWillUnmount() {
        // we're recreating the api object reference so that the
        // <ExcalidrawAPIContext.Provider/> picks up on it
        this.api = { ...this.api, isDestroyed: true };
        for (const key of Object.keys(this.api)) {
            if ((key.startsWith("get") ||
                key === "onStateChange" ||
                key === "onEvent") &&
                typeof this.api[key] === "function") {
                this.api[key] = () => {
                    throw new Error("ExcalidrawAPI is no longer usable after the editor has been unmounted and will return invalid/empty data. You should check for `ExcalidrawAPI.isDestroyed` before calling get* methods on subscribing to state/event changes.");
                };
            }
        }
        this.editorLifecycleEvents.emit("editor:unmount");
        this.props.onUnmount?.();
        this.props.onExcalidrawAPI?.(null);
        window.launchQueue?.setConsumer(() => { });
        this.renderer.destroy();
        this.scene.destroy();
        this.scene = new element_1.Scene();
        this.fonts = new fonts_1.Fonts(this.scene);
        this.renderer = new Renderer_1.Renderer(this.scene);
        this.files = {};
        this.imageCache.clear();
        this.resizeObserver?.disconnect();
        this.unmounted = true;
        this.removeEventListeners();
        this.library.destroy();
        this.laserTrails.stop();
        this.eraserTrail.stop();
        this.onChangeEmitter.clear();
        this.store.onStoreIncrementEmitter.clear();
        this.store.onDurableIncrementEmitter.clear();
        this.appStateObserver.clear();
        this.editorLifecycleEvents.clear();
        element_1.ShapeCache.destroy();
        snapping_1.SnapCache.destroy();
        clearTimeout(touchTimeout);
        scene_1.isSomeElementSelected.clearCache();
        element_1.selectGroupsForSelectedElements.clearCache();
        touchTimeout = 0;
        document.documentElement.style.overscrollBehaviorX = "";
    }
    onResize = (0, reactUtils_1.withBatchedUpdates)(() => {
        this.scene
            .getElementsIncludingDeleted()
            .forEach((element) => element_1.ShapeCache.delete(element));
        this.refreshEditorInterface();
        this.updateDOMRect();
        this.setState({});
    });
    /** generally invoked only if fullscreen was invoked programmatically */
    onFullscreenChange = () => {
        if (
        // points to the iframe element we fullscreened
        !document.fullscreenElement &&
            this.state.activeEmbeddable?.state === "active") {
            this.setState({
                activeEmbeddable: null,
            });
        }
    };
    removeEventListeners() {
        this.onRemoveEventListenersEmitter.trigger();
    }
    addEventListeners() {
        // remove first as we can add event listeners multiple times
        this.removeEventListeners();
        // -------------------------------------------------------------------------
        //                        view+edit mode listeners
        // -------------------------------------------------------------------------
        if (this.props.handleKeyboardGlobally) {
            this.onRemoveEventListenersEmitter.once((0, common_1.addEventListener)(document, common_1.EVENT.KEYDOWN, this.onKeyDown, false));
        }
        this.onRemoveEventListenersEmitter.once((0, common_1.addEventListener)(this.excalidrawContainerRef.current, common_1.EVENT.WHEEL, this.handleWheel, { passive: false }), (0, common_1.addEventListener)(window, common_1.EVENT.MESSAGE, this.onWindowMessage, false), (0, common_1.addEventListener)(document, common_1.EVENT.POINTER_UP, this.removePointer, {
            passive: false,
        }), // #3553
        (0, common_1.addEventListener)(document, common_1.EVENT.COPY, this.onCopy, { passive: false }), (0, common_1.addEventListener)(document, common_1.EVENT.KEYUP, this.onKeyUp, { passive: true }), (0, common_1.addEventListener)(document, common_1.EVENT.POINTER_MOVE, this.updateCurrentCursorPosition, { passive: false }), 
        // rerender text elements on font load to fix #637 && #1553
        (0, common_1.addEventListener)(document.fonts, "loadingdone", (event) => {
            const fontFaces = event.fontfaces;
            this.fonts.onLoaded(fontFaces);
        }, { passive: false }), 
        // Safari-only desktop pinch zoom
        (0, common_1.addEventListener)(document, common_1.EVENT.GESTURE_START, this.onGestureStart, false), (0, common_1.addEventListener)(document, common_1.EVENT.GESTURE_CHANGE, this.onGestureChange, false), (0, common_1.addEventListener)(document, common_1.EVENT.GESTURE_END, this.onGestureEnd, false), (0, common_1.addEventListener)(window, common_1.EVENT.FOCUS, () => {
            this.maybeCleanupAfterMissingPointerUp(null);
            // browsers (chrome?) tend to free up memory a lot, which results
            // in canvas context being cleared. Thus re-render on focus.
            this.triggerRender(true);
        }, { passive: false }));
        if (this.state.viewModeEnabled) {
            return;
        }
        // -------------------------------------------------------------------------
        //                        edit-mode listeners only
        // -------------------------------------------------------------------------
        this.onRemoveEventListenersEmitter.once((0, common_1.addEventListener)(document, common_1.EVENT.FULLSCREENCHANGE, this.onFullscreenChange, { passive: false }), (0, common_1.addEventListener)(document, common_1.EVENT.PASTE, this.pasteFromClipboard, {
            passive: false,
        }), (0, common_1.addEventListener)(document, common_1.EVENT.CUT, this.onCut, { passive: false }), (0, common_1.addEventListener)(window, common_1.EVENT.RESIZE, this.onResize, false), (0, common_1.addEventListener)(window, common_1.EVENT.UNLOAD, this.onUnload, false), (0, common_1.addEventListener)(window, common_1.EVENT.BLUR, this.onBlur, false), (0, common_1.addEventListener)(this.excalidrawContainerRef.current, common_1.EVENT.WHEEL, this.handleWheel, { passive: false }), (0, common_1.addEventListener)(this.excalidrawContainerRef.current, common_1.EVENT.DRAG_OVER, this.disableEvent, false), (0, common_1.addEventListener)(this.excalidrawContainerRef.current, common_1.EVENT.DROP, this.disableEvent, false));
        if (this.props.detectScroll) {
            this.onRemoveEventListenersEmitter.once((0, common_1.addEventListener)((0, common_1.getNearestScrollableContainer)(this.excalidrawContainerRef.current), common_1.EVENT.SCROLL, this.onScroll, { passive: false }));
        }
    }
    componentDidUpdate(prevProps, prevState) {
        // must be updated *before* state change listeners are triggered below
        if (!this._initialized && !this.state.isLoading) {
            this._initialized = true;
            this.editorLifecycleEvents.emit("editor:initialize", this.api);
            this.props.onInitialize?.(this.api);
        }
        this.appStateObserver.flush(prevState);
        this.updateEmbeddables();
        const elements = this.scene.getElementsIncludingDeleted();
        const elementsMap = this.scene.getElementsMapIncludingDeleted();
        const shouldExportWithDarkMode = (this.sessionExportThemeOverride ?? this.state.theme) === common_1.THEME.DARK;
        if (this.state.exportWithDarkMode !== shouldExportWithDarkMode) {
            this.setState({ exportWithDarkMode: shouldExportWithDarkMode });
        }
        if (!this.state.showWelcomeScreen && !elements.length) {
            this.setState({ showWelcomeScreen: true });
        }
        const hasFollowedPersonLeft = prevState.userToFollow &&
            !this.state.collaborators.has(prevState.userToFollow.socketId);
        if (hasFollowedPersonLeft) {
            this.maybeUnfollowRemoteUser();
        }
        if (prevState.zoom.value !== this.state.zoom.value ||
            prevState.scrollX !== this.state.scrollX ||
            prevState.scrollY !== this.state.scrollY) {
            this.props?.onScrollChange?.(this.state.scrollX, this.state.scrollY, this.state.zoom);
            this.onScrollChangeEmitter.trigger(this.state.scrollX, this.state.scrollY, this.state.zoom);
        }
        if (prevState.userToFollow !== this.state.userToFollow) {
            if (prevState.userToFollow) {
                this.onUserFollowEmitter.trigger({
                    userToFollow: prevState.userToFollow,
                    action: "UNFOLLOW",
                });
            }
            if (this.state.userToFollow) {
                this.onUserFollowEmitter.trigger({
                    userToFollow: this.state.userToFollow,
                    action: "FOLLOW",
                });
            }
        }
        if (Object.keys(this.state.selectedElementIds).length &&
            (0, appState_1.isEraserActive)(this.state)) {
            this.setState({
                activeTool: (0, common_1.updateActiveTool)(this.state, { type: "selection" }),
            });
        }
        if (this.state.activeTool.type === "eraser" &&
            prevState.theme !== this.state.theme) {
            (0, cursor_1.setEraserCursor)(this.interactiveCanvas, this.state.theme);
        }
        // Hide hyperlink popup if shown when element type is not selection
        if (prevState.activeTool.type === "selection" &&
            this.state.activeTool.type !== "selection" &&
            this.state.showHyperlinkPopup) {
            this.setState({ showHyperlinkPopup: false });
        }
        if (prevProps.langCode !== this.props.langCode) {
            this.updateLanguage();
        }
        if ((0, appState_1.isEraserActive)(prevState) && !(0, appState_1.isEraserActive)(this.state)) {
            this.eraserTrail.endPath();
        }
        if (prevProps.viewModeEnabled !== this.props.viewModeEnabled) {
            this.setState({ viewModeEnabled: !!this.props.viewModeEnabled });
        }
        if (prevState.viewModeEnabled !== this.state.viewModeEnabled) {
            this.addEventListeners();
            this.deselectElements();
        }
        // cleanup
        if ((prevState.openDialog?.name === "elementLinkSelector" ||
            this.state.openDialog?.name === "elementLinkSelector") &&
            prevState.openDialog?.name !== this.state.openDialog?.name) {
            this.deselectElements();
            this.setState({
                hoveredElementIds: {},
            });
        }
        if (prevProps.zenModeEnabled !== this.props.zenModeEnabled) {
            this.setState({ zenModeEnabled: !!this.props.zenModeEnabled });
        }
        if (prevProps.theme !== this.props.theme && this.props.theme) {
            this.setState({ theme: this.props.theme });
        }
        this.excalidrawContainerRef.current?.classList.toggle("theme--dark", this.state.theme === common_1.THEME.DARK);
        if (this.state.selectedLinearElement?.isEditing &&
            !this.state.selectedElementIds[this.state.selectedLinearElement.elementId]) {
            // defer so that the scheduleCapture flag isn't reset via current update
            setTimeout(() => {
                // execute only if the condition still holds when the deferred callback
                // executes (it can be scheduled multiple times depending on how
                // many times the component renders)
                this.state.selectedLinearElement?.isEditing &&
                    this.actionManager.executeAction(actions_1.actionFinalize);
            });
        }
        // failsafe in case the state is being updated in incorrect order resulting
        // in the editingTextElement being now a deleted element
        if (this.state.editingTextElement?.isDeleted) {
            this.setState({ editingTextElement: null });
        }
        this.store.commit(elementsMap, this.state);
        // Do not notify consumers if we're still loading the scene. Among other
        // potential issues, this fixes a case where the tab isn't focused during
        // init, which would trigger onChange with empty elements, which would then
        // override whatever is in localStorage currently.
        if (!this.state.isLoading) {
            this.props.onChange?.(elements, this.state, this.files);
            this.onChangeEmitter.trigger(elements, this.state, this.files);
        }
    }
    renderInteractiveSceneCallback = ({ atLeastOneVisibleElement, scrollBars, elementsMap, }) => {
        if (scrollBars) {
            currentScrollBars = scrollBars;
        }
        const scrolledOutside = 
        // hide when editing text
        this.state.editingTextElement
            ? false
            : !atLeastOneVisibleElement && elementsMap.size > 0;
        if (this.state.scrolledOutside !== scrolledOutside) {
            this.setState({ scrolledOutside });
        }
        this.scheduleImageRefresh();
    };
    onScroll = (0, common_1.debounce)(() => {
        const { offsetTop, offsetLeft } = this.getCanvasOffsets();
        this.setState((state) => {
            if (state.offsetLeft === offsetLeft && state.offsetTop === offsetTop) {
                return null;
            }
            return { offsetTop, offsetLeft };
        });
    }, common_1.SCROLL_TIMEOUT);
    // Copy/paste
    onCut = (0, reactUtils_1.withBatchedUpdates)((event) => {
        const isExcalidrawActive = this.excalidrawContainerRef.current?.contains(document.activeElement);
        if (!isExcalidrawActive || (0, common_1.isWritableElement)(event.target)) {
            return;
        }
        this.actionManager.executeAction(actions_1.actionCut, "keyboard", event);
        event.preventDefault();
        event.stopPropagation();
    });
    onCopy = (0, reactUtils_1.withBatchedUpdates)((event) => {
        const isExcalidrawActive = this.excalidrawContainerRef.current?.contains(document.activeElement);
        if (!isExcalidrawActive || (0, common_1.isWritableElement)(event.target)) {
            return;
        }
        this.actionManager.executeAction(actions_1.actionCopy, "keyboard", event);
        event.preventDefault();
        event.stopPropagation();
    });
    static resetTapTwice() {
        didTapTwice = false;
        firstTapPosition = null;
    }
    onTouchStart = (event) => {
        // fix for Apple Pencil Scribble (do not prevent for other devices)
        if (common_1.isIOS) {
            event.preventDefault();
        }
        if (!didTapTwice) {
            didTapTwice = true;
            if (event.touches.length === 1) {
                firstTapPosition = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                };
            }
            clearTimeout(tappedTwiceTimer);
            tappedTwiceTimer = window.setTimeout(App.resetTapTwice, common_1.TAP_TWICE_TIMEOUT);
            return;
        }
        // insert text only if we tapped twice with a single finger at approximately the same position
        // event.touches.length === 1 will also prevent inserting text when user's zooming
        if (didTapTwice && event.touches.length === 1 && firstTapPosition) {
            const touch = event.touches[0];
            const distance = (0, math_1.pointDistance)((0, math_1.pointFrom)(touch.clientX, touch.clientY), (0, math_1.pointFrom)(firstTapPosition.x, firstTapPosition.y));
            // only create text if the second tap is within the threshold of the first tap
            // this prevents accidental text creation during dragging/selection
            if (distance <= common_1.DOUBLE_TAP_POSITION_THRESHOLD) {
                // end lasso trail and deselect elements just in case
                this.lassoTrail.endPath();
                this.deselectElements();
                this.handleCanvasDoubleClick({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    type: "touch",
                    altKey: false,
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                });
            }
            didTapTwice = false;
            clearTimeout(tappedTwiceTimer);
        }
        if (event.touches.length === 2) {
            this.setState({
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                activeEmbeddable: null,
            });
        }
    };
    onTouchEnd = (event) => {
        this.resetContextMenuTimer();
        if (event.touches.length > 0) {
            this.setState({
                previousSelectedElementIds: {},
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)(this.state.previousSelectedElementIds, this.state),
            });
        }
        else {
            gesture.pointers.clear();
        }
    };
    // TODO: Cover with tests
    async insertClipboardContent(data, dataTransferFiles, isPlainPaste) {
        const { x: sceneX, y: sceneY } = (0, common_1.viewportCoordsToSceneCoords)({
            clientX: this.lastViewportPosition.x,
            clientY: this.lastViewportPosition.y,
        }, this.state);
        // ------------------- Error -------------------
        if (data.errorMessage) {
            this.setState({ errorMessage: data.errorMessage });
            return;
        }
        // ------------------- Mixed content with no files -------------------
        if (dataTransferFiles.length === 0 && !isPlainPaste && data.mixedContent) {
            await this.addElementsFromMixedContentPaste(data.mixedContent, {
                isPlainPaste,
                sceneX,
                sceneY,
            });
            return;
        }
        // ------------------- Spreadsheet -------------------
        if (!isPlainPaste && data.text) {
            const result = (0, charts_1.tryParseSpreadsheet)(data.text);
            if (result.ok) {
                this.setState({
                    openDialog: {
                        name: "charts",
                        data: result.data,
                        rawText: data.text,
                    },
                });
                return;
            }
        }
        // ------------------- Images or SVG code -------------------
        const imageFiles = dataTransferFiles.map((data) => data.file);
        if (imageFiles.length === 0 && data.text && !isPlainPaste) {
            const trimmedText = data.text.trim();
            if (trimmedText.startsWith("<svg") && trimmedText.endsWith("</svg>")) {
                // ignore SVG validation/normalization which will be done during image
                // initialization
                imageFiles.push((0, blob_1.SVGStringToFile)(trimmedText));
            }
        }
        if (imageFiles.length > 0) {
            if (this.isToolSupported("image")) {
                await this.insertImages(imageFiles, sceneX, sceneY);
            }
            else {
                this.setState({ errorMessage: (0, i18n_1.t)("errors.imageToolNotSupported") });
            }
            return;
        }
        // ------------------- Elements -------------------
        if (data.elements) {
            const elements = (data.programmaticAPI
                ? (0, element_1.convertToExcalidrawElements)(data.elements)
                : data.elements);
            // TODO: remove formatting from elements if isPlainPaste
            this.addElementsFromPasteOrLibrary({
                elements,
                files: data.files || null,
                position: this.editorInterface.formFactor === "desktop" ? "cursor" : "center",
                retainSeed: isPlainPaste,
            });
            return;
        }
        // ------------------- Only textual stuff remaining -------------------
        if (!data.text) {
            return;
        }
        // ------------------- Successful Mermaid -------------------
        if (!isPlainPaste && (0, mermaid_1.isMaybeMermaidDefinition)(data.text)) {
            const api = await Promise.resolve().then(() => __importStar(require("@excalidraw/mermaid-to-excalidraw")));
            try {
                const { elements: skeletonElements, files = {} } = await api.parseMermaidToExcalidraw(data.text);
                const elements = (0, element_1.convertToExcalidrawElements)(skeletonElements, {
                    regenerateIds: true,
                });
                this.addElementsFromPasteOrLibrary({
                    elements,
                    files,
                    position: this.editorInterface.formFactor === "desktop" ? "cursor" : "center",
                });
                return;
            }
            catch (err) {
                console.warn(`parsing pasted text as mermaid definition failed: ${err.message}`);
            }
        }
        // ------------------- Pure embeddable URLs -------------------
        const nonEmptyLines = (0, common_1.normalizeEOL)(data.text)
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean);
        const embbeddableUrls = nonEmptyLines
            .map((str) => (0, element_1.maybeParseEmbedSrc)(str))
            .filter((string) => (0, element_1.embeddableURLValidator)(string, this.props.validateEmbeddable) &&
            (/^(http|https):\/\/[^\s/$.?#].[^\s]*$/.test(string) ||
                (0, element_1.getEmbedLink)(string)?.type === "video"));
        if (!isPlainPaste &&
            embbeddableUrls.length > 0 &&
            embbeddableUrls.length === nonEmptyLines.length) {
            const embeddables = [];
            for (const url of embbeddableUrls) {
                const prevEmbeddable = embeddables[embeddables.length - 1];
                const embeddable = this.insertEmbeddableElement({
                    sceneX: prevEmbeddable
                        ? prevEmbeddable.x + prevEmbeddable.width + 20
                        : sceneX,
                    sceneY,
                    link: (0, common_1.normalizeLink)(url),
                });
                if (embeddable) {
                    embeddables.push(embeddable);
                }
            }
            if (embeddables.length) {
                this.store.scheduleCapture();
                this.setState({
                    selectedElementIds: Object.fromEntries(embeddables.map((embeddable) => [embeddable.id, true])),
                });
            }
            return;
        }
        // ------------------- Text -------------------
        this.addTextFromPaste(data.text, isPlainPaste);
    }
    pasteFromClipboard = (0, reactUtils_1.withBatchedUpdates)(async (event) => {
        const isPlainPaste = !!IS_PLAIN_PASTE;
        // #686
        const target = document.activeElement;
        const isExcalidrawActive = this.excalidrawContainerRef.current?.contains(target);
        if (event && !isExcalidrawActive) {
            return;
        }
        const elementUnderCursor = document.elementFromPoint(this.lastViewportPosition.x, this.lastViewportPosition.y);
        if (event &&
            (!(elementUnderCursor instanceof HTMLCanvasElement) ||
                (0, common_1.isWritableElement)(target))) {
            return;
        }
        // must be called in the same frame (thus before any awaits) as the paste
        // event else some browsers (FF...) will clear the clipboardData
        // (something something security)
        const dataTransferList = await (0, clipboard_1.parseDataTransferEvent)(event);
        const filesList = dataTransferList.getFiles();
        const data = await (0, clipboard_1.parseClipboard)(dataTransferList, isPlainPaste);
        if (this.props.onPaste) {
            try {
                if ((await this.props.onPaste(data, event)) === false) {
                    return;
                }
            }
            catch (error) {
                console.error(error);
            }
        }
        await this.insertClipboardContent(data, filesList, isPlainPaste);
        this.setActiveTool({ type: this.state.preferredSelectionTool.type }, true);
        event?.preventDefault();
    });
    addElementsFromPasteOrLibrary = (opts) => {
        const elements = (0, restore_1.restoreElements)(opts.elements, null, {
            deleteInvisibleElements: true,
        });
        const [minX, minY, maxX, maxY] = (0, element_1.getCommonBounds)(elements);
        const elementsCenterX = (0, common_1.distance)(minX, maxX) / 2;
        const elementsCenterY = (0, common_1.distance)(minY, maxY) / 2;
        const clientX = typeof opts.position === "object"
            ? opts.position.clientX
            : opts.position === "cursor"
                ? this.lastViewportPosition.x
                : this.state.width / 2 + this.state.offsetLeft;
        const clientY = typeof opts.position === "object"
            ? opts.position.clientY
            : opts.position === "cursor"
                ? this.lastViewportPosition.y
                : this.state.height / 2 + this.state.offsetTop;
        const { x, y } = (0, common_1.viewportCoordsToSceneCoords)({ clientX, clientY }, this.state);
        const dx = x - elementsCenterX;
        const dy = y - elementsCenterY;
        const [gridX, gridY] = (0, common_1.getGridPoint)(dx, dy, this.getEffectiveGridSize());
        const { duplicatedElements } = (0, element_1.duplicateElements)({
            type: "everything",
            elements: elements.map((element) => {
                return (0, element_1.newElementWith)(element, {
                    x: element.x + gridX - minX,
                    y: element.y + gridY - minY,
                });
            }),
            randomizeSeed: !opts.retainSeed,
        });
        const prevElements = this.scene.getElementsIncludingDeleted();
        let nextElements = [...prevElements, ...duplicatedElements];
        const mappedNewSceneElements = this.props.onDuplicate?.(nextElements, prevElements);
        nextElements = mappedNewSceneElements || nextElements;
        (0, element_1.syncMovedIndices)(nextElements, (0, common_1.arrayToMap)(duplicatedElements));
        const topLayerFrame = this.getTopLayerFrameAtSceneCoords({ x, y });
        if (topLayerFrame) {
            const eligibleElements = (0, element_1.filterElementsEligibleAsFrameChildren)(duplicatedElements, topLayerFrame);
            (0, element_1.addElementsToFrame)(nextElements, eligibleElements, topLayerFrame, this.state);
        }
        this.scene.replaceAllElements(nextElements);
        duplicatedElements.forEach((newElement) => {
            if ((0, element_1.isTextElement)(newElement) && (0, element_1.isBoundToContainer)(newElement)) {
                const container = (0, element_1.getContainerElement)(newElement, this.scene.getElementsMapIncludingDeleted());
                (0, element_1.redrawTextBoundingBox)(newElement, container, this.scene);
            }
        });
        // paste event may not fire FontFace loadingdone event in Safari, hence loading font faces manually
        if (common_1.isSafari) {
            fonts_1.Fonts.loadElementsFonts(duplicatedElements).then((fontFaces) => {
                this.fonts.onLoaded(fontFaces);
            });
        }
        if (opts.files) {
            this.addMissingFiles(opts.files);
        }
        const nextElementsToSelect = (0, element_1.excludeElementsInFramesFromSelection)(duplicatedElements);
        this.store.scheduleCapture();
        this.setState({
            ...this.state,
            // keep sidebar (presumably the library) open if it's docked and
            // can fit.
            //
            // Note, we should close the sidebar only if we're dropping items
            // from library, not when pasting from clipboard. Alas.
            openSidebar: this.state.openSidebar &&
                this.editorInterface.canFitSidebar &&
                editor_jotai_1.editorJotaiStore.get(Sidebar_1.isSidebarDockedAtom)
                ? this.state.openSidebar
                : null,
            ...(0, element_1.selectGroupsForSelectedElements)({
                editingGroupId: null,
                selectedElementIds: nextElementsToSelect.reduce((acc, element) => {
                    if (!(0, element_1.isBoundToContainer)(element)) {
                        acc[element.id] = true;
                    }
                    return acc;
                }, {}),
            }, this.scene.getNonDeletedElements(), this.state, this),
        }, () => {
            if (opts.files) {
                this.addNewImagesToImageCache();
            }
        });
        this.setActiveTool({ type: this.state.preferredSelectionTool.type }, true);
        if (opts.fitToContent) {
            this.scrollToContent(duplicatedElements, {
                fitToContent: true,
                canvasOffsets: this.getEditorUIOffsets(),
            });
        }
    };
    // TODO rewrite this to paste both text & images at the same time if
    // pasted data contains both
    async addElementsFromMixedContentPaste(mixedContent, { isPlainPaste, sceneX, sceneY, }) {
        if (!isPlainPaste &&
            mixedContent.some((node) => node.type === "imageUrl") &&
            this.isToolSupported("image")) {
            const imageURLs = mixedContent
                .filter((node) => node.type === "imageUrl")
                .map((node) => node.value);
            const responses = await Promise.all(imageURLs.map(async (url) => {
                try {
                    return { file: await (0, blob_1.ImageURLToFile)(url) };
                }
                catch (error) {
                    let errorMessage = error.message;
                    if (error.cause === "FETCH_ERROR") {
                        errorMessage = (0, i18n_1.t)("errors.failedToFetchImage");
                    }
                    else if (error.cause === "UNSUPPORTED") {
                        errorMessage = (0, i18n_1.t)("errors.unsupportedFileType");
                    }
                    return { errorMessage };
                }
            }));
            const imageFiles = responses
                .filter((response) => !!response.file)
                .map((response) => response.file);
            await this.insertImages(imageFiles, sceneX, sceneY);
            const error = responses.find((response) => !!response.errorMessage);
            if (error && error.errorMessage) {
                this.setState({ errorMessage: error.errorMessage });
            }
        }
        else {
            const textNodes = mixedContent.filter((node) => node.type === "text");
            if (textNodes.length) {
                this.addTextFromPaste(textNodes.map((node) => node.value).join("\n\n"), isPlainPaste);
            }
        }
    }
    addTextFromPaste(text, isPlainPaste = false) {
        const { x, y } = (0, common_1.viewportCoordsToSceneCoords)({
            clientX: this.lastViewportPosition.x,
            clientY: this.lastViewportPosition.y,
        }, this.state);
        const textElementProps = {
            x,
            y,
            strokeColor: this.state.currentItemStrokeColor,
            backgroundColor: this.state.currentItemBackgroundColor,
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roundness: null,
            roughness: this.state.currentItemRoughness,
            opacity: this.state.currentItemOpacity,
            text,
            fontSize: this.state.currentItemFontSize,
            fontFamily: this.state.currentItemFontFamily,
            textAlign: common_1.DEFAULT_TEXT_ALIGN,
            verticalAlign: common_1.DEFAULT_VERTICAL_ALIGN,
            locked: false,
        };
        const fontString = (0, common_1.getFontString)({
            fontSize: textElementProps.fontSize,
            fontFamily: textElementProps.fontFamily,
        });
        const lineHeight = (0, common_1.getLineHeight)(textElementProps.fontFamily);
        const [x1, , x2] = (0, element_1.getVisibleSceneBounds)(this.state);
        // long texts should not go beyond 800 pixels in width nor should it go below 200 px
        const maxTextWidth = Math.max(Math.min((x2 - x1) * 0.5, 800), 200);
        const LINE_GAP = 10;
        let currentY = y;
        const lines = isPlainPaste ? [text] : text.split("\n");
        const textElements = lines.reduce((acc, line, idx) => {
            const originalText = (0, element_1.normalizeText)(line).trim();
            if (originalText.length) {
                const topLayerFrame = this.getTopLayerFrameAtSceneCoords({
                    x,
                    y: currentY,
                });
                let metrics = (0, element_1.measureText)(originalText, fontString, lineHeight);
                const isTextUnwrapped = metrics.width > maxTextWidth;
                const text = isTextUnwrapped
                    ? (0, element_1.wrapText)(originalText, fontString, maxTextWidth)
                    : originalText;
                metrics = isTextUnwrapped
                    ? (0, element_1.measureText)(text, fontString, lineHeight)
                    : metrics;
                const startX = x - metrics.width / 2;
                const startY = currentY - metrics.height / 2;
                const element = (0, element_1.newTextElement)({
                    ...textElementProps,
                    x: startX,
                    y: startY,
                    text,
                    originalText,
                    lineHeight,
                    autoResize: !isTextUnwrapped,
                    frameId: topLayerFrame ? topLayerFrame.id : null,
                });
                acc.push(element);
                currentY += element.height + LINE_GAP;
            }
            else {
                const prevLine = lines[idx - 1]?.trim();
                // add paragraph only if previous line was not empty, IOW don't add
                // more than one empty line
                if (prevLine) {
                    currentY +=
                        (0, element_1.getLineHeightInPx)(textElementProps.fontSize, lineHeight) +
                            LINE_GAP;
                }
            }
            return acc;
        }, []);
        if (textElements.length === 0) {
            return;
        }
        this.scene.insertElements(textElements);
        this.store.scheduleCapture();
        this.setState({
            selectedElementIds: (0, element_1.makeNextSelectedElementIds)(Object.fromEntries(textElements.map((el) => [el.id, true])), this.state),
        });
        if (!isPlainPaste &&
            textElements.length > 1 &&
            PLAIN_PASTE_TOAST_SHOWN === false &&
            this.editorInterface.formFactor !== "phone") {
            this.setToast({
                message: (0, i18n_1.t)("toast.pasteAsSingleElement", {
                    shortcut: (0, shortcut_1.getShortcutKey)("CtrlOrCmd+Shift+V"),
                }),
                duration: 5000,
            });
            PLAIN_PASTE_TOAST_SHOWN = true;
        }
    }
    setAppState = (state, callback) => {
        this.setState(state, callback);
    };
    removePointer = (event) => {
        if (touchTimeout) {
            this.resetContextMenuTimer();
        }
        gesture.pointers.delete(event.pointerId);
    };
    toggleLock = (source = "ui") => {
        if (!this.state.activeTool.locked) {
            (0, analytics_1.trackEvent)("toolbar", "toggleLock", `${source} (${this.editorInterface.formFactor === "phone" ? "mobile" : "desktop"})`);
        }
        this.setState((prevState) => {
            return {
                activeTool: {
                    ...prevState.activeTool,
                    ...(0, common_1.updateActiveTool)(this.state, prevState.activeTool.locked
                        ? { type: this.state.preferredSelectionTool.type }
                        : prevState.activeTool),
                    locked: !prevState.activeTool.locked,
                },
            };
        });
    };
    updateFrameRendering = (opts) => {
        this.setState((prevState) => {
            const next = typeof opts === "function" ? opts(prevState.frameRendering) : opts;
            return {
                frameRendering: {
                    enabled: next?.enabled ?? prevState.frameRendering.enabled,
                    clip: next?.clip ?? prevState.frameRendering.clip,
                    name: next?.name ?? prevState.frameRendering.name,
                    outline: next?.outline ?? prevState.frameRendering.outline,
                },
            };
        });
    };
    togglePenMode = (force) => {
        this.setState((prevState) => {
            return {
                penMode: force ?? !prevState.penMode,
                penDetected: true,
            };
        });
    };
    onHandToolToggle = () => {
        this.actionManager.executeAction(actionCanvas_1.actionToggleHandTool);
    };
    /**
     * Zooms on canvas viewport center
     */
    zoomCanvas = (
    /**
     * Decimal fraction, auto-clamped between MIN_ZOOM and MAX_ZOOM.
     * 1 = 100% zoom, 2 = 200% zoom, 0.5 = 50% zoom
     */
    value) => {
        this.setState({
            ...(0, zoom_1.getStateForZoom)({
                viewportX: this.state.width / 2 + this.state.offsetLeft,
                viewportY: this.state.height / 2 + this.state.offsetTop,
                nextZoom: (0, scene_1.getNormalizedZoom)(value),
            }, this.state),
        });
    };
    cancelInProgressAnimation = null;
    scrollToContent = (
    /**
     * target to scroll to
     *
     * - string - id of element or group, or url containing elementLink
     * - ExcalidrawElement | ExcalidrawElement[] - element(s) objects
     */
    target = this.scene.getNonDeletedElements(), opts) => {
        if (typeof target === "string") {
            let id;
            if ((0, element_1.isElementLink)(target)) {
                id = (0, element_1.parseElementLinkFromURL)(target);
            }
            else {
                id = target;
            }
            if (id) {
                const elements = this.scene.getElementsFromId(id);
                if (elements?.length) {
                    this.scrollToContent(elements, {
                        fitToContent: opts?.fitToContent ?? true,
                        animate: opts?.animate ?? true,
                    });
                }
                else if ((0, element_1.isElementLink)(target)) {
                    this.setState({
                        toast: {
                            message: (0, i18n_1.t)("elementLink.notFound"),
                            duration: 3000,
                            closable: true,
                        },
                    });
                }
            }
            return;
        }
        this.cancelInProgressAnimation?.();
        // convert provided target into ExcalidrawElement[] if necessary
        const targetElements = Array.isArray(target) ? target : [target];
        let zoom = this.state.zoom;
        let scrollX = this.state.scrollX;
        let scrollY = this.state.scrollY;
        if (opts?.fitToContent || opts?.fitToViewport) {
            const { appState } = (0, actionCanvas_1.zoomToFit)({
                canvasOffsets: opts.canvasOffsets,
                targetElements,
                appState: this.state,
                fitToViewport: !!opts?.fitToViewport,
                viewportZoomFactor: opts?.viewportZoomFactor,
                minZoom: opts?.minZoom,
                maxZoom: opts?.maxZoom,
            });
            zoom = appState.zoom;
            scrollX = appState.scrollX;
            scrollY = appState.scrollY;
        }
        else {
            // compute only the viewport location, without any zoom adjustment
            const scroll = (0, scene_1.calculateScrollCenter)(targetElements, this.state);
            scrollX = scroll.scrollX;
            scrollY = scroll.scrollY;
        }
        // when animating, we use RequestAnimationFrame to prevent the animation
        // from slowing down other processes
        if (opts?.animate) {
            const origScrollX = this.state.scrollX;
            const origScrollY = this.state.scrollY;
            const origZoom = this.state.zoom.value;
            const cancel = (0, common_1.easeToValuesRAF)({
                fromValues: {
                    scrollX: origScrollX,
                    scrollY: origScrollY,
                    zoom: origZoom,
                },
                toValues: { scrollX, scrollY, zoom: zoom.value },
                interpolateValue: (from, to, progress, key) => {
                    // for zoom, use different easing
                    if (key === "zoom") {
                        return from * Math.pow(to / from, (0, common_1.easeOut)(progress));
                    }
                    // handle using default
                    return undefined;
                },
                onStep: ({ scrollX, scrollY, zoom }) => {
                    this.setState({
                        scrollX,
                        scrollY,
                        zoom: { value: zoom },
                    });
                },
                onStart: () => {
                    this.setState({ shouldCacheIgnoreZoom: true });
                },
                onEnd: () => {
                    this.setState({ shouldCacheIgnoreZoom: false });
                },
                onCancel: () => {
                    this.setState({ shouldCacheIgnoreZoom: false });
                },
                duration: opts?.duration ?? 500,
            });
            this.cancelInProgressAnimation = () => {
                cancel();
                this.cancelInProgressAnimation = null;
            };
        }
        else {
            this.setState({ scrollX, scrollY, zoom });
        }
    };
    maybeUnfollowRemoteUser = () => {
        if (this.state.userToFollow) {
            this.setState({ userToFollow: null });
        }
    };
    /** use when changing scrollX/scrollY/zoom based on user interaction */
    translateCanvas = (state) => {
        this.cancelInProgressAnimation?.();
        this.maybeUnfollowRemoteUser();
        this.setState(state);
    };
    setToast = (toast) => {
        this.setState({ toast });
    };
    restoreFileFromShare = async () => {
        try {
            const webShareTargetCache = await caches.open("web-share-target");
            const response = await webShareTargetCache.match("shared-file");
            if (response) {
                const blob = await response.blob();
                const file = new File([blob], blob.name || "", { type: blob.type });
                this.loadFileToCanvas(file, null);
                await webShareTargetCache.delete("shared-file");
                window.history.replaceState(null, common_1.APP_NAME, window.location.pathname);
            }
        }
        catch (error) {
            this.setState({ errorMessage: error.message });
        }
    };
    /**
     * adds supplied files to existing files in the appState.
     * NOTE if file already exists in editor state, the file data is not updated
     * */
    addFiles = (0, reactUtils_1.withBatchedUpdates)((files) => {
        const { addedFiles } = this.addMissingFiles(files);
        this.clearImageShapeCache(addedFiles);
        this.scene.triggerUpdate();
        this.addNewImagesToImageCache();
    });
    addMissingFiles = (files, replace = false) => {
        const nextFiles = replace ? {} : { ...this.files };
        const addedFiles = {};
        const _files = Array.isArray(files) ? files : Object.values(files);
        for (const fileData of _files) {
            if (nextFiles[fileData.id]) {
                continue;
            }
            addedFiles[fileData.id] = fileData;
            nextFiles[fileData.id] = fileData;
            if (fileData.mimeType === common_1.MIME_TYPES.svg) {
                try {
                    const restoredDataURL = (0, blob_1.getDataURL_sync)((0, element_1.normalizeSVG)((0, blob_1.dataURLToString)(fileData.dataURL)), common_1.MIME_TYPES.svg);
                    if (fileData.dataURL !== restoredDataURL) {
                        // bump version so persistence layer can update the store
                        fileData.version = (fileData.version ?? 1) + 1;
                        fileData.dataURL = restoredDataURL;
                    }
                }
                catch (error) {
                    console.error(error);
                }
            }
        }
        this.files = nextFiles;
        return { addedFiles };
    };
    updateScene = (0, reactUtils_1.withBatchedUpdates)((sceneData) => {
        const { elements, appState, collaborators, captureUpdate } = sceneData;
        if (captureUpdate) {
            const nextElements = elements ? elements : undefined;
            const observedAppState = appState
                ? (0, element_1.getObservedAppState)({
                    ...this.store.snapshot.appState,
                    ...appState,
                })
                : undefined;
            this.store.scheduleMicroAction({
                action: captureUpdate,
                elements: nextElements,
                appState: observedAppState,
            });
        }
        if (appState) {
            this.setState(appState);
        }
        if (elements) {
            this.scene.replaceAllElements(elements);
        }
        if (collaborators) {
            this.setState({ collaborators });
        }
    });
    applyDeltas = (deltas, options) => {
        // squash all deltas together, starting with a fresh new delta instance
        const aggregatedDelta = element_1.StoreDelta.squash(...deltas);
        // create new instance of elements map & appState, so we don't accidentaly mutate existing ones
        const nextAppState = { ...this.state };
        const nextElements = new Map(this.scene.getElementsMapIncludingDeleted());
        return element_1.StoreDelta.applyTo(aggregatedDelta, nextElements, nextAppState, options);
    };
    mutateElement = (element, updates, informMutation = true) => {
        return this.scene.mutateElement(element, updates, {
            informMutation,
            isDragging: false,
        });
    };
    triggerRender = (
    /** force always re-renders canvas even if no change */
    force) => {
        if (force === true) {
            this.scene.triggerUpdate();
        }
        else {
            this.setState({});
        }
    };
    /**
     * @returns whether the menu was toggled on or off
     */
    toggleSidebar = ({ name, tab, force, }) => {
        let nextName;
        if (force === undefined) {
            nextName =
                this.state.openSidebar?.name === name &&
                    this.state.openSidebar?.tab === tab
                    ? null
                    : name;
        }
        else {
            nextName = force ? name : null;
        }
        const nextState = nextName
            ? { name: nextName }
            : null;
        if (nextState && tab) {
            nextState.tab = tab;
        }
        this.setState({ openSidebar: nextState });
        return !!nextName;
    };
    updateCurrentCursorPosition = (0, reactUtils_1.withBatchedUpdates)((event) => {
        this.lastViewportPosition.x = event.clientX;
        this.lastViewportPosition.y = event.clientY;
    });
    getEditorUIOffsets = () => {
        const toolbarBottom = this.excalidrawContainerRef?.current
            ?.querySelector(".App-toolbar")
            ?.getBoundingClientRect()?.bottom ?? 0;
        const sidebarRect = this.excalidrawContainerRef?.current
            ?.querySelector(".sidebar")
            ?.getBoundingClientRect();
        const propertiesPanelRect = this.excalidrawContainerRef?.current
            ?.querySelector(".App-menu__left")
            ?.getBoundingClientRect();
        const PADDING = 16;
        return (0, i18n_1.getLanguage)().rtl
            ? {
                top: toolbarBottom + PADDING,
                right: Math.max(this.state.width -
                    (propertiesPanelRect?.left ?? this.state.width), 0) + PADDING,
                bottom: PADDING,
                left: Math.max(sidebarRect?.right ?? 0, 0) + PADDING,
            }
            : {
                top: toolbarBottom + PADDING,
                right: Math.max(this.state.width -
                    (sidebarRect?.left ?? this.state.width) +
                    PADDING, 0),
                bottom: PADDING,
                left: Math.max(propertiesPanelRect?.right ?? 0, 0) + PADDING,
            };
    };
    // Input handling
    onKeyDown = (0, reactUtils_1.withBatchedUpdates)((event) => {
        // normalize `event.key` when CapsLock is pressed #2372
        if ("Proxy" in window &&
            ((!event.shiftKey && /^[A-Z]$/.test(event.key)) ||
                (event.shiftKey && /^[a-z]$/.test(event.key)))) {
            event = new Proxy(event, {
                get(ev, prop) {
                    const value = ev[prop];
                    if (typeof value === "function") {
                        // fix for Proxies hijacking `this`
                        return value.bind(ev);
                    }
                    return prop === "key"
                        ? // CapsLock inverts capitalization based on ShiftKey, so invert
                            // it back
                            event.shiftKey
                                ? ev.key.toUpperCase()
                                : ev.key.toLowerCase()
                        : value;
                },
            });
        }
        if (!(0, common_1.isInputLike)(event.target)) {
            if ((event.key === common_1.KEYS.ESCAPE || event.key === common_1.KEYS.ENTER) &&
                this.state.croppingElementId) {
                this.finishImageCropping();
                return;
            }
            const selectedElements = (0, scene_1.getSelectedElements)(this.scene.getNonDeletedElementsMap(), this.state);
            if (selectedElements.length === 1 &&
                (0, element_1.isImageElement)(selectedElements[0]) &&
                event.key === common_1.KEYS.ENTER) {
                this.startImageCropping(selectedElements[0]);
                return;
            }
            // Shape switching
            if (event.key === common_1.KEYS.ESCAPE) {
                this.updateEditorAtom(ConvertElementTypePopup_1.convertElementTypePopupAtom, null);
            }
            else if (event.key === common_1.KEYS.TAB &&
                (document.activeElement === this.excalidrawContainerRef?.current ||
                    document.activeElement?.classList.contains(common_1.CLASSES.CONVERT_ELEMENT_TYPE_POPUP))) {
                event.preventDefault();
                const conversionType = (0, ConvertElementTypePopup_1.getConversionTypeFromElements)(selectedElements);
                if (editor_jotai_1.editorJotaiStore.get(ConvertElementTypePopup_1.convertElementTypePopupAtom)?.type === "panel") {
                    if ((0, ConvertElementTypePopup_1.convertElementTypes)(this, {
                        conversionType,
                        direction: event.shiftKey ? "left" : "right",
                    })) {
                        this.store.scheduleCapture();
                    }
                }
                if (conversionType) {
                    this.updateEditorAtom(ConvertElementTypePopup_1.convertElementTypePopupAtom, {
                        type: "panel",
                    });
                }
            }
            if (event.key === common_1.KEYS.ESCAPE &&
                this.flowChartCreator.isCreatingChart) {
                this.flowChartCreator.clear();
                this.triggerRender(true);
                return;
            }
            const arrowKeyPressed = (0, common_1.isArrowKey)(event.key);
            if (event[common_1.KEYS.CTRL_OR_CMD] && arrowKeyPressed && !event.shiftKey) {
                event.preventDefault();
                const selectedElements = (0, scene_1.getSelectedElements)(this.scene.getNonDeletedElementsMap(), this.state);
                if (selectedElements.length === 1 &&
                    (0, element_1.isFlowchartNodeElement)(selectedElements[0])) {
                    this.flowChartCreator.createNodes(selectedElements[0], this.state, (0, element_1.getLinkDirectionFromKey)(event.key), this.scene);
                }
                if (this.flowChartCreator.pendingNodes?.length &&
                    !(0, element_1.isElementCompletelyInViewport)(this.flowChartCreator.pendingNodes, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio, {
                        offsetLeft: this.state.offsetLeft,
                        offsetTop: this.state.offsetTop,
                        scrollX: this.state.scrollX,
                        scrollY: this.state.scrollY,
                        zoom: this.state.zoom,
                    }, this.scene.getNonDeletedElementsMap(), this.getEditorUIOffsets())) {
                    this.scrollToContent(this.flowChartCreator.pendingNodes, {
                        animate: true,
                        duration: 300,
                        fitToContent: true,
                        canvasOffsets: this.getEditorUIOffsets(),
                    });
                }
                return;
            }
            if (event.altKey) {
                const selectedElements = (0, scene_1.getSelectedElements)(this.scene.getNonDeletedElementsMap(), this.state);
                if (selectedElements.length === 1 && arrowKeyPressed) {
                    event.preventDefault();
                    const nextId = this.flowChartNavigator.exploreByDirection(selectedElements[0], this.scene.getNonDeletedElementsMap(), (0, element_1.getLinkDirectionFromKey)(event.key));
                    if (nextId) {
                        this.setState((prevState) => ({
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                                [nextId]: true,
                            }, prevState),
                        }));
                        const nextNode = this.scene
                            .getNonDeletedElementsMap()
                            .get(nextId);
                        if (nextNode &&
                            !(0, element_1.isElementCompletelyInViewport)([nextNode], this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio, {
                                offsetLeft: this.state.offsetLeft,
                                offsetTop: this.state.offsetTop,
                                scrollX: this.state.scrollX,
                                scrollY: this.state.scrollY,
                                zoom: this.state.zoom,
                            }, this.scene.getNonDeletedElementsMap(), this.getEditorUIOffsets())) {
                            this.scrollToContent(nextNode, {
                                animate: true,
                                duration: 300,
                                canvasOffsets: this.getEditorUIOffsets(),
                            });
                        }
                    }
                    return;
                }
            }
        }
        if (event[common_1.KEYS.CTRL_OR_CMD] &&
            event.key === common_1.KEYS.P &&
            !event.shiftKey &&
            !event.altKey) {
            this.setToast({
                message: (0, i18n_1.t)("commandPalette.shortcutHint", {
                    shortcut: (0, shortcuts_1.getShortcutFromShortcutName)("commandPalette"),
                }),
            });
            event.preventDefault();
            return;
        }
        if (event[common_1.KEYS.CTRL_OR_CMD] && event.key.toLowerCase() === common_1.KEYS.V) {
            IS_PLAIN_PASTE = event.shiftKey;
            clearTimeout(IS_PLAIN_PASTE_TIMER);
            // reset (100ms to be safe that we it runs after the ensuing
            // paste event). Though, technically unnecessary to reset since we
            // (re)set the flag before each paste event.
            IS_PLAIN_PASTE_TIMER = window.setTimeout(() => {
                IS_PLAIN_PASTE = false;
            }, 100);
        }
        // prevent browser zoom in input fields
        if (event[common_1.KEYS.CTRL_OR_CMD] && (0, common_1.isWritableElement)(event.target)) {
            if (event.code === common_1.CODES.MINUS || event.code === common_1.CODES.EQUAL) {
                event.preventDefault();
                return;
            }
        }
        // bail if
        if (
        // inside an input
        ((0, common_1.isWritableElement)(event.target) &&
            // unless pressing escape (finalize action)
            event.key !== common_1.KEYS.ESCAPE) ||
            // or unless using arrows (to move between buttons)
            ((0, common_1.isArrowKey)(event.key) && (0, common_1.isInputLike)(event.target))) {
            return;
        }
        if (event.key === common_1.KEYS.QUESTION_MARK) {
            this.setState({
                openDialog: { name: "help" },
            });
            return;
        }
        else if (event.key.toLowerCase() === common_1.KEYS.E &&
            event.shiftKey &&
            event[common_1.KEYS.CTRL_OR_CMD]) {
            event.preventDefault();
            this.setState({ openDialog: { name: "imageExport" } });
            return;
        }
        if (event.key === common_1.KEYS.PAGE_UP || event.key === common_1.KEYS.PAGE_DOWN) {
            let offset = (event.shiftKey ? this.state.width : this.state.height) /
                this.state.zoom.value;
            if (event.key === common_1.KEYS.PAGE_DOWN) {
                offset = -offset;
            }
            if (event.shiftKey) {
                this.translateCanvas((state) => ({
                    scrollX: state.scrollX + offset,
                }));
            }
            else {
                this.translateCanvas((state) => ({
                    scrollY: state.scrollY + offset,
                }));
            }
        }
        if (this.state.openDialog?.name === "elementLinkSelector") {
            return;
        }
        // Handle Alt key for bind mode
        if (event.key === common_1.KEYS.ALT) {
            if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                this.handleSkipBindMode();
            }
            else {
                (0, element_1.maybeHandleArrowPointlikeDrag)({ app: this, event });
            }
        }
        if (this.actionManager.handleKeyDown(event)) {
            return;
        }
        // view mode hardcoded from upstream -> disable tool switching for now
        const shouldPreventToolSwitching = this.props.viewModeEnabled === true;
        if (!shouldPreventToolSwitching &&
            this.state.viewModeEnabled &&
            event.key === common_1.KEYS.ESCAPE) {
            this.setActiveTool({ type: "selection" });
            return;
        }
        if (!shouldPreventToolSwitching &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey &&
            !this.state.newElement &&
            !this.state.selectionElement &&
            !this.state.selectedElementsAreBeingDragged) {
            const shape = (0, shapes_1.findShapeByKey)(event.key, this);
            if (this.state.viewModeEnabled && !(0, common_1.oneOf)(shape, ["laser", "hand"])) {
                return;
            }
            if (shape) {
                if (this.state.activeTool.type !== shape) {
                    (0, analytics_1.trackEvent)("toolbar", shape, `keyboard (${this.editorInterface.formFactor === "phone"
                        ? "mobile"
                        : "desktop"})`);
                }
                if (shape === "arrow" && this.state.activeTool.type === "arrow") {
                    this.setState((prevState) => ({
                        currentItemArrowType: prevState.currentItemArrowType === common_1.ARROW_TYPE.sharp
                            ? common_1.ARROW_TYPE.round
                            : prevState.currentItemArrowType === common_1.ARROW_TYPE.round
                                ? common_1.ARROW_TYPE.elbow
                                : common_1.ARROW_TYPE.sharp,
                    }));
                }
                if (shape === "lasso" && this.state.activeTool.type === "laser") {
                    this.setActiveTool({
                        type: this.state.preferredSelectionTool.type,
                    });
                }
                else {
                    this.setActiveTool({ type: shape });
                }
                event.stopPropagation();
                return;
            }
            else if (event.key === common_1.KEYS.Q) {
                this.toggleLock("keyboard");
                event.stopPropagation();
                return;
            }
        }
        if (this.state.viewModeEnabled) {
            return;
        }
        if (event[common_1.KEYS.CTRL_OR_CMD] && !event.repeat) {
            if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                this.resetDelayedBindMode();
            }
            (0, react_dom_1.flushSync)(() => {
                this.setState({
                    isBindingEnabled: this.state.bindingPreference !== "enabled",
                });
            });
            (0, element_1.maybeHandleArrowPointlikeDrag)({ app: this, event });
        }
        if ((0, common_1.isArrowKey)(event.key)) {
            let selectedElements = this.scene.getSelectedElements({
                selectedElementIds: this.state.selectedElementIds,
                includeBoundTextElement: true,
                includeElementsInFrames: true,
            });
            const arrowIdsToRemove = new Set();
            selectedElements
                .filter((el) => (0, element_1.isBindingElement)(el))
                .filter((arrow) => {
                const startElementNotInSelection = arrow.startBinding &&
                    !selectedElements.some((el) => el.id === arrow.startBinding?.elementId);
                const endElementNotInSelection = arrow.endBinding &&
                    !selectedElements.some((el) => el.id === arrow.endBinding?.elementId);
                return startElementNotInSelection || endElementNotInSelection;
            })
                .forEach((arrow) => arrowIdsToRemove.add(arrow.id));
            selectedElements = selectedElements.filter((el) => !arrowIdsToRemove.has(el.id));
            const step = (this.getEffectiveGridSize() &&
                (event.shiftKey
                    ? common_1.ELEMENT_TRANSLATE_AMOUNT
                    : this.getEffectiveGridSize())) ||
                (event.shiftKey
                    ? common_1.ELEMENT_SHIFT_TRANSLATE_AMOUNT
                    : common_1.ELEMENT_TRANSLATE_AMOUNT);
            let offsetX = 0;
            let offsetY = 0;
            if (event.key === common_1.KEYS.ARROW_LEFT) {
                offsetX = -step;
            }
            else if (event.key === common_1.KEYS.ARROW_RIGHT) {
                offsetX = step;
            }
            else if (event.key === common_1.KEYS.ARROW_UP) {
                offsetY = -step;
            }
            else if (event.key === common_1.KEYS.ARROW_DOWN) {
                offsetY = step;
            }
            selectedElements.forEach((element) => {
                this.scene.mutateElement(element, {
                    x: element.x + offsetX,
                    y: element.y + offsetY,
                }, { informMutation: false, isDragging: false });
                (0, element_1.updateBoundElements)(element, this.scene, {
                    simultaneouslyUpdated: selectedElements,
                });
            });
            this.scene.triggerUpdate();
            event.preventDefault();
        }
        else if (event.key === common_1.KEYS.ENTER) {
            const selectedElements = this.scene.getSelectedElements(this.state);
            if (selectedElements.length === 1) {
                const selectedElement = selectedElements[0];
                if (event[common_1.KEYS.CTRL_OR_CMD] || (0, element_1.isLineElement)(selectedElement)) {
                    if ((0, element_1.isLinearElement)(selectedElement)) {
                        if (!this.state.selectedLinearElement?.isEditing ||
                            this.state.selectedLinearElement.elementId !==
                                selectedElement.id) {
                            this.store.scheduleCapture();
                            if (!(0, element_1.isElbowArrow)(selectedElement)) {
                                this.actionManager.executeAction(actions_1.actionToggleLinearEditor);
                            }
                        }
                    }
                }
                else if ((0, element_1.isTextElement)(selectedElement) ||
                    (0, element_1.isValidTextContainer)(selectedElement)) {
                    let container;
                    if (!(0, element_1.isTextElement)(selectedElement)) {
                        container = selectedElement;
                    }
                    const midPoint = (0, element_1.getContainerCenter)(selectedElement, this.state, this.scene.getNonDeletedElementsMap());
                    const sceneX = midPoint.x;
                    const sceneY = midPoint.y;
                    this.startTextEditing({
                        sceneX,
                        sceneY,
                        container,
                    });
                    event.preventDefault();
                    return;
                }
                else if ((0, element_1.isFrameLikeElement)(selectedElement)) {
                    this.setState({
                        editingFrame: selectedElement.id,
                    });
                }
            }
        }
        if (event.key === common_1.KEYS.SPACE && gesture.pointers.size === 0) {
            isHoldingSpace = true;
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
            event.preventDefault();
        }
        if ((event.key === common_1.KEYS.G || event.key === common_1.KEYS.S) &&
            !event.altKey &&
            !event[common_1.KEYS.CTRL_OR_CMD]) {
            const selectedElements = this.scene.getSelectedElements(this.state);
            if (this.state.activeTool.type === "selection" &&
                !selectedElements.length) {
                return;
            }
            if (event.key === common_1.KEYS.G &&
                ((0, scene_1.hasBackground)(this.state.activeTool.type) ||
                    selectedElements.some((element) => (0, scene_1.hasBackground)(element.type)))) {
                this.setState({ openPopup: "elementBackground" });
                event.stopPropagation();
            }
            if (event.key === common_1.KEYS.S) {
                this.setState({ openPopup: "elementStroke" });
                event.stopPropagation();
            }
        }
        if (!event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            event.key.toLowerCase() === common_1.KEYS.F) {
            const selectedElements = this.scene.getSelectedElements(this.state);
            if (this.state.activeTool.type === "selection" &&
                !selectedElements.length) {
                return;
            }
            if (this.state.activeTool.type === "text" ||
                selectedElements.find((element) => (0, element_1.isTextElement)(element) ||
                    (0, element_1.getBoundTextElement)(element, this.scene.getNonDeletedElementsMap()))) {
                event.preventDefault();
                this.setState({ openPopup: "fontFamily" });
            }
        }
        if (event[common_1.KEYS.CTRL_OR_CMD] &&
            (event.key === common_1.KEYS.BACKSPACE || event.key === common_1.KEYS.DELETE)) {
            this.updateEditorAtom(ActiveConfirmDialog_1.activeConfirmDialogAtom, "clearCanvas");
        }
        // eye dropper
        // -----------------------------------------------------------------------
        const lowerCased = event.key.toLocaleLowerCase();
        const isPickingStroke = lowerCased === common_1.KEYS.S && event.shiftKey && !event[common_1.KEYS.CTRL_OR_CMD];
        const isPickingBackground = event.key === common_1.KEYS.I || (lowerCased === common_1.KEYS.G && event.shiftKey);
        if (isPickingStroke || isPickingBackground) {
            this.openEyeDropper({
                type: isPickingStroke ? "stroke" : "background",
            });
        }
        // -----------------------------------------------------------------------
    });
    onKeyUp = (0, reactUtils_1.withBatchedUpdates)((event) => {
        if (event.key === common_1.KEYS.SPACE) {
            if ((this.state.viewModeEnabled &&
                this.state.activeTool.type !== "laser") ||
                this.state.openDialog?.name === "elementLinkSelector") {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
            }
            else if ((0, common_1.isSelectionLikeTool)(this.state.activeTool.type)) {
                (0, cursor_1.resetCursor)(this.interactiveCanvas);
            }
            else {
                (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
                this.setState({
                    selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                    selectedGroupIds: {},
                    editingGroupId: null,
                    activeEmbeddable: null,
                });
            }
            isHoldingSpace = false;
        }
        if (event.key === common_1.KEYS.ALT) {
            (0, element_1.maybeHandleArrowPointlikeDrag)({ app: this, event });
        }
        if ((event.key === common_1.KEYS.ALT && this.state.bindMode === "skip") ||
            (!event[common_1.KEYS.CTRL_OR_CMD] && !(0, element_1.isBindingEnabled)(this.state))) {
            // Handle Alt key release for bind mode
            this.setState({
                bindMode: "orbit",
            });
            // Restart the timer if we're creating/editing a linear element and hovering over an element
            if (this.lastPointerMoveEvent && (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                const scenePointer = (0, common_1.viewportCoordsToSceneCoords)({
                    clientX: this.lastPointerMoveEvent.clientX,
                    clientY: this.lastPointerMoveEvent.clientY,
                }, this.state);
                const hoveredElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(scenePointer.x, scenePointer.y), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap());
                if (this.state.selectedLinearElement) {
                    const element = element_1.LinearElementEditor.getElement(this.state.selectedLinearElement.elementId, this.scene.getNonDeletedElementsMap());
                    if ((0, element_1.isBindingElement)(element)) {
                        this.handleDelayedBindModeChange(element, hoveredElement);
                    }
                }
            }
        }
        if (!event[common_1.KEYS.CTRL_OR_CMD]) {
            const preferenceEnabled = this.state.bindingPreference === "enabled";
            if (this.state.isBindingEnabled !== preferenceEnabled) {
                (0, react_dom_1.flushSync)(() => {
                    this.setState({ isBindingEnabled: preferenceEnabled });
                });
            }
            (0, element_1.maybeHandleArrowPointlikeDrag)({ app: this, event });
        }
        if ((0, common_1.isArrowKey)(event.key)) {
            (0, element_1.bindOrUnbindBindingElements)(this.scene.getSelectedElements(this.state).filter(element_1.isArrowElement), this.scene, this.state);
            const elementsMap = this.scene.getNonDeletedElementsMap();
            this.scene
                .getSelectedElements(this.state)
                .filter(element_1.isSimpleArrow)
                .forEach((element) => {
                // Update the fixed point bindings for non-elbow arrows
                // when the pointer is released, so that they are correctly positioned
                // after the drag.
                if (element.startBinding) {
                    this.scene.mutateElement(element, {
                        startBinding: {
                            ...element.startBinding,
                            ...(0, element_1.calculateFixedPointForNonElbowArrowBinding)(element, elementsMap.get(element.startBinding.elementId), "start", elementsMap),
                        },
                    });
                }
                if (element.endBinding) {
                    this.scene.mutateElement(element, {
                        endBinding: {
                            ...element.endBinding,
                            ...(0, element_1.calculateFixedPointForNonElbowArrowBinding)(element, elementsMap.get(element.endBinding.elementId), "end", elementsMap),
                        },
                    });
                }
            });
            this.setState({ suggestedBinding: null });
        }
        if (!event.altKey) {
            if (this.flowChartNavigator.isExploring) {
                this.flowChartNavigator.clear();
                this.syncActionResult({
                    captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                });
            }
        }
        if (!event[common_1.KEYS.CTRL_OR_CMD]) {
            if (this.flowChartCreator.isCreatingChart) {
                if (this.flowChartCreator.pendingNodes?.length) {
                    this.scene.insertElements(this.flowChartCreator.pendingNodes);
                }
                const firstNode = this.flowChartCreator.pendingNodes?.[0];
                if (firstNode) {
                    this.setState((prevState) => ({
                        selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                            [firstNode.id]: true,
                        }, prevState),
                    }));
                    if (!(0, element_1.isElementCompletelyInViewport)([firstNode], this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio, {
                        offsetLeft: this.state.offsetLeft,
                        offsetTop: this.state.offsetTop,
                        scrollX: this.state.scrollX,
                        scrollY: this.state.scrollY,
                        zoom: this.state.zoom,
                    }, this.scene.getNonDeletedElementsMap(), this.getEditorUIOffsets())) {
                        this.scrollToContent(firstNode, {
                            animate: true,
                            duration: 300,
                            canvasOffsets: this.getEditorUIOffsets(),
                        });
                    }
                }
                this.flowChartCreator.clear();
                this.syncActionResult({
                    captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                });
            }
        }
    });
    // We purposely widen the `tool` type so this helper can be called with
    // any tool without having to type check it
    isToolSupported = (tool) => {
        return (this.props.UIOptions.tools?.[tool] !== false);
    };
    setActiveTool = (tool, keepSelection = false) => {
        if (!this.isToolSupported(tool.type)) {
            console.warn(`"${tool.type}" tool is disabled via "UIOptions.canvasActions.tools.${tool.type}"`);
            return;
        }
        const nextActiveTool = (0, common_1.updateActiveTool)(this.state, tool);
        if (nextActiveTool.type === "hand") {
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
        }
        else if (!isHoldingSpace) {
            (0, cursor_1.setCursorForShape)(this.interactiveCanvas, {
                ...this.state,
                activeTool: nextActiveTool,
            });
        }
        if ((0, common_1.isToolIcon)(document.activeElement)) {
            this.focusContainer();
        }
        if (!(0, element_1.isLinearElementType)(nextActiveTool.type)) {
            this.setState({ suggestedBinding: null });
        }
        if (nextActiveTool.type === "image") {
            this.onImageToolbarButtonClick();
        }
        this.setState((prevState) => {
            const commonResets = {
                snapLines: prevState.snapLines.length ? [] : prevState.snapLines,
                originSnapOffset: null,
                activeEmbeddable: null,
                selectedLinearElement: (0, common_1.isSelectionLikeTool)(nextActiveTool.type)
                    ? prevState.selectedLinearElement
                    : null,
            };
            if (nextActiveTool.type === "freedraw") {
                this.store.scheduleCapture();
            }
            if (nextActiveTool.type === "lasso") {
                return {
                    ...prevState,
                    ...commonResets,
                    activeTool: nextActiveTool,
                    ...(keepSelection
                        ? {}
                        : {
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, prevState),
                            selectedGroupIds: (0, element_1.makeNextSelectedElementIds)({}, prevState),
                            editingGroupId: null,
                            multiElement: null,
                        }),
                };
            }
            else if (nextActiveTool.type !== "selection") {
                return {
                    ...prevState,
                    ...commonResets,
                    activeTool: nextActiveTool,
                    selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, prevState),
                    selectedGroupIds: (0, element_1.makeNextSelectedElementIds)({}, prevState),
                    editingGroupId: null,
                    multiElement: null,
                };
            }
            return {
                ...prevState,
                ...commonResets,
                activeTool: nextActiveTool,
            };
        });
    };
    setOpenDialog = (dialogType) => {
        this.setState({ openDialog: dialogType });
    };
    setCursor = (cursor) => {
        (0, cursor_1.setCursor)(this.interactiveCanvas, cursor);
    };
    resetCursor = () => {
        (0, cursor_1.resetCursor)(this.interactiveCanvas);
    };
    /**
     * returns whether user is making a gesture with >= 2 fingers (points)
     * on o touch screen (not on a trackpad). Currently only relates to Darwin
     * (iOS/iPadOS,MacOS), but may work on other devices in the future if
     * GestureEvent is standardized.
     */
    isTouchScreenMultiTouchGesture = () => {
        // we don't want to deselect when using trackpad, and multi-point gestures
        // only work on touch screens, so checking for >= pointers means we're on a
        // touchscreen
        return gesture.pointers.size >= 2;
    };
    getName = () => {
        return (this.state.name ||
            this.props.name ||
            `${(0, i18n_1.t)("labels.untitled")}-${(0, common_1.getDateTime)()}`);
    };
    // fires only on Safari
    onGestureStart = (0, reactUtils_1.withBatchedUpdates)((event) => {
        event.preventDefault();
        // we only want to deselect on touch screens because user may have selected
        // elements by mistake while zooming
        if (this.isTouchScreenMultiTouchGesture()) {
            this.setState({
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                activeEmbeddable: null,
            });
        }
        gesture.initialScale = this.state.zoom.value;
    });
    // fires only on Safari
    onGestureChange = (0, reactUtils_1.withBatchedUpdates)((event) => {
        event.preventDefault();
        // onGestureChange only has zoom factor but not the center.
        // If we're on iPad or iPhone, then we recognize multi-touch and will
        // zoom in at the right location in the touchmove handler
        // (handleCanvasPointerMove).
        //
        // On Macbook trackpad, we don't have those events so will zoom in at the
        // current location instead.
        //
        // As such, bail from this handler on touch devices.
        if (this.isTouchScreenMultiTouchGesture()) {
            return;
        }
        const initialScale = gesture.initialScale;
        if (initialScale) {
            this.setState((state) => ({
                ...(0, zoom_1.getStateForZoom)({
                    viewportX: this.lastViewportPosition.x,
                    viewportY: this.lastViewportPosition.y,
                    nextZoom: (0, scene_1.getNormalizedZoom)(initialScale * event.scale),
                }, state),
            }));
        }
    });
    // fires only on Safari
    onGestureEnd = (0, reactUtils_1.withBatchedUpdates)((event) => {
        event.preventDefault();
        // reselect elements only on touch screens (see onGestureStart)
        if (this.isTouchScreenMultiTouchGesture()) {
            this.setState({
                previousSelectedElementIds: {},
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)(this.state.previousSelectedElementIds, this.state),
            });
        }
        gesture.initialScale = null;
    });
    handleTextWysiwyg(element, { isExistingElement = false, initialCaretSceneCoords = null, }) {
        const elementsMap = this.scene.getElementsMapIncludingDeleted();
        const updateElement = (nextOriginalText, isDeleted) => {
            this.scene.replaceAllElements([
                // Not sure why we include deleted elements as well hence using deleted elements map
                ...this.scene.getElementsIncludingDeleted().map((_element) => {
                    if (_element.id === element.id && (0, element_1.isTextElement)(_element)) {
                        return (0, element_1.newElementWith)(_element, {
                            originalText: nextOriginalText,
                            isDeleted: isDeleted ?? _element.isDeleted,
                            // returns (wrapped) text and new dimensions
                            ...(0, element_1.refreshTextDimensions)(_element, (0, element_1.getContainerElement)(_element, elementsMap), elementsMap, nextOriginalText),
                        });
                    }
                    return _element;
                }),
            ]);
        };
        (0, textWysiwyg_1.textWysiwyg)({
            id: element.id,
            canvas: this.canvas,
            getViewportCoords: (x, y) => {
                const { x: viewportX, y: viewportY } = (0, common_1.sceneCoordsToViewportCoords)({
                    sceneX: x,
                    sceneY: y,
                }, this.state);
                return [
                    viewportX - this.state.offsetLeft,
                    viewportY - this.state.offsetTop,
                ];
            },
            onChange: (0, reactUtils_1.withBatchedUpdates)((nextOriginalText) => {
                updateElement(nextOriginalText, false);
                if ((0, element_1.isNonDeletedElement)(element)) {
                    (0, element_1.updateBoundElements)(element, this.scene);
                }
            }),
            onSubmit: (0, reactUtils_1.withBatchedUpdates)(({ viaKeyboard, nextOriginalText }) => {
                const isDeleted = !nextOriginalText.trim();
                updateElement(nextOriginalText, isDeleted);
                // keyboard-submit keeps focus on the edited object. For bound text, keep
                // the container selected even if the text becomes empty and is deleted.
                const elementIdToSelect = viaKeyboard
                    ? element.containerId || (!isDeleted ? element.id : null)
                    : null;
                if (elementIdToSelect) {
                    // needed to ensure state is updated before "finalize" action
                    // that's invoked on keyboard-submit as well
                    // TODO either move this into finalize as well, or handle all state
                    // updates in one place, skipping finalize action
                    (0, react_dom_1.flushSync)(() => {
                        this.setState((prevState) => ({
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                                ...prevState.selectedElementIds,
                                [elementIdToSelect]: true,
                            }, prevState),
                        }));
                    });
                }
                if (isDeleted) {
                    (0, element_1.fixBindingsAfterDeletion)(this.scene.getNonDeletedElements(), [
                        element,
                    ]);
                }
                if (!isDeleted || isExistingElement) {
                    this.store.scheduleCapture();
                }
                (0, react_dom_1.flushSync)(() => {
                    this.setState({
                        newElement: null,
                        editingTextElement: null,
                    });
                });
                if (this.state.activeTool.locked) {
                    (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
                }
                this.focusContainer();
            }),
            element,
            excalidrawContainer: this.excalidrawContainerRef.current,
            app: this,
            initialCaretSceneCoords,
            // when text is selected, it's hard (at least on iOS) to re-position the
            // caret (i.e. deselect). There's not much use for always selecting
            // the text on edit anyway (and users can select-all from contextmenu
            // if needed)
            autoSelect: !this.editorInterface.isTouchScreen,
        });
        // deselect all other elements when inserting text
        this.deselectElements();
        // do an initial update to re-initialize element position since we were
        // modifying element's x/y for sake of editor (case: syncing to remote)
        updateElement(element.originalText, false);
    }
    deselectElements() {
        this.setState({
            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
            selectedGroupIds: {},
            editingGroupId: null,
            activeEmbeddable: null,
        });
    }
    getSelectedTextElement(container) {
        const selectedElements = this.scene.getSelectedElements(this.state);
        if (selectedElements.length !== 1) {
            return null;
        }
        const selectedElement = selectedElements[0];
        if ((0, element_1.isTextElement)(selectedElement)) {
            return selectedElement;
        }
        if (!container) {
            return null;
        }
        return (0, element_1.getBoundTextElement)(selectedElement, this.scene.getNonDeletedElementsMap());
    }
    getSelectedTextEditingContainerAtPosition(hitElement, sceneCoords) {
        const selectedElements = this.scene.getSelectedElements(this.state);
        if (selectedElements.length !== 1 ||
            !hitElement ||
            hitElement.id !== selectedElements[0].id) {
            return null;
        }
        const selectedElement = selectedElements[0];
        if ((0, element_1.isTextElement)(selectedElement)) {
            return null;
        }
        if (!(0, element_1.isValidTextContainer)(selectedElement)) {
            return undefined;
        }
        const textElement = this.getSelectedTextElement(selectedElement);
        const hitTextElement = this.getTextElementAtPosition(sceneCoords.x, sceneCoords.y);
        if (!textElement || hitTextElement?.id !== textElement.id) {
            return undefined;
        }
        return selectedElement;
    }
    getTextElementAtPosition(x, y) {
        const element = this.getElementAtPosition(x, y, {
            includeBoundTextElement: true,
        });
        if (element && (0, element_1.isTextElement)(element) && !element.isDeleted) {
            return element;
        }
        return null;
    }
    isHittingTextAutoResizeHandle = (selectedElements, point) => {
        const activeTextElement = (0, element_1.getActiveTextElement)(selectedElements, this.state);
        if (activeTextElement &&
            !activeTextElement.isDeleted &&
            !activeTextElement.autoResize &&
            (0, textAutoResizeHandle_1.isPointHittingTextAutoResizeHandle)(point, activeTextElement, this.state.zoom.value, this.editorInterface.formFactor)) {
            return true;
        }
        return false;
    };
    handleTextAutoResizeHandlePointerDown = (selectedElements, point) => {
        const activeTextElement = (0, element_1.getActiveTextElement)(selectedElements, this.state);
        if (!activeTextElement ||
            !this.isHittingTextAutoResizeHandle(selectedElements, point)) {
            return false;
        }
        this.actionManager.executeAction(actionTextAutoResize_1.actionTextAutoResize, "ui", 
        // we need to pass down the element since it may already be deselected
        // due to the pointerdown
        activeTextElement);
        this.resetCursor();
        return true;
    };
    // NOTE: Hot path for hit testing, so avoid unnecessary computations
    getElementAtPosition(x, y, opts) {
        let allHitElements = [];
        if (opts && "allHitElements" in opts) {
            allHitElements = opts?.allHitElements || [];
        }
        else {
            allHitElements = this.getElementsAtPosition(x, y, {
                includeBoundTextElement: opts?.includeBoundTextElement,
                includeLockedElements: opts?.includeLockedElements,
            });
        }
        if (allHitElements.length > 1) {
            if (opts?.preferSelected) {
                for (let index = allHitElements.length - 1; index > -1; index--) {
                    if (this.state.selectedElementIds[allHitElements[index].id]) {
                        return allHitElements[index];
                    }
                }
            }
            const elementWithHighestZIndex = allHitElements[allHitElements.length - 1];
            // If we're hitting element with highest z-index only on its bounding box
            // while also hitting other element figure, the latter should be considered.
            return (0, element_1.hitElementItself)({
                point: (0, math_1.pointFrom)(x, y),
                element: elementWithHighestZIndex,
                // when overlapping, we would like to be more precise
                // this also avoids the need to update past tests
                threshold: this.getElementHitThreshold(elementWithHighestZIndex) / 2,
                elementsMap: this.scene.getNonDeletedElementsMap(),
                frameNameBound: (0, element_1.isFrameLikeElement)(elementWithHighestZIndex)
                    ? this.frameNameBoundsCache.get(elementWithHighestZIndex)
                    : null,
            })
                ? elementWithHighestZIndex
                : allHitElements[allHitElements.length - 2];
        }
        if (allHitElements.length === 1) {
            return allHitElements[0];
        }
        return null;
    }
    // NOTE: Hot path for hit testing, so avoid unnecessary computations
    getElementsAtPosition(x, y, opts) {
        const iframeLikes = [];
        const elementsMap = this.scene.getNonDeletedElementsMap();
        const elements = (opts?.includeBoundTextElement && opts?.includeLockedElements
            ? this.scene.getNonDeletedElements()
            : this.scene
                .getNonDeletedElements()
                .filter((element) => (opts?.includeLockedElements || !element.locked) &&
                (opts?.includeBoundTextElement ||
                    !((0, element_1.isTextElement)(element) && element.containerId))))
            .filter((el) => this.hitElement(x, y, el))
            .filter((element) => {
            // hitting a frame's element from outside the frame is not considered a hit
            const containingFrame = (0, element_1.getContainingFrame)(element, elementsMap);
            return containingFrame &&
                this.state.frameRendering.enabled &&
                this.state.frameRendering.clip
                ? (0, element_1.isCursorInFrame)({ x, y }, containingFrame, elementsMap)
                : true;
        })
            .filter((el) => {
            // The parameter elements comes ordered from lower z-index to higher.
            // We want to preserve that order on the returned array.
            // Exception being embeddables which should be on top of everything else in
            // terms of hit testing.
            if ((0, element_1.isIframeElement)(el)) {
                iframeLikes.push(el);
                return false;
            }
            return true;
        })
            .concat(iframeLikes);
        return elements;
    }
    getElementHitThreshold(element) {
        return Math.max(element.strokeWidth / 2 + 0.1, 
        // NOTE: Here be dragons. Do not go under the 0.63 multiplier unless you're
        // willing to test extensively. The hit testing starts to become unreliable
        // due to FP imprecision under 0.63 in high zoom levels.
        0.85 * (common_1.DEFAULT_COLLISION_THRESHOLD / this.state.zoom.value));
    }
    hitElement(x, y, element, considerBoundingBox = true) {
        // if the element is selected, then hit test is done against its bounding box
        if (considerBoundingBox &&
            this.state.selectedElementIds[element.id] &&
            (0, element_1.hasBoundingBox)([element], this.state, this.editorInterface)) {
            // if hitting the bounding box, return early
            // but if not, we should check for other cases as well (e.g. frame name)
            if ((0, element_1.hitElementBoundingBox)((0, math_1.pointFrom)(x, y), element, this.scene.getNonDeletedElementsMap(), this.getElementHitThreshold(element))) {
                return true;
            }
        }
        // take bound text element into consideration for hit collision as well
        const hitBoundTextOfElement = (0, element_1.hitElementBoundText)((0, math_1.pointFrom)(x, y), element, this.scene.getNonDeletedElementsMap());
        if (hitBoundTextOfElement) {
            return true;
        }
        return (0, element_1.hitElementItself)({
            point: (0, math_1.pointFrom)(x, y),
            element,
            threshold: this.getElementHitThreshold(element),
            elementsMap: this.scene.getNonDeletedElementsMap(),
            frameNameBound: (0, element_1.isFrameLikeElement)(element)
                ? this.frameNameBoundsCache.get(element)
                : null,
        });
    }
    getTextBindableContainerAtPosition(x, y) {
        const elements = this.scene.getNonDeletedElements();
        const selectedElements = this.scene.getSelectedElements(this.state);
        if (selectedElements.length === 1) {
            return (0, element_1.isTextBindableContainer)(selectedElements[0], false)
                ? selectedElements[0]
                : null;
        }
        let hitElement = null;
        // We need to do hit testing from front (end of the array) to back (beginning of the array)
        for (let index = elements.length - 1; index >= 0; --index) {
            if (elements[index].isDeleted) {
                continue;
            }
            const [x1, y1, x2, y2] = (0, element_1.getElementAbsoluteCoords)(elements[index], this.scene.getNonDeletedElementsMap());
            if ((0, element_1.isArrowElement)(elements[index]) &&
                (0, element_1.hitElementItself)({
                    point: (0, math_1.pointFrom)(x, y),
                    element: elements[index],
                    elementsMap: this.scene.getNonDeletedElementsMap(),
                    threshold: this.getElementHitThreshold(elements[index]),
                })) {
                hitElement = elements[index];
                break;
            }
            else if (x1 < x && x < x2 && y1 < y && y < y2) {
                hitElement = elements[index];
                break;
            }
        }
        return (0, element_1.isTextBindableContainer)(hitElement, false) ? hitElement : null;
    }
    startTextEditing = ({ sceneX, sceneY, insertAtParentCenter = true, container, autoEdit = true, initialCaretSceneCoords, }) => {
        let shouldBindToContainer = false;
        let parentCenterPosition = insertAtParentCenter &&
            this.getTextWysiwygSnappedToCenterPosition(sceneX, sceneY, this.state, container);
        if (container && parentCenterPosition) {
            const boundTextElementToContainer = (0, element_1.getBoundTextElement)(container, this.scene.getNonDeletedElementsMap());
            if (!boundTextElementToContainer) {
                shouldBindToContainer = true;
            }
        }
        const existingTextElement = this.getSelectedTextElement(container) ||
            this.getTextElementAtPosition(sceneX, sceneY);
        const fontFamily = existingTextElement?.fontFamily || this.state.currentItemFontFamily;
        const lineHeight = existingTextElement?.lineHeight || (0, common_1.getLineHeight)(fontFamily);
        const fontSize = this.state.currentItemFontSize;
        if (!existingTextElement &&
            shouldBindToContainer &&
            container &&
            !(0, element_1.isArrowElement)(container)) {
            const fontString = {
                fontSize,
                fontFamily,
            };
            const minWidth = (0, element_1.getApproxMinLineWidth)((0, common_1.getFontString)(fontString), lineHeight);
            const minHeight = (0, element_1.getApproxMinLineHeight)(fontSize, lineHeight);
            const newHeight = Math.max(container.height, minHeight);
            const newWidth = Math.max(container.width, minWidth);
            this.scene.mutateElement(container, {
                height: newHeight,
                width: newWidth,
            });
            sceneX = container.x + newWidth / 2;
            sceneY = container.y + newHeight / 2;
            if (parentCenterPosition) {
                parentCenterPosition = this.getTextWysiwygSnappedToCenterPosition(sceneX, sceneY, this.state, container);
            }
        }
        const topLayerFrame = this.getTopLayerFrameAtSceneCoords({
            x: sceneX,
            y: sceneY,
        });
        const textCreationGridPoint = this.getTextCreationGridPoint(sceneX, sceneY);
        const newTextElementPosition = parentCenterPosition
            ? {
                x: parentCenterPosition.elementCenterX,
                y: parentCenterPosition.elementCenterY,
            }
            : !existingTextElement
                ? {
                    x: textCreationGridPoint?.x ?? sceneX,
                    y: textCreationGridPoint === null
                        ? // Free text starts from a point cursor, so center the first line box on it.
                            sceneY - (0, element_1.getLineHeightInPx)(fontSize, lineHeight) / 2
                        : textCreationGridPoint.y,
                }
                : {
                    x: sceneX,
                    y: sceneY,
                };
        const element = existingTextElement ||
            (0, element_1.newTextElement)({
                x: newTextElementPosition.x,
                y: newTextElementPosition.y,
                strokeColor: this.state.currentItemStrokeColor,
                backgroundColor: this.state.currentItemBackgroundColor,
                fillStyle: this.state.currentItemFillStyle,
                strokeWidth: this.state.currentItemStrokeWidth,
                strokeStyle: this.state.currentItemStrokeStyle,
                roughness: this.state.currentItemRoughness,
                opacity: this.state.currentItemOpacity,
                text: "",
                fontSize,
                fontFamily,
                textAlign: parentCenterPosition
                    ? "center"
                    : this.state.currentItemTextAlign,
                verticalAlign: parentCenterPosition
                    ? common_1.VERTICAL_ALIGN.MIDDLE
                    : common_1.DEFAULT_VERTICAL_ALIGN,
                containerId: shouldBindToContainer ? container?.id : undefined,
                groupIds: container?.groupIds ?? [],
                lineHeight,
                angle: container
                    ? (0, element_1.isArrowElement)(container)
                        ? 0
                        : container.angle
                    : 0,
                frameId: topLayerFrame ? topLayerFrame.id : null,
            });
        if (!existingTextElement && shouldBindToContainer && container) {
            this.scene.mutateElement(container, {
                boundElements: (container.boundElements || []).concat({
                    type: "text",
                    id: element.id,
                }),
            });
        }
        this.setState({ editingTextElement: element });
        if (!existingTextElement) {
            if (container && shouldBindToContainer) {
                const containerIndex = this.scene.getElementIndex(container.id);
                this.scene.insertElementAtIndex(element, containerIndex + 1);
            }
            else {
                this.scene.insertElement(element);
            }
        }
        if (autoEdit || existingTextElement || container) {
            this.handleTextWysiwyg(element, {
                isExistingElement: !!existingTextElement,
                initialCaretSceneCoords: existingTextElement
                    ? initialCaretSceneCoords
                    : null,
            });
        }
        else {
            this.setState({
                newElement: element,
                multiElement: null,
            });
        }
    };
    startImageCropping = (image) => {
        this.store.scheduleCapture();
        this.setState({
            croppingElementId: image.id,
        });
    };
    finishImageCropping = () => {
        if (this.state.croppingElementId) {
            this.store.scheduleCapture();
            this.setState({
                croppingElementId: null,
            });
        }
    };
    shouldHandleBrowserCanvasDoubleClick = (type) => {
        // TODO remove this once we consolidate double-click logic and handle
        // ourselves for all event types together
        if (type === "touch") {
            return true;
        }
        if (this.lastCompletedCanvasClicks.length === 0) {
            return true;
        }
        if (this.lastCompletedCanvasClicks.length < 2) {
            return false;
        }
        const [firstClick, secondClick] = this.lastCompletedCanvasClicks;
        return ((0, math_1.pointDistance)((0, math_1.pointFrom)(firstClick.x, firstClick.y), (0, math_1.pointFrom)(secondClick.x, secondClick.y)) <= common_1.DOUBLE_TAP_POSITION_THRESHOLD);
    };
    handleCanvasDoubleClick = (event) => {
        if (this.state.editingTextElement ||
            !this.shouldHandleBrowserCanvasDoubleClick(event.type)) {
            return;
        }
        // case: double-clicking with arrow/line tool selected would both create
        // text and enter multiElement mode
        if (this.state.multiElement) {
            return;
        }
        // we should only be able to double click when mode is selection
        if (this.state.activeTool.type !== this.state.preferredSelectionTool.type) {
            return;
        }
        const selectedElements = this.scene.getSelectedElements(this.state);
        let { x: sceneX, y: sceneY } = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        if (selectedElements.length === 1 && (0, element_1.isLinearElement)(selectedElements[0])) {
            const selectedLinearElement = selectedElements[0];
            if (((event[common_1.KEYS.CTRL_OR_CMD] && (0, element_1.isSimpleArrow)(selectedLinearElement)) ||
                (0, element_1.isLineElement)(selectedLinearElement)) &&
                (!this.state.selectedLinearElement?.isEditing ||
                    this.state.selectedLinearElement.elementId !==
                        selectedLinearElement.id)) {
                // Use the proper action to ensure immediate history capture
                this.actionManager.executeAction(actions_1.actionToggleLinearEditor);
                return;
            }
            else if (this.state.selectedLinearElement &&
                (0, element_1.isElbowArrow)(selectedElements[0])) {
                const hitCoords = element_1.LinearElementEditor.getSegmentMidpointHitCoords(this.state.selectedLinearElement, { x: sceneX, y: sceneY }, this.state, this.scene.getNonDeletedElementsMap());
                const midPoint = hitCoords
                    ? element_1.LinearElementEditor.getSegmentMidPointIndex(this.state.selectedLinearElement, this.state, hitCoords, this.scene.getNonDeletedElementsMap())
                    : -1;
                if (midPoint && midPoint > -1) {
                    this.store.scheduleCapture();
                    element_1.LinearElementEditor.deleteFixedSegment(selectedElements[0], this.scene, midPoint);
                    const nextCoords = element_1.LinearElementEditor.getSegmentMidpointHitCoords({
                        ...this.state.selectedLinearElement,
                        segmentMidPointHoveredCoords: null,
                    }, { x: sceneX, y: sceneY }, this.state, this.scene.getNonDeletedElementsMap());
                    const nextIndex = nextCoords
                        ? element_1.LinearElementEditor.getSegmentMidPointIndex(this.state.selectedLinearElement, this.state, nextCoords, this.scene.getNonDeletedElementsMap())
                        : null;
                    this.setState({
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            initialState: {
                                ...this.state.selectedLinearElement.initialState,
                                segmentMidpoint: {
                                    index: nextIndex,
                                    value: hitCoords,
                                    added: false,
                                },
                            },
                            segmentMidPointHoveredCoords: nextCoords,
                        },
                    });
                    return;
                }
            }
            else if (this.state.selectedLinearElement?.isEditing &&
                this.state.selectedLinearElement.elementId ===
                    selectedLinearElement.id &&
                (0, element_1.isLineElement)(selectedLinearElement)) {
                return;
            }
        }
        if (selectedElements.length === 1 && (0, element_1.isImageElement)(selectedElements[0])) {
            this.startImageCropping(selectedElements[0]);
            return;
        }
        (0, cursor_1.resetCursor)(this.interactiveCanvas);
        const selectedGroupIds = (0, element_1.getSelectedGroupIds)(this.state);
        if (selectedGroupIds.length > 0) {
            const hitElement = this.getElementAtPosition(sceneX, sceneY);
            const selectedGroupId = hitElement &&
                (0, element_1.getSelectedGroupIdForElement)(hitElement, this.state.selectedGroupIds);
            if (selectedGroupId) {
                this.store.scheduleCapture();
                this.setState((prevState) => ({
                    ...prevState,
                    ...(0, element_1.selectGroupsForSelectedElements)({
                        editingGroupId: selectedGroupId,
                        selectedElementIds: { [hitElement.id]: true },
                    }, this.scene.getNonDeletedElements(), prevState, this),
                }));
                return;
            }
        }
        (0, cursor_1.resetCursor)(this.interactiveCanvas);
        if (!event[common_1.KEYS.CTRL_OR_CMD] && !this.state.viewModeEnabled) {
            const hitElement = this.getElementAtPosition(sceneX, sceneY);
            if ((0, element_1.isIframeLikeElement)(hitElement)) {
                this.setState({
                    activeEmbeddable: { element: hitElement, state: "active" },
                });
                return;
            }
            // shouldn't edit/create text when inside line editor (often false positive)
            if (!this.state.selectedLinearElement?.isEditing) {
                const container = this.getTextBindableContainerAtPosition(sceneX, sceneY);
                if (container) {
                    if ((0, element_1.hasBoundTextElement)(container) ||
                        !(0, common_1.isTransparent)(container.backgroundColor) ||
                        (0, element_1.hitElementItself)({
                            point: (0, math_1.pointFrom)(sceneX, sceneY),
                            element: container,
                            elementsMap: this.scene.getNonDeletedElementsMap(),
                            threshold: this.getElementHitThreshold(container),
                        })) {
                        const midPoint = (0, element_1.getContainerCenter)(container, this.state, this.scene.getNonDeletedElementsMap());
                        sceneX = midPoint.x;
                        sceneY = midPoint.y;
                    }
                }
                this.startTextEditing({
                    sceneX,
                    sceneY,
                    insertAtParentCenter: !event.altKey,
                    container,
                });
            }
        }
    };
    handleCanvasClick = (event) => {
        if (event.button !== common_1.POINTER_BUTTON.MAIN) {
            this.lastCompletedCanvasClicks = [];
            return;
        }
        this.lastCompletedCanvasClicks = [
            ...this.lastCompletedCanvasClicks.slice(-1),
            {
                x: event.clientX,
                y: event.clientY,
            },
        ];
    };
    getElementLinkAtPosition = (scenePointer, hitElementMightBeLocked) => {
        if (hitElementMightBeLocked && hitElementMightBeLocked.locked) {
            return undefined;
        }
        const elements = this.scene.getNonDeletedElements();
        let hitElementIndex = -1;
        for (let index = elements.length - 1; index >= 0; index--) {
            const element = elements[index];
            if (hitElementMightBeLocked &&
                element.id === hitElementMightBeLocked.id) {
                hitElementIndex = index;
            }
            if (element.link &&
                index >= hitElementIndex &&
                (0, helpers_1.isPointHittingLink)(element, this.scene.getNonDeletedElementsMap(), this.state, (0, math_1.pointFrom)(scenePointer.x, scenePointer.y), this.editorInterface.formFactor === "phone")) {
                return element;
            }
        }
    };
    handleElementLinkClick = (event) => {
        const draggedDistance = (0, math_1.pointDistance)((0, math_1.pointFrom)(this.lastPointerDownEvent.clientX, this.lastPointerDownEvent.clientY), (0, math_1.pointFrom)(this.lastPointerUpEvent.clientX, this.lastPointerUpEvent.clientY));
        if (!this.hitLinkElement || draggedDistance > common_1.DRAGGING_THRESHOLD) {
            return;
        }
        const lastPointerDownCoords = (0, common_1.viewportCoordsToSceneCoords)(this.lastPointerDownEvent, this.state);
        const elementsMap = this.scene.getNonDeletedElementsMap();
        const lastPointerDownHittingLinkIcon = (0, helpers_1.isPointHittingLink)(this.hitLinkElement, elementsMap, this.state, (0, math_1.pointFrom)(lastPointerDownCoords.x, lastPointerDownCoords.y), this.editorInterface.formFactor === "phone");
        const lastPointerUpCoords = (0, common_1.viewportCoordsToSceneCoords)(this.lastPointerUpEvent, this.state);
        const lastPointerUpHittingLinkIcon = (0, helpers_1.isPointHittingLink)(this.hitLinkElement, elementsMap, this.state, (0, math_1.pointFrom)(lastPointerUpCoords.x, lastPointerUpCoords.y), this.editorInterface.formFactor === "phone");
        if (lastPointerDownHittingLinkIcon && lastPointerUpHittingLinkIcon) {
            (0, Hyperlink_1.hideHyperlinkToolip)();
            let url = this.hitLinkElement.link;
            if (url) {
                url = (0, common_1.normalizeLink)(url);
                let customEvent;
                if (this.props.onLinkOpen) {
                    customEvent = (0, common_1.wrapEvent)(common_1.EVENT.EXCALIDRAW_LINK, event.nativeEvent);
                    this.props.onLinkOpen({
                        ...this.hitLinkElement,
                        link: url,
                    }, customEvent);
                }
                if (!customEvent?.defaultPrevented) {
                    const target = (0, common_1.isLocalLink)(url) ? "_self" : "_blank";
                    const newWindow = window.open(undefined, target);
                    // https://mathiasbynens.github.io/rel-noopener/
                    if (newWindow) {
                        newWindow.opener = null;
                        newWindow.location = url;
                    }
                }
            }
        }
    };
    getTopLayerFrameAtSceneCoords = (sceneCoords) => {
        const elementsMap = this.scene.getNonDeletedElementsMap();
        const frames = this.scene
            .getNonDeletedFramesLikes()
            .filter((frame) => !frame.locked && (0, element_1.isCursorInFrame)(sceneCoords, frame, elementsMap));
        return frames.length ? frames[frames.length - 1] : null;
    };
    handleCanvasPointerMove = (event) => {
        this.savePointer(event.clientX, event.clientY, this.state.cursorButton);
        this.lastPointerMoveEvent = event.nativeEvent;
        const scenePointer = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        const { x: scenePointerX, y: scenePointerY } = scenePointer;
        this.lastPointerMoveCoords = {
            x: scenePointerX,
            y: scenePointerY,
        };
        if (gesture.pointers.has(event.pointerId)) {
            gesture.pointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
        }
        const initialScale = gesture.initialScale;
        if (gesture.pointers.size === 2 &&
            gesture.lastCenter &&
            initialScale &&
            gesture.initialDistance) {
            const center = (0, gesture_1.getCenter)(gesture.pointers);
            const deltaX = center.x - gesture.lastCenter.x;
            const deltaY = center.y - gesture.lastCenter.y;
            gesture.lastCenter = center;
            const distance = (0, gesture_1.getDistance)(Array.from(gesture.pointers.values()));
            const scaleFactor = this.state.activeTool.type === "freedraw" && this.state.penMode
                ? 1
                : distance / gesture.initialDistance;
            const nextZoom = scaleFactor
                ? (0, scene_1.getNormalizedZoom)(initialScale * scaleFactor)
                : this.state.zoom.value;
            this.setState((state) => {
                const zoomState = (0, zoom_1.getStateForZoom)({
                    viewportX: center.x,
                    viewportY: center.y,
                    nextZoom,
                }, state);
                this.translateCanvas({
                    zoom: zoomState.zoom,
                    // 2x multiplier is just a magic number that makes this work correctly
                    // on touchscreen devices (note: if we get report that panning is slower/faster
                    // than actual movement, consider swapping with devicePixelRatio)
                    scrollX: zoomState.scrollX + 2 * (deltaX / nextZoom),
                    scrollY: zoomState.scrollY + 2 * (deltaY / nextZoom),
                    shouldCacheIgnoreZoom: true,
                });
                return null;
            });
            this.resetShouldCacheIgnoreZoomDebounced();
        }
        else {
            gesture.lastCenter =
                gesture.initialDistance =
                    gesture.initialScale =
                        null;
        }
        if (isHoldingSpace ||
            isPanning ||
            isDraggingScrollBar ||
            (0, appState_1.isHandToolActive)(this.state)) {
            return;
        }
        const isPointerOverScrollBars = (0, scrollbars_1.isOverScrollBars)(currentScrollBars, event.clientX - this.state.offsetLeft, event.clientY - this.state.offsetTop);
        const isOverScrollBar = isPointerOverScrollBars.isOverEither;
        if (!this.state.newElement &&
            !this.state.selectionElement &&
            !this.state.selectedElementsAreBeingDragged &&
            !this.state.multiElement) {
            if (isOverScrollBar) {
                (0, cursor_1.resetCursor)(this.interactiveCanvas);
            }
            else {
                (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
            }
        }
        if (!this.state.newElement &&
            (0, snapping_1.isActiveToolNonLinearSnappable)(this.state.activeTool.type)) {
            const { originOffset, snapLines } = (0, snapping_1.getSnapLinesAtPointer)(this.scene.getNonDeletedElements(), this, {
                x: scenePointerX,
                y: scenePointerY,
            }, event, this.scene.getNonDeletedElementsMap());
            this.setState((prevState) => {
                const nextSnapLines = (0, common_1.updateStable)(prevState.snapLines, snapLines);
                const nextOriginOffset = prevState.originSnapOffset
                    ? (0, common_1.updateStable)(prevState.originSnapOffset, originOffset)
                    : originOffset;
                if (prevState.snapLines === nextSnapLines &&
                    prevState.originSnapOffset === nextOriginOffset) {
                    return null;
                }
                return {
                    snapLines: nextSnapLines,
                    originSnapOffset: nextOriginOffset,
                };
            });
        }
        else if (!this.state.newElement &&
            !this.state.selectedElementsAreBeingDragged &&
            !this.state.selectionElement) {
            this.setState((prevState) => {
                if (prevState.snapLines.length) {
                    return {
                        snapLines: [],
                    };
                }
                return null;
            });
        }
        if (this.state.selectedLinearElement?.isEditing &&
            !this.state.selectedLinearElement.isDragging) {
            const editingLinearElement = this.state.newElement
                ? null
                : element_1.LinearElementEditor.handlePointerMoveInEditMode(event, scenePointerX, scenePointerY, this);
            if (editingLinearElement &&
                editingLinearElement !== this.state.selectedLinearElement) {
                // Since we are reading from previous state which is not possible with
                // automatic batching in React 18 hence using flush sync to synchronously
                // update the state. Check https://github.com/excalidraw/excalidraw/pull/5508 for more details.
                (0, react_dom_1.flushSync)(() => {
                    this.setState({
                        selectedLinearElement: editingLinearElement,
                    });
                });
            }
        }
        if ((0, element_1.isBindingElementType)(this.state.activeTool.type)) {
            // Hovering with a selected tool or creating new linear element via click
            // and point
            const { newElement } = this.state;
            if (!newElement && (0, element_1.isBindingEnabled)(this.state)) {
                const globalPoint = (0, math_1.pointFrom)(scenePointerX, scenePointerY);
                const elementsMap = this.scene.getNonDeletedElementsMap();
                const hoveredElement = (0, element_1.getHoveredElementForBinding)(globalPoint, this.scene.getNonDeletedElements(), elementsMap, (0, element_1.maxBindingDistance_simple)(this.state.zoom));
                if (hoveredElement) {
                    this.setState({
                        suggestedBinding: {
                            element: hoveredElement,
                            midPoint: (0, element_1.getSnapOutlineMidPoint)(globalPoint, hoveredElement, elementsMap, this.state.zoom),
                        },
                    });
                }
                else if (this.state.suggestedBinding) {
                    this.setState({
                        suggestedBinding: null,
                    });
                }
            }
        }
        if (this.state.multiElement && this.state.selectedLinearElement) {
            const { multiElement, selectedLinearElement } = this.state;
            const { x: rx, y: ry, points } = multiElement;
            const lastPoint = points[points.length - 1];
            const { lastCommittedPoint } = selectedLinearElement;
            (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
            if (lastPoint === lastCommittedPoint) {
                const hoveredElement = (0, element_1.isArrowElement)(this.state.newElement) &&
                    (0, element_1.isBindingEnabled)(this.state) &&
                    (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(scenePointerX, scenePointerY), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap(), (0, element_1.maxBindingDistance_simple)(this.state.zoom));
                if (hoveredElement) {
                    this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                        event: event.nativeEvent,
                        sceneCoords: {
                            x: scenePointerX,
                            y: scenePointerY,
                        },
                    });
                    this.setState({ suggestedBinding: null, startBoundElement: null });
                    if (!this.state.activeTool.locked) {
                        (0, cursor_1.resetCursor)(this.interactiveCanvas);
                        this.setState((prevState) => ({
                            newElement: null,
                            activeTool: (0, common_1.updateActiveTool)(this.state, {
                                type: this.state.preferredSelectionTool.type,
                            }),
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                                ...prevState.selectedElementIds,
                                [multiElement.id]: true,
                            }, prevState),
                            selectedLinearElement: new element_1.LinearElementEditor(multiElement, this.scene.getNonDeletedElementsMap()),
                        }));
                    }
                }
                else if (
                // if we haven't yet created a temp point and we're beyond commit-zone
                // threshold, add a point
                (0, math_1.pointDistance)((0, math_1.pointFrom)(scenePointerX - rx, scenePointerY - ry), lastPoint) >= common_1.LINE_CONFIRM_THRESHOLD) {
                    this.scene.mutateElement(multiElement, {
                        points: [
                            ...points,
                            (0, math_1.pointFrom)(scenePointerX - rx, scenePointerY - ry),
                        ],
                    }, { informMutation: false, isDragging: false });
                    (0, common_1.invariant)(this.state.selectedLinearElement?.initialState, "initialState must be set");
                    this.setState({
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            lastCommittedPoint: points[points.length - 1],
                            selectedPointsIndices: [multiElement.points.length - 1],
                            initialState: {
                                ...this.state.selectedLinearElement.initialState,
                                lastClickedPoint: multiElement.points.length - 1,
                            },
                        },
                    });
                }
                else {
                    (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
                    // in this branch, we're inside the commit zone, and no uncommitted
                    // point exists. Thus do nothing (don't add/remove points).
                }
            }
            else if (points.length > 2 &&
                lastCommittedPoint &&
                (0, math_1.pointDistance)((0, math_1.pointFrom)(scenePointerX - rx, scenePointerY - ry), lastCommittedPoint) < common_1.LINE_CONFIRM_THRESHOLD) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
                this.scene.mutateElement(multiElement, {
                    points: points.slice(0, -1),
                }, { informMutation: false, isDragging: false });
                const newLastIdx = multiElement.points.length - 1;
                this.setState({
                    selectedLinearElement: {
                        ...selectedLinearElement,
                        selectedPointsIndices: selectedLinearElement.selectedPointsIndices
                            ? [
                                ...new Set(selectedLinearElement.selectedPointsIndices.map((idx) => Math.min(idx, newLastIdx))),
                            ]
                            : selectedLinearElement.selectedPointsIndices,
                        lastCommittedPoint: multiElement.points[newLastIdx],
                        initialState: {
                            ...selectedLinearElement.initialState,
                            lastClickedPoint: newLastIdx,
                        },
                    },
                });
            }
            else {
                if ((0, element_1.isPathALoop)(points, this.state.zoom.value)) {
                    (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
                }
                // Update arrow points
                const elementsMap = this.scene.getNonDeletedElementsMap();
                if ((0, element_1.isSimpleArrow)(multiElement)) {
                    const hoveredElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(scenePointerX, scenePointerY), this.scene.getNonDeletedElements(), elementsMap);
                    if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                        this.handleDelayedBindModeChange(multiElement, hoveredElement);
                    }
                }
                (0, common_1.invariant)(this.state.selectedLinearElement, "Expected selectedLinearElement to be set to operate on a linear element");
                const newState = element_1.LinearElementEditor.handlePointerMove(event.nativeEvent, this, scenePointerX, scenePointerY, this.state.selectedLinearElement);
                if (newState) {
                    this.setState(newState);
                }
            }
            return;
        }
        if (this.state.activeTool.type === "arrow") {
            const hit = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(scenePointerX, scenePointerY), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap(), (0, element_1.maxBindingDistance_simple)(this.state.zoom));
            const scenePointer = (0, math_1.pointFrom)(scenePointerX, scenePointerY);
            const elementsMap = this.scene.getNonDeletedElementsMap();
            if (hit && !(0, element_1.isPointInElement)(scenePointer, hit, elementsMap)) {
                this.setState({
                    suggestedBinding: {
                        element: hit,
                        midPoint: (0, element_1.getSnapOutlineMidPoint)(scenePointer, hit, elementsMap, this.state.zoom),
                    },
                });
            }
        }
        const isPressingAnyButton = Boolean(event.buttons);
        const isLaserTool = this.state.activeTool.type === "laser";
        if (isPressingAnyButton ||
            // checking against laser so that if you mouseover with a laser tool
            // over a link/embeddable, we change the cursor
            (!isLaserTool &&
                this.state.activeTool.type !== "selection" &&
                this.state.activeTool.type !== "lasso" &&
                this.state.activeTool.type !== "text" &&
                this.state.activeTool.type !== "eraser")) {
            return;
        }
        const elements = this.scene.getNonDeletedElements();
        const selectedElements = this.scene.getSelectedElements(this.state);
        if (this.isHittingTextAutoResizeHandle(selectedElements, scenePointer)) {
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
            return;
        }
        if (selectedElements.length === 1 &&
            !isOverScrollBar &&
            !this.state.selectedLinearElement?.isEditing) {
            // for linear elements, we'd like to prioritize point dragging over edge resizing
            // therefore, we update and check hovered point index first
            if (this.state.selectedLinearElement) {
                this.handleHoverSelectedLinearElement(this.state.selectedLinearElement, scenePointerX, scenePointerY);
            }
            if ((!this.state.selectedLinearElement ||
                this.state.selectedLinearElement.hoverPointIndex === -1) &&
                this.state.openDialog?.name !== "elementLinkSelector" &&
                !(selectedElements.length === 1 && (0, element_1.isElbowArrow)(selectedElements[0])) &&
                // HACK: Disable transform handles for linear elements on mobile until a
                // better way of showing them is found
                !((0, element_1.isLinearElement)(selectedElements[0]) &&
                    (this.editorInterface.userAgent.isMobileDevice ||
                        selectedElements[0].points.length === 2))) {
                const elementWithTransformHandleType = (0, element_1.getElementWithTransformHandleType)(elements, this.state, scenePointerX, scenePointerY, this.state.zoom, event.pointerType, this.scene.getNonDeletedElementsMap(), this.editorInterface);
                if (elementWithTransformHandleType &&
                    elementWithTransformHandleType.transformHandleType) {
                    (0, cursor_1.setCursor)(this.interactiveCanvas, (0, element_1.getCursorForResizingElement)(elementWithTransformHandleType));
                    return;
                }
            }
        }
        else if (selectedElements.length > 1 &&
            !isOverScrollBar &&
            this.state.openDialog?.name !== "elementLinkSelector") {
            const transformHandleType = (0, element_1.getTransformHandleTypeFromCoords)((0, element_1.getCommonBounds)(selectedElements), scenePointerX, scenePointerY, this.state.zoom, event.pointerType, this.editorInterface);
            if (transformHandleType) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, (0, element_1.getCursorForResizingElement)({
                    transformHandleType,
                }));
                return;
            }
        }
        if ((0, appState_1.isEraserActive)(this.state)) {
            return;
        }
        const hitElementMightBeLocked = this.getElementAtPosition(scenePointerX, scenePointerY, {
            preferSelected: true,
            includeLockedElements: true,
        });
        let hitElement = null;
        if (hitElementMightBeLocked && hitElementMightBeLocked.locked) {
            hitElement = null;
        }
        else {
            hitElement = hitElementMightBeLocked;
        }
        if (!this.handleIframeLikeElementHover({
            hitElement,
            scenePointer,
            moveEvent: event,
        })) {
            this.hitLinkElement = this.getElementLinkAtPosition(scenePointer, hitElementMightBeLocked);
        }
        if (this.hitLinkElement &&
            !this.state.selectedElementIds[this.hitLinkElement.id]) {
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
            (0, Hyperlink_1.showHyperlinkTooltip)(this.hitLinkElement, this.state, this.scene.getNonDeletedElementsMap());
        }
        else {
            (0, Hyperlink_1.hideHyperlinkToolip)();
            if (isLaserTool) {
                return;
            }
            if (hitElement &&
                (hitElement.link || (0, element_1.isEmbeddableElement)(hitElement)) &&
                this.state.selectedElementIds[hitElement.id] &&
                !this.state.contextMenu &&
                !this.state.showHyperlinkPopup) {
                this.setState({ showHyperlinkPopup: "info" });
            }
            else if (this.state.activeTool.type === "text") {
                (0, cursor_1.setCursor)(this.interactiveCanvas, (0, element_1.isTextElement)(hitElement) ? common_1.CURSOR_TYPE.TEXT : common_1.CURSOR_TYPE.CROSSHAIR);
            }
            else if (!event[common_1.KEYS.CTRL_OR_CMD] &&
                this.isHittingCommonBoundingBoxOfSelectedElements(scenePointer, selectedElements)) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.MOVE);
            }
            else if (this.state.viewModeEnabled) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
            }
            else if (this.state.openDialog?.name === "elementLinkSelector") {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.AUTO);
            }
            else if (isOverScrollBar) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.AUTO);
            }
            else if (
            // if using cmd/ctrl, we're not dragging
            !event[common_1.KEYS.CTRL_OR_CMD] &&
                // editing text -> don't show move cursor when hovering over its bbox
                hitElement?.id !== this.state.editingTextElement?.id) {
                if ((hitElement ||
                    this.isHittingCommonBoundingBoxOfSelectedElements(scenePointer, selectedElements)) &&
                    !hitElement?.locked) {
                    if (!hitElement ||
                        // Elbow arrows can only be moved when unconnected
                        !(0, element_1.isElbowArrow)(hitElement) ||
                        !(hitElement.startBinding || hitElement.endBinding)) {
                        if (this.state.activeTool.type !== "lasso" ||
                            selectedElements.length > 0) {
                            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.MOVE);
                        }
                    }
                }
            }
            else {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.AUTO);
            }
            if (this.state.selectedLinearElement) {
                this.handleHoverSelectedLinearElement(this.state.selectedLinearElement, scenePointerX, scenePointerY);
            }
        }
        if (this.state.openDialog?.name === "elementLinkSelector" && hitElement) {
            this.setState((prevState) => {
                return {
                    hoveredElementIds: (0, common_1.updateStable)(prevState.hoveredElementIds, (0, element_1.selectGroupsForSelectedElements)({
                        editingGroupId: prevState.editingGroupId,
                        selectedElementIds: { [hitElement.id]: true },
                    }, this.scene.getNonDeletedElements(), prevState, this).selectedElementIds),
                };
            });
        }
        else if (this.state.openDialog?.name === "elementLinkSelector" &&
            !hitElement) {
            this.setState((prevState) => ({
                hoveredElementIds: (0, common_1.updateStable)(prevState.hoveredElementIds, {}),
            }));
        }
    };
    handleEraser = (event, scenePointer) => {
        const elementsToErase = this.eraserTrail.addPointToPath(scenePointer.x, scenePointer.y, event.altKey);
        this.elementsPendingErasure = new Set(elementsToErase);
        this.triggerRender();
    };
    // set touch moving for mobile context menu
    handleTouchMove = (event) => {
        invalidateContextMenu = true;
    };
    handleHoverSelectedLinearElement(linearElementEditor, scenePointerX, scenePointerY) {
        const elementsMap = this.scene.getNonDeletedElementsMap();
        const element = element_1.LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
        if (!element) {
            return;
        }
        if (this.state.selectedLinearElement) {
            let hoverPointIndex = -1;
            let segmentMidPointHoveredCoords = null;
            if ((0, element_1.hitElementItself)({
                point: (0, math_1.pointFrom)(scenePointerX, scenePointerY),
                element,
                elementsMap,
                threshold: this.getElementHitThreshold(element),
            })) {
                hoverPointIndex = element_1.LinearElementEditor.getPointIndexUnderCursor(element, elementsMap, this.state.zoom, scenePointerX, scenePointerY);
                segmentMidPointHoveredCoords =
                    element_1.LinearElementEditor.getSegmentMidpointHitCoords(linearElementEditor, { x: scenePointerX, y: scenePointerY }, this.state, this.scene.getNonDeletedElementsMap());
                const isHoveringAPointHandle = (0, element_1.isElbowArrow)(element)
                    ? hoverPointIndex === 0 ||
                        hoverPointIndex === element.points.length - 1
                    : hoverPointIndex >= 0;
                if (isHoveringAPointHandle || segmentMidPointHoveredCoords) {
                    (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
                }
                else if (this.hitElement(scenePointerX, scenePointerY, element)) {
                    if (
                    // Elbow arrows can only be moved when unconnected
                    !(0, element_1.isElbowArrow)(element) ||
                        !(element.startBinding || element.endBinding)) {
                        if (this.state.activeTool.type !== "lasso" ||
                            Object.keys(this.state.selectedElementIds).length > 0) {
                            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.MOVE);
                        }
                    }
                }
            }
            else if (this.hitElement(scenePointerX, scenePointerY, element)) {
                if (
                // Elbow arrow can only be moved when unconnected
                !(0, element_1.isElbowArrow)(element) ||
                    !(element.startBinding || element.endBinding)) {
                    if (this.state.activeTool.type !== "lasso" ||
                        Object.keys(this.state.selectedElementIds).length > 0) {
                        (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.MOVE);
                    }
                }
            }
            if (this.state.selectedLinearElement.hoverPointIndex !== hoverPointIndex) {
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        hoverPointIndex,
                    },
                });
            }
            if (!element_1.LinearElementEditor.arePointsEqual(this.state.selectedLinearElement.segmentMidPointHoveredCoords, segmentMidPointHoveredCoords)) {
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        segmentMidPointHoveredCoords,
                    },
                });
            }
            // Check for focus point hover
            let hoveredFocusPointBinding = null;
            const arrow = element;
            if (arrow.startBinding || arrow.endBinding) {
                hoveredFocusPointBinding = (0, element_1.handleFocusPointHover)(element, scenePointerX, scenePointerY, this.scene, this.state);
            }
            if (this.state.selectedLinearElement.hoveredFocusPointBinding !==
                hoveredFocusPointBinding) {
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        isDragging: false,
                        hoveredFocusPointBinding,
                    },
                });
            }
            // Set cursor to pointer when hovering over a focus point
            if (hoveredFocusPointBinding) {
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
            }
        }
        else {
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.AUTO);
        }
    }
    handleCanvasPointerDown = (event) => {
        const selectedElements = this.scene.getSelectedElements(this.state);
        // If Ctrl is not held, ensure isBindingEnabled reflects the user preference.
        if (!event.ctrlKey) {
            const preferenceEnabled = this.state.bindingPreference === "enabled";
            if (this.state.isBindingEnabled !== preferenceEnabled) {
                this.setState({ isBindingEnabled: preferenceEnabled });
            }
        }
        const scenePointer = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        const { x: scenePointerX, y: scenePointerY } = scenePointer;
        this.lastPointerMoveCoords = {
            x: scenePointerX,
            y: scenePointerY,
        };
        const target = event.target;
        // capture subsequent pointer events to the canvas
        // this makes other elements non-interactive until pointer up
        if (target.setPointerCapture) {
            target.setPointerCapture(event.pointerId);
        }
        this.maybeCleanupAfterMissingPointerUp(event.nativeEvent);
        this.maybeUnfollowRemoteUser();
        if (this.state.searchMatches) {
            this.setState((state) => {
                return {
                    searchMatches: state.searchMatches && {
                        focusedId: null,
                        matches: state.searchMatches.matches.map((searchMatch) => ({
                            ...searchMatch,
                            focus: false,
                        })),
                    },
                };
            });
            this.updateEditorAtom(SearchMenu_1.searchItemInFocusAtom, null);
        }
        if (editor_jotai_1.editorJotaiStore.get(ConvertElementTypePopup_1.convertElementTypePopupAtom)) {
            this.updateEditorAtom(ConvertElementTypePopup_1.convertElementTypePopupAtom, null);
        }
        // since contextMenu options are potentially evaluated on each render,
        // and an contextMenu action may depend on selection state, we must
        // close the contextMenu before we update the selection on pointerDown
        // (e.g. resetting selection)
        if (this.state.contextMenu) {
            this.setState({ contextMenu: null });
        }
        if (this.state.snapLines) {
            this.setAppState({ snapLines: [] });
        }
        if (this.state.openPopup) {
            this.setState({ openPopup: null });
        }
        this.updateGestureOnPointerDown(event);
        // if dragging element is freedraw and another pointerdown event occurs
        // a second finger is on the screen
        // discard the freedraw element if it is very short because it is likely
        // just a spike, otherwise finalize the freedraw element when the second
        // finger is lifted
        if (event.pointerType === "touch" &&
            this.state.newElement &&
            this.state.newElement.type === "freedraw") {
            const element = this.state.newElement;
            this.updateScene({
                ...(element.points.length < 10
                    ? {
                        elements: this.scene
                            .getElementsIncludingDeleted()
                            .filter((el) => el.id !== element.id),
                    }
                    : {}),
                appState: {
                    newElement: null,
                    editingTextElement: null,
                    startBoundElement: null,
                    suggestedBinding: null,
                    selectedElementIds: (0, element_1.makeNextSelectedElementIds)(Object.keys(this.state.selectedElementIds)
                        .filter((key) => key !== element.id)
                        .reduce((obj, key) => {
                        obj[key] = this.state.selectedElementIds[key];
                        return obj;
                    }, {}), this.state),
                },
                captureUpdate: this.state.openDialog?.name === "elementLinkSelector"
                    ? element_1.CaptureUpdateAction.EVENTUALLY
                    : element_1.CaptureUpdateAction.NEVER,
            });
            return;
        }
        // remove any active selection when we start to interact with canvas
        // (mainly, we care about removing selection outside the component which
        //  would prevent our copy handling otherwise)
        const selection = document.getSelection();
        if (selection?.anchorNode) {
            selection.removeAllRanges();
        }
        this.maybeOpenContextMenuAfterPointerDownOnTouchDevices(event);
        //fires only once, if pen is detected, penMode is enabled
        //the user can disable this by toggling the penMode button
        if (!this.state.penDetected && event.pointerType === "pen") {
            this.setState((prevState) => {
                return {
                    penMode: true,
                    penDetected: true,
                };
            });
        }
        if (!this.editorInterface.isTouchScreen &&
            ["pen", "touch"].includes(event.pointerType)) {
            this.editorInterface = (0, common_1.updateObject)(this.editorInterface, {
                isTouchScreen: true,
            });
        }
        if (isPanning) {
            return;
        }
        this.lastPointerDownEvent = event;
        // we must exit before we set `cursorButton` state and `savePointer`
        // else it will send pointer state & laser pointer events in collab when
        // panning
        if (this.handleCanvasPanUsingWheelOrSpaceDrag(event)) {
            return;
        }
        this.setState({
            lastPointerDownWith: event.pointerType,
            cursorButton: "down",
        });
        this.savePointer(event.clientX, event.clientY, "down");
        if (event.button === common_1.POINTER_BUTTON.ERASER &&
            this.state.activeTool.type !== common_1.TOOL_TYPE.eraser) {
            this.setState({
                activeTool: (0, common_1.updateActiveTool)(this.state, {
                    type: common_1.TOOL_TYPE.eraser,
                    lastActiveToolBeforeEraser: this.state.activeTool,
                }),
            }, () => {
                this.handleCanvasPointerDown(event);
                const onPointerUp = () => {
                    unsubPointerUp();
                    unsubCleanup?.();
                    if ((0, appState_1.isEraserActive)(this.state)) {
                        this.setState({
                            activeTool: (0, common_1.updateActiveTool)(this.state, {
                                ...(this.state.activeTool.lastActiveTool || {
                                    type: common_1.TOOL_TYPE.selection,
                                }),
                                lastActiveToolBeforeEraser: null,
                            }),
                        });
                    }
                };
                const unsubPointerUp = (0, common_1.addEventListener)(window, common_1.EVENT.POINTER_UP, onPointerUp, {
                    once: true,
                });
                let unsubCleanup;
                // subscribe inside rAF lest it'd be triggered on the same pointerdown
                // if we start erasing while coming from blurred document since
                // we cleanup pointer events on focus
                requestAnimationFrame(() => {
                    unsubCleanup =
                        this.missingPointerEventCleanupEmitter.once(onPointerUp);
                });
            });
            return;
        }
        // only handle left mouse button or touch
        if (event.button !== common_1.POINTER_BUTTON.MAIN &&
            event.button !== common_1.POINTER_BUTTON.TOUCH &&
            event.button !== common_1.POINTER_BUTTON.ERASER) {
            return;
        }
        // don't select while panning
        if (gesture.pointers.size > 1) {
            return;
        }
        // State for the duration of a pointer interaction, which starts with a
        // pointerDown event, ends with a pointerUp event (or another pointerDown)
        const pointerDownState = this.initialPointerDownState(event);
        this.setState({
            selectedElementsAreBeingDragged: false,
        });
        if (this.handleTextAutoResizeHandlePointerDown(selectedElements, pointerDownState.origin)) {
            return;
        }
        if (this.handleDraggingScrollBar(event, pointerDownState)) {
            return;
        }
        this.clearSelectionIfNotUsingSelection();
        if (this.handleSelectionOnPointerDown(event, pointerDownState)) {
            return;
        }
        const allowOnPointerDown = !this.state.penMode ||
            event.pointerType !== "touch" ||
            this.state.activeTool.type === "selection" ||
            this.state.activeTool.type === "lasso" ||
            this.state.activeTool.type === "text" ||
            this.state.activeTool.type === "image";
        if (!allowOnPointerDown) {
            return;
        }
        if (this.state.activeTool.type === "lasso") {
            const hitSelectedElement = pointerDownState.hit.element &&
                this.isASelectedElement(pointerDownState.hit.element);
            const shouldForceLassoReselect = event.altKey &&
                event[common_1.KEYS.CTRL_OR_CMD] &&
                !pointerDownState.resize.handleType;
            const shouldStartLassoSelection = shouldForceLassoReselect ||
                (!pointerDownState.hit.hasHitCommonBoundingBoxOfSelectedElements &&
                    !pointerDownState.resize.handleType &&
                    !hitSelectedElement);
            if (shouldStartLassoSelection) {
                if (!this.lassoTrail.hasCurrentTrail) {
                    this.lassoTrail.startPath(pointerDownState.origin.x, pointerDownState.origin.y, event.shiftKey);
                }
                // block dragging after lasso selection on PCs until the next pointer down
                // (on mobile or tablet, we want to allow user to drag immediately)
                pointerDownState.drag.blockDragging =
                    this.editorInterface.formFactor === "desktop";
            }
            // only for mobile or tablet, if we hit an element, select it immediately like normal selection
            if (this.editorInterface.formFactor !== "desktop" &&
                pointerDownState.hit.element &&
                !hitSelectedElement) {
                this.setState((prevState) => {
                    const nextSelectedElementIds = {
                        ...prevState.selectedElementIds,
                        [pointerDownState.hit.element.id]: true,
                    };
                    const previouslySelectedElements = [];
                    Object.keys(prevState.selectedElementIds).forEach((id) => {
                        const element = this.scene.getElement(id);
                        element && previouslySelectedElements.push(element);
                    });
                    const hitElement = pointerDownState.hit.element;
                    // if hitElement is frame-like, deselect all of its elements
                    // if they are selected
                    if ((0, element_1.isFrameLikeElement)(hitElement)) {
                        (0, element_1.getFrameChildren)(previouslySelectedElements, hitElement.id).forEach((element) => {
                            delete nextSelectedElementIds[element.id];
                        });
                    }
                    else if (hitElement.frameId) {
                        // if hitElement is in a frame and its frame has been selected
                        // disable selection for the given element
                        if (nextSelectedElementIds[hitElement.frameId]) {
                            delete nextSelectedElementIds[hitElement.id];
                        }
                    }
                    else {
                        // hitElement is neither a frame nor an element in a frame
                        // but since hitElement could be in a group with some frames
                        // this means selecting hitElement will have the frames selected as well
                        // because we want to keep the invariant:
                        // - frames and their elements are not selected at the same time
                        // we deselect elements in those frames that were previously selected
                        const groupIds = hitElement.groupIds;
                        const framesInGroups = new Set(groupIds
                            .flatMap((gid) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), gid))
                            .filter((element) => (0, element_1.isFrameLikeElement)(element))
                            .map((frame) => frame.id));
                        if (framesInGroups.size > 0) {
                            previouslySelectedElements.forEach((element) => {
                                if (element.frameId && framesInGroups.has(element.frameId)) {
                                    // deselect element and groups containing the element
                                    delete nextSelectedElementIds[element.id];
                                    element.groupIds
                                        .flatMap((gid) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), gid))
                                        .forEach((element) => {
                                        delete nextSelectedElementIds[element.id];
                                    });
                                }
                            });
                        }
                    }
                    return {
                        ...(0, element_1.selectGroupsForSelectedElements)({
                            editingGroupId: prevState.editingGroupId,
                            selectedElementIds: nextSelectedElementIds,
                        }, this.scene.getNonDeletedElements(), prevState, this),
                        showHyperlinkPopup: hitElement.link || (0, element_1.isEmbeddableElement)(hitElement)
                            ? "info"
                            : false,
                    };
                });
                pointerDownState.hit.wasAddedToSelection = true;
            }
        }
        else if (this.state.activeTool.type === "text") {
            this.handleTextOnPointerDown(event, pointerDownState);
        }
        else if (this.state.activeTool.type === "arrow" ||
            this.state.activeTool.type === "line") {
            this.handleLinearElementOnPointerDown(event, this.state.activeTool.type, pointerDownState);
        }
        else if (this.state.activeTool.type === "freedraw") {
            this.handleFreeDrawElementOnPointerDown(event, this.state.activeTool.type, pointerDownState);
        }
        else if (this.state.activeTool.type === "custom") {
            (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
        }
        else if (this.state.activeTool.type === common_1.TOOL_TYPE.frame ||
            this.state.activeTool.type === common_1.TOOL_TYPE.magicframe) {
            this.createFrameElementOnPointerDown(pointerDownState, this.state.activeTool.type);
        }
        else if (this.state.activeTool.type === "laser") {
            this.laserTrails.startPath(pointerDownState.lastCoords.x, pointerDownState.lastCoords.y);
        }
        else if (this.state.activeTool.type !== "eraser" &&
            this.state.activeTool.type !== "hand" &&
            this.state.activeTool.type !== "image") {
            this.createGenericElementOnPointerDown(this.state.activeTool.type, pointerDownState);
        }
        this.props?.onPointerDown?.(this.state.activeTool, pointerDownState);
        this.onPointerDownEmitter.trigger(this.state.activeTool, pointerDownState, event);
        if (this.state.activeTool.type === "eraser") {
            this.eraserTrail.startPath(pointerDownState.lastCoords.x, pointerDownState.lastCoords.y);
        }
        const onPointerMove = this.onPointerMoveFromPointerDownHandler(pointerDownState);
        const onPointerUp = this.onPointerUpFromPointerDownHandler(pointerDownState);
        const onKeyDown = this.onKeyDownFromPointerDownHandler(pointerDownState);
        const onKeyUp = this.onKeyUpFromPointerDownHandler(pointerDownState);
        this.missingPointerEventCleanupEmitter.once((_event) => onPointerUp(_event || event.nativeEvent));
        if (!this.state.viewModeEnabled || this.state.activeTool.type === "laser") {
            window.addEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove);
            window.addEventListener(common_1.EVENT.POINTER_UP, onPointerUp);
            window.addEventListener(common_1.EVENT.KEYDOWN, onKeyDown);
            window.addEventListener(common_1.EVENT.KEYUP, onKeyUp);
            pointerDownState.eventListeners.onMove = onPointerMove;
            pointerDownState.eventListeners.onUp = onPointerUp;
            pointerDownState.eventListeners.onKeyUp = onKeyUp;
            pointerDownState.eventListeners.onKeyDown = onKeyDown;
        }
    };
    handleCanvasPointerUp = (event) => {
        if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
            this.resetDelayedBindMode();
        }
        this.removePointer(event);
        this.lastPointerUpIsDoubleClick = this.isDoubleClick(this.lastPointerUpEvent, event);
        this.lastPointerUpEvent = event;
        if (!event.ctrlKey) {
            const preferenceEnabled = this.state.bindingPreference === "enabled";
            if (this.state.isBindingEnabled !== preferenceEnabled) {
                this.setState({ isBindingEnabled: preferenceEnabled });
            }
        }
        const scenePointer = (0, common_1.viewportCoordsToSceneCoords)({ clientX: event.clientX, clientY: event.clientY }, this.state);
        const { x: scenePointerX, y: scenePointerY } = scenePointer;
        this.lastPointerMoveCoords = {
            x: scenePointerX,
            y: scenePointerY,
        };
        if (this.handleIframeLikeCenterClick()) {
            return;
        }
        if (this.editorInterface.isTouchScreen) {
            const hitElement = this.getElementAtPosition(scenePointer.x, scenePointer.y, {
                includeLockedElements: true,
            });
            this.hitLinkElement = this.getElementLinkAtPosition(scenePointer, hitElement);
        }
        if (this.hitLinkElement &&
            !this.state.selectedElementIds[this.hitLinkElement.id]) {
            this.handleElementLinkClick(event);
        }
        else if (this.state.viewModeEnabled) {
            this.setState({
                activeEmbeddable: null,
                selectedElementIds: {},
            });
        }
    };
    maybeOpenContextMenuAfterPointerDownOnTouchDevices = (event) => {
        // deal with opening context menu on touch devices
        if (event.pointerType === "touch") {
            invalidateContextMenu = false;
            if (touchTimeout) {
                // If there's already a touchTimeout, this means that there's another
                // touch down and we are doing another touch, so we shouldn't open the
                // context menu.
                invalidateContextMenu = true;
            }
            else {
                // open the context menu with the first touch's clientX and clientY
                // if the touch is not moving
                touchTimeout = window.setTimeout(() => {
                    touchTimeout = 0;
                    if (!invalidateContextMenu) {
                        this.handleCanvasContextMenu(event);
                    }
                }, common_1.TOUCH_CTX_MENU_TIMEOUT);
            }
        }
    };
    resetContextMenuTimer = () => {
        clearTimeout(touchTimeout);
        touchTimeout = 0;
        invalidateContextMenu = false;
    };
    /**
     * pointerup may not fire in certian cases (user tabs away...), so in order
     * to properly cleanup pointerdown state, we need to fire any hanging
     * pointerup handlers manually
     */
    maybeCleanupAfterMissingPointerUp = (event) => {
        lastPointerUp?.();
        this.missingPointerEventCleanupEmitter.trigger(event).clear();
    };
    // Returns whether the event is a panning
    handleCanvasPanUsingWheelOrSpaceDrag = (event) => {
        if (!(gesture.pointers.size <= 1 &&
            (event.button === common_1.POINTER_BUTTON.WHEEL ||
                (event.button === common_1.POINTER_BUTTON.MAIN && isHoldingSpace) ||
                (0, appState_1.isHandToolActive)(this.state) ||
                (this.state.viewModeEnabled &&
                    this.state.activeTool.type !== "laser")))) {
            return false;
        }
        isPanning = true;
        // due to event.preventDefault below, container wouldn't get focus
        // automatically
        this.focusContainer();
        // preventing defualt while text editing messes with cursor/focus
        if (!this.state.editingTextElement) {
            // necessary to prevent browser from scrolling the page if excalidraw
            // not full-page #4489
            //
            // as such, the above is broken when panning canvas while in wysiwyg
            event.preventDefault();
        }
        let nextPastePrevented = false;
        const isLinux = typeof window === undefined
            ? false
            : /Linux/.test(window.navigator.platform);
        (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRABBING);
        let { clientX: lastX, clientY: lastY } = event;
        const onPointerMove = (0, reactUtils_1.withBatchedUpdatesThrottled)((event) => {
            const deltaX = lastX - event.clientX;
            const deltaY = lastY - event.clientY;
            lastX = event.clientX;
            lastY = event.clientY;
            /*
             * Prevent paste event if we move while middle clicking on Linux.
             * See issue #1383.
             */
            if (isLinux &&
                !nextPastePrevented &&
                (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
                nextPastePrevented = true;
                /* Prevent the next paste event */
                const preventNextPaste = (event) => {
                    document.body.removeEventListener(common_1.EVENT.PASTE, preventNextPaste);
                    event.stopPropagation();
                };
                /*
                 * Reenable next paste in case of disabled middle click paste for
                 * any reason:
                 * - right click paste
                 * - empty clipboard
                 */
                const enableNextPaste = () => {
                    setTimeout(() => {
                        document.body.removeEventListener(common_1.EVENT.PASTE, preventNextPaste);
                        window.removeEventListener(common_1.EVENT.POINTER_UP, enableNextPaste);
                    }, 100);
                };
                document.body.addEventListener(common_1.EVENT.PASTE, preventNextPaste);
                window.addEventListener(common_1.EVENT.POINTER_UP, enableNextPaste);
            }
            this.translateCanvas({
                scrollX: this.state.scrollX - deltaX / this.state.zoom.value,
                scrollY: this.state.scrollY - deltaY / this.state.zoom.value,
            });
        });
        const teardown = (0, reactUtils_1.withBatchedUpdates)((lastPointerUp = () => {
            lastPointerUp = null;
            isPanning = false;
            if (!isHoldingSpace) {
                if (this.state.viewModeEnabled &&
                    this.state.activeTool.type !== "laser") {
                    (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
                }
                else {
                    (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
                }
            }
            this.setState({
                cursorButton: "up",
            });
            this.savePointer(event.clientX, event.clientY, "up");
            window.removeEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove);
            window.removeEventListener(common_1.EVENT.POINTER_UP, teardown);
            window.removeEventListener(common_1.EVENT.BLUR, teardown);
            onPointerMove.flush();
        }));
        window.addEventListener(common_1.EVENT.BLUR, teardown);
        window.addEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove, {
            passive: true,
        });
        window.addEventListener(common_1.EVENT.POINTER_UP, teardown);
        return true;
    };
    updateGestureOnPointerDown(event) {
        gesture.pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        if (gesture.pointers.size === 2) {
            gesture.lastCenter = (0, gesture_1.getCenter)(gesture.pointers);
            gesture.initialScale = this.state.zoom.value;
            gesture.initialDistance = (0, gesture_1.getDistance)(Array.from(gesture.pointers.values()));
        }
    }
    initialPointerDownState(event) {
        const origin = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        const selectedElements = this.scene.getSelectedElements(this.state);
        const [minX, minY, maxX, maxY] = (0, element_1.getCommonBounds)(selectedElements);
        const isElbowArrowOnly = selectedElements.findIndex(element_1.isElbowArrow) === 0;
        return {
            origin,
            withCmdOrCtrl: event[common_1.KEYS.CTRL_OR_CMD],
            originInGrid: (0, common_1.tupleToCoors)((0, common_1.getGridPoint)(origin.x, origin.y, event[common_1.KEYS.CTRL_OR_CMD] || isElbowArrowOnly
                ? null
                : this.getEffectiveGridSize())),
            scrollbars: (0, scrollbars_1.isOverScrollBars)(currentScrollBars, event.clientX - this.state.offsetLeft, event.clientY - this.state.offsetTop),
            // we need to duplicate because we'll be updating this state
            lastCoords: { ...origin },
            originalElements: this.scene
                .getNonDeletedElements()
                .reduce((acc, element) => {
                acc.set(element.id, (0, element_1.deepCopyElement)(element));
                return acc;
            }, new Map()),
            resize: {
                handleType: false,
                isResizing: false,
                offset: { x: 0, y: 0 },
                arrowDirection: "origin",
                center: { x: (maxX + minX) / 2, y: (maxY + minY) / 2 },
            },
            hit: {
                element: null,
                allHitElements: [],
                wasAddedToSelection: false,
                hasBeenDuplicated: false,
                hasHitCommonBoundingBoxOfSelectedElements: this.isHittingCommonBoundingBoxOfSelectedElements(origin, selectedElements),
            },
            drag: {
                hasOccurred: false,
                offset: null,
                origin: { ...origin },
                blockDragging: false,
            },
            eventListeners: {
                onMove: null,
                onUp: null,
                onKeyUp: null,
                onKeyDown: null,
            },
            boxSelection: {
                hasOccurred: false,
            },
        };
    }
    // Returns whether the event is a dragging a scrollbar
    handleDraggingScrollBar(event, pointerDownState) {
        if (!(pointerDownState.scrollbars.isOverEither && !this.state.multiElement)) {
            return false;
        }
        isDraggingScrollBar = true;
        pointerDownState.lastCoords.x = event.clientX;
        pointerDownState.lastCoords.y = event.clientY;
        const onPointerMove = (0, reactUtils_1.withBatchedUpdatesThrottled)((event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            this.handlePointerMoveOverScrollbars(event, pointerDownState);
        });
        const onPointerUp = (0, reactUtils_1.withBatchedUpdates)(() => {
            lastPointerUp = null;
            isDraggingScrollBar = false;
            (0, cursor_1.setCursorForShape)(this.interactiveCanvas, this.state);
            this.setState({
                cursorButton: "up",
            });
            this.savePointer(event.clientX, event.clientY, "up");
            window.removeEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove);
            window.removeEventListener(common_1.EVENT.POINTER_UP, onPointerUp);
            onPointerMove.flush();
        });
        lastPointerUp = onPointerUp;
        window.addEventListener(common_1.EVENT.POINTER_MOVE, onPointerMove);
        window.addEventListener(common_1.EVENT.POINTER_UP, onPointerUp);
        return true;
    }
    clearSelectionIfNotUsingSelection = () => {
        if (!(0, common_1.isSelectionLikeTool)(this.state.activeTool.type)) {
            this.setState({
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                selectedGroupIds: {},
                editingGroupId: null,
                activeEmbeddable: null,
            });
        }
    };
    /**
     * @returns whether the pointer event has been completely handled
     */
    handleSelectionOnPointerDown = (event, pointerDownState) => {
        if ((0, common_1.isSelectionLikeTool)(this.state.activeTool.type)) {
            const elements = this.scene.getNonDeletedElements();
            const elementsMap = this.scene.getNonDeletedElementsMap();
            const selectedElements = this.scene.getSelectedElements(this.state);
            if (selectedElements.length === 1 &&
                !this.state.selectedLinearElement?.isEditing &&
                !(0, element_1.isElbowArrow)(selectedElements[0]) &&
                !((0, element_1.isLinearElement)(selectedElements[0]) &&
                    (this.editorInterface.userAgent.isMobileDevice ||
                        selectedElements[0].points.length === 2)) &&
                !(this.state.selectedLinearElement &&
                    this.state.selectedLinearElement.hoverPointIndex !== -1)) {
                const elementWithTransformHandleType = (0, element_1.getElementWithTransformHandleType)(elements, this.state, pointerDownState.origin.x, pointerDownState.origin.y, this.state.zoom, event.pointerType, this.scene.getNonDeletedElementsMap(), this.editorInterface);
                if (elementWithTransformHandleType != null) {
                    if (elementWithTransformHandleType.transformHandleType === "rotation") {
                        this.setState({
                            resizingElement: elementWithTransformHandleType.element,
                        });
                        pointerDownState.resize.handleType =
                            elementWithTransformHandleType.transformHandleType;
                    }
                    else if (this.state.croppingElementId) {
                        pointerDownState.resize.handleType =
                            elementWithTransformHandleType.transformHandleType;
                    }
                    else {
                        this.setState({
                            resizingElement: elementWithTransformHandleType.element,
                        });
                        pointerDownState.resize.handleType =
                            elementWithTransformHandleType.transformHandleType;
                    }
                }
            }
            else if (selectedElements.length > 1) {
                pointerDownState.resize.handleType = (0, element_1.getTransformHandleTypeFromCoords)((0, element_1.getCommonBounds)(selectedElements), pointerDownState.origin.x, pointerDownState.origin.y, this.state.zoom, event.pointerType, this.editorInterface);
            }
            if (pointerDownState.resize.handleType) {
                pointerDownState.resize.isResizing = true;
                pointerDownState.resize.offset = (0, common_1.tupleToCoors)((0, element_1.getResizeOffsetXY)(pointerDownState.resize.handleType, selectedElements, elementsMap, pointerDownState.origin.x, pointerDownState.origin.y));
                if (selectedElements.length === 1 &&
                    (0, element_1.isLinearElement)(selectedElements[0]) &&
                    selectedElements[0].points.length === 2) {
                    pointerDownState.resize.arrowDirection = (0, element_1.getResizeArrowDirection)(pointerDownState.resize.handleType, selectedElements[0]);
                }
            }
            else {
                if (this.state.selectedLinearElement) {
                    const linearElementEditor = this.state.selectedLinearElement;
                    const ret = element_1.LinearElementEditor.handlePointerDown(event, this, this.store, pointerDownState.origin, linearElementEditor, this.scene);
                    if (ret.hitElement) {
                        pointerDownState.hit.element = ret.hitElement;
                    }
                    if (ret.linearElementEditor) {
                        this.setState({ selectedLinearElement: ret.linearElementEditor });
                    }
                    if (ret.didAddPoint) {
                        return true;
                    }
                    // Also check at current pointer position if focus point is being hovered
                    // (in case we're clicking directly without a prior move event)
                    const elementsMap = this.scene.getNonDeletedElementsMap();
                    const arrow = element_1.LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
                    if (arrow && (0, element_1.isBindingElement)(arrow)) {
                        const { hitFocusPoint, pointerOffset } = (0, element_1.handleFocusPointPointerDown)(arrow, pointerDownState, elementsMap, this.state);
                        // If focus point is hit, update state and prevent element selection
                        if (hitFocusPoint) {
                            this.setState({
                                selectedLinearElement: {
                                    ...linearElementEditor,
                                    hoveredFocusPointBinding: hitFocusPoint,
                                    draggedFocusPointBinding: hitFocusPoint,
                                    pointerOffset,
                                },
                            });
                            return false;
                        }
                    }
                }
                const allHitElements = this.getElementsAtPosition(pointerDownState.origin.x, pointerDownState.origin.y, {
                    includeLockedElements: true,
                });
                const unlockedHitElements = allHitElements.filter((e) => !e.locked);
                // Cannot set preferSelected in getElementAtPosition as we do in pointer move; consider:
                // A & B: both unlocked, A selected, B on top, A & B overlaps in some way
                // we want to select B when clicking on the overlapping area
                const hitElementMightBeLocked = this.getElementAtPosition(pointerDownState.origin.x, pointerDownState.origin.y, {
                    allHitElements,
                });
                if (!hitElementMightBeLocked ||
                    hitElementMightBeLocked.id !== this.state.activeLockedId) {
                    this.setState({
                        activeLockedId: null,
                    });
                }
                if (hitElementMightBeLocked &&
                    hitElementMightBeLocked.locked &&
                    !unlockedHitElements.some((el) => this.state.selectedElementIds[el.id])) {
                    pointerDownState.hit.element = null;
                }
                else {
                    // hitElement may already be set above, so check first
                    pointerDownState.hit.element =
                        pointerDownState.hit.element ??
                            this.getElementAtPosition(pointerDownState.origin.x, pointerDownState.origin.y);
                }
                this.hitLinkElement = this.getElementLinkAtPosition(pointerDownState.origin, hitElementMightBeLocked);
                if (this.hitLinkElement) {
                    return true;
                }
                if (this.state.croppingElementId &&
                    pointerDownState.hit.element?.id !== this.state.croppingElementId) {
                    this.finishImageCropping();
                }
                if (pointerDownState.hit.element) {
                    // Early return if pointer is hitting link icon
                    const hitLinkElement = this.getElementLinkAtPosition({
                        x: pointerDownState.origin.x,
                        y: pointerDownState.origin.y,
                    }, pointerDownState.hit.element);
                    if (hitLinkElement) {
                        return false;
                    }
                }
                // For overlapped elements one position may hit
                // multiple elements
                pointerDownState.hit.allHitElements = unlockedHitElements;
                const hitElement = pointerDownState.hit.element;
                const someHitElementIsSelected = pointerDownState.hit.allHitElements.some((element) => this.isASelectedElement(element));
                if ((hitElement === null || !someHitElementIsSelected) &&
                    !event.shiftKey &&
                    !pointerDownState.hit.hasHitCommonBoundingBoxOfSelectedElements &&
                    (!this.state.selectedLinearElement?.isEditing ||
                        (hitElement &&
                            hitElement?.id !== this.state.selectedLinearElement?.elementId))) {
                    this.clearSelection(hitElement);
                }
                if (this.state.selectedLinearElement?.isEditing) {
                    this.setState((prevState) => ({
                        selectedLinearElement: prevState.selectedLinearElement
                            ? {
                                ...prevState.selectedLinearElement,
                                isEditing: !!hitElement &&
                                    hitElement.id ===
                                        this.state.selectedLinearElement?.elementId,
                            }
                            : null,
                        selectedElementIds: prevState.selectedLinearElement
                            ? (0, element_1.makeNextSelectedElementIds)({
                                [prevState.selectedLinearElement.elementId]: true,
                            }, this.state)
                            : (0, element_1.makeNextSelectedElementIds)({}, prevState),
                    }));
                    // If we click on something
                }
                else if (hitElement != null) {
                    // == deep selection ==
                    // on CMD/CTRL, drill down to hit element regardless of groups etc.
                    if (event[common_1.KEYS.CTRL_OR_CMD]) {
                        if (event.altKey) {
                            // ctrl + alt means we're lasso selecting - start lasso trail and switch to lasso tool
                            // Close any open dialogs that might interfere with lasso selection
                            if (this.state.openDialog?.name === "elementLinkSelector") {
                                this.setOpenDialog(null);
                            }
                            this.lassoTrail.startPath(pointerDownState.origin.x, pointerDownState.origin.y, event.shiftKey);
                            this.setActiveTool({ type: "lasso", fromSelection: true });
                            return false;
                        }
                        if (!this.state.selectedElementIds[hitElement.id]) {
                            pointerDownState.hit.wasAddedToSelection = true;
                        }
                        this.setState((prevState) => ({
                            ...(0, element_1.editGroupForSelectedElement)(prevState, hitElement),
                            previousSelectedElementIds: this.state.selectedElementIds,
                        }));
                        // mark as not completely handled so as to allow dragging etc.
                        return false;
                    }
                    // deselect if item is selected
                    // if shift is not clicked, this will always return true
                    // otherwise, it will trigger selection based on current
                    // state of the box
                    if (!this.state.selectedElementIds[hitElement.id]) {
                        // if we are currently editing a group, exiting editing mode and deselect the group.
                        if (this.state.editingGroupId &&
                            !(0, element_1.isElementInGroup)(hitElement, this.state.editingGroupId)) {
                            this.setState({
                                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                                selectedGroupIds: {},
                                editingGroupId: null,
                                activeEmbeddable: null,
                            });
                        }
                        // Add hit element to selection. At this point if we're not holding
                        // SHIFT the previously selected element(s) were deselected above
                        // (make sure you use setState updater to use latest state)
                        // With shift-selection, we want to make sure that frames and their containing
                        // elements are not selected at the same time.
                        if (!someHitElementIsSelected &&
                            !pointerDownState.hit.hasHitCommonBoundingBoxOfSelectedElements) {
                            this.setState((prevState) => {
                                let nextSelectedElementIds = {
                                    ...prevState.selectedElementIds,
                                    [hitElement.id]: true,
                                };
                                const previouslySelectedElements = [];
                                Object.keys(prevState.selectedElementIds).forEach((id) => {
                                    const element = this.scene.getElement(id);
                                    element && previouslySelectedElements.push(element);
                                });
                                // if hitElement is frame-like, deselect all of its elements
                                // if they are selected
                                if ((0, element_1.isFrameLikeElement)(hitElement)) {
                                    (0, element_1.getFrameChildren)(previouslySelectedElements, hitElement.id).forEach((element) => {
                                        delete nextSelectedElementIds[element.id];
                                    });
                                }
                                else if (hitElement.frameId) {
                                    // if hitElement is in a frame and its frame has been selected
                                    // disable selection for the given element
                                    if (nextSelectedElementIds[hitElement.frameId]) {
                                        delete nextSelectedElementIds[hitElement.id];
                                    }
                                }
                                else {
                                    // hitElement is neither a frame nor an element in a frame
                                    // but since hitElement could be in a group with some frames
                                    // this means selecting hitElement will have the frames selected as well
                                    // because we want to keep the invariant:
                                    // - frames and their elements are not selected at the same time
                                    // we deselect elements in those frames that were previously selected
                                    const groupIds = hitElement.groupIds;
                                    const framesInGroups = new Set(groupIds
                                        .flatMap((gid) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), gid))
                                        .filter((element) => (0, element_1.isFrameLikeElement)(element))
                                        .map((frame) => frame.id));
                                    if (framesInGroups.size > 0) {
                                        previouslySelectedElements.forEach((element) => {
                                            if (element.frameId &&
                                                framesInGroups.has(element.frameId)) {
                                                // deselect element and groups containing the element
                                                delete nextSelectedElementIds[element.id];
                                                element.groupIds
                                                    .flatMap((gid) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), gid))
                                                    .forEach((element) => {
                                                    delete nextSelectedElementIds[element.id];
                                                });
                                            }
                                        });
                                    }
                                }
                                // Finally, in shape selection mode, we'd like to
                                // keep only one shape or group selected at a time.
                                // This means, if the hitElement is a different shape or group
                                // than the previously selected ones, we deselect the previous ones
                                // and select the hitElement
                                if (prevState.openDialog?.name === "elementLinkSelector") {
                                    if (!hitElement.groupIds.some((gid) => prevState.selectedGroupIds[gid])) {
                                        nextSelectedElementIds = {
                                            [hitElement.id]: true,
                                        };
                                    }
                                }
                                return {
                                    ...(0, element_1.selectGroupsForSelectedElements)({
                                        editingGroupId: prevState.editingGroupId,
                                        selectedElementIds: nextSelectedElementIds,
                                    }, this.scene.getNonDeletedElements(), prevState, this),
                                    showHyperlinkPopup: hitElement.link || (0, element_1.isEmbeddableElement)(hitElement)
                                        ? "info"
                                        : false,
                                };
                            });
                            pointerDownState.hit.wasAddedToSelection = true;
                        }
                    }
                }
                this.setState({
                    previousSelectedElementIds: this.state.selectedElementIds,
                });
            }
        }
        return false;
    };
    isASelectedElement(hitElement) {
        return hitElement != null && this.state.selectedElementIds[hitElement.id];
    }
    isHittingCommonBoundingBoxOfSelectedElements(point, selectedElements) {
        if (selectedElements.length < 2) {
            return false;
        }
        // How many pixels off the shape boundary we still consider a hit
        const threshold = Math.max(common_1.DEFAULT_COLLISION_THRESHOLD / this.state.zoom.value, 1);
        const boundsPadding = (common_1.DEFAULT_TRANSFORM_HANDLE_SPACING * 2) / this.state.zoom.value;
        const [x1, y1, x2, y2] = (0, element_1.getCommonBounds)(selectedElements);
        return (point.x > x1 - boundsPadding - threshold &&
            point.x < x2 + boundsPadding + threshold &&
            point.y > y1 - boundsPadding - threshold &&
            point.y < y2 + boundsPadding + threshold);
    }
    handleTextOnPointerDown = (event, pointerDownState) => {
        // if we're currently still editing text, clicking outside
        // should only finalize it, not create another (irrespective
        // of state.activeTool.locked)
        if (this.state.editingTextElement) {
            return;
        }
        let sceneX = pointerDownState.origin.x;
        let sceneY = pointerDownState.origin.y;
        const element = this.getElementAtPosition(sceneX, sceneY, {
            includeBoundTextElement: true,
        });
        // FIXME
        let container = this.getTextBindableContainerAtPosition(sceneX, sceneY);
        if ((0, element_1.hasBoundTextElement)(element)) {
            container = element;
            sceneX = element.x + element.width / 2;
            sceneY = element.y + element.height / 2;
        }
        this.startTextEditing({
            sceneX,
            sceneY,
            insertAtParentCenter: !event.altKey,
            container,
            autoEdit: false,
            initialCaretSceneCoords: { x: sceneX, y: sceneY },
        });
        (0, cursor_1.resetCursor)(this.interactiveCanvas);
        if (!this.state.activeTool.locked) {
            this.setState({
                activeTool: (0, common_1.updateActiveTool)(this.state, {
                    type: this.state.preferredSelectionTool.type,
                }),
            });
        }
    };
    handleFreeDrawElementOnPointerDown = (event, elementType, pointerDownState) => {
        // Begin a mark capture. This does not have to update state yet.
        const [gridX, gridY] = (0, common_1.getGridPoint)(pointerDownState.origin.x, pointerDownState.origin.y, null);
        const topLayerFrame = this.getTopLayerFrameAtSceneCoords({
            x: gridX,
            y: gridY,
        });
        const simulatePressure = event.pressure === 0.5;
        const element = (0, element_1.newFreeDrawElement)({
            type: elementType,
            x: gridX,
            y: gridY,
            strokeColor: this.state.currentItemStrokeColor,
            backgroundColor: this.state.currentItemBackgroundColor,
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roughness: this.state.currentItemRoughness,
            opacity: this.state.currentItemOpacity,
            roundness: null,
            simulatePressure,
            locked: false,
            frameId: topLayerFrame ? topLayerFrame.id : null,
            points: [(0, math_1.pointFrom)(0, 0)],
            pressures: simulatePressure ? [] : [event.pressure],
        });
        this.scene.insertElement(element);
        this.setState((prevState) => {
            const nextSelectedElementIds = {
                ...prevState.selectedElementIds,
            };
            delete nextSelectedElementIds[element.id];
            return {
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)(nextSelectedElementIds, prevState),
            };
        });
        const boundElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap());
        this.setState({
            newElement: element,
            startBoundElement: boundElement,
            suggestedBinding: null,
        });
    };
    insertIframeElement = ({ sceneX, sceneY, width, height, }) => {
        const [gridX, gridY] = (0, common_1.getGridPoint)(sceneX, sceneY, this.lastPointerDownEvent?.[common_1.KEYS.CTRL_OR_CMD]
            ? null
            : this.getEffectiveGridSize());
        const element = (0, element_1.newIframeElement)({
            type: "iframe",
            x: gridX,
            y: gridY,
            strokeColor: "transparent",
            backgroundColor: "transparent",
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roughness: this.state.currentItemRoughness,
            roundness: this.getCurrentItemRoundness("iframe"),
            opacity: this.state.currentItemOpacity,
            locked: false,
            width,
            height,
        });
        this.scene.insertElement(element);
        return element;
    };
    //create rectangle element with youtube top left on nearest grid point width / hight 640/360
    insertEmbeddableElement = ({ sceneX, sceneY, link, }) => {
        const [gridX, gridY] = (0, common_1.getGridPoint)(sceneX, sceneY, this.lastPointerDownEvent?.[common_1.KEYS.CTRL_OR_CMD]
            ? null
            : this.getEffectiveGridSize());
        const embedLink = (0, element_1.getEmbedLink)(link);
        if (!embedLink) {
            return;
        }
        if (embedLink.error instanceof URIError) {
            this.setToast({
                message: (0, i18n_1.t)("toast.unrecognizedLinkFormat"),
                closable: true,
            });
        }
        const element = (0, element_1.newEmbeddableElement)({
            type: "embeddable",
            x: gridX,
            y: gridY,
            strokeColor: "transparent",
            backgroundColor: "transparent",
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roughness: this.state.currentItemRoughness,
            roundness: this.getCurrentItemRoundness("embeddable"),
            opacity: this.state.currentItemOpacity,
            locked: false,
            width: embedLink.intrinsicSize.w,
            height: embedLink.intrinsicSize.h,
            link,
        });
        this.scene.insertElement(element);
        return element;
    };
    newImagePlaceholder = ({ sceneX, sceneY, addToFrameUnderCursor = true, }) => {
        const [gridX, gridY] = (0, common_1.getGridPoint)(sceneX, sceneY, this.lastPointerDownEvent?.[common_1.KEYS.CTRL_OR_CMD]
            ? null
            : this.getEffectiveGridSize());
        const topLayerFrame = addToFrameUnderCursor
            ? this.getTopLayerFrameAtSceneCoords({
                x: gridX,
                y: gridY,
            })
            : null;
        const placeholderSize = 100 / this.state.zoom.value;
        return (0, element_1.newImageElement)({
            type: "image",
            strokeColor: this.state.currentItemStrokeColor,
            backgroundColor: this.state.currentItemBackgroundColor,
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roughness: this.state.currentItemRoughness,
            roundness: null,
            opacity: this.state.currentItemOpacity,
            locked: false,
            frameId: topLayerFrame ? topLayerFrame.id : null,
            x: gridX - placeholderSize / 2,
            y: gridY - placeholderSize / 2,
            width: placeholderSize,
            height: placeholderSize,
        });
    };
    handleLinearElementOnPointerDown = (event, elementType, pointerDownState) => {
        if (event.ctrlKey) {
            (0, react_dom_1.flushSync)(() => {
                this.setState({
                    isBindingEnabled: this.state.bindingPreference !== "enabled",
                });
            });
        }
        if (this.state.multiElement) {
            const { multiElement, selectedLinearElement } = this.state;
            (0, common_1.invariant)(selectedLinearElement, "selectedLinearElement is expected to be set");
            // finalize if completing a loop
            if (multiElement.type === "line" &&
                (0, element_1.isPathALoop)(multiElement.points, this.state.zoom.value)) {
                (0, react_dom_1.flushSync)(() => {
                    this.setState({
                        selectedLinearElement: {
                            ...selectedLinearElement,
                            lastCommittedPoint: multiElement.points[multiElement.points.length - 1],
                            initialState: {
                                ...selectedLinearElement.initialState,
                                lastClickedPoint: -1, // Disable dragging
                            },
                        },
                    });
                });
                this.actionManager.executeAction(actions_1.actionFinalize);
                return;
            }
            // Elbow arrows cannot be created by putting down points
            // only the start and end points can be defined
            if ((0, element_1.isElbowArrow)(multiElement) && multiElement.points.length > 1) {
                this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                    event: event.nativeEvent,
                    sceneCoords: {
                        x: pointerDownState.origin.x,
                        y: pointerDownState.origin.y,
                    },
                });
                return;
            }
            const { x: rx, y: ry } = multiElement;
            const { lastCommittedPoint } = selectedLinearElement;
            const hoveredElementForBinding = (0, element_1.isBindingEnabled)(this.state) &&
                (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(this.lastPointerMoveCoords?.x ??
                    rx + multiElement.points[multiElement.points.length - 1][0], this.lastPointerMoveCoords?.y ??
                    ry + multiElement.points[multiElement.points.length - 1][1]), this.scene.getNonDeletedElements(), this.scene.getNonDeletedElementsMap());
            // clicking inside commit zone → finalize arrow
            if (((0, element_1.isBindingElement)(multiElement) && hoveredElementForBinding) ||
                (multiElement.points.length > 1 &&
                    lastCommittedPoint &&
                    (0, math_1.pointDistance)((0, math_1.pointFrom)(pointerDownState.origin.x - rx, pointerDownState.origin.y - ry), lastCommittedPoint) < common_1.LINE_CONFIRM_THRESHOLD)) {
                this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                    event: event.nativeEvent,
                    sceneCoords: {
                        x: pointerDownState.origin.x,
                        y: pointerDownState.origin.y,
                    },
                });
                return;
            }
            this.setState((prevState) => ({
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                    ...prevState.selectedElementIds,
                    [multiElement.id]: true,
                }, prevState),
            }));
            (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.POINTER);
        }
        else {
            const [gridX, gridY] = (0, common_1.getGridPoint)(pointerDownState.origin.x, pointerDownState.origin.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
            const topLayerFrame = this.getTopLayerFrameAtSceneCoords({
                x: gridX,
                y: gridY,
            });
            /* If arrow is pre-arrowheads, it will have undefined for both start and end arrowheads.
            If so, we want it to be null for start and "arrow" for end. If the linear item is not
            an arrow, we want it to be null for both. Otherwise, we want it to use the
            values from appState. */
            const { currentItemStartArrowhead, currentItemEndArrowhead } = this.state;
            const [startArrowhead, endArrowhead] = elementType === "arrow"
                ? [currentItemStartArrowhead, currentItemEndArrowhead]
                : [null, null];
            const element = elementType === "arrow"
                ? (0, element_1.newArrowElement)({
                    type: elementType,
                    x: gridX,
                    y: gridY,
                    strokeColor: this.state.currentItemStrokeColor,
                    backgroundColor: this.state.currentItemBackgroundColor,
                    fillStyle: this.state.currentItemFillStyle,
                    strokeWidth: this.state.currentItemStrokeWidth,
                    strokeStyle: this.state.currentItemStrokeStyle,
                    roughness: this.state.currentItemRoughness,
                    opacity: this.state.currentItemOpacity,
                    roundness: this.state.currentItemArrowType === common_1.ARROW_TYPE.round
                        ? { type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS }
                        : // note, roundness doesn't have any effect for elbow arrows,
                            // but it's best to set it to null as well
                            null,
                    startArrowhead,
                    endArrowhead,
                    locked: false,
                    frameId: topLayerFrame ? topLayerFrame.id : null,
                    elbowed: this.state.currentItemArrowType === common_1.ARROW_TYPE.elbow,
                    fixedSegments: this.state.currentItemArrowType === common_1.ARROW_TYPE.elbow
                        ? []
                        : null,
                })
                : (0, element_1.newLinearElement)({
                    type: elementType,
                    x: gridX,
                    y: gridY,
                    strokeColor: this.state.currentItemStrokeColor,
                    backgroundColor: this.state.currentItemBackgroundColor,
                    fillStyle: this.state.currentItemFillStyle,
                    strokeWidth: this.state.currentItemStrokeWidth,
                    strokeStyle: this.state.currentItemStrokeStyle,
                    roughness: this.state.currentItemRoughness,
                    opacity: this.state.currentItemOpacity,
                    roundness: this.state.currentItemRoundness === "round"
                        ? { type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS }
                        : null,
                    locked: false,
                    frameId: topLayerFrame ? topLayerFrame.id : null,
                });
            const point = (0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y);
            const elementsMap = this.scene.getNonDeletedElementsMap();
            const boundElement = (0, element_1.isBindingEnabled)(this.state)
                ? (0, element_1.getHoveredElementForBinding)(point, this.scene.getNonDeletedElements(), elementsMap)
                : null;
            this.scene.mutateElement(element, {
                points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(0, 0)],
            });
            this.scene.insertElement(element);
            if ((0, element_1.isBindingElement)(element)) {
                // Do the initial binding so the binding strategy has the initial state
                (0, element_1.bindOrUnbindBindingElement)(element, new Map([
                    [
                        0,
                        {
                            point: (0, math_1.pointFrom)(0, 0),
                            isDragging: false,
                        },
                    ],
                ]), point[0], point[1], this.scene, this.state, {
                    newArrow: true,
                    altKey: event.altKey,
                    initialBinding: true,
                    angleLocked: (0, common_1.shouldRotateWithDiscreteAngle)(event.nativeEvent),
                });
            }
            // NOTE: We need the flushSync here for the
            // delayed bind mode change to see the right state
            // (specifically the `newElement`)
            (0, react_dom_1.flushSync)(() => {
                this.setState((prevState) => {
                    let linearElementEditor = null;
                    let nextSelectedElementIds = prevState.selectedElementIds;
                    if ((0, element_1.isLinearElement)(element)) {
                        linearElementEditor = new element_1.LinearElementEditor(element, this.scene.getNonDeletedElementsMap());
                        const endIdx = element.points.length - 1;
                        linearElementEditor = {
                            ...linearElementEditor,
                            selectedPointsIndices: [endIdx],
                            initialState: {
                                ...linearElementEditor.initialState,
                                arrowStartIsInside: event.altKey,
                                lastClickedPoint: endIdx,
                                origin: (0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y),
                            },
                        };
                    }
                    nextSelectedElementIds = !this.state.activeTool.locked
                        ? (0, element_1.makeNextSelectedElementIds)({ [element.id]: true }, prevState)
                        : prevState.selectedElementIds;
                    return {
                        ...prevState,
                        bindMode: "orbit",
                        newElement: element,
                        startBoundElement: boundElement,
                        suggestedBinding: boundElement && (0, element_1.isBindingElement)(element)
                            ? {
                                element: boundElement,
                                midPoint: (0, element_1.getSnapOutlineMidPoint)(point, boundElement, elementsMap, this.state.zoom),
                            }
                            : null,
                        selectedElementIds: nextSelectedElementIds,
                        selectedLinearElement: linearElementEditor,
                    };
                });
            });
            if ((0, element_1.isBindingElement)(element) && (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                this.handleDelayedBindModeChange(element, boundElement);
            }
        }
    };
    getCurrentItemRoundness(elementType) {
        return this.state.currentItemRoundness === "round"
            ? {
                type: (0, element_1.isUsingAdaptiveRadius)(elementType)
                    ? common_1.ROUNDNESS.ADAPTIVE_RADIUS
                    : common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
            }
            : null;
    }
    createGenericElementOnPointerDown = (elementType, pointerDownState) => {
        const [gridX, gridY] = (0, common_1.getGridPoint)(pointerDownState.origin.x, pointerDownState.origin.y, this.lastPointerDownEvent?.[common_1.KEYS.CTRL_OR_CMD]
            ? null
            : this.getEffectiveGridSize());
        const topLayerFrame = this.getTopLayerFrameAtSceneCoords({
            x: gridX,
            y: gridY,
        });
        const baseElementAttributes = {
            x: gridX,
            y: gridY,
            strokeColor: this.state.currentItemStrokeColor,
            backgroundColor: this.state.currentItemBackgroundColor,
            fillStyle: this.state.currentItemFillStyle,
            strokeWidth: this.state.currentItemStrokeWidth,
            strokeStyle: this.state.currentItemStrokeStyle,
            roughness: this.state.currentItemRoughness,
            opacity: this.state.currentItemOpacity,
            roundness: this.getCurrentItemRoundness(elementType),
            locked: false,
            frameId: topLayerFrame ? topLayerFrame.id : null,
        };
        let element;
        if (elementType === "embeddable") {
            element = (0, element_1.newEmbeddableElement)({
                type: "embeddable",
                ...baseElementAttributes,
            });
        }
        else {
            element = (0, element_1.newElement)({
                type: elementType,
                ...baseElementAttributes,
            });
        }
        if (element.type === "selection") {
            this.setState({
                selectionElement: element,
            });
        }
        else {
            this.scene.insertElement(element);
            this.setState({
                multiElement: null,
                newElement: element,
            });
        }
    };
    createFrameElementOnPointerDown = (pointerDownState, type) => {
        const [gridX, gridY] = (0, common_1.getGridPoint)(pointerDownState.origin.x, pointerDownState.origin.y, this.lastPointerDownEvent?.[common_1.KEYS.CTRL_OR_CMD]
            ? null
            : this.getEffectiveGridSize());
        const constructorOpts = {
            x: gridX,
            y: gridY,
            opacity: this.state.currentItemOpacity,
            locked: false,
            ...common_1.FRAME_STYLE,
        };
        const frame = type === common_1.TOOL_TYPE.magicframe
            ? (0, element_1.newMagicFrameElement)(constructorOpts)
            : (0, element_1.newFrameElement)(constructorOpts);
        this.scene.insertElement(frame);
        this.setState({
            multiElement: null,
            newElement: frame,
        });
    };
    maybeCacheReferenceSnapPoints(event, selectedElements, recomputeAnyways = false) {
        if ((0, snapping_1.isSnappingEnabled)({
            event,
            app: this,
            selectedElements,
        }) &&
            (recomputeAnyways || !snapping_1.SnapCache.getReferenceSnapPoints())) {
            snapping_1.SnapCache.setReferenceSnapPoints((0, snapping_1.getReferenceSnapPoints)(this.scene.getNonDeletedElements(), selectedElements, this.state, this.scene.getNonDeletedElementsMap()));
        }
    }
    maybeCacheVisibleGaps(event, selectedElements, recomputeAnyways = false) {
        if ((0, snapping_1.isSnappingEnabled)({
            event,
            app: this,
            selectedElements,
        }) &&
            (recomputeAnyways || !snapping_1.SnapCache.getVisibleGaps())) {
            snapping_1.SnapCache.setVisibleGaps((0, snapping_1.getVisibleGaps)(this.scene.getNonDeletedElements(), selectedElements, this.state, this.scene.getNonDeletedElementsMap()));
        }
    }
    onKeyDownFromPointerDownHandler(pointerDownState) {
        return (0, reactUtils_1.withBatchedUpdates)((event) => {
            if (this.maybeHandleResize(pointerDownState, event)) {
                return;
            }
            this.maybeDragNewGenericElement(pointerDownState, event);
        });
    }
    onKeyUpFromPointerDownHandler(pointerDownState) {
        return (0, reactUtils_1.withBatchedUpdates)((event) => {
            // Prevents focus from escaping excalidraw tab
            event.key === common_1.KEYS.ALT && event.preventDefault();
            if (this.maybeHandleResize(pointerDownState, event)) {
                return;
            }
            this.maybeDragNewGenericElement(pointerDownState, event);
        });
    }
    onPointerMoveFromPointerDownHandler(pointerDownState) {
        return (0, reactUtils_1.withBatchedUpdatesThrottled)((event) => {
            if (this.state.openDialog?.name === "elementLinkSelector") {
                return;
            }
            const pointerCoords = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
            if (this.state.activeLockedId) {
                this.setState({
                    activeLockedId: null,
                });
            }
            if (this.state.selectedLinearElement &&
                this.state.selectedLinearElement.elbowed &&
                this.state.selectedLinearElement.initialState.segmentMidpoint.index) {
                const [gridX, gridY] = (0, common_1.getGridPoint)(pointerCoords.x, pointerCoords.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
                let index = this.state.selectedLinearElement.initialState.segmentMidpoint.index;
                if (index < 0) {
                    const nextCoords = element_1.LinearElementEditor.getSegmentMidpointHitCoords({
                        ...this.state.selectedLinearElement,
                        segmentMidPointHoveredCoords: null,
                    }, { x: gridX, y: gridY }, this.state, this.scene.getNonDeletedElementsMap());
                    index = nextCoords
                        ? element_1.LinearElementEditor.getSegmentMidPointIndex(this.state.selectedLinearElement, this.state, nextCoords, this.scene.getNonDeletedElementsMap())
                        : -1;
                }
                const ret = element_1.LinearElementEditor.moveFixedSegment(this.state.selectedLinearElement, index, gridX, gridY, this.scene);
                this.setState({
                    selectedLinearElement: {
                        ...this.state.selectedLinearElement,
                        isDragging: true,
                        segmentMidPointHoveredCoords: ret.segmentMidPointHoveredCoords,
                        initialState: ret.initialState,
                    },
                });
                return;
            }
            const lastPointerCoords = this.previousPointerMoveCoords ?? pointerDownState.origin;
            this.previousPointerMoveCoords = pointerCoords;
            // We need to initialize dragOffsetXY only after we've updated
            // `state.selectedElementIds` on pointerDown. Doing it here in pointerMove
            // event handler should hopefully ensure we're already working with
            // the updated state.
            if (pointerDownState.drag.offset === null) {
                pointerDownState.drag.offset = (0, common_1.tupleToCoors)((0, element_1.getDragOffsetXY)(this.scene.getSelectedElements(this.state), pointerDownState.origin.x, pointerDownState.origin.y));
            }
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            if (this.handlePointerMoveOverScrollbars(event, pointerDownState)) {
                return;
            }
            if ((0, appState_1.isEraserActive)(this.state)) {
                this.handleEraser(event, pointerCoords);
                return;
            }
            if (this.state.activeTool.type === "laser") {
                this.laserTrails.addPointToPath(pointerCoords.x, pointerCoords.y);
            }
            const [gridX, gridY] = (0, common_1.getGridPoint)(pointerCoords.x, pointerCoords.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
            if (pointerDownState.resize.isResizing) {
                pointerDownState.lastCoords.x = pointerCoords.x;
                pointerDownState.lastCoords.y = pointerCoords.y;
                if (this.maybeHandleCrop(pointerDownState, event)) {
                    return true;
                }
                if (this.maybeHandleResize(pointerDownState, event)) {
                    return true;
                }
            }
            const elementsMap = this.scene.getNonDeletedElementsMap();
            if (this.state.selectedLinearElement) {
                const linearElementEditor = this.state.selectedLinearElement;
                // Handle focus point dragging if needed
                if (linearElementEditor.draggedFocusPointBinding) {
                    (0, element_1.handleFocusPointDrag)(linearElementEditor, elementsMap, pointerCoords, this.scene, this.state, this.getEffectiveGridSize(), event.altKey);
                    this.setState({
                        selectedLinearElement: {
                            ...linearElementEditor,
                            isDragging: false,
                            selectedPointsIndices: [],
                            initialState: {
                                ...linearElementEditor.initialState,
                                lastClickedPoint: -1,
                            },
                        },
                    });
                    return;
                }
                if (element_1.LinearElementEditor.shouldAddMidpoint(this.state.selectedLinearElement, pointerCoords, this.state, elementsMap)) {
                    const ret = element_1.LinearElementEditor.addMidpoint(this.state.selectedLinearElement, pointerCoords, this, !event[common_1.KEYS.CTRL_OR_CMD], this.scene);
                    if (!ret) {
                        return;
                    }
                    // Since we are reading from previous state which is not possible with
                    // automatic batching in React 18 hence using flush sync to synchronously
                    // update the state. Check https://github.com/excalidraw/excalidraw/pull/5508 for more details.
                    (0, react_dom_1.flushSync)(() => {
                        if (this.state.selectedLinearElement) {
                            this.setState({
                                selectedLinearElement: {
                                    ...this.state.selectedLinearElement,
                                    initialState: ret.pointerDownState,
                                    selectedPointsIndices: ret.selectedPointsIndices,
                                    segmentMidPointHoveredCoords: null,
                                },
                            });
                        }
                    });
                    return;
                }
                else if (linearElementEditor.initialState.segmentMidpoint.value !== null &&
                    !linearElementEditor.initialState.segmentMidpoint.added) {
                    return;
                }
                else if (linearElementEditor.initialState.lastClickedPoint > -1) {
                    const element = element_1.LinearElementEditor.getElement(linearElementEditor.elementId, elementsMap);
                    if (element?.isDeleted) {
                        return;
                    }
                    if ((0, element_1.isBindingElement)(element)) {
                        const hoveredElement = (0, element_1.getHoveredElementForBinding)((0, math_1.pointFrom)(pointerCoords.x, pointerCoords.y), this.scene.getNonDeletedElements(), elementsMap);
                        if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                            this.handleDelayedBindModeChange(element, hoveredElement);
                        }
                    }
                    if (event.altKey &&
                        !this.state.selectedLinearElement?.initialState
                            ?.arrowStartIsInside &&
                        (0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                        this.handleSkipBindMode();
                    }
                    // Ignore drag requests if the arrow modification already happened
                    if (linearElementEditor.initialState.lastClickedPoint === -1) {
                        return;
                    }
                    const newState = element_1.LinearElementEditor.handlePointDragging(event, this, pointerCoords.x, pointerCoords.y, linearElementEditor);
                    if (newState) {
                        pointerDownState.lastCoords.x = pointerCoords.x;
                        pointerDownState.lastCoords.y = pointerCoords.y;
                        pointerDownState.drag.hasOccurred = true;
                        // NOTE: Optimize setState calls because it
                        // affects history and performance
                        if (newState.suggestedBinding !== this.state.suggestedBinding ||
                            !(0, common_1.isShallowEqual)(newState.selectedLinearElement?.selectedPointsIndices ?? [], this.state.selectedLinearElement?.selectedPointsIndices ?? []) ||
                            newState.selectedLinearElement?.hoverPointIndex !==
                                this.state.selectedLinearElement?.hoverPointIndex ||
                            newState.selectedLinearElement?.customLineAngle !==
                                this.state.selectedLinearElement?.customLineAngle ||
                            this.state.selectedLinearElement.isDragging !==
                                newState.selectedLinearElement?.isDragging ||
                            this.state.selectedLinearElement?.initialState?.altFocusPoint !==
                                newState.selectedLinearElement?.initialState?.altFocusPoint) {
                            this.setState(newState);
                        }
                        return;
                    }
                }
            }
            const hasHitASelectedElement = pointerDownState.hit.allHitElements.some((element) => this.isASelectedElement(element));
            const isSelectingPointsInLineEditor = this.state.selectedLinearElement?.isEditing &&
                event.shiftKey &&
                this.state.selectedLinearElement.elementId ===
                    pointerDownState.hit.element?.id;
            if ((hasHitASelectedElement ||
                pointerDownState.hit.hasHitCommonBoundingBoxOfSelectedElements) &&
                !isSelectingPointsInLineEditor &&
                !pointerDownState.drag.blockDragging) {
                const selectedElements = this.scene.getSelectedElements(this.state);
                if (selectedElements.length > 0 &&
                    selectedElements.every((element) => element.locked)) {
                    return;
                }
                const selectedElementsHasAFrame = selectedElements.find((e) => (0, element_1.isFrameLikeElement)(e));
                const topLayerFrame = this.getTopLayerFrameAtSceneCoords(pointerCoords);
                const frameToHighlight = topLayerFrame && !selectedElementsHasAFrame ? topLayerFrame : null;
                // Only update the state if there is a difference
                if (this.state.frameToHighlight !== frameToHighlight) {
                    (0, react_dom_1.flushSync)(() => {
                        this.setState({ frameToHighlight });
                    });
                }
                // Marking that click was used for dragging to check
                // if elements should be deselected on pointerup
                pointerDownState.drag.hasOccurred = true;
                // prevent immediate dragging during lasso selection to avoid element displacement
                // only allow dragging if we're not in the middle of lasso selection
                // (on mobile, allow dragging if we hit an element)
                if (this.state.activeTool.type === "lasso" &&
                    this.lassoTrail.hasCurrentTrail &&
                    !(this.editorInterface.formFactor !== "desktop" &&
                        pointerDownState.hit.element) &&
                    !this.state.activeTool.fromSelection) {
                    return;
                }
                // Clear lasso trail when starting to drag selected elements with lasso tool
                // Only clear if we're actually dragging (not during lasso selection)
                if (this.state.activeTool.type === "lasso" &&
                    selectedElements.length > 0 &&
                    pointerDownState.drag.hasOccurred &&
                    !this.state.activeTool.fromSelection) {
                    this.lassoTrail.endPath();
                }
                // prevent dragging even if we're no longer holding cmd/ctrl otherwise
                // it would have weird results (stuff jumping all over the screen)
                // Checking for editingTextElement to avoid jump while editing on mobile #6503
                if (selectedElements.length > 0 &&
                    !pointerDownState.withCmdOrCtrl &&
                    !this.state.editingTextElement &&
                    this.state.activeEmbeddable?.state !== "active") {
                    const dragOffset = {
                        x: pointerCoords.x - pointerDownState.drag.origin.x,
                        y: pointerCoords.y - pointerDownState.drag.origin.y,
                    };
                    const originalElements = [
                        ...pointerDownState.originalElements.values(),
                    ];
                    // We only drag in one direction if shift is pressed
                    const lockDirection = event.shiftKey;
                    if (lockDirection) {
                        const distanceX = Math.abs(dragOffset.x);
                        const distanceY = Math.abs(dragOffset.y);
                        const lockX = lockDirection && distanceX < distanceY;
                        const lockY = lockDirection && distanceX > distanceY;
                        if (lockX) {
                            dragOffset.x = 0;
                        }
                        if (lockY) {
                            dragOffset.y = 0;
                        }
                    }
                    // #region move crop region
                    if (this.state.croppingElementId) {
                        const croppingElement = this.scene
                            .getNonDeletedElementsMap()
                            .get(this.state.croppingElementId);
                        if (croppingElement &&
                            (0, element_1.isImageElement)(croppingElement) &&
                            croppingElement.crop !== null &&
                            pointerDownState.hit.element === croppingElement) {
                            const crop = croppingElement.crop;
                            const image = (0, element_1.isInitializedImageElement)(croppingElement) &&
                                this.imageCache.get(croppingElement.fileId)?.image;
                            if (image && !(image instanceof Promise)) {
                                const uncroppedSize = (0, element_1.getUncroppedWidthAndHeight)(croppingElement);
                                const instantDragOffset = (0, math_1.vector)(pointerCoords.x - lastPointerCoords.x, pointerCoords.y - lastPointerCoords.y);
                                // to reduce cursor:image drift, we need to take into account
                                // the canvas image element scaling so we can accurately
                                // track the pixels on movement
                                instantDragOffset[0] *=
                                    image.naturalWidth / uncroppedSize.width;
                                instantDragOffset[1] *=
                                    image.naturalHeight / uncroppedSize.height;
                                const [x1, y1, x2, y2, cx, cy] = (0, element_1.getElementAbsoluteCoords)(croppingElement, elementsMap);
                                const topLeft = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y1), (0, math_1.pointFrom)(cx, cy), croppingElement.angle));
                                const topRight = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x2, y1), (0, math_1.pointFrom)(cx, cy), croppingElement.angle));
                                const bottomLeft = (0, math_1.vectorFromPoint)((0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), (0, math_1.pointFrom)(cx, cy), croppingElement.angle));
                                const topEdge = (0, math_1.vectorNormalize)((0, math_1.vectorSubtract)(topRight, topLeft));
                                const leftEdge = (0, math_1.vectorNormalize)((0, math_1.vectorSubtract)(bottomLeft, topLeft));
                                // project instantDrafOffset onto leftEdge and topEdge to decompose
                                const offsetVector = (0, math_1.vector)((0, math_1.vectorDot)(instantDragOffset, topEdge), (0, math_1.vectorDot)(instantDragOffset, leftEdge));
                                const nextCrop = {
                                    ...crop,
                                    x: (0, math_1.clamp)(crop.x -
                                        offsetVector[0] * Math.sign(croppingElement.scale[0]), 0, image.naturalWidth - crop.width),
                                    y: (0, math_1.clamp)(crop.y -
                                        offsetVector[1] * Math.sign(croppingElement.scale[1]), 0, image.naturalHeight - crop.height),
                                };
                                this.scene.mutateElement(croppingElement, {
                                    crop: nextCrop,
                                });
                                return;
                            }
                        }
                    }
                    // Snap cache *must* be synchronously popuplated before initial drag,
                    // otherwise the first drag even will not snap, causing a jump before
                    // it snaps to its position if previously snapped already.
                    this.maybeCacheVisibleGaps(event, selectedElements);
                    this.maybeCacheReferenceSnapPoints(event, selectedElements);
                    const { snapOffset, snapLines } = (0, snapping_1.snapDraggedElements)(originalElements, dragOffset, this, event, this.scene.getNonDeletedElementsMap());
                    this.setState({ snapLines });
                    // when we're editing the name of a frame, we want the user to be
                    // able to select and interact with the text input
                    if (!this.state.editingFrame) {
                        (0, element_1.dragSelectedElements)(pointerDownState, selectedElements, dragOffset, this.scene, snapOffset, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
                    }
                    this.setState({
                        selectedElementsAreBeingDragged: true,
                        // element is being dragged and selectionElement that was created on pointer down
                        // should be removed
                        selectionElement: null,
                    });
                    // We duplicate the selected element if alt is pressed on pointer move
                    if (event.altKey && !pointerDownState.hit.hasBeenDuplicated) {
                        // Move the currently selected elements to the top of the z index stack, and
                        // put the duplicates where the selected elements used to be.
                        // (the origin point where the dragging started)
                        pointerDownState.hit.hasBeenDuplicated = true;
                        const elements = this.scene.getElementsIncludingDeleted();
                        const hitElement = pointerDownState.hit.element;
                        const selectedElements = this.scene.getSelectedElements({
                            selectedElementIds: this.state.selectedElementIds,
                            includeBoundTextElement: true,
                            includeElementsInFrames: true,
                        });
                        if (hitElement &&
                            // hit element may not end up being selected
                            // if we're alt-dragging a common bounding box
                            // over the hit element
                            pointerDownState.hit.wasAddedToSelection &&
                            !selectedElements.find((el) => el.id === hitElement.id)) {
                            selectedElements.push(hitElement);
                        }
                        const idsOfElementsToDuplicate = new Map(selectedElements.map((el) => [el.id, el]));
                        const { duplicatedElements, duplicateElementsMap, elementsWithDuplicates, origIdToDuplicateId, } = (0, element_1.duplicateElements)({
                            type: "in-place",
                            elements,
                            appState: this.state,
                            randomizeSeed: true,
                            idsOfElementsToDuplicate,
                            overrides: ({ duplicateElement, origElement }) => {
                                return {
                                    // reset to the original element's frameId (unless we've
                                    // duplicated alongside a frame in which case we need to
                                    // keep the duplicate frame's id) so that the element
                                    // frame membership is refreshed on pointerup
                                    // NOTE this is a hacky solution and should be done
                                    // differently
                                    frameId: duplicateElement.frameId ?? origElement.frameId,
                                    seed: (0, common_1.randomInteger)(),
                                };
                            },
                        });
                        duplicatedElements.forEach((element) => {
                            pointerDownState.originalElements.set(element.id, (0, element_1.deepCopyElement)(element));
                        });
                        const mappedClonedElements = elementsWithDuplicates.map((el) => {
                            if (idsOfElementsToDuplicate.has(el.id)) {
                                const origEl = pointerDownState.originalElements.get(el.id);
                                if (origEl) {
                                    return (0, element_1.newElementWith)(el, {
                                        x: origEl.x,
                                        y: origEl.y,
                                    });
                                }
                            }
                            return el;
                        });
                        const mappedNewSceneElements = this.props.onDuplicate?.(mappedClonedElements, elements);
                        const elementsWithIndices = (0, element_1.syncMovedIndices)(mappedNewSceneElements || mappedClonedElements, (0, common_1.arrayToMap)(duplicatedElements));
                        // we need to update synchronously so as to keep pointerDownState,
                        // appState, and scene elements in sync
                        (0, react_dom_1.flushSync)(() => {
                            // swap hit element with the duplicated one
                            if (pointerDownState.hit.element) {
                                const cloneId = origIdToDuplicateId.get(pointerDownState.hit.element.id);
                                const clonedElement = cloneId && duplicateElementsMap.get(cloneId);
                                pointerDownState.hit.element = clonedElement || null;
                            }
                            // swap hit elements with the duplicated ones
                            pointerDownState.hit.allHitElements =
                                pointerDownState.hit.allHitElements.reduce((acc, origHitElement) => {
                                    const cloneId = origIdToDuplicateId.get(origHitElement.id);
                                    const clonedElement = cloneId && duplicateElementsMap.get(cloneId);
                                    if (clonedElement) {
                                        acc.push(clonedElement);
                                    }
                                    return acc;
                                }, []);
                            // update drag origin to the position at which we started
                            // the duplication so that the drag offset is correct
                            pointerDownState.drag.origin = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
                            // switch selected elements to the duplicated ones
                            this.setState((prevState) => ({
                                ...(0, element_1.getSelectionStateForElements)(duplicatedElements, this.scene.getNonDeletedElements(), prevState),
                            }));
                            this.scene.replaceAllElements(elementsWithIndices);
                            selectedElements.forEach((element) => {
                                if ((0, element_1.isBindableElement)(element) &&
                                    element.boundElements?.some((other) => other.type === "arrow")) {
                                    (0, element_1.updateBoundElements)(element, this.scene);
                                }
                            });
                            this.maybeCacheVisibleGaps(event, selectedElements, true);
                            this.maybeCacheReferenceSnapPoints(event, selectedElements, true);
                        });
                    }
                    return;
                }
            }
            if (this.state.selectionElement) {
                pointerDownState.lastCoords.x = pointerCoords.x;
                pointerDownState.lastCoords.y = pointerCoords.y;
                if (event.altKey) {
                    this.setActiveTool({ type: "lasso", fromSelection: true }, event.shiftKey);
                    this.lassoTrail.startPath(pointerDownState.origin.x, pointerDownState.origin.y, event.shiftKey);
                    this.setAppState({
                        selectionElement: null,
                    });
                    return;
                }
                this.maybeDragNewGenericElement(pointerDownState, event);
            }
            else if (this.state.activeTool.type === "lasso") {
                if (!event.altKey && this.state.activeTool.fromSelection) {
                    this.setActiveTool({ type: "selection" });
                    this.createGenericElementOnPointerDown("selection", pointerDownState);
                    pointerDownState.lastCoords.x = pointerCoords.x;
                    pointerDownState.lastCoords.y = pointerCoords.y;
                    this.maybeDragNewGenericElement(pointerDownState, event);
                    this.lassoTrail.endPath();
                }
                else {
                    this.lassoTrail.addPointToPath(pointerCoords.x, pointerCoords.y, event.shiftKey);
                }
            }
            else {
                // It is very important to read this.state within each move event,
                // otherwise we would read a stale one!
                const newElement = this.state.newElement;
                if (!newElement) {
                    return;
                }
                if (newElement.type === "freedraw") {
                    const points = newElement.points;
                    const dx = pointerCoords.x - newElement.x;
                    const dy = pointerCoords.y - newElement.y;
                    const lastPoint = points.length > 0 && points[points.length - 1];
                    const discardPoint = lastPoint && lastPoint[0] === dx && lastPoint[1] === dy;
                    if (!discardPoint) {
                        const pressures = newElement.simulatePressure
                            ? newElement.pressures
                            : [...newElement.pressures, event.pressure];
                        this.scene.mutateElement(newElement, {
                            points: [...points, (0, math_1.pointFrom)(dx, dy)],
                            pressures,
                        }, {
                            informMutation: false,
                            isDragging: false,
                        });
                        this.setState({
                            newElement,
                        });
                    }
                }
                else if ((0, element_1.isLinearElement)(newElement) && !newElement.isDeleted) {
                    pointerDownState.drag.hasOccurred = true;
                    const points = newElement.points;
                    (0, common_1.invariant)(points.length > 1, "Do not create linear elements with less than 2 points");
                    let linearElementEditor = this.state.selectedLinearElement;
                    if (!linearElementEditor) {
                        linearElementEditor = new element_1.LinearElementEditor(newElement, this.scene.getNonDeletedElementsMap());
                        linearElementEditor = {
                            ...linearElementEditor,
                            selectedPointsIndices: [1],
                            initialState: {
                                ...linearElementEditor.initialState,
                                lastClickedPoint: 1,
                            },
                        };
                    }
                    this.setState({
                        newElement,
                        ...element_1.LinearElementEditor.handlePointDragging(event, this, gridX, gridY, linearElementEditor),
                    });
                }
                else {
                    pointerDownState.lastCoords.x = pointerCoords.x;
                    pointerDownState.lastCoords.y = pointerCoords.y;
                    this.maybeDragNewGenericElement(pointerDownState, event, false);
                }
            }
            if (this.state.activeTool.type === "selection") {
                pointerDownState.boxSelection.hasOccurred = true;
                const elements = this.scene.getNonDeletedElements();
                // box-select line editor points
                if (this.state.selectedLinearElement?.isEditing) {
                    element_1.LinearElementEditor.handleBoxSelection(event, this.state, this.setState.bind(this), this.scene.getNonDeletedElementsMap());
                    // regular box-select
                }
                else {
                    let shouldReuseSelection = true;
                    if (!event.shiftKey && (0, scene_1.isSomeElementSelected)(elements, this.state)) {
                        if (pointerDownState.withCmdOrCtrl &&
                            pointerDownState.hit.element) {
                            this.setState((prevState) => (0, element_1.selectGroupsForSelectedElements)({
                                ...prevState,
                                selectedElementIds: {
                                    [pointerDownState.hit.element.id]: true,
                                },
                            }, this.scene.getNonDeletedElements(), prevState, this));
                        }
                        else {
                            shouldReuseSelection = false;
                        }
                    }
                    const elementsWithinSelection = this.state.selectionElement
                        ? (0, scene_1.getElementsWithinSelection)(elements, this.state.selectionElement, this.scene.getNonDeletedElementsMap(), false, this.state.boxSelectionMode)
                        : [];
                    this.setState((prevState) => {
                        const nextSelectedElementIds = {
                            ...(shouldReuseSelection && prevState.selectedElementIds),
                            ...elementsWithinSelection.reduce((acc, element) => {
                                acc[element.id] = true;
                                return acc;
                            }, {}),
                        };
                        if (pointerDownState.hit.element) {
                            // if using ctrl/cmd, select the hitElement only if we
                            // haven't box-selected anything else
                            if (!elementsWithinSelection.length) {
                                nextSelectedElementIds[pointerDownState.hit.element.id] = true;
                            }
                            else {
                                delete nextSelectedElementIds[pointerDownState.hit.element.id];
                            }
                        }
                        prevState = !shouldReuseSelection
                            ? { ...prevState, selectedGroupIds: {}, editingGroupId: null }
                            : prevState;
                        return {
                            ...(0, element_1.selectGroupsForSelectedElements)({
                                editingGroupId: prevState.editingGroupId,
                                selectedElementIds: nextSelectedElementIds,
                            }, this.scene.getNonDeletedElements(), prevState, this),
                            // select linear element only when we haven't box-selected anything else
                            selectedLinearElement: elementsWithinSelection.length === 1 &&
                                (0, element_1.isLinearElement)(elementsWithinSelection[0])
                                ? new element_1.LinearElementEditor(elementsWithinSelection[0], this.scene.getNonDeletedElementsMap())
                                : null,
                            showHyperlinkPopup: elementsWithinSelection.length === 1 &&
                                (elementsWithinSelection[0].link ||
                                    (0, element_1.isEmbeddableElement)(elementsWithinSelection[0]))
                                ? "info"
                                : false,
                        };
                    });
                }
            }
        });
    }
    // Returns whether the pointer move happened over either scrollbar
    handlePointerMoveOverScrollbars(event, pointerDownState) {
        if (pointerDownState.scrollbars.isOverHorizontal) {
            const x = event.clientX;
            const dx = x - pointerDownState.lastCoords.x;
            this.translateCanvas({
                scrollX: this.state.scrollX -
                    (dx * (currentScrollBars.horizontal?.deltaMultiplier || 1)) /
                        this.state.zoom.value,
            });
            pointerDownState.lastCoords.x = x;
            return true;
        }
        if (pointerDownState.scrollbars.isOverVertical) {
            const y = event.clientY;
            const dy = y - pointerDownState.lastCoords.y;
            this.translateCanvas({
                scrollY: this.state.scrollY -
                    (dy * (currentScrollBars.vertical?.deltaMultiplier || 1)) /
                        this.state.zoom.value,
            });
            pointerDownState.lastCoords.y = y;
            return true;
        }
        return false;
    }
    onPointerUpFromPointerDownHandler(pointerDownState) {
        return (0, reactUtils_1.withBatchedUpdates)((childEvent) => {
            const elementsMap = this.scene.getNonDeletedElementsMap();
            this.removePointer(childEvent);
            pointerDownState.drag.blockDragging = false;
            if (pointerDownState.eventListeners.onMove) {
                pointerDownState.eventListeners.onMove.flush();
            }
            const { newElement, resizingElement, croppingElementId, multiElement, activeTool, isResizing, isRotating, isCropping, } = this.state;
            this.setState((prevState) => ({
                isResizing: false,
                isRotating: false,
                isCropping: false,
                resizingElement: null,
                selectionElement: null,
                frameToHighlight: null,
                elementsToHighlight: null,
                cursorButton: "up",
                snapLines: (0, common_1.updateStable)(prevState.snapLines, []),
                originSnapOffset: null,
            }));
            // just in case, tool changes mid drag, always clean up
            this.lassoTrail.endPath();
            this.previousPointerMoveCoords = null;
            snapping_1.SnapCache.setReferenceSnapPoints(null);
            snapping_1.SnapCache.setVisibleGaps(null);
            this.savePointer(childEvent.clientX, childEvent.clientY, "up");
            // if current elements are still selected
            // and the pointer is just over a locked element
            // do not allow activeLockedId to be set
            const hitElements = pointerDownState.hit.allHitElements;
            const sceneCoords = (0, common_1.viewportCoordsToSceneCoords)({ clientX: childEvent.clientX, clientY: childEvent.clientY }, this.state);
            if (this.state.activeTool.type === "selection" &&
                !pointerDownState.boxSelection.hasOccurred &&
                !pointerDownState.resize.isResizing &&
                !hitElements.some((el) => this.state.selectedElementIds[el.id])) {
                const hitLockedElement = this.getElementAtPosition(sceneCoords.x, sceneCoords.y, {
                    includeLockedElements: true,
                });
                this.store.scheduleCapture();
                if (hitLockedElement?.locked) {
                    this.setState({
                        activeLockedId: hitLockedElement.groupIds.length > 0
                            ? hitLockedElement.groupIds.at(-1) || ""
                            : hitLockedElement.id,
                    });
                }
                else {
                    this.setState({
                        activeLockedId: null,
                    });
                }
            }
            else {
                this.setState({
                    activeLockedId: null,
                });
            }
            if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
                this.resetDelayedBindMode();
            }
            this.setState({
                selectedElementsAreBeingDragged: false,
                bindMode: "orbit",
            });
            if (pointerDownState.drag.hasOccurred &&
                pointerDownState.hit?.element?.id) {
                const element = elementsMap.get(pointerDownState.hit.element.id);
                if ((0, element_1.isBindableElement)(element)) {
                    // Renormalize elbow arrows when they are changed via indirect move
                    element.boundElements
                        ?.filter((e) => e.type === "arrow")
                        .map((e) => elementsMap.get(e.id))
                        .filter((e) => (0, element_1.isElbowArrow)(e))
                        .forEach((e) => {
                        !!e && this.scene.mutateElement(e, {});
                    });
                }
            }
            // Handle end of dragging a point of a linear element, might close a loop
            // and sets binding element
            if (this.state.selectedLinearElement?.isEditing &&
                !this.state.newElement &&
                this.state.selectedLinearElement.draggedFocusPointBinding === null) {
                if (!pointerDownState.boxSelection.hasOccurred &&
                    pointerDownState.hit?.element?.id !==
                        this.state.selectedLinearElement.elementId &&
                    this.state.selectedLinearElement.draggedFocusPointBinding === null) {
                    this.actionManager.executeAction(actions_1.actionFinalize);
                }
                else {
                    const editingLinearElement = element_1.LinearElementEditor.handlePointerUp(childEvent, this.state.selectedLinearElement, this.state, this.scene);
                    this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                        event: childEvent,
                        sceneCoords,
                    });
                    if (editingLinearElement !== this.state.selectedLinearElement) {
                        this.setState({
                            selectedLinearElement: editingLinearElement,
                            suggestedBinding: null,
                        });
                    }
                }
            }
            else if (this.state.selectedLinearElement) {
                // Normalize elbow arrow points, remove close parallel segments
                if (this.state.selectedLinearElement.elbowed) {
                    const element = element_1.LinearElementEditor.getElement(this.state.selectedLinearElement.elementId, this.scene.getNonDeletedElementsMap());
                    if (element) {
                        this.scene.mutateElement(element, {});
                    }
                }
                if (this.state.selectedLinearElement.draggedFocusPointBinding) {
                    (0, element_1.handleFocusPointPointerUp)(this.state.selectedLinearElement, this.scene);
                    this.setState({
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            draggedFocusPointBinding: null,
                        },
                    });
                }
                else if (pointerDownState.hit?.element?.id !==
                    this.state.selectedLinearElement.elementId) {
                    const selectedELements = this.scene.getSelectedElements(this.state);
                    // set selectedLinearElement to null if there is more than one element selected since we don't want to show linear element handles
                    if (selectedELements.length > 1) {
                        this.setState({ selectedLinearElement: null });
                    }
                }
                else if (this.state.selectedLinearElement.isDragging) {
                    this.setState({
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            isDragging: false,
                        },
                    });
                    this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                        event: childEvent,
                        sceneCoords,
                    });
                }
                if (this.state.newElement &&
                    this.state.multiElement &&
                    (0, element_1.isLinearElement)(this.state.newElement) &&
                    this.state.selectedLinearElement) {
                    const { multiElement } = this.state;
                    this.setState({
                        selectedLinearElement: {
                            ...this.state.selectedLinearElement,
                            lastCommittedPoint: multiElement.points[multiElement.points.length - 1],
                        },
                    });
                }
            }
            this.missingPointerEventCleanupEmitter.clear();
            window.removeEventListener(common_1.EVENT.POINTER_MOVE, pointerDownState.eventListeners.onMove);
            window.removeEventListener(common_1.EVENT.POINTER_UP, pointerDownState.eventListeners.onUp);
            window.removeEventListener(common_1.EVENT.KEYDOWN, pointerDownState.eventListeners.onKeyDown);
            window.removeEventListener(common_1.EVENT.KEYUP, pointerDownState.eventListeners.onKeyUp);
            this.props?.onPointerUp?.(activeTool, pointerDownState);
            this.onPointerUpEmitter.trigger(this.state.activeTool, pointerDownState, childEvent);
            if (newElement?.type === "freedraw") {
                const pointerCoords = (0, common_1.viewportCoordsToSceneCoords)(childEvent, this.state);
                const points = newElement.points;
                let dx = pointerCoords.x - newElement.x;
                let dy = pointerCoords.y - newElement.y;
                // Allows dots to avoid being flagged as infinitely small
                if (dx === points[0][0] && dy === points[0][1]) {
                    dy += 0.0001;
                    dx += 0.0001;
                }
                const pressures = newElement.simulatePressure
                    ? []
                    : [...newElement.pressures, childEvent.pressure];
                this.scene.mutateElement(newElement, {
                    points: [...points, (0, math_1.pointFrom)(dx, dy)],
                    pressures,
                });
                this.actionManager.executeAction(actions_1.actionFinalize);
                return;
            }
            if ((0, element_1.isLinearElement)(newElement)) {
                if (newElement.points.length > 1 &&
                    newElement.points[1][0] !== 0 &&
                    newElement.points[1][1] !== 0) {
                    this.store.scheduleCapture();
                }
                const pointerCoords = (0, common_1.viewportCoordsToSceneCoords)(childEvent, this.state);
                const dragDistance = (0, math_1.pointDistance)((0, math_1.pointFrom)(pointerCoords.x, pointerCoords.y), (0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y)) * this.state.zoom.value;
                if ((!pointerDownState.drag.hasOccurred ||
                    dragDistance < common_1.MINIMUM_ARROW_SIZE) &&
                    newElement &&
                    !multiElement) {
                    if (this.editorInterface.isTouchScreen) {
                        const FIXED_DELTA_X = Math.min((this.state.width * 0.7) / this.state.zoom.value, 100);
                        this.scene.mutateElement(newElement, {
                            x: newElement.x - FIXED_DELTA_X / 2,
                            points: [
                                (0, math_1.pointFrom)(0, 0),
                                (0, math_1.pointFrom)(FIXED_DELTA_X, 0),
                            ],
                        }, { informMutation: false, isDragging: false });
                        this.actionManager.executeAction(actions_1.actionFinalize);
                    }
                    else {
                        const dx = pointerCoords.x - newElement.x;
                        const dy = pointerCoords.y - newElement.y;
                        this.scene.mutateElement(newElement, {
                            points: [newElement.points[0], (0, math_1.pointFrom)(dx, dy)],
                        }, { informMutation: false, isDragging: false });
                        this.setState({
                            multiElement: newElement,
                            newElement,
                        });
                    }
                }
                else if (pointerDownState.drag.hasOccurred && !multiElement) {
                    if ((0, element_1.isLinearElement)(newElement)) {
                        this.actionManager.executeAction(actions_1.actionFinalize, "ui", {
                            event: childEvent,
                            sceneCoords,
                        });
                    }
                    this.setState({ suggestedBinding: null, startBoundElement: null });
                    if (!activeTool.locked) {
                        (0, cursor_1.resetCursor)(this.interactiveCanvas);
                        this.setState((prevState) => ({
                            newElement: null,
                            activeTool: (0, common_1.updateActiveTool)(this.state, {
                                type: this.state.preferredSelectionTool.type,
                            }),
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                                ...prevState.selectedElementIds,
                                [newElement.id]: true,
                            }, prevState),
                            selectedLinearElement: new element_1.LinearElementEditor(newElement, this.scene.getNonDeletedElementsMap()),
                        }));
                    }
                    else {
                        this.setState((prevState) => ({
                            newElement: null,
                        }));
                    }
                    // so that the scene gets rendered again to display the newly drawn linear as well
                    this.scene.triggerUpdate();
                }
                return;
            }
            if ((0, element_1.isTextElement)(newElement)) {
                const minWidth = (0, element_1.getMinTextElementWidth)((0, common_1.getFontString)({
                    fontSize: newElement.fontSize,
                    fontFamily: newElement.fontFamily,
                }), newElement.lineHeight);
                if (newElement.width < minWidth) {
                    this.scene.mutateElement(newElement, {
                        autoResize: true,
                    });
                }
                this.resetCursor();
                this.handleTextWysiwyg(newElement, {
                    isExistingElement: true,
                });
            }
            if (activeTool.type !== "selection" &&
                newElement &&
                (0, element_1.isInvisiblySmallElement)(newElement)) {
                // remove invisible element which was added in onPointerDown
                // update the store snapshot, so that invisible elements are not captured by the store
                this.updateScene({
                    elements: this.scene
                        .getElementsIncludingDeleted()
                        .filter((el) => el.id !== newElement.id),
                    appState: {
                        newElement: null,
                    },
                    captureUpdate: element_1.CaptureUpdateAction.NEVER,
                });
                return;
            }
            if ((0, element_1.isFrameLikeElement)(newElement)) {
                const elementsInsideFrame = (0, element_1.getElementsInNewFrame)(this.scene.getElementsIncludingDeleted(), newElement, this.scene.getNonDeletedElementsMap());
                this.scene.replaceAllElements((0, element_1.addElementsToFrame)(this.scene.getElementsMapIncludingDeleted(), elementsInsideFrame, newElement, this.state));
            }
            if (newElement) {
                this.scene.mutateElement(newElement, (0, element_1.getNormalizedDimensions)(newElement), {
                    informMutation: false,
                    isDragging: false,
                });
                // the above does not guarantee the scene to be rendered again, hence the trigger below
                this.scene.triggerUpdate();
            }
            if (pointerDownState.drag.hasOccurred) {
                const sceneCoords = (0, common_1.viewportCoordsToSceneCoords)(childEvent, this.state);
                // when editing the points of a linear element, we check if the
                // linear element still is in the frame afterwards
                // if not, the linear element will be removed from its frame (if any)
                if (this.state.selectedLinearElement &&
                    this.state.selectedLinearElement.isDragging) {
                    const linearElement = this.scene.getElement(this.state.selectedLinearElement.elementId);
                    if (linearElement?.frameId) {
                        const frame = (0, element_1.getContainingFrame)(linearElement, elementsMap);
                        if (frame && linearElement) {
                            if (!(0, element_1.elementOverlapsWithFrame)(linearElement, frame, this.scene.getNonDeletedElementsMap())) {
                                // remove the linear element from all groups
                                // before removing it from the frame as well
                                this.scene.mutateElement(linearElement, {
                                    groupIds: [],
                                });
                                (0, element_1.removeElementsFromFrame)([linearElement], this.scene.getNonDeletedElementsMap());
                                this.scene.triggerUpdate();
                            }
                        }
                    }
                }
                else {
                    // update the relationships between selected elements and frames
                    const topLayerFrame = this.getTopLayerFrameAtSceneCoords(sceneCoords);
                    const selectedElements = this.scene.getSelectedElements(this.state);
                    let nextElements = this.scene.getElementsMapIncludingDeleted();
                    const updateGroupIdsAfterEditingGroup = (elements) => {
                        if (elements.length > 0) {
                            for (const element of elements) {
                                const index = element.groupIds.indexOf(this.state.editingGroupId);
                                this.scene.mutateElement(element, {
                                    groupIds: element.groupIds.slice(0, index),
                                }, { informMutation: false, isDragging: false });
                            }
                            nextElements.forEach((element) => {
                                if (element.groupIds.length &&
                                    (0, element_1.getElementsInGroup)(nextElements, element.groupIds[element.groupIds.length - 1]).length < 2) {
                                    this.scene.mutateElement(element, {
                                        groupIds: [],
                                    }, { informMutation: false, isDragging: false });
                                }
                            });
                            this.setState({
                                editingGroupId: null,
                            });
                        }
                    };
                    if (topLayerFrame &&
                        !this.state.selectedElementIds[topLayerFrame.id]) {
                        const elementsToAdd = selectedElements.filter((element) => element.frameId !== topLayerFrame.id &&
                            (0, element_1.isElementInFrame)(element, nextElements, this.state));
                        if (this.state.editingGroupId) {
                            updateGroupIdsAfterEditingGroup(elementsToAdd);
                        }
                        nextElements = (0, element_1.addElementsToFrame)(nextElements, elementsToAdd, topLayerFrame, this.state);
                    }
                    else if (!topLayerFrame) {
                        if (this.state.editingGroupId) {
                            const elementsToRemove = selectedElements.filter((element) => element.frameId &&
                                !(0, element_1.isElementInFrame)(element, nextElements, this.state));
                            updateGroupIdsAfterEditingGroup(elementsToRemove);
                        }
                    }
                    nextElements = (0, element_1.updateFrameMembershipOfSelectedElements)(nextElements, this.state, this);
                    this.scene.replaceAllElements(nextElements);
                }
            }
            if (resizingElement) {
                this.store.scheduleCapture();
            }
            if (resizingElement && (0, element_1.isInvisiblySmallElement)(resizingElement)) {
                // update the store snapshot, so that invisible elements are not captured by the store
                this.updateScene({
                    elements: this.scene
                        .getElementsIncludingDeleted()
                        .filter((el) => el.id !== resizingElement.id),
                    captureUpdate: element_1.CaptureUpdateAction.NEVER,
                });
            }
            // handle frame membership for resizing frames and/or selected elements
            if (pointerDownState.resize.isResizing) {
                let nextElements = (0, element_1.updateFrameMembershipOfSelectedElements)(this.scene.getElementsIncludingDeleted(), this.state, this);
                const selectedFrames = this.scene
                    .getSelectedElements(this.state)
                    .filter((element) => (0, element_1.isFrameLikeElement)(element));
                for (const frame of selectedFrames) {
                    nextElements = (0, element_1.replaceAllElementsInFrame)(nextElements, (0, element_1.getElementsInResizingFrame)(this.scene.getElementsIncludingDeleted(), frame, this.state, elementsMap), frame, this);
                }
                this.scene.replaceAllElements(nextElements);
            }
            // Code below handles selection when element(s) weren't
            // drag or added to selection on pointer down phase.
            const hitElement = pointerDownState.hit.element;
            if (this.state.selectedLinearElement?.elementId !== hitElement?.id &&
                (0, element_1.isLinearElement)(hitElement)) {
                const selectedElements = this.scene.getSelectedElements(this.state);
                // set selectedLinearElement when no other element selected except
                // the one we've hit
                if (selectedElements.length === 1) {
                    this.setState({
                        selectedLinearElement: new element_1.LinearElementEditor(hitElement, this.scene.getNonDeletedElementsMap()),
                    });
                }
            }
            // click outside the cropping region to exit
            if (
            // not in the cropping mode at all
            !croppingElementId ||
                // in the cropping mode
                (croppingElementId &&
                    // not cropping and no hit element
                    ((!hitElement && !isCropping) ||
                        // hitting something else
                        (hitElement && hitElement.id !== croppingElementId)))) {
                this.finishImageCropping();
            }
            const pointerStart = this.lastPointerDownEvent;
            const pointerEnd = this.lastPointerUpEvent || this.lastPointerMoveEvent;
            if ((0, appState_1.isEraserActive)(this.state) && pointerStart && pointerEnd) {
                this.eraserTrail.endPath();
                const draggedDistance = (0, math_1.pointDistance)((0, math_1.pointFrom)(pointerStart.clientX, pointerStart.clientY), (0, math_1.pointFrom)(pointerEnd.clientX, pointerEnd.clientY));
                if (draggedDistance === 0) {
                    const scenePointer = (0, common_1.viewportCoordsToSceneCoords)({
                        clientX: pointerEnd.clientX,
                        clientY: pointerEnd.clientY,
                    }, this.state);
                    const hitElements = this.getElementsAtPosition(scenePointer.x, scenePointer.y);
                    hitElements.forEach((hitElement) => this.elementsPendingErasure.add(hitElement.id));
                }
                this.eraseElements();
                return;
            }
            else if (this.elementsPendingErasure.size) {
                this.restoreReadyToEraseElements();
            }
            if (hitElement &&
                !pointerDownState.drag.hasOccurred &&
                !pointerDownState.hit.wasAddedToSelection &&
                // if we're editing a line, pointerup shouldn't switch selection if
                // box selected
                (!this.state.selectedLinearElement?.isEditing ||
                    !pointerDownState.boxSelection.hasOccurred) &&
                // hitElement can be set when alt + ctrl to toggle lasso and we will
                // just respect the selected elements from lasso instead
                this.state.activeTool.type !== "lasso") {
                // when inside line editor, shift selects points instead
                if (childEvent.shiftKey &&
                    !this.state.selectedLinearElement?.isEditing) {
                    if (this.state.selectedElementIds[hitElement.id]) {
                        if ((0, element_1.isSelectedViaGroup)(this.state, hitElement)) {
                            this.setState((_prevState) => {
                                const nextSelectedElementIds = {
                                    ..._prevState.selectedElementIds,
                                };
                                // We want to unselect all groups hitElement is part of
                                // as well as all elements that are part of the groups
                                // hitElement is part of
                                for (const groupedElement of hitElement.groupIds.flatMap((groupId) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), groupId))) {
                                    delete nextSelectedElementIds[groupedElement.id];
                                }
                                return {
                                    selectedGroupIds: {
                                        ..._prevState.selectedElementIds,
                                        ...hitElement.groupIds
                                            .map((gId) => ({ [gId]: false }))
                                            .reduce((prev, acc) => ({ ...prev, ...acc }), {}),
                                    },
                                    selectedElementIds: (0, element_1.makeNextSelectedElementIds)(nextSelectedElementIds, _prevState),
                                };
                            });
                            // if not dragging a linear element point (outside editor)
                        }
                        else if (!this.state.selectedLinearElement?.isDragging) {
                            // remove element from selection while
                            // keeping prev elements selected
                            this.setState((prevState) => {
                                const newSelectedElementIds = {
                                    ...prevState.selectedElementIds,
                                };
                                delete newSelectedElementIds[hitElement.id];
                                const newSelectedElements = (0, scene_1.getSelectedElements)(this.scene.getNonDeletedElements(), { selectedElementIds: newSelectedElementIds });
                                return {
                                    ...(0, element_1.selectGroupsForSelectedElements)({
                                        editingGroupId: prevState.editingGroupId,
                                        selectedElementIds: newSelectedElementIds,
                                    }, this.scene.getNonDeletedElements(), prevState, this),
                                    // set selectedLinearElement only if thats the only element selected
                                    selectedLinearElement: newSelectedElements.length === 1 &&
                                        (0, element_1.isLinearElement)(newSelectedElements[0])
                                        ? new element_1.LinearElementEditor(newSelectedElements[0], this.scene.getNonDeletedElementsMap())
                                        : prevState.selectedLinearElement,
                                };
                            });
                        }
                    }
                    else if (hitElement.frameId &&
                        this.state.selectedElementIds[hitElement.frameId]) {
                        // when hitElement is part of a selected frame, deselect the frame
                        // to avoid frame and containing elements selected simultaneously
                        this.setState((prevState) => {
                            const nextSelectedElementIds = {
                                ...prevState.selectedElementIds,
                                [hitElement.id]: true,
                            };
                            // deselect the frame
                            delete nextSelectedElementIds[hitElement.frameId];
                            // deselect groups containing the frame
                            (this.scene.getElement(hitElement.frameId)?.groupIds ?? [])
                                .flatMap((gid) => (0, element_1.getElementsInGroup)(this.scene.getNonDeletedElements(), gid))
                                .forEach((element) => {
                                delete nextSelectedElementIds[element.id];
                            });
                            return {
                                ...(0, element_1.selectGroupsForSelectedElements)({
                                    editingGroupId: prevState.editingGroupId,
                                    selectedElementIds: nextSelectedElementIds,
                                }, this.scene.getNonDeletedElements(), prevState, this),
                                showHyperlinkPopup: hitElement.link || (0, element_1.isEmbeddableElement)(hitElement)
                                    ? "info"
                                    : false,
                            };
                        });
                    }
                    else {
                        // add element to selection while keeping prev elements selected
                        this.setState((_prevState) => ({
                            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                                ..._prevState.selectedElementIds,
                                [hitElement.id]: true,
                            }, _prevState),
                        }));
                    }
                }
                else {
                    this.setState((prevState) => ({
                        ...(0, element_1.selectGroupsForSelectedElements)({
                            editingGroupId: prevState.editingGroupId,
                            selectedElementIds: { [hitElement.id]: true },
                        }, this.scene.getNonDeletedElements(), prevState, this),
                        selectedLinearElement: (0, element_1.isLinearElement)(hitElement) &&
                            // Don't set `selectedLinearElement` if its same as the hitElement, this is mainly to prevent resetting the `hoverPointIndex` to -1.
                            // Future we should update the API to take care of setting the correct `hoverPointIndex` when initialized
                            prevState.selectedLinearElement?.elementId !== hitElement.id
                            ? new element_1.LinearElementEditor(hitElement, this.scene.getNonDeletedElementsMap())
                            : prevState.selectedLinearElement,
                    }));
                }
            }
            if (
            // do not clear selection if lasso is active
            this.state.activeTool.type !== "lasso" &&
                // not elbow midpoint dragged
                !(hitElement && (0, element_1.isElbowArrow)(hitElement)) &&
                // not dragged
                !pointerDownState.drag.hasOccurred &&
                // not resized
                !this.state.isResizing &&
                // only hitting the bounding box of the previous hit element
                ((hitElement &&
                    (0, element_1.hitElementBoundingBoxOnly)({
                        point: (0, math_1.pointFrom)(pointerDownState.origin.x, pointerDownState.origin.y),
                        element: hitElement,
                        elementsMap,
                        threshold: this.getElementHitThreshold(hitElement),
                        frameNameBound: (0, element_1.isFrameLikeElement)(hitElement)
                            ? this.frameNameBoundsCache.get(hitElement)
                            : null,
                    }, elementsMap)) ||
                    (!hitElement &&
                        pointerDownState.hit.hasHitCommonBoundingBoxOfSelectedElements))) {
                if (this.state.selectedLinearElement?.isEditing) {
                    // Exit editing mode but keep the element selected
                    this.actionManager.executeAction(actions_1.actionToggleLinearEditor);
                }
                else {
                    // Deselect selected elements
                    this.setState({
                        selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
                        selectedGroupIds: {},
                        editingGroupId: null,
                        activeEmbeddable: null,
                    });
                }
                // reset cursor
                (0, cursor_1.setCursor)(this.interactiveCanvas, common_1.CURSOR_TYPE.AUTO);
                return;
            }
            const selectedTextEditingContainer = this.getSelectedTextEditingContainerAtPosition(hitElement, sceneCoords);
            if (activeTool.type === this.state.preferredSelectionTool.type &&
                !this.state.editingTextElement &&
                !pointerDownState.drag.hasOccurred &&
                !pointerDownState.hit.wasAddedToSelection &&
                !childEvent.shiftKey &&
                !childEvent[common_1.KEYS.CTRL_OR_CMD] &&
                !childEvent.altKey &&
                childEvent.pointerType !== "touch" &&
                hitElement &&
                (((0, element_1.isTextElement)(hitElement) &&
                    this.state.selectedElementIds[hitElement.id] &&
                    this.scene.getSelectedElements(this.state).length === 1) ||
                    selectedTextEditingContainer)) {
                this.startTextEditing({
                    sceneX: sceneCoords.x,
                    sceneY: sceneCoords.y,
                    container: selectedTextEditingContainer,
                    initialCaretSceneCoords: this.lastPointerUpIsDoubleClick
                        ? undefined
                        : sceneCoords,
                });
                return;
            }
            if (!activeTool.locked && activeTool.type !== "freedraw" && newElement) {
                this.setState((prevState) => ({
                    selectedElementIds: (0, element_1.makeNextSelectedElementIds)({
                        ...prevState.selectedElementIds,
                        [newElement.id]: true,
                    }, prevState),
                    showHyperlinkPopup: (0, element_1.isEmbeddableElement)(newElement) && !newElement.link
                        ? "editor"
                        : prevState.showHyperlinkPopup,
                }));
            }
            if (activeTool.type !== "selection" ||
                (0, scene_1.isSomeElementSelected)(this.scene.getNonDeletedElements(), this.state) ||
                !(0, common_1.isShallowEqual)(this.state.previousSelectedElementIds, this.state.selectedElementIds)) {
                this.store.scheduleCapture();
            }
            if ((pointerDownState.drag.hasOccurred &&
                !this.state.selectedLinearElement) ||
                isResizing ||
                isRotating ||
                isCropping) {
                // We only allow binding via linear elements, specifically via dragging
                // the endpoints ("start" or "end").
                const linearElements = this.scene
                    .getSelectedElements(this.state)
                    .filter(element_1.isArrowElement);
                (0, element_1.bindOrUnbindBindingElements)(linearElements, this.scene, this.state);
            }
            if (activeTool.type === "laser") {
                this.laserTrails.endPath();
                return;
            }
            if (!activeTool.locked &&
                activeTool.type !== "freedraw" &&
                (activeTool.type !== "lasso" ||
                    // if lasso is turned on but from selection => reset to selection
                    (activeTool.type === "lasso" && activeTool.fromSelection))) {
                (0, cursor_1.resetCursor)(this.interactiveCanvas);
                this.setState({
                    newElement: null,
                    suggestedBinding: null,
                    activeTool: (0, common_1.updateActiveTool)(this.state, {
                        type: this.state.preferredSelectionTool.type,
                    }),
                });
            }
            else {
                this.setState({
                    newElement: null,
                    suggestedBinding: null,
                });
            }
        });
    }
    restoreReadyToEraseElements = () => {
        this.elementsPendingErasure = new Set();
        this.triggerRender();
    };
    eraseElements = () => {
        let didChange = false;
        // Binding is double accounted on both elements and if one of them is
        // deleted, the binding should be removed
        this.elementsPendingErasure.forEach((id) => {
            const element = this.scene.getElement(id);
            if ((0, element_1.isBindingElement)(element)) {
                if (element.startBinding) {
                    const bindable = this.scene.getElement(element.startBinding.elementId);
                    // NOTE: We use the raw mutateElement() because we don't want history
                    // entries or multiplayer updates
                    (0, element_1.mutateElement)(bindable, this.scene.getElementsMapIncludingDeleted(), {
                        boundElements: bindable.boundElements.filter((e) => e.id !== element.id),
                    });
                }
                if (element.endBinding) {
                    const bindable = this.scene.getElement(element.endBinding.elementId);
                    // NOTE: We use the raw mutateElement() because we don't want history
                    // entries or multiplayer updates
                    (0, element_1.mutateElement)(bindable, this.scene.getElementsMapIncludingDeleted(), {
                        boundElements: bindable.boundElements.filter((e) => e.id !== element.id),
                    });
                }
            }
            else if ((0, element_1.isBindableElement)(element)) {
                element.boundElements?.forEach((boundElement) => {
                    if (boundElement.type === "arrow") {
                        const arrow = this.scene.getElement(boundElement.id);
                        if (arrow?.startBinding?.elementId === element.id) {
                            // NOTE: We use the raw mutateElement() because we don't want history
                            // entries or multiplayer updates
                            (0, element_1.mutateElement)(arrow, this.scene.getElementsMapIncludingDeleted(), {
                                startBinding: null,
                            });
                        }
                        if (arrow?.endBinding?.elementId === element.id) {
                            // NOTE: We use the raw mutateElement() because we don't want history
                            // entries or multiplayer updates
                            (0, element_1.mutateElement)(arrow, this.scene.getElementsMapIncludingDeleted(), {
                                endBinding: null,
                            });
                        }
                    }
                });
            }
        });
        const elements = this.scene.getElementsIncludingDeleted().map((ele) => {
            if (this.elementsPendingErasure.has(ele.id) ||
                (ele.frameId && this.elementsPendingErasure.has(ele.frameId)) ||
                ((0, element_1.isBoundToContainer)(ele) &&
                    this.elementsPendingErasure.has(ele.containerId))) {
                didChange = true;
                return (0, element_1.newElementWith)(ele, { isDeleted: true });
            }
            return ele;
        });
        this.elementsPendingErasure = new Set();
        if (didChange) {
            this.store.scheduleCapture();
            this.scene.replaceAllElements(elements);
        }
    };
    initializeImage = async (placeholderImageElement, imageFile) => {
        // at this point this should be guaranteed image file, but we do this check
        // to satisfy TS down the line
        if (!(0, blob_1.isSupportedImageFile)(imageFile)) {
            throw new Error((0, i18n_1.t)("errors.unsupportedFileType"));
        }
        const mimeType = imageFile.type;
        (0, cursor_1.setCursor)(this.interactiveCanvas, "wait");
        if (mimeType === common_1.MIME_TYPES.svg) {
            try {
                imageFile = (0, blob_1.SVGStringToFile)((0, element_1.normalizeSVG)(await imageFile.text()), imageFile.name);
            }
            catch (error) {
                console.warn(error);
                throw new Error((0, i18n_1.t)("errors.svgImageInsertError"));
            }
        }
        // generate image id (by default the file digest) before any
        // resizing/compression takes place to keep it more portable
        const fileId = await (this.props.generateIdForFile?.(imageFile) || (0, blob_1.generateIdFromFile)(imageFile));
        if (!fileId) {
            console.warn("Couldn't generate file id or the supplied `generateIdForFile` didn't resolve to one.");
            throw new Error((0, i18n_1.t)("errors.imageInsertError"));
        }
        const existingFileData = this.files[fileId];
        if (!existingFileData?.dataURL) {
            try {
                imageFile = await (0, blob_1.resizeImageFile)(imageFile, {
                    maxWidthOrHeight: common_1.DEFAULT_MAX_IMAGE_WIDTH_OR_HEIGHT,
                });
            }
            catch (error) {
                console.error("Error trying to resizing image file on insertion", error);
            }
            if (imageFile.size > common_1.MAX_ALLOWED_FILE_BYTES) {
                throw new Error((0, i18n_1.t)("errors.fileTooBig", {
                    maxSize: `${Math.trunc(common_1.MAX_ALLOWED_FILE_BYTES / 1024 / 1024)}MB`,
                }));
            }
        }
        const dataURL = this.files[fileId]?.dataURL || (await (0, blob_1.getDataURL)(imageFile));
        return new Promise(async (resolve, reject) => {
            try {
                let initializedImageElement = this.getLatestInitializedImageElement(placeholderImageElement, fileId);
                this.addMissingFiles([
                    {
                        mimeType,
                        id: fileId,
                        dataURL,
                        created: Date.now(),
                        lastRetrieved: Date.now(),
                    },
                ]);
                if (!this.imageCache.get(fileId)) {
                    this.addNewImagesToImageCache();
                    const { erroredFiles } = await this.updateImageCache([
                        initializedImageElement,
                    ]);
                    if (erroredFiles.size) {
                        throw new Error("Image cache update resulted with an error.");
                    }
                }
                const imageHTML = await this.imageCache.get(fileId)?.image;
                if (imageHTML &&
                    this.state.newElement?.id !== initializedImageElement.id) {
                    initializedImageElement = this.getLatestInitializedImageElement(placeholderImageElement, fileId);
                    const naturalDimensions = this.getImageNaturalDimensions(initializedImageElement, imageHTML);
                    // no need to create a new instance anymore, just assign the natural dimensions
                    Object.assign(initializedImageElement, naturalDimensions);
                }
                resolve(initializedImageElement);
            }
            catch (error) {
                console.error(error);
                reject(new Error((0, i18n_1.t)("errors.imageInsertError")));
            }
        });
    };
    /**
     * use during async image initialization,
     * when the placeholder image could have been modified in the meantime,
     * and when you don't want to loose those modifications
     */
    getLatestInitializedImageElement = (imagePlaceholder, fileId) => {
        const latestImageElement = this.scene.getElement(imagePlaceholder.id) ?? imagePlaceholder;
        return (0, element_1.newElementWith)(latestImageElement, {
            fileId,
        });
    };
    onImageToolbarButtonClick = async () => {
        try {
            const clientX = this.state.width / 2 + this.state.offsetLeft;
            const clientY = this.state.height / 2 + this.state.offsetTop;
            const { x, y } = (0, common_1.viewportCoordsToSceneCoords)({ clientX, clientY }, this.state);
            const imageFiles = await (0, filesystem_1.fileOpen)({
                description: "Image",
                extensions: Object.keys(common_1.IMAGE_MIME_TYPES),
                multiple: true,
            });
            this.insertImages(imageFiles, x, y);
        }
        catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
            else {
                console.warn(error);
            }
            this.setState({
                newElement: null,
                activeTool: (0, common_1.updateActiveTool)(this.state, {
                    type: this.state.preferredSelectionTool.type,
                }),
            }, () => {
                this.actionManager.executeAction(actions_1.actionFinalize);
            });
        }
    };
    getImageNaturalDimensions = (imageElement, imageHTML) => {
        const minHeight = Math.max(this.state.height - 120, 160);
        // max 65% of canvas height, clamped to <300px, vh - 120px>
        const maxHeight = Math.min(minHeight, Math.floor(this.state.height * 0.5) / this.state.zoom.value);
        const height = Math.min(imageHTML.naturalHeight, maxHeight);
        const width = height * (imageHTML.naturalWidth / imageHTML.naturalHeight);
        // add current imageElement width/height to account for previous centering
        // of the placeholder image
        const x = imageElement.x + imageElement.width / 2 - width / 2;
        const y = imageElement.y + imageElement.height / 2 - height / 2;
        return {
            x,
            y,
            width,
            height,
            crop: null,
        };
    };
    /** updates image cache, refreshing updated elements and/or setting status
        to error for images that fail during <img> element creation */
    updateImageCache = async (elements, files = this.files) => {
        const { updatedFiles, erroredFiles } = await (0, element_1.updateImageCache)({
            imageCache: this.imageCache,
            fileIds: elements.map((element) => element.fileId),
            files,
        });
        if (erroredFiles.size) {
            this.store.scheduleAction(element_1.CaptureUpdateAction.NEVER);
            this.scene.replaceAllElements(this.scene.getElementsIncludingDeleted().map((element) => {
                if ((0, element_1.isInitializedImageElement)(element) &&
                    erroredFiles.has(element.fileId)) {
                    return (0, element_1.newElementWith)(element, {
                        status: "error",
                    });
                }
                return element;
            }));
        }
        return { updatedFiles, erroredFiles };
    };
    /** adds new images to imageCache and re-renders if needed */
    addNewImagesToImageCache = async (imageElements = (0, element_1.getInitializedImageElements)(this.scene.getNonDeletedElements()), files = this.files) => {
        const uncachedImageElements = imageElements.filter((element) => !element.isDeleted && !this.imageCache.has(element.fileId));
        if (uncachedImageElements.length) {
            const { updatedFiles } = await this.updateImageCache(uncachedImageElements, files);
            if (updatedFiles.size) {
                for (const element of uncachedImageElements) {
                    if (updatedFiles.has(element.fileId)) {
                        element_1.ShapeCache.delete(element);
                    }
                }
            }
            if (updatedFiles.size) {
                this.scene.triggerUpdate();
            }
        }
    };
    /** generally you should use `addNewImagesToImageCache()` directly if you need
     *  to render new images. This is just a failsafe  */
    scheduleImageRefresh = (0, lodash_throttle_1.default)(() => {
        this.addNewImagesToImageCache();
    }, common_1.IMAGE_RENDER_TIMEOUT);
    clearSelection(hitElement) {
        this.setState((prevState) => ({
            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, prevState),
            activeEmbeddable: null,
            selectedGroupIds: {},
            // Continue editing the same group if the user selected a different
            // element from it
            editingGroupId: prevState.editingGroupId &&
                hitElement != null &&
                (0, element_1.isElementInGroup)(hitElement, prevState.editingGroupId)
                ? prevState.editingGroupId
                : null,
        }));
        this.setState({
            selectedElementIds: (0, element_1.makeNextSelectedElementIds)({}, this.state),
            activeEmbeddable: null,
            previousSelectedElementIds: this.state.selectedElementIds,
            selectedLinearElement: null,
        });
    }
    handleInteractiveCanvasRef = (canvas) => {
        // canvas is null when unmounting
        if (canvas !== null) {
            this.interactiveCanvas = canvas;
            // -----------------------------------------------------------------------
            // NOTE wheel, touchstart, touchend events must be registered outside
            // of react because react binds them them passively (so we can't prevent
            // default on them)
            this.interactiveCanvas.addEventListener(common_1.EVENT.TOUCH_START, this.onTouchStart, { passive: false });
            this.interactiveCanvas.addEventListener(common_1.EVENT.TOUCH_END, this.onTouchEnd);
            // -----------------------------------------------------------------------
        }
        else {
            this.interactiveCanvas?.removeEventListener(common_1.EVENT.TOUCH_START, this.onTouchStart);
            this.interactiveCanvas?.removeEventListener(common_1.EVENT.TOUCH_END, this.onTouchEnd);
        }
    };
    insertImages = async (imageFiles, sceneX, sceneY) => {
        const gridPadding = 50 / this.state.zoom.value;
        // Create, position, and insert placeholders
        const placeholders = (0, element_1.positionElementsOnGrid)(imageFiles.map(() => this.newImagePlaceholder({ sceneX, sceneY })), sceneX, sceneY, gridPadding);
        placeholders.forEach((el) => this.scene.insertElement(el));
        // Create, position, insert and select initialized (replacing placeholders)
        const initialized = await Promise.all(placeholders.map(async (placeholder, i) => {
            try {
                return await this.initializeImage(placeholder, await (0, blob_1.normalizeFile)(imageFiles[i]));
            }
            catch (error) {
                this.setState({
                    errorMessage: error.message || (0, i18n_1.t)("errors.imageInsertError"),
                });
                return (0, element_1.newElementWith)(placeholder, { isDeleted: true });
            }
        }));
        const initializedMap = (0, common_1.arrayToMap)(initialized);
        const positioned = (0, element_1.positionElementsOnGrid)(initialized.filter((el) => !el.isDeleted), sceneX, sceneY, gridPadding);
        const positionedMap = (0, common_1.arrayToMap)(positioned);
        const nextElements = this.scene
            .getElementsIncludingDeleted()
            .map((el) => positionedMap.get(el.id) ?? initializedMap.get(el.id) ?? el);
        this.updateScene({
            appState: {
                selectedElementIds: (0, element_1.makeNextSelectedElementIds)(Object.fromEntries(positioned.map((el) => [el.id, true])), this.state),
            },
            elements: nextElements,
            captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
        });
        this.setState({}, () => {
            // actionFinalize after all state values have been updated
            this.actionManager.executeAction(actions_1.actionFinalize);
        });
    };
    handleAppOnDrop = async (event) => {
        const { x: sceneX, y: sceneY } = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        const dataTransferList = await (0, clipboard_1.parseDataTransferEvent)(event);
        // must be retrieved first, in the same frame
        const fileItems = dataTransferList.getFiles();
        if (fileItems.length === 1) {
            const { file, fileHandle } = fileItems[0];
            if (file &&
                (file.type === common_1.MIME_TYPES.png || file.type === common_1.MIME_TYPES.svg)) {
                try {
                    const scene = await (0, data_1.loadFromBlob)(file, this.state, this.scene.getElementsIncludingDeleted(), fileHandle);
                    this.syncActionResult({
                        ...scene,
                        appState: {
                            ...(scene.appState || this.state),
                            isLoading: false,
                        },
                        replaceFiles: true,
                        captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                    });
                    return;
                }
                catch (error) {
                    if (error.name !== "EncodingError") {
                        throw new Error((0, i18n_1.t)("alerts.couldNotLoadInvalidFile"));
                    }
                    // if EncodingError, fall through to insert as regular image
                }
            }
        }
        const imageFiles = fileItems
            .map((data) => data.file)
            .filter((file) => (0, blob_1.isSupportedImageFile)(file));
        if (imageFiles.length > 0 && this.isToolSupported("image")) {
            return this.insertImages(imageFiles, sceneX, sceneY);
        }
        const excalidrawLibrary_ids = dataTransferList.getData(common_1.MIME_TYPES.excalidrawlibIds);
        const excalidrawLibrary_data = dataTransferList.getData(common_1.MIME_TYPES.excalidrawlib);
        if (excalidrawLibrary_ids || excalidrawLibrary_data) {
            try {
                let libraryItems = null;
                if (excalidrawLibrary_ids) {
                    const { itemIds } = JSON.parse(excalidrawLibrary_ids);
                    const allLibraryItems = await this.library.getLatestLibrary();
                    libraryItems = allLibraryItems.filter((item) => itemIds.includes(item.id));
                    // legacy library dataTransfer format
                }
                else if (excalidrawLibrary_data) {
                    libraryItems = (0, blob_1.parseLibraryJSON)(excalidrawLibrary_data);
                }
                if (libraryItems?.length) {
                    libraryItems = libraryItems.map((item) => ({
                        ...item,
                        // #6465
                        elements: (0, element_1.duplicateElements)({
                            type: "everything",
                            elements: item.elements,
                            randomizeSeed: true,
                        }).duplicatedElements,
                    }));
                    this.addElementsFromPasteOrLibrary({
                        elements: (0, library_1.distributeLibraryItemsOnSquareGrid)(libraryItems),
                        position: event,
                        files: null,
                    });
                }
            }
            catch (error) {
                this.setState({ errorMessage: error.message });
            }
            return;
        }
        if (fileItems.length > 0) {
            const { file, fileHandle } = fileItems[0];
            if (file) {
                // Attempt to parse an excalidraw/excalidrawlib file
                await this.loadFileToCanvas(file, fileHandle);
            }
        }
        const textItem = dataTransferList.findByType(common_1.MIME_TYPES.text);
        if (textItem) {
            const text = textItem.value;
            if (text &&
                (0, element_1.embeddableURLValidator)(text, this.props.validateEmbeddable) &&
                (/^(http|https):\/\/[^\s/$.?#].[^\s]*$/.test(text) ||
                    (0, element_1.getEmbedLink)(text)?.type === "video")) {
                const embeddable = this.insertEmbeddableElement({
                    sceneX,
                    sceneY,
                    link: (0, common_1.normalizeLink)(text),
                });
                if (embeddable) {
                    this.store.scheduleCapture();
                    this.setState({ selectedElementIds: { [embeddable.id]: true } });
                }
            }
        }
    };
    loadFileToCanvas = async (file, fileHandle) => {
        file = await (0, blob_1.normalizeFile)(file);
        try {
            const elements = this.scene.getElementsIncludingDeleted();
            let ret;
            try {
                ret = await (0, blob_1.loadSceneOrLibraryFromBlob)(file, this.state, elements, fileHandle);
            }
            catch (error) {
                const imageSceneDataError = error instanceof errors_1.ImageSceneDataError;
                if (imageSceneDataError &&
                    error.code === "IMAGE_NOT_CONTAINS_SCENE_DATA" &&
                    !this.isToolSupported("image")) {
                    this.setState({
                        isLoading: false,
                        errorMessage: (0, i18n_1.t)("errors.imageToolNotSupported"),
                    });
                    return;
                }
                const errorMessage = imageSceneDataError
                    ? (0, i18n_1.t)("alerts.cannotRestoreFromImage")
                    : (0, i18n_1.t)("alerts.couldNotLoadInvalidFile");
                this.setState({
                    isLoading: false,
                    errorMessage,
                });
            }
            if (!ret) {
                return;
            }
            if (ret.type === common_1.MIME_TYPES.excalidraw) {
                // restore the fractional indices by mutating elements
                (0, element_1.syncInvalidIndices)(elements.concat(ret.data.elements));
                // don't capture and only update the store snapshot for old elements,
                // otherwise we would end up with duplicated fractional indices on undo
                this.store.scheduleMicroAction({
                    action: element_1.CaptureUpdateAction.NEVER,
                    elements,
                    appState: undefined,
                });
                this.setState({ isLoading: true });
                this.syncActionResult({
                    ...ret.data,
                    appState: {
                        ...(ret.data.appState || this.state),
                        isLoading: false,
                    },
                    replaceFiles: true,
                    captureUpdate: element_1.CaptureUpdateAction.IMMEDIATELY,
                });
            }
            else if (ret.type === common_1.MIME_TYPES.excalidrawlib) {
                await this.library
                    .updateLibrary({
                    libraryItems: file,
                    merge: true,
                    openLibraryMenu: true,
                })
                    .catch((error) => {
                    console.error(error);
                    this.setState({ errorMessage: (0, i18n_1.t)("errors.importLibraryError") });
                });
            }
        }
        catch (error) {
            this.setState({ isLoading: false, errorMessage: error.message });
        }
    };
    handleCanvasContextMenu = (event) => {
        event.preventDefault();
        if ((("pointerType" in event.nativeEvent &&
            event.nativeEvent.pointerType === "touch") ||
            ("pointerType" in event.nativeEvent &&
                event.nativeEvent.pointerType === "pen" &&
                // always allow if user uses a pen secondary button
                event.button !== common_1.POINTER_BUTTON.SECONDARY)) &&
            this.state.activeTool.type !== this.state.preferredSelectionTool.type) {
            return;
        }
        const { x, y } = (0, common_1.viewportCoordsToSceneCoords)(event, this.state);
        const element = this.getElementAtPosition(x, y, {
            preferSelected: true,
            includeLockedElements: true,
        });
        const selectedElements = this.scene.getSelectedElements(this.state);
        const isHittingCommonBoundBox = this.isHittingCommonBoundingBoxOfSelectedElements({ x, y }, selectedElements);
        const type = element || isHittingCommonBoundBox ? "element" : "canvas";
        const container = this.excalidrawContainerRef.current;
        const { top: offsetTop, left: offsetLeft } = container.getBoundingClientRect();
        const left = event.clientX - offsetLeft;
        const top = event.clientY - offsetTop;
        (0, analytics_1.trackEvent)("contextMenu", "openContextMenu", type);
        this.setState({
            ...(element && !this.state.selectedElementIds[element.id]
                ? {
                    ...this.state,
                    ...(0, element_1.selectGroupsForSelectedElements)({
                        editingGroupId: this.state.editingGroupId,
                        selectedElementIds: { [element.id]: true },
                    }, this.scene.getNonDeletedElements(), this.state, this),
                    selectedLinearElement: (0, element_1.isLinearElement)(element)
                        ? new element_1.LinearElementEditor(element, this.scene.getNonDeletedElementsMap())
                        : null,
                }
                : this.state),
            showHyperlinkPopup: false,
        }, () => {
            this.setState({
                contextMenu: { top, left, items: this.getContextMenuItems(type) },
            });
        });
    };
    maybeDragNewGenericElement = (pointerDownState, event, informMutation = true) => {
        const selectionElement = this.state.selectionElement;
        const pointerCoords = pointerDownState.lastCoords;
        if (selectionElement &&
            pointerDownState.boxSelection.hasOccurred &&
            this.state.activeTool.type !== "eraser") {
            (0, element_1.dragNewElement)({
                newElement: selectionElement,
                elementType: this.state.activeTool.type,
                originX: pointerDownState.origin.x,
                originY: pointerDownState.origin.y,
                x: pointerCoords.x,
                y: pointerCoords.y,
                width: (0, common_1.distance)(pointerDownState.origin.x, pointerCoords.x),
                height: (0, common_1.distance)(pointerDownState.origin.y, pointerCoords.y),
                shouldMaintainAspectRatio: (0, common_1.shouldMaintainAspectRatio)(event),
                shouldResizeFromCenter: false,
                scene: this.scene,
                zoom: this.state.zoom.value,
                informMutation: false,
            });
            return;
        }
        const newElement = this.state.newElement;
        if (!newElement) {
            return;
        }
        let [gridX, gridY] = (0, common_1.getGridPoint)(pointerCoords.x, pointerCoords.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
        const image = (0, element_1.isInitializedImageElement)(newElement) &&
            this.imageCache.get(newElement.fileId)?.image;
        const aspectRatio = image && !(image instanceof Promise) ? image.width / image.height : null;
        this.maybeCacheReferenceSnapPoints(event, [newElement]);
        const { snapOffset, snapLines } = (0, snapping_1.snapNewElement)(newElement, this, event, {
            x: pointerDownState.originInGrid.x +
                (this.state.originSnapOffset?.x ?? 0),
            y: pointerDownState.originInGrid.y +
                (this.state.originSnapOffset?.y ?? 0),
        }, {
            x: gridX - pointerDownState.originInGrid.x,
            y: gridY - pointerDownState.originInGrid.y,
        }, this.scene.getNonDeletedElementsMap());
        gridX += snapOffset.x;
        gridY += snapOffset.y;
        this.setState({
            snapLines,
        });
        if (!(0, element_1.isBindingElement)(newElement)) {
            (0, element_1.dragNewElement)({
                newElement,
                elementType: this.state.activeTool.type,
                originX: pointerDownState.originInGrid.x,
                originY: pointerDownState.originInGrid.y,
                x: gridX,
                y: gridY,
                width: (0, common_1.distance)(pointerDownState.originInGrid.x, gridX),
                height: (0, common_1.distance)(pointerDownState.originInGrid.y, gridY),
                shouldMaintainAspectRatio: (0, element_1.isImageElement)(newElement)
                    ? !(0, common_1.shouldMaintainAspectRatio)(event)
                    : (0, common_1.shouldMaintainAspectRatio)(event),
                shouldResizeFromCenter: (0, common_1.shouldResizeFromCenter)(event),
                zoom: this.state.zoom.value,
                scene: this.scene,
                widthAspectRatio: aspectRatio,
                originOffset: this.state.originSnapOffset,
                informMutation,
            });
        }
        this.setState({
            newElement,
        });
        // highlight elements that are to be added to frames on frames creation
        if (this.state.activeTool.type === common_1.TOOL_TYPE.frame ||
            this.state.activeTool.type === common_1.TOOL_TYPE.magicframe) {
            this.setState({
                elementsToHighlight: (0, element_1.getElementsInResizingFrame)(this.scene.getNonDeletedElements(), newElement, this.state, this.scene.getNonDeletedElementsMap()),
            });
        }
    };
    maybeHandleCrop = (pointerDownState, event) => {
        // to crop, we must already be in the cropping mode, where croppingElement has been set
        if (!this.state.croppingElementId) {
            return false;
        }
        const transformHandleType = pointerDownState.resize.handleType;
        const pointerCoords = pointerDownState.lastCoords;
        const [x, y] = (0, common_1.getGridPoint)(pointerCoords.x - pointerDownState.resize.offset.x, pointerCoords.y - pointerDownState.resize.offset.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
        const croppingElement = this.scene
            .getNonDeletedElementsMap()
            .get(this.state.croppingElementId);
        if (transformHandleType &&
            croppingElement &&
            (0, element_1.isImageElement)(croppingElement)) {
            const croppingAtStateStart = pointerDownState.originalElements.get(croppingElement.id);
            const image = (0, element_1.isInitializedImageElement)(croppingElement) &&
                this.imageCache.get(croppingElement.fileId)?.image;
            if (croppingAtStateStart &&
                (0, element_1.isImageElement)(croppingAtStateStart) &&
                image &&
                !(image instanceof Promise)) {
                const [gridX, gridY] = (0, common_1.getGridPoint)(pointerCoords.x, pointerCoords.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
                const dragOffset = {
                    x: gridX - pointerDownState.originInGrid.x,
                    y: gridY - pointerDownState.originInGrid.y,
                };
                this.maybeCacheReferenceSnapPoints(event, [croppingElement]);
                const { snapOffset, snapLines } = (0, snapping_1.snapResizingElements)([croppingElement], [croppingAtStateStart], this, event, dragOffset, transformHandleType);
                this.scene.mutateElement(croppingElement, (0, element_1.cropElement)(croppingElement, this.scene.getNonDeletedElementsMap(), transformHandleType, image.naturalWidth, image.naturalHeight, x + snapOffset.x, y + snapOffset.y, event.shiftKey
                    ? croppingAtStateStart.width / croppingAtStateStart.height
                    : undefined));
                (0, element_1.updateBoundElements)(croppingElement, this.scene);
                this.setState({
                    isCropping: transformHandleType && transformHandleType !== "rotation",
                    snapLines,
                });
            }
            return true;
        }
        return false;
    };
    maybeHandleResize = (pointerDownState, event) => {
        const selectedElements = this.scene.getSelectedElements(this.state);
        const selectedFrames = selectedElements.filter((element) => (0, element_1.isFrameLikeElement)(element));
        const transformHandleType = pointerDownState.resize.handleType;
        if (
        // Frames cannot be rotated.
        (selectedFrames.length > 0 && transformHandleType === "rotation") ||
            // Elbow arrows cannot be transformed (resized or rotated).
            (selectedElements.length === 1 && (0, element_1.isElbowArrow)(selectedElements[0])) ||
            // Do not resize when in crop mode
            this.state.croppingElementId) {
            return false;
        }
        this.setState({
            // TODO: rename this state field to "isScaling" to distinguish
            // it from the generic "isResizing" which includes scaling and
            // rotating
            isResizing: transformHandleType && transformHandleType !== "rotation",
            isRotating: transformHandleType === "rotation",
            activeEmbeddable: null,
        });
        const pointerCoords = pointerDownState.lastCoords;
        let [resizeX, resizeY] = (0, common_1.getGridPoint)(pointerCoords.x - pointerDownState.resize.offset.x, pointerCoords.y - pointerDownState.resize.offset.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
        const frameElementsOffsetsMap = new Map();
        selectedFrames.forEach((frame) => {
            const elementsInFrame = (0, element_1.getFrameChildren)(this.scene.getNonDeletedElements(), frame.id);
            elementsInFrame.forEach((element) => {
                frameElementsOffsetsMap.set(frame.id + element.id, {
                    x: element.x - frame.x,
                    y: element.y - frame.y,
                });
            });
        });
        // check needed for avoiding flickering when a key gets pressed
        // during dragging
        if (!this.state.selectedElementsAreBeingDragged) {
            const [gridX, gridY] = (0, common_1.getGridPoint)(pointerCoords.x, pointerCoords.y, event[common_1.KEYS.CTRL_OR_CMD] ? null : this.getEffectiveGridSize());
            const dragOffset = {
                x: gridX - pointerDownState.originInGrid.x,
                y: gridY - pointerDownState.originInGrid.y,
            };
            const originalElements = [...pointerDownState.originalElements.values()];
            this.maybeCacheReferenceSnapPoints(event, selectedElements);
            const { snapOffset, snapLines } = (0, snapping_1.snapResizingElements)(selectedElements, (0, scene_1.getSelectedElements)(originalElements, this.state), this, event, dragOffset, transformHandleType);
            resizeX += snapOffset.x;
            resizeY += snapOffset.y;
            this.setState({
                snapLines,
            });
        }
        if ((0, element_1.transformElements)(pointerDownState.originalElements, transformHandleType, selectedElements, this.scene, (0, common_1.shouldRotateWithDiscreteAngle)(event), (0, common_1.shouldResizeFromCenter)(event), selectedElements.some((element) => (0, element_1.isImageElement)(element))
            ? !(0, common_1.shouldMaintainAspectRatio)(event)
            : (0, common_1.shouldMaintainAspectRatio)(event), resizeX, resizeY, pointerDownState.resize.center.x, pointerDownState.resize.center.y)) {
            const elementsToHighlight = new Set();
            selectedFrames.forEach((frame) => {
                (0, element_1.getElementsInResizingFrame)(this.scene.getNonDeletedElements(), frame, this.state, this.scene.getNonDeletedElementsMap()).forEach((element) => elementsToHighlight.add(element));
            });
            this.setState({
                elementsToHighlight: [...elementsToHighlight],
            });
            return true;
        }
        return false;
    };
    getContextMenuItems = (type) => {
        const options = [];
        options.push(actions_1.actionCopyAsPng, actions_1.actionCopyAsSvg);
        // canvas contextMenu
        // -------------------------------------------------------------------------
        if (type === "canvas") {
            if (this.state.viewModeEnabled) {
                return [
                    ...options,
                    actions_1.actionToggleGridMode,
                    actions_1.actionToggleZenMode,
                    actionToggleViewMode_1.actionToggleViewMode,
                    actions_1.actionToggleStats,
                ];
            }
            return [
                actionClipboard_1.actionPaste,
                ContextMenu_1.CONTEXT_MENU_SEPARATOR,
                actions_1.actionCopyAsPng,
                actions_1.actionCopyAsSvg,
                actions_1.copyText,
                ContextMenu_1.CONTEXT_MENU_SEPARATOR,
                actions_1.actionSelectAll,
                actionElementLock_1.actionUnlockAllElements,
                ContextMenu_1.CONTEXT_MENU_SEPARATOR,
                actions_1.actionToggleGridMode,
                actions_1.actionToggleObjectsSnapMode,
                actions_1.actionToggleArrowBinding,
                actions_1.actionToggleMidpointSnapping,
                actions_1.actionToggleZenMode,
                actionToggleViewMode_1.actionToggleViewMode,
                actions_1.actionToggleStats,
            ];
        }
        // element contextMenu
        // -------------------------------------------------------------------------
        options.push(actions_1.copyText);
        if (this.state.viewModeEnabled) {
            return [actions_1.actionCopy, ...options];
        }
        const zIndexActions = this.editorInterface.formFactor === "desktop"
            ? [
                ContextMenu_1.CONTEXT_MENU_SEPARATOR,
                actions_1.actionSendBackward,
                actions_1.actionBringForward,
                actions_1.actionSendToBack,
                actions_1.actionBringToFront,
            ]
            : [];
        return [
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionCut,
            actions_1.actionCopy,
            actionClipboard_1.actionPaste,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actionFrame_1.actionSelectAllElementsInFrame,
            actionFrame_1.actionRemoveAllElementsFromFrame,
            actionFrame_1.actionWrapSelectionInFrame,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionToggleCropEditor,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            ...options,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionCopyStyles,
            actions_1.actionPasteStyles,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionGroup,
            actionTextAutoResize_1.actionTextAutoResize,
            actions_1.actionUnbindText,
            actions_1.actionBindText,
            actionBoundText_1.actionWrapTextInContainer,
            actions_1.actionUngroup,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionAddToLibrary,
            ...zIndexActions,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionFlipHorizontal,
            actions_1.actionFlipVertical,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionToggleLinearEditor,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionLink,
            actionElementLink_1.actionCopyElementLink,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionDuplicateSelection,
            actions_1.actionToggleElementLock,
            ContextMenu_1.CONTEXT_MENU_SEPARATOR,
            actions_1.actionDeleteSelected,
        ];
    };
    handleWheel = (0, reactUtils_1.withBatchedUpdates)((event) => {
        if (!(event.target instanceof HTMLCanvasElement ||
            event.target instanceof HTMLTextAreaElement ||
            event.target instanceof HTMLIFrameElement ||
            (event.target instanceof HTMLElement &&
                event.target.classList.contains(common_1.CLASSES.FRAME_NAME)))) {
            // prevent zooming the browser (but allow scrolling DOM)
            if (event[common_1.KEYS.CTRL_OR_CMD]) {
                event.preventDefault();
            }
            return;
        }
        event.preventDefault();
        if (isPanning) {
            return;
        }
        const { deltaX, deltaY } = event;
        // note that event.ctrlKey is necessary to handle pinch zooming
        if (event.metaKey || event.ctrlKey) {
            const sign = Math.sign(deltaY);
            const MAX_STEP = common_1.ZOOM_STEP * 100;
            const absDelta = Math.abs(deltaY);
            let delta = deltaY;
            if (absDelta > MAX_STEP) {
                delta = MAX_STEP * sign;
            }
            let newZoom = this.state.zoom.value - delta / 100;
            // increase zoom steps the more zoomed-in we are (applies to >100% only)
            newZoom +=
                Math.log10(Math.max(1, this.state.zoom.value)) *
                    -sign *
                    // reduced amplification for small deltas (small movements on a trackpad)
                    Math.min(1, absDelta / 20);
            this.translateCanvas((state) => ({
                ...(0, zoom_1.getStateForZoom)({
                    viewportX: this.lastViewportPosition.x,
                    viewportY: this.lastViewportPosition.y,
                    nextZoom: (0, scene_1.getNormalizedZoom)(newZoom),
                }, state),
                shouldCacheIgnoreZoom: true,
            }));
            this.resetShouldCacheIgnoreZoomDebounced();
            return;
        }
        // scroll horizontally when shift pressed
        if (event.shiftKey) {
            this.translateCanvas(({ zoom, scrollX }) => ({
                // on Mac, shift+wheel tends to result in deltaX
                scrollX: scrollX - (deltaY || deltaX) / zoom.value,
            }));
            return;
        }
        this.translateCanvas(({ zoom, scrollX, scrollY }) => ({
            scrollX: scrollX - deltaX / zoom.value,
            scrollY: scrollY - deltaY / zoom.value,
        }));
    });
    getTextWysiwygSnappedToCenterPosition(x, y, appState, container) {
        if (container) {
            let elementCenterX = container.x + container.width / 2;
            let elementCenterY = container.y + container.height / 2;
            const elementCenter = (0, element_1.getContainerCenter)(container, appState, this.scene.getNonDeletedElementsMap());
            if (elementCenter) {
                elementCenterX = elementCenter.x;
                elementCenterY = elementCenter.y;
            }
            const distanceToCenter = Math.hypot(x - elementCenterX, y - elementCenterY);
            const isSnappedToCenter = distanceToCenter < common_1.TEXT_TO_CENTER_SNAP_THRESHOLD;
            if (isSnappedToCenter) {
                const { x: viewportX, y: viewportY } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: elementCenterX, sceneY: elementCenterY }, appState);
                return { viewportX, viewportY, elementCenterX, elementCenterY };
            }
        }
    }
    savePointer = (x, y, button) => {
        if (!x || !y) {
            return;
        }
        const { x: sceneX, y: sceneY } = (0, common_1.viewportCoordsToSceneCoords)({ clientX: x, clientY: y }, this.state);
        if (isNaN(sceneX) || isNaN(sceneY)) {
            // sometimes the pointer goes off screen
        }
        const pointer = {
            x: sceneX,
            y: sceneY,
            tool: this.state.activeTool.type === "laser" ? "laser" : "pointer",
        };
        this.props.onPointerUpdate?.({
            pointer,
            button,
            pointersMap: gesture.pointers,
        });
    };
    resetShouldCacheIgnoreZoomDebounced = (0, common_1.debounce)(() => {
        if (!this.unmounted) {
            this.setState({ shouldCacheIgnoreZoom: false });
        }
    }, 300);
    updateDOMRect = (cb) => {
        if (this.excalidrawContainerRef?.current) {
            const excalidrawContainer = this.excalidrawContainerRef.current;
            const { width, height, left: offsetLeft, top: offsetTop, } = excalidrawContainer.getBoundingClientRect();
            const { width: currentWidth, height: currentHeight, offsetTop: currentOffsetTop, offsetLeft: currentOffsetLeft, } = this.state;
            if (width === currentWidth &&
                height === currentHeight &&
                offsetLeft === currentOffsetLeft &&
                offsetTop === currentOffsetTop) {
                if (cb) {
                    cb();
                }
                return;
            }
            this.setState({
                width,
                height,
                offsetLeft,
                offsetTop,
            }, () => {
                cb && cb();
            });
        }
    };
    refresh = () => {
        this.setState({ ...this.getCanvasOffsets() });
    };
    getCanvasOffsets() {
        if (this.excalidrawContainerRef?.current) {
            const excalidrawContainer = this.excalidrawContainerRef.current;
            const { left, top } = excalidrawContainer.getBoundingClientRect();
            return {
                offsetLeft: left,
                offsetTop: top,
            };
        }
        return {
            offsetLeft: 0,
            offsetTop: 0,
        };
    }
    watchState = () => { };
    async updateLanguage() {
        const currentLang = i18n_1.languages.find((lang) => lang.code === this.props.langCode) ||
            i18n_1.defaultLang;
        await (0, i18n_1.setLanguage)(currentLang);
        this.setAppState({});
    }
}
const createTestHook = () => {
    if ((0, common_1.isTestEnv)() || (0, common_1.isDevEnv)()) {
        window.h = window.h || {};
        Object.defineProperties(window.h, {
            elements: {
                configurable: true,
                get() {
                    return this.app?.scene.getElementsIncludingDeleted();
                },
                set(elements) {
                    return this.app?.scene.replaceAllElements((0, element_1.syncInvalidIndices)(elements));
                },
            },
            scene: {
                configurable: true,
                get() {
                    return this.app?.scene;
                },
            },
        });
    }
};
exports.createTestHook = createTestHook;
(0, exports.createTestHook)();
exports.default = App;
