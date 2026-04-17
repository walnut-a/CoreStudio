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
exports.PasteChartDialog = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const element_1 = require("@excalidraw/element");
const analytics_1 = require("../analytics");
const charts_1 = require("../charts");
const i18n_1 = require("../i18n");
const export_1 = require("../scene/export");
const ui_appState_1 = require("../context/ui-appState");
const App_1 = require("./App");
const Dialog_1 = require("./Dialog");
require("./PasteChartDialog.scss");
const icons_1 = require("./icons");
const getChartTypeLabel = (chartType) => {
    switch (chartType) {
        case "bar":
            return (0, i18n_1.t)("labels.chartType_bar");
        case "line":
            return (0, i18n_1.t)("labels.chartType_line");
        case "radar":
            return (0, i18n_1.t)("labels.chartType_radar");
        default:
            return chartType;
    }
};
const ChartPreviewBtn = (props) => {
    const previewRef = (0, react_1.useRef)(null);
    const [chartElements, setChartElements] = (0, react_1.useState)(null);
    const { theme } = (0, ui_appState_1.useUIAppState)();
    (0, react_1.useLayoutEffect)(() => {
        if (!props.spreadsheet) {
            setChartElements(null);
            return;
        }
        const elements = (0, charts_1.renderSpreadsheet)(props.chartType, props.spreadsheet, 0, 0, props.colorSeed);
        if (!elements) {
            setChartElements(null);
            previewRef.current?.replaceChildren();
            return;
        }
        setChartElements(elements);
        let svg;
        const previewNode = previewRef.current;
        (async () => {
            svg = await (0, export_1.exportToSvg)(elements, {
                exportBackground: false,
                viewBackgroundColor: "#fff",
                exportWithDarkMode: theme === "dark",
            }, null, // files
            {
                skipInliningFonts: true,
            });
            svg.querySelector(".style-fonts")?.remove();
            previewNode.replaceChildren();
            previewNode.appendChild(svg);
        })();
        return () => {
            previewNode.replaceChildren();
        };
    }, [props.spreadsheet, props.chartType, props.colorSeed, theme]);
    const chartTypeLabel = getChartTypeLabel(props.chartType);
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "ChartPreview", "aria-label": chartTypeLabel, onClick: () => {
            if (chartElements) {
                props.onClick(props.chartType, chartElements);
            }
        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "ChartPreview__canvas", ref: previewRef }), (0, jsx_runtime_1.jsx)("div", { className: "ChartPreview__label", children: chartTypeLabel })] }));
};
const PlainTextPreviewBtn = (props) => {
    const previewRef = (0, react_1.useRef)(null);
    const { theme } = (0, ui_appState_1.useUIAppState)();
    (0, react_1.useLayoutEffect)(() => {
        if (!props.rawText) {
            return;
        }
        const textElement = (0, element_1.newTextElement)({
            text: props.rawText,
            x: 0,
            y: 0,
        });
        const previewNode = previewRef.current;
        (async () => {
            const svg = await (0, export_1.exportToSvg)([textElement], {
                exportBackground: false,
                viewBackgroundColor: "#fff",
                exportWithDarkMode: theme === "dark",
            }, null, {
                skipInliningFonts: true,
            });
            svg.querySelector(".style-fonts")?.remove();
            previewNode.replaceChildren();
            previewNode.appendChild(svg);
        })();
        return () => {
            previewNode.replaceChildren();
        };
    }, [props.rawText, theme]);
    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "ChartPreview", "aria-label": (0, i18n_1.t)("labels.chartType_plaintext"), onClick: () => {
            props.onClick(props.rawText);
        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "ChartPreview__canvas", ref: previewRef }), (0, jsx_runtime_1.jsx)("div", { className: "ChartPreview__label", children: (0, i18n_1.t)("labels.chartType_plaintext") })] }));
};
const PasteChartDialog = ({ data, rawText, onClose, }) => {
    const { onInsertElements, focusContainer } = (0, App_1.useApp)();
    const [colorSeed, setColorSeed] = (0, react_1.useState)(Math.random());
    const handleReshuffleColors = react_1.default.useCallback(() => {
        setColorSeed(Math.random());
    }, []);
    const handleClose = react_1.default.useCallback(() => {
        if (onClose) {
            onClose();
        }
    }, [onClose]);
    const handleChartClick = (chartType, elements) => {
        onInsertElements(elements);
        (0, analytics_1.trackEvent)("paste", "chart", chartType);
        onClose();
        focusContainer();
    };
    const handlePlainTextClick = (rawText) => {
        const textElement = (0, element_1.newTextElement)({
            text: rawText,
            x: 0,
            y: 0,
        });
        onInsertElements([textElement]);
        (0, analytics_1.trackEvent)("paste", "chart", "plaintext");
        onClose();
        focusContainer();
    };
    return ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { size: "regular", onCloseRequest: handleClose, title: (0, jsx_runtime_1.jsxs)("div", { className: "PasteChartDialog__title", children: [(0, jsx_runtime_1.jsx)("div", { className: "PasteChartDialog__titleText", children: (0, i18n_1.t)("labels.pasteCharts") }), (0, jsx_runtime_1.jsx)("div", { className: "PasteChartDialog__reshuffleBtn", onClick: handleReshuffleColors, role: "button", tabIndex: 0, onKeyDown: (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleReshuffleColors();
                        }
                    }, children: icons_1.bucketFillIcon })] }), className: "PasteChartDialog", autofocus: false, children: (0, jsx_runtime_1.jsxs)("div", { className: "container", children: [["bar", "line", "radar"].map((chartType) => {
                    if (!(0, charts_1.isSpreadsheetValidForChartType)(data, chartType)) {
                        return null;
                    }
                    return ((0, jsx_runtime_1.jsx)(ChartPreviewBtn, { chartType: chartType, spreadsheet: data, colorSeed: colorSeed, onClick: handleChartClick }, chartType));
                }), rawText && ((0, jsx_runtime_1.jsx)(PlainTextPreviewBtn, { rawText: rawText, onClick: handlePlainTextClick }))] }) }));
};
exports.PasteChartDialog = PasteChartDialog;
