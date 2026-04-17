"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHandToolActive = exports.isEraserActive = exports.clearAppStateForDatabase = exports.cleanAppStateForExport = exports.clearAppStateForLocalStorage = exports.getDefaultAppState = void 0;
const common_1 = require("@excalidraw/common");
const defaultExportScale = common_1.EXPORT_SCALES.includes(devicePixelRatio)
    ? devicePixelRatio
    : 1;
const getDefaultAppState = () => {
    return {
        showWelcomeScreen: false,
        theme: common_1.THEME.LIGHT,
        collaborators: new Map(),
        currentItemBackgroundColor: common_1.DEFAULT_ELEMENT_PROPS.backgroundColor,
        currentItemEndArrowhead: "arrow",
        currentItemFillStyle: common_1.DEFAULT_ELEMENT_PROPS.fillStyle,
        currentItemFontFamily: common_1.DEFAULT_FONT_FAMILY,
        currentItemFontSize: common_1.DEFAULT_FONT_SIZE,
        currentItemOpacity: common_1.DEFAULT_ELEMENT_PROPS.opacity,
        currentItemRoughness: common_1.DEFAULT_ELEMENT_PROPS.roughness,
        currentItemStartArrowhead: null,
        currentItemStrokeColor: common_1.DEFAULT_ELEMENT_PROPS.strokeColor,
        currentItemRoundness: (0, common_1.isTestEnv)() ? "sharp" : "round",
        currentItemArrowType: common_1.ARROW_TYPE.round,
        currentItemStrokeStyle: common_1.DEFAULT_ELEMENT_PROPS.strokeStyle,
        currentItemStrokeWidth: common_1.DEFAULT_ELEMENT_PROPS.strokeWidth,
        currentItemTextAlign: common_1.DEFAULT_TEXT_ALIGN,
        currentHoveredFontFamily: null,
        cursorButton: "up",
        activeEmbeddable: null,
        newElement: null,
        editingTextElement: null,
        editingGroupId: null,
        activeTool: {
            type: "selection",
            customType: null,
            locked: common_1.DEFAULT_ELEMENT_PROPS.locked,
            fromSelection: false,
            lastActiveTool: null,
        },
        preferredSelectionTool: {
            type: "selection",
            initialized: false,
        },
        penMode: false,
        penDetected: false,
        errorMessage: null,
        exportBackground: true,
        exportScale: defaultExportScale,
        exportEmbedScene: false,
        exportWithDarkMode: false,
        fileHandle: null,
        gridSize: common_1.DEFAULT_GRID_SIZE,
        gridStep: common_1.DEFAULT_GRID_STEP,
        gridModeEnabled: false,
        isBindingEnabled: true,
        bindingPreference: "enabled",
        isMidpointSnappingEnabled: true,
        defaultSidebarDockedPreference: false,
        isLoading: false,
        isResizing: false,
        isRotating: false,
        lastPointerDownWith: "mouse",
        multiElement: null,
        name: null,
        contextMenu: null,
        openMenu: null,
        openPopup: null,
        openSidebar: null,
        openDialog: null,
        previousSelectedElementIds: {},
        resizingElement: null,
        scrolledOutside: false,
        scrollX: 0,
        scrollY: 0,
        selectedElementIds: {},
        hoveredElementIds: {},
        selectedGroupIds: {},
        selectedElementsAreBeingDragged: false,
        selectionElement: null,
        shouldCacheIgnoreZoom: false,
        stats: {
            open: false,
            panels: common_1.STATS_PANELS.generalStats | common_1.STATS_PANELS.elementProperties,
        },
        startBoundElement: null,
        suggestedBinding: null,
        frameRendering: { enabled: true, clip: true, name: true, outline: true },
        frameToHighlight: null,
        editingFrame: null,
        elementsToHighlight: null,
        toast: null,
        viewBackgroundColor: common_1.COLOR_PALETTE.white,
        zenModeEnabled: false,
        zoom: {
            value: 1,
        },
        viewModeEnabled: false,
        showHyperlinkPopup: false,
        selectedLinearElement: null,
        snapLines: [],
        originSnapOffset: {
            x: 0,
            y: 0,
        },
        objectsSnapModeEnabled: false,
        userToFollow: null,
        followedBy: new Set(),
        isCropping: false,
        croppingElementId: null,
        searchMatches: null,
        lockedMultiSelections: {},
        activeLockedId: null,
        bindMode: "orbit",
        boxSelectionMode: "contain",
    };
};
exports.getDefaultAppState = getDefaultAppState;
/**
 * Config containing all AppState keys. Used to determine whether given state
 *  prop should be stripped when exporting to given storage type.
 */
const APP_STATE_STORAGE_CONF = ((config) => config)({
    showWelcomeScreen: { browser: true, export: false, server: false },
    theme: { browser: true, export: false, server: false },
    collaborators: { browser: false, export: false, server: false },
    currentItemBackgroundColor: { browser: true, export: false, server: false },
    currentItemEndArrowhead: { browser: true, export: false, server: false },
    currentItemFillStyle: { browser: true, export: false, server: false },
    currentItemFontFamily: { browser: true, export: false, server: false },
    currentItemFontSize: { browser: true, export: false, server: false },
    currentItemRoundness: {
        browser: true,
        export: false,
        server: false,
    },
    currentItemArrowType: {
        browser: true,
        export: false,
        server: false,
    },
    currentItemOpacity: { browser: true, export: false, server: false },
    currentItemRoughness: { browser: true, export: false, server: false },
    currentItemStartArrowhead: { browser: true, export: false, server: false },
    currentItemStrokeColor: { browser: true, export: false, server: false },
    currentItemStrokeStyle: { browser: true, export: false, server: false },
    currentItemStrokeWidth: { browser: true, export: false, server: false },
    currentItemTextAlign: { browser: true, export: false, server: false },
    currentHoveredFontFamily: { browser: false, export: false, server: false },
    cursorButton: { browser: true, export: false, server: false },
    activeEmbeddable: { browser: false, export: false, server: false },
    newElement: { browser: false, export: false, server: false },
    editingTextElement: { browser: false, export: false, server: false },
    editingGroupId: { browser: true, export: false, server: false },
    activeTool: { browser: true, export: false, server: false },
    preferredSelectionTool: { browser: true, export: false, server: false },
    penMode: { browser: true, export: false, server: false },
    penDetected: { browser: true, export: false, server: false },
    errorMessage: { browser: false, export: false, server: false },
    exportBackground: { browser: true, export: false, server: false },
    exportEmbedScene: { browser: true, export: false, server: false },
    exportScale: { browser: true, export: false, server: false },
    exportWithDarkMode: { browser: true, export: false, server: false },
    fileHandle: { browser: false, export: false, server: false },
    gridSize: { browser: true, export: true, server: true },
    gridStep: { browser: true, export: true, server: true },
    gridModeEnabled: { browser: true, export: true, server: true },
    height: { browser: false, export: false, server: false },
    isBindingEnabled: { browser: true, export: false, server: false },
    boxSelectionMode: { browser: true, export: false, server: false },
    bindingPreference: { browser: true, export: false, server: false },
    isMidpointSnappingEnabled: { browser: true, export: false, server: false },
    defaultSidebarDockedPreference: {
        browser: true,
        export: false,
        server: false,
    },
    isLoading: { browser: false, export: false, server: false },
    isResizing: { browser: false, export: false, server: false },
    isRotating: { browser: false, export: false, server: false },
    lastPointerDownWith: { browser: true, export: false, server: false },
    multiElement: { browser: false, export: false, server: false },
    name: { browser: true, export: false, server: false },
    offsetLeft: { browser: false, export: false, server: false },
    offsetTop: { browser: false, export: false, server: false },
    contextMenu: { browser: false, export: false, server: false },
    openMenu: { browser: true, export: false, server: false },
    openPopup: { browser: false, export: false, server: false },
    openSidebar: { browser: true, export: false, server: false },
    openDialog: { browser: false, export: false, server: false },
    previousSelectedElementIds: { browser: true, export: false, server: false },
    resizingElement: { browser: false, export: false, server: false },
    scrolledOutside: { browser: true, export: false, server: false },
    scrollX: { browser: true, export: false, server: false },
    scrollY: { browser: true, export: false, server: false },
    selectedElementIds: { browser: true, export: false, server: false },
    hoveredElementIds: { browser: false, export: false, server: false },
    selectedGroupIds: { browser: true, export: false, server: false },
    selectedElementsAreBeingDragged: {
        browser: false,
        export: false,
        server: false,
    },
    selectionElement: { browser: false, export: false, server: false },
    shouldCacheIgnoreZoom: { browser: true, export: false, server: false },
    stats: { browser: true, export: false, server: false },
    startBoundElement: { browser: false, export: false, server: false },
    suggestedBinding: { browser: false, export: false, server: false },
    frameRendering: { browser: false, export: false, server: false },
    frameToHighlight: { browser: false, export: false, server: false },
    editingFrame: { browser: false, export: false, server: false },
    elementsToHighlight: { browser: false, export: false, server: false },
    toast: { browser: false, export: false, server: false },
    viewBackgroundColor: { browser: true, export: true, server: true },
    width: { browser: false, export: false, server: false },
    zenModeEnabled: { browser: true, export: false, server: false },
    zoom: { browser: true, export: false, server: false },
    viewModeEnabled: { browser: false, export: false, server: false },
    showHyperlinkPopup: { browser: false, export: false, server: false },
    selectedLinearElement: { browser: true, export: false, server: false },
    snapLines: { browser: false, export: false, server: false },
    originSnapOffset: { browser: false, export: false, server: false },
    objectsSnapModeEnabled: { browser: true, export: false, server: false },
    userToFollow: { browser: false, export: false, server: false },
    followedBy: { browser: false, export: false, server: false },
    isCropping: { browser: false, export: false, server: false },
    croppingElementId: { browser: false, export: false, server: false },
    searchMatches: { browser: false, export: false, server: false },
    lockedMultiSelections: { browser: true, export: true, server: true },
    activeLockedId: { browser: false, export: false, server: false },
    bindMode: { browser: true, export: false, server: false },
});
const _clearAppStateForStorage = (appState, exportType) => {
    const stateForExport = {};
    for (const key of Object.keys(appState)) {
        const propConfig = APP_STATE_STORAGE_CONF[key];
        if (propConfig?.[exportType]) {
            const nextValue = appState[key];
            // https://github.com/microsoft/TypeScript/issues/31445
            stateForExport[key] = nextValue;
        }
    }
    return stateForExport;
};
const clearAppStateForLocalStorage = (appState) => {
    return _clearAppStateForStorage(appState, "browser");
};
exports.clearAppStateForLocalStorage = clearAppStateForLocalStorage;
const cleanAppStateForExport = (appState) => {
    return _clearAppStateForStorage(appState, "export");
};
exports.cleanAppStateForExport = cleanAppStateForExport;
const clearAppStateForDatabase = (appState) => {
    return _clearAppStateForStorage(appState, "server");
};
exports.clearAppStateForDatabase = clearAppStateForDatabase;
const isEraserActive = ({ activeTool, }) => activeTool.type === "eraser";
exports.isEraserActive = isEraserActive;
const isHandToolActive = ({ activeTool, }) => {
    return activeTool.type === "hand";
};
exports.isHandToolActive = isHandToolActive;
