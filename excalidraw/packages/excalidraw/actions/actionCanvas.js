"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionToggleHandTool = exports.actionToggleLassoTool = exports.actionToggleEraserTool = exports.actionToggleTheme = exports.actionZoomToFit = exports.actionZoomToFitSelection = exports.actionZoomToFitSelectionInViewport = exports.zoomToFit = exports.zoomToFitBounds = exports.actionResetZoom = exports.actionZoomOut = exports.actionZoomIn = exports.actionClearCanvas = exports.actionChangeViewBackgroundColor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const appState_1 = require("../appState");
const ColorPicker_1 = require("../components/ColorPicker/ColorPicker");
const ToolButton_1 = require("../components/ToolButton");
const Tooltip_1 = require("../components/Tooltip");
const icons_1 = require("../components/icons");
const cursor_1 = require("../cursor");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const scroll_1 = require("../scene/scroll");
const zoom_1 = require("../scene/zoom");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
exports.actionChangeViewBackgroundColor = (0, register_1.register)({
    name: "changeViewBackgroundColor",
    label: "labels.canvasBackground",
    trackEvent: false,
    predicate: (elements, appState, props, app) => {
        return (!!app.props.UIOptions.canvasActions.changeViewBackgroundColor &&
            !appState.viewModeEnabled);
    },
    perform: (_, appState, value) => {
        return {
            appState: { ...appState, ...value },
            captureUpdate: !!value?.viewBackgroundColor
                ? element_4.CaptureUpdateAction.IMMEDIATELY
                : element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, appProps, data }) => {
        // FIXME move me to src/components/mainMenu/DefaultItems.tsx
        return ((0, jsx_runtime_1.jsx)(ColorPicker_1.ColorPicker, { palette: null, topPicks: common_1.DEFAULT_CANVAS_BACKGROUND_PICKS, label: (0, i18n_1.t)("labels.canvasBackground"), type: "canvasBackground", color: appState.viewBackgroundColor, onChange: (color) => updateData({ viewBackgroundColor: color }), "data-testid": "canvas-background-picker", elements: elements, appState: appState, updateData: updateData }));
    },
});
exports.actionClearCanvas = (0, register_1.register)({
    name: "clearCanvas",
    label: "labels.clearCanvas",
    icon: icons_1.TrashIcon,
    trackEvent: { category: "canvas" },
    predicate: (elements, appState, props, app) => {
        return (!!app.props.UIOptions.canvasActions.clearCanvas &&
            !appState.viewModeEnabled &&
            appState.openDialog?.name !== "elementLinkSelector");
    },
    perform: (elements, appState, _, app) => {
        app.imageCache.clear();
        return {
            elements: elements.map((element) => (0, element_2.newElementWith)(element, { isDeleted: true })),
            appState: {
                ...(0, appState_1.getDefaultAppState)(),
                files: {},
                theme: appState.theme,
                penMode: appState.penMode,
                penDetected: appState.penDetected,
                exportBackground: appState.exportBackground,
                exportEmbedScene: appState.exportEmbedScene,
                gridSize: appState.gridSize,
                gridStep: appState.gridStep,
                gridModeEnabled: appState.gridModeEnabled,
                stats: appState.stats,
                activeTool: appState.activeTool.type === "image"
                    ? {
                        ...appState.activeTool,
                        type: app.state.preferredSelectionTool.type,
                    }
                    : appState.activeTool,
            },
            captureUpdate: element_4.CaptureUpdateAction.IMMEDIATELY,
        };
    },
});
exports.actionZoomIn = (0, register_1.register)({
    name: "zoomIn",
    label: "buttons.zoomIn",
    viewMode: true,
    icon: icons_1.ZoomInIcon,
    trackEvent: { category: "canvas" },
    perform: (_elements, appState, _, app) => {
        return {
            appState: {
                ...appState,
                ...(0, zoom_1.getStateForZoom)({
                    viewportX: appState.width / 2 + appState.offsetLeft,
                    viewportY: appState.height / 2 + appState.offsetTop,
                    nextZoom: (0, scene_1.getNormalizedZoom)(appState.zoom.value + common_1.ZOOM_STEP),
                }, appState),
                userToFollow: null,
            },
            captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", className: "zoom-in-button zoom-button", icon: icons_1.ZoomInIcon, title: `${(0, i18n_1.t)("buttons.zoomIn")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd++")}`, "aria-label": (0, i18n_1.t)("buttons.zoomIn"), disabled: appState.zoom.value >= common_1.MAX_ZOOM, onClick: () => {
            updateData(null);
        } })),
    keyTest: (event) => (event.code === common_1.CODES.EQUAL || event.code === common_1.CODES.NUM_ADD) &&
        (event[common_1.KEYS.CTRL_OR_CMD] || event.shiftKey),
});
exports.actionZoomOut = (0, register_1.register)({
    name: "zoomOut",
    label: "buttons.zoomOut",
    icon: icons_1.ZoomOutIcon,
    viewMode: true,
    trackEvent: { category: "canvas" },
    perform: (_elements, appState, _, app) => {
        return {
            appState: {
                ...appState,
                ...(0, zoom_1.getStateForZoom)({
                    viewportX: appState.width / 2 + appState.offsetLeft,
                    viewportY: appState.height / 2 + appState.offsetTop,
                    nextZoom: (0, scene_1.getNormalizedZoom)(appState.zoom.value - common_1.ZOOM_STEP),
                }, appState),
                userToFollow: null,
            },
            captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", className: "zoom-out-button zoom-button", icon: icons_1.ZoomOutIcon, title: `${(0, i18n_1.t)("buttons.zoomOut")} — ${(0, shortcut_1.getShortcutKey)("CtrlOrCmd+-")}`, "aria-label": (0, i18n_1.t)("buttons.zoomOut"), disabled: appState.zoom.value <= common_1.MIN_ZOOM, onClick: () => {
            updateData(null);
        } })),
    keyTest: (event) => (event.code === common_1.CODES.MINUS || event.code === common_1.CODES.NUM_SUBTRACT) &&
        (event[common_1.KEYS.CTRL_OR_CMD] || event.shiftKey),
});
exports.actionResetZoom = (0, register_1.register)({
    name: "resetZoom",
    label: "buttons.resetZoom",
    icon: icons_1.ZoomResetIcon,
    viewMode: true,
    trackEvent: { category: "canvas" },
    perform: (_elements, appState, _, app) => {
        return {
            appState: {
                ...appState,
                ...(0, zoom_1.getStateForZoom)({
                    viewportX: appState.width / 2 + appState.offsetLeft,
                    viewportY: appState.height / 2 + appState.offsetTop,
                    nextZoom: (0, scene_1.getNormalizedZoom)(1),
                }, appState),
                userToFollow: null,
            },
            captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ updateData, appState }) => ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: (0, i18n_1.t)("buttons.resetZoom"), style: { height: "100%" }, children: (0, jsx_runtime_1.jsxs)(ToolButton_1.ToolButton, { type: "button", className: "reset-zoom-button zoom-button", title: (0, i18n_1.t)("buttons.resetZoom"), "aria-label": (0, i18n_1.t)("buttons.resetZoom"), onClick: () => {
                updateData(null);
            }, children: [(appState.zoom.value * 100).toFixed(0), "%"] }) })),
    keyTest: (event) => (event.code === common_1.CODES.ZERO || event.code === common_1.CODES.NUM_ZERO) &&
        (event[common_1.KEYS.CTRL_OR_CMD] || event.shiftKey),
});
const zoomValueToFitBoundsOnViewport = (bounds, viewportDimensions, viewportZoomFactor = 1) => {
    const [x1, y1, x2, y2] = bounds;
    const commonBoundsWidth = x2 - x1;
    const zoomValueForWidth = viewportDimensions.width / commonBoundsWidth;
    const commonBoundsHeight = y2 - y1;
    const zoomValueForHeight = viewportDimensions.height / commonBoundsHeight;
    const smallestZoomValue = Math.min(zoomValueForWidth, zoomValueForHeight);
    const adjustedZoomValue = smallestZoomValue * (0, math_1.clamp)(viewportZoomFactor, 0.1, 1);
    return Math.min(adjustedZoomValue, 1);
};
const zoomToFitBounds = ({ bounds, appState, canvasOffsets, fitToViewport = false, viewportZoomFactor = 1, minZoom = -Infinity, maxZoom = Infinity, }) => {
    viewportZoomFactor = (0, math_1.clamp)(viewportZoomFactor, common_1.MIN_ZOOM, common_1.MAX_ZOOM);
    const [x1, y1, x2, y2] = bounds;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const canvasOffsetLeft = canvasOffsets?.left ?? 0;
    const canvasOffsetTop = canvasOffsets?.top ?? 0;
    const canvasOffsetRight = canvasOffsets?.right ?? 0;
    const canvasOffsetBottom = canvasOffsets?.bottom ?? 0;
    const effectiveCanvasWidth = appState.width - canvasOffsetLeft - canvasOffsetRight;
    const effectiveCanvasHeight = appState.height - canvasOffsetTop - canvasOffsetBottom;
    let adjustedZoomValue;
    if (fitToViewport) {
        const commonBoundsWidth = x2 - x1;
        const commonBoundsHeight = y2 - y1;
        adjustedZoomValue =
            Math.min(effectiveCanvasWidth / commonBoundsWidth, effectiveCanvasHeight / commonBoundsHeight) * viewportZoomFactor;
    }
    else {
        adjustedZoomValue = zoomValueToFitBoundsOnViewport(bounds, {
            width: effectiveCanvasWidth,
            height: effectiveCanvasHeight,
        }, viewportZoomFactor);
    }
    const newZoomValue = (0, scene_1.getNormalizedZoom)((0, math_1.clamp)((0, math_1.roundToStep)(adjustedZoomValue, common_1.ZOOM_STEP, "floor"), minZoom, maxZoom));
    const centerScroll = (0, scroll_1.centerScrollOn)({
        scenePoint: { x: centerX, y: centerY },
        viewportDimensions: {
            width: appState.width,
            height: appState.height,
        },
        offsets: canvasOffsets,
        zoom: { value: newZoomValue },
    });
    return {
        appState: {
            ...appState,
            scrollX: centerScroll.scrollX,
            scrollY: centerScroll.scrollY,
            zoom: { value: newZoomValue },
        },
        captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
    };
};
exports.zoomToFitBounds = zoomToFitBounds;
const zoomToFit = ({ canvasOffsets, targetElements, appState, fitToViewport, viewportZoomFactor, minZoom, maxZoom, }) => {
    const commonBounds = (0, element_3.getCommonBounds)((0, element_1.getNonDeletedElements)(targetElements));
    return (0, exports.zoomToFitBounds)({
        canvasOffsets,
        bounds: commonBounds,
        appState,
        fitToViewport,
        viewportZoomFactor,
        minZoom,
        maxZoom,
    });
};
exports.zoomToFit = zoomToFit;
// Note, this action differs from actionZoomToFitSelection in that it doesn't
// zoom beyond 100%. In other words, if the content is smaller than viewport
// size, it won't be zoomed in.
exports.actionZoomToFitSelectionInViewport = (0, register_1.register)({
    name: "zoomToFitSelectionInViewport",
    label: "labels.zoomToFitViewport",
    icon: icons_1.zoomAreaIcon,
    trackEvent: { category: "canvas" },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        return (0, exports.zoomToFit)({
            targetElements: selectedElements.length ? selectedElements : elements,
            appState: {
                ...appState,
                userToFollow: null,
            },
            fitToViewport: false,
            canvasOffsets: app.getEditorUIOffsets(),
        });
    },
    // NOTE shift-2 should have been assigned actionZoomToFitSelection.
    // TBD on how proceed
    keyTest: (event) => event.code === common_1.CODES.TWO &&
        event.shiftKey &&
        !event.altKey &&
        !event[common_1.KEYS.CTRL_OR_CMD],
});
exports.actionZoomToFitSelection = (0, register_1.register)({
    name: "zoomToFitSelection",
    label: "helpDialog.zoomToSelection",
    icon: icons_1.zoomAreaIcon,
    trackEvent: { category: "canvas" },
    perform: (elements, appState, _, app) => {
        const selectedElements = app.scene.getSelectedElements(appState);
        return (0, exports.zoomToFit)({
            targetElements: selectedElements.length ? selectedElements : elements,
            appState: {
                ...appState,
                userToFollow: null,
            },
            fitToViewport: true,
            canvasOffsets: app.getEditorUIOffsets(),
        });
    },
    // NOTE this action should use shift-2 per figma, alas
    keyTest: (event) => event.code === common_1.CODES.THREE &&
        event.shiftKey &&
        !event.altKey &&
        !event[common_1.KEYS.CTRL_OR_CMD],
});
exports.actionZoomToFit = (0, register_1.register)({
    name: "zoomToFit",
    label: "helpDialog.zoomToFit",
    icon: icons_1.zoomAreaIcon,
    viewMode: true,
    trackEvent: { category: "canvas" },
    perform: (elements, appState, _, app) => (0, exports.zoomToFit)({
        targetElements: elements,
        appState: {
            ...appState,
            userToFollow: null,
        },
        fitToViewport: false,
        canvasOffsets: app.getEditorUIOffsets(),
    }),
    keyTest: (event) => event.code === common_1.CODES.ONE &&
        event.shiftKey &&
        !event.altKey &&
        !event[common_1.KEYS.CTRL_OR_CMD],
});
exports.actionToggleTheme = (0, register_1.register)({
    name: "toggleTheme",
    label: (_, appState) => {
        return appState.theme === common_1.THEME.DARK
            ? "buttons.lightMode"
            : "buttons.darkMode";
    },
    keywords: ["toggle", "dark", "light", "mode", "theme"],
    icon: (appState, elements) => appState.theme === common_1.THEME.LIGHT ? icons_1.MoonIcon : icons_1.SunIcon,
    viewMode: true,
    trackEvent: { category: "canvas" },
    perform: (_, appState, value) => {
        return {
            appState: {
                ...appState,
                theme: value || (appState.theme === common_1.THEME.LIGHT ? common_1.THEME.DARK : common_1.THEME.LIGHT),
            },
            captureUpdate: element_4.CaptureUpdateAction.EVENTUALLY,
        };
    },
    keyTest: (event) => event.altKey && event.shiftKey && event.code === common_1.CODES.D,
    predicate: (elements, appState, props, app) => {
        return !!app.props.UIOptions.canvasActions.toggleTheme;
    },
});
exports.actionToggleEraserTool = (0, register_1.register)({
    name: "toggleEraserTool",
    label: "toolBar.eraser",
    trackEvent: { category: "toolbar" },
    perform: (elements, appState, _, app) => {
        let activeTool;
        if ((0, appState_1.isEraserActive)(appState)) {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                ...(appState.activeTool.lastActiveTool || {
                    type: app.state.preferredSelectionTool.type,
                }),
                lastActiveToolBeforeEraser: null,
            });
        }
        else {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                type: "eraser",
                lastActiveToolBeforeEraser: appState.activeTool,
            });
        }
        return {
            appState: {
                ...appState,
                selectedElementIds: {},
                selectedGroupIds: {},
                activeEmbeddable: null,
                activeTool,
            },
            captureUpdate: element_4.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => event.key === common_1.KEYS.E,
});
exports.actionToggleLassoTool = (0, register_1.register)({
    name: "toggleLassoTool",
    label: "toolBar.lasso",
    icon: icons_1.LassoIcon,
    trackEvent: { category: "toolbar" },
    predicate: (elements, appState, props, app) => {
        return app.state.preferredSelectionTool.type !== "lasso";
    },
    perform: (elements, appState, _, app) => {
        let activeTool;
        if (appState.activeTool.type !== "lasso") {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                type: "lasso",
                fromSelection: false,
            });
            (0, cursor_1.setCursor)(app.interactiveCanvas, common_1.CURSOR_TYPE.CROSSHAIR);
        }
        else {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                type: "selection",
            });
        }
        return {
            appState: {
                ...appState,
                selectedElementIds: {},
                selectedGroupIds: {},
                activeEmbeddable: null,
                activeTool,
            },
            captureUpdate: element_4.CaptureUpdateAction.NEVER,
        };
    },
});
exports.actionToggleHandTool = (0, register_1.register)({
    name: "toggleHandTool",
    label: "toolBar.hand",
    trackEvent: { category: "toolbar" },
    icon: icons_1.handIcon,
    viewMode: false,
    perform: (elements, appState, _, app) => {
        let activeTool;
        if ((0, appState_1.isHandToolActive)(appState)) {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                ...(appState.activeTool.lastActiveTool || {
                    type: "selection",
                }),
                lastActiveToolBeforeEraser: null,
            });
        }
        else {
            activeTool = (0, common_1.updateActiveTool)(appState, {
                type: "hand",
                lastActiveToolBeforeEraser: appState.activeTool,
            });
            (0, cursor_1.setCursor)(app.interactiveCanvas, common_1.CURSOR_TYPE.GRAB);
        }
        return {
            appState: {
                ...appState,
                selectedElementIds: {},
                selectedGroupIds: {},
                activeEmbeddable: null,
                activeTool,
            },
            captureUpdate: element_4.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    keyTest: (event) => !event.altKey && !event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.H,
});
