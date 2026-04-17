"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRadarChart = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const charts_constants_1 = require("./charts.constants");
const charts_helpers_1 = require("./charts.helpers");
const renderRadarChart = (spreadsheet, x, y, colorSeed) => {
    if (!(0, charts_helpers_1.isSpreadsheetValidForChartType)(spreadsheet, "radar")) {
        return null;
    }
    const labels = spreadsheet.labels ??
        spreadsheet.series[0].values.map((_, index) => `Value ${index + 1}`);
    const series = spreadsheet.series;
    const { normalize, renderSteps } = (0, charts_helpers_1.getRadarValueScale)(series, labels.length);
    const colorOffset = (0, charts_helpers_1.getColorOffset)(colorSeed);
    const backgroundColor = (0, charts_helpers_1.getBackgroundColor)(colorOffset);
    const seriesColors = (0, charts_helpers_1.getSeriesColors)(series.length, colorOffset);
    const { chartWidth, chartHeight } = (0, charts_helpers_1.getRadarDimensions)();
    const centerX = x + chartWidth / 2;
    const centerY = y - chartHeight / 2;
    const radius = charts_constants_1.BAR_HEIGHT / 2;
    const angles = labels.map((_, index) => -Math.PI / 2 + (Math.PI * 2 * index) / labels.length);
    const { axisLabels, axisLabelTopY, axisLabelBottomY } = (0, charts_helpers_1.createRadarAxisLabels)(labels, angles, centerX, centerY, radius, backgroundColor);
    const titleFontFamily = common_1.FONT_FAMILY["Lilita One"];
    const titleFontSize = common_1.FONT_SIZES.xl;
    const titleLineHeight = (0, common_1.getLineHeight)(titleFontFamily);
    const titleFontString = (0, common_1.getFontString)({
        fontFamily: titleFontFamily,
        fontSize: titleFontSize,
    });
    const titleText = spreadsheet.title
        ? (0, charts_helpers_1.getRadarDisplayText)(spreadsheet.title, titleFontString, chartWidth + charts_constants_1.RADAR_LABEL_OFFSET * 2)
        : null;
    const titleTextMetrics = titleText
        ? (0, element_1.measureText)(titleText, titleFontString, titleLineHeight)
        : null;
    const title = titleText
        ? (0, element_1.newTextElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            text: titleText,
            originalText: spreadsheet.title ?? titleText,
            x: x + chartWidth / 2,
            y: axisLabelTopY - charts_constants_1.RADAR_LABEL_OFFSET - titleTextMetrics.height / 2,
            fontFamily: titleFontFamily,
            fontSize: titleFontSize,
            lineHeight: titleLineHeight,
            textAlign: "center",
        })
        : null;
    const radarGridLines = renderSteps
        ? Array.from({ length: charts_constants_1.RADAR_GRID_LEVELS }, (_, levelIndex) => {
            const levelRatio = (levelIndex + 1) / charts_constants_1.RADAR_GRID_LEVELS;
            const levelRadius = radius * levelRatio;
            const points = angles.map((angle) => (0, math_1.pointFrom)(Math.cos(angle) * levelRadius, Math.sin(angle) * levelRadius));
            points.push((0, math_1.pointFrom)(points[0][0], points[0][1]));
            return (0, element_1.newLinearElement)({
                backgroundColor: "transparent",
                ...charts_constants_1.commonProps,
                type: "line",
                x: centerX,
                y: centerY,
                width: levelRadius * 2,
                height: levelRadius * 2,
                strokeStyle: "solid",
                roughness: common_1.ROUGHNESS.architect,
                opacity: charts_constants_1.GRID_OPACITY,
                polygon: true,
                points,
            });
        })
        : [];
    const spokes = angles.map((angle) => {
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        return (0, element_1.newLinearElement)({
            backgroundColor: "transparent",
            ...charts_constants_1.commonProps,
            type: "line",
            x: centerX,
            y: centerY,
            width: Math.abs(px),
            height: Math.abs(py),
            strokeStyle: "solid",
            roughness: common_1.ROUGHNESS.architect,
            opacity: charts_constants_1.GRID_OPACITY,
            points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(px, py)],
        });
    });
    const seriesPolygons = series.map((seriesData, index) => {
        const points = angles.map((angle, axisIndex) => {
            const value = seriesData.values[axisIndex] ?? 0;
            const pointRadius = normalize(value, axisIndex) * radius;
            return (0, math_1.pointFrom)(Math.cos(angle) * pointRadius, Math.sin(angle) * pointRadius);
        });
        points.push((0, math_1.pointFrom)(points[0][0], points[0][1]));
        return (0, element_1.newLinearElement)({
            backgroundColor: "transparent",
            ...charts_constants_1.commonProps,
            type: "line",
            x: centerX,
            y: centerY,
            width: radius * 2,
            height: radius * 2,
            strokeColor: seriesColors[index],
            strokeWidth: 2,
            polygon: true,
            points,
        });
    });
    const seriesLegend = (0, charts_helpers_1.createSeriesLegend)(series, seriesColors, centerX, axisLabelBottomY, y + charts_constants_1.BAR_GAP * 5, backgroundColor);
    return [
        ...(title ? [title] : []),
        ...axisLabels,
        ...radarGridLines,
        ...spokes,
        ...seriesPolygons,
        ...seriesLegend,
    ];
};
exports.renderRadarChart = renderRadarChart;
