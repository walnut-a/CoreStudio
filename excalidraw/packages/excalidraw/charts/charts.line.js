"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLineChart = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const charts_constants_1 = require("./charts.constants");
const charts_helpers_1 = require("./charts.helpers");
const renderLineChart = (spreadsheet, x, y, colorSeed) => {
    const series = spreadsheet.series;
    const layout = (0, charts_helpers_1.getCartesianChartLayout)("line", series.length);
    const max = Math.max(1, ...series.flatMap((seriesData) => seriesData.values));
    const colorOffset = (0, charts_helpers_1.getColorOffset)(colorSeed);
    const backgroundColor = (0, charts_helpers_1.getBackgroundColor)(colorOffset);
    const seriesColors = (0, charts_helpers_1.getSeriesColors)(series.length, colorOffset);
    const lines = series.map((seriesData, seriesIndex) => {
        const points = seriesData.values.map((value, valueIndex) => (0, math_1.pointFrom)(valueIndex * (layout.slotWidth + layout.gap), -(value / max) * layout.chartHeight));
        const maxX = Math.max(...points.map((point) => point[0]));
        const maxY = Math.max(...points.map((point) => point[1]));
        const minX = Math.min(...points.map((point) => point[0]));
        const minY = Math.min(...points.map((point) => point[1]));
        return (0, element_1.newLinearElement)({
            backgroundColor: "transparent",
            ...charts_constants_1.commonProps,
            type: "line",
            x: x + layout.gap + layout.slotWidth / 2,
            y: y - layout.gap,
            height: maxY - minY,
            width: maxX - minX,
            strokeColor: seriesColors[seriesIndex],
            strokeWidth: 2,
            points,
        });
    });
    const dots = series.flatMap((seriesData, seriesIndex) => seriesData.values.map((value, valueIndex) => {
        const cx = valueIndex * (layout.slotWidth + layout.gap) + layout.gap / 2;
        const cy = -(value / max) * layout.chartHeight + layout.gap / 2;
        return (0, element_1.newElement)({
            backgroundColor: seriesColors[seriesIndex],
            ...charts_constants_1.commonProps,
            fillStyle: "solid",
            strokeColor: seriesColors[seriesIndex],
            strokeWidth: 2,
            type: "ellipse",
            x: x + cx + layout.slotWidth / 2,
            y: y + cy - layout.gap * 2,
            width: layout.gap,
            height: layout.gap,
        });
    }));
    const guideValues = series[0].values.map((_, valueIndex) => Math.max(0, ...series.map((seriesData) => seriesData.values[valueIndex] ?? 0)));
    const guides = guideValues.map((value, valueIndex) => {
        const cx = valueIndex * (layout.slotWidth + layout.gap) + layout.gap / 2;
        const cy = (value / max) * layout.chartHeight + layout.gap / 2 + layout.gap;
        return (0, element_1.newLinearElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            type: "line",
            x: x + cx + layout.slotWidth / 2 + layout.gap / 2,
            y: y - cy,
            height: cy,
            strokeStyle: "dotted",
            opacity: charts_constants_1.GRID_OPACITY,
            points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(0, cy)],
        });
    });
    const baseElements = (0, charts_helpers_1.chartBaseElements)(spreadsheet, x, y, backgroundColor, layout, max, (0, common_1.isDevEnv)());
    const xLabels = (0, charts_helpers_1.chartXLabels)(spreadsheet, x, y, backgroundColor, layout);
    const xLabelsBottomY = Math.max(y + layout.gap / 2, ...xLabels.map((label) => (0, charts_helpers_1.getRotatedTextElementBottom)(label)));
    const { chartWidth } = (0, charts_helpers_1.getChartDimensions)(spreadsheet, layout);
    const seriesLegend = (0, charts_helpers_1.createSeriesLegend)(series, seriesColors, x + chartWidth / 2, xLabelsBottomY, y + layout.gap * 5, backgroundColor);
    return [...baseElements, ...lines, ...guides, ...dots, ...seriesLegend];
};
exports.renderLineChart = renderLineChart;
