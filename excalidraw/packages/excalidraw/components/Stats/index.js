"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsInner = exports.Stats = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const clsx_1 = __importDefault(require("clsx"));
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const i18n_1 = require("../../i18n");
const snapping_1 = require("../../snapping");
const App_1 = require("../App");
const Island_1 = require("../Island");
const icons_1 = require("../icons");
const Angle_1 = __importDefault(require("./Angle"));
const CanvasGrid_1 = __importDefault(require("./CanvasGrid"));
const Collapsible_1 = __importDefault(require("./Collapsible"));
const Dimension_1 = __importDefault(require("./Dimension"));
const FontSize_1 = __importDefault(require("./FontSize"));
const MultiAngle_1 = __importDefault(require("./MultiAngle"));
const MultiDimension_1 = __importDefault(require("./MultiDimension"));
const MultiFontSize_1 = __importDefault(require("./MultiFontSize"));
const MultiPosition_1 = __importDefault(require("./MultiPosition"));
const Position_1 = __importDefault(require("./Position"));
const utils_1 = require("./utils");
require("./Stats.scss");
const STATS_TIMEOUT = 50;
const Stats = (props) => {
    const appState = (0, App_1.useExcalidrawAppState)();
    const sceneNonce = props.app.scene.getSceneNonce() || 1;
    const selectedElements = props.app.scene.getSelectedElements({
        selectedElementIds: appState.selectedElementIds,
        includeBoundTextElement: false,
    });
    const gridModeEnabled = (0, snapping_1.isGridModeEnabled)(props.app);
    return ((0, jsx_runtime_1.jsx)(exports.StatsInner, { ...props, appState: appState, sceneNonce: sceneNonce, selectedElements: selectedElements, gridModeEnabled: gridModeEnabled }));
};
exports.Stats = Stats;
const StatsRow = ({ children, columns = 1, heading, style, ...rest }) => ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("exc-stats__row", { "exc-stats__row--heading": heading }), style: {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        ...style,
    }, ...rest, children: children }));
StatsRow.displayName = "StatsRow";
const StatsRows = ({ children, order, style, ...rest }) => ((0, jsx_runtime_1.jsx)("div", { className: "exc-stats__rows", style: { order, ...style }, ...rest, children: children }));
StatsRows.displayName = "StatsRows";
exports.Stats.StatsRow = StatsRow;
exports.Stats.StatsRows = StatsRows;
exports.StatsInner = (0, react_1.memo)(({ app, onClose, renderCustomStats, selectedElements, appState, sceneNonce, gridModeEnabled, }) => {
    const scene = app.scene;
    const elements = scene.getNonDeletedElements();
    const elementsMap = scene.getNonDeletedElementsMap();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const singleElement = selectedElements.length === 1 ? selectedElements[0] : null;
    const multipleElements = selectedElements.length > 1 ? selectedElements : null;
    const cropMode = appState.croppingElementId && (0, element_3.isImageElement)(singleElement);
    const unCroppedDimension = cropMode
        ? (0, element_2.getUncroppedWidthAndHeight)(singleElement)
        : null;
    const [sceneDimension, setSceneDimension] = (0, react_1.useState)({
        width: 0,
        height: 0,
    });
    const throttledSetSceneDimension = (0, react_1.useMemo)(() => (0, lodash_throttle_1.default)((elements) => {
        const boundingBox = (0, element_1.getCommonBounds)(elements);
        setSceneDimension({
            width: Math.round(boundingBox[2]) - Math.round(boundingBox[0]),
            height: Math.round(boundingBox[3]) - Math.round(boundingBox[1]),
        });
    }, STATS_TIMEOUT), []);
    (0, react_1.useEffect)(() => {
        throttledSetSceneDimension(elements);
    }, [sceneNonce, elements, throttledSetSceneDimension]);
    (0, react_1.useEffect)(() => () => throttledSetSceneDimension.cancel(), [throttledSetSceneDimension]);
    const atomicUnits = (0, react_1.useMemo)(() => {
        return (0, utils_1.getAtomicUnits)(selectedElements, appState);
    }, [selectedElements, appState]);
    const _frameAndChildrenSelectedTogether = (0, react_1.useMemo)(() => {
        return (0, element_4.frameAndChildrenSelectedTogether)(selectedElements);
    }, [selectedElements]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "exc-stats", children: (0, jsx_runtime_1.jsxs)(Island_1.Island, { padding: 3, children: [(0, jsx_runtime_1.jsxs)("div", { className: "title", children: [(0, jsx_runtime_1.jsx)("h2", { children: (0, i18n_1.t)("stats.title") }), (0, jsx_runtime_1.jsx)("div", { className: "close", onClick: onClose, children: icons_1.CloseIcon })] }), (0, jsx_runtime_1.jsxs)(Collapsible_1.default, { label: (0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("stats.generalStats") }), open: !!(appState.stats.panels & common_1.STATS_PANELS.generalStats), openTrigger: () => setAppState((state) => {
                        return {
                            stats: {
                                open: true,
                                panels: state.stats.panels ^ common_1.STATS_PANELS.generalStats,
                            },
                        };
                    }), children: [(0, jsx_runtime_1.jsxs)(StatsRows, { children: [(0, jsx_runtime_1.jsx)(StatsRow, { heading: true, children: (0, i18n_1.t)("stats.scene") }), (0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.shapes") }), (0, jsx_runtime_1.jsx)("div", { children: elements.length })] }), (0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.width") }), (0, jsx_runtime_1.jsx)("div", { children: sceneDimension.width })] }), (0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.height") }), (0, jsx_runtime_1.jsx)("div", { children: sceneDimension.height })] }), gridModeEnabled && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(StatsRow, { heading: true, children: "Canvas" }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(CanvasGrid_1.default, { property: "gridStep", scene: scene, appState: appState, setAppState: setAppState }) })] }))] }), renderCustomStats?.(elements, appState)] }), !_frameAndChildrenSelectedTogether && selectedElements.length > 0 && ((0, jsx_runtime_1.jsx)("div", { id: "elementStats", style: {
                        marginTop: 12,
                    }, children: (0, jsx_runtime_1.jsx)(Collapsible_1.default, { label: (0, jsx_runtime_1.jsx)("h3", { children: (0, i18n_1.t)("stats.elementProperties") }), open: !!(appState.stats.panels & common_1.STATS_PANELS.elementProperties), openTrigger: () => setAppState((state) => {
                            return {
                                stats: {
                                    open: true,
                                    panels: state.stats.panels ^ common_1.STATS_PANELS.elementProperties,
                                },
                            };
                        }), children: (0, jsx_runtime_1.jsxs)(StatsRows, { children: [singleElement && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [cropMode && ((0, jsx_runtime_1.jsx)(StatsRow, { heading: true, children: (0, i18n_1.t)("labels.unCroppedDimension") })), appState.croppingElementId &&
                                            (0, element_3.isImageElement)(singleElement) &&
                                            unCroppedDimension && ((0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.width") }), (0, jsx_runtime_1.jsx)("div", { children: (0, math_1.round)(unCroppedDimension.width, 2) })] })), appState.croppingElementId &&
                                            (0, element_3.isImageElement)(singleElement) &&
                                            unCroppedDimension && ((0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.height") }), (0, jsx_runtime_1.jsx)("div", { children: (0, math_1.round)(unCroppedDimension.height, 2) })] })), (0, jsx_runtime_1.jsx)(StatsRow, { heading: true, "data-testid": "stats-element-type", style: { margin: "0.3125rem 0" }, children: appState.croppingElementId
                                                ? (0, i18n_1.t)("labels.imageCropping")
                                                : (0, i18n_1.t)(`element.${singleElement.type}`) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(Position_1.default, { element: singleElement, property: "x", elementsMap: elementsMap, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(Position_1.default, { element: singleElement, property: "y", elementsMap: elementsMap, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(Dimension_1.default, { property: "width", element: singleElement, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(Dimension_1.default, { property: "height", element: singleElement, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(Angle_1.default, { property: "angle", element: singleElement, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(FontSize_1.default, { property: "fontSize", element: singleElement, scene: scene, appState: appState }) })] })), multipleElements && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, element_5.elementsAreInSameGroup)(multipleElements) && ((0, jsx_runtime_1.jsx)(StatsRow, { heading: true, children: (0, i18n_1.t)("element.group") })), (0, jsx_runtime_1.jsxs)(StatsRow, { columns: 2, style: { margin: "0.3125rem 0" }, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("stats.shapes") }), (0, jsx_runtime_1.jsx)("div", { children: selectedElements.length })] }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiPosition_1.default, { property: "x", elements: multipleElements, elementsMap: elementsMap, atomicUnits: atomicUnits, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiPosition_1.default, { property: "y", elements: multipleElements, elementsMap: elementsMap, atomicUnits: atomicUnits, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiDimension_1.default, { property: "width", elements: multipleElements, elementsMap: elementsMap, atomicUnits: atomicUnits, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiDimension_1.default, { property: "height", elements: multipleElements, elementsMap: elementsMap, atomicUnits: atomicUnits, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiAngle_1.default, { property: "angle", elements: multipleElements, scene: scene, appState: appState }) }), (0, jsx_runtime_1.jsx)(StatsRow, { children: (0, jsx_runtime_1.jsx)(MultiFontSize_1.default, { property: "fontSize", elements: multipleElements, scene: scene, appState: appState, elementsMap: elementsMap }) })] }))] }) }) }))] }) }));
}, (prev, next) => {
    return (prev.sceneNonce === next.sceneNonce &&
        prev.selectedElements === next.selectedElements &&
        prev.appState.stats.panels === next.appState.stats.panels &&
        prev.gridModeEnabled === next.gridModeEnabled &&
        prev.appState.gridStep === next.appState.gridStep &&
        prev.appState.croppingElementId === next.appState.croppingElementId);
});
