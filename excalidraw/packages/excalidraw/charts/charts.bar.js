"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderBarChart = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const charts_constants_1 = require("./charts.constants");
const charts_helpers_1 = require("./charts.helpers");
const renderBarChart = (spreadsheet, x, y, colorSeed) => {
    const series = spreadsheet.series;
    const layout = (0, charts_helpers_1.getCartesianChartLayout)("bar", series.length);
    const max = Math.max(1, ...series.flatMap((seriesData) => seriesData.values.map((value) => Math.max(0, value))));
    const colorOffset = (0, charts_helpers_1.getColorOffset)(colorSeed);
    const backgroundColor = (0, charts_helpers_1.getBackgroundColor)(colorOffset);
    const seriesColors = (0, charts_helpers_1.getSeriesColors)(series.length, colorOffset);
    const interBarGap = series.length > 1
        ? Math.max(1, Math.floor(layout.gap / (series.length + 1)))
        : 0;
    const barWidth = series.length > 1
        ? Math.max(2, (layout.slotWidth - interBarGap * (series.length - 1)) /
            series.length)
        : layout.slotWidth;
    const clusterWidth = series.length * barWidth + interBarGap * (series.length - 1);
    const clusterOffset = (layout.slotWidth - clusterWidth) / 2;
    const bars = series[0].values.flatMap((_, categoryIndex) => series.map((seriesData, seriesIndex) => {
        const value = Math.max(0, seriesData.values[categoryIndex] ?? 0);
        const barHeight = (value / max) * layout.chartHeight;
        const barColor = series.length > 1 ? seriesColors[seriesIndex] : backgroundColor;
        return (0, element_1.newElement)({
            backgroundColor: barColor,
            ...charts_constants_1.commonProps,
            type: "rectangle",
            fillStyle: series.length > 1 ? "solid" : charts_constants_1.commonProps.fillStyle,
            strokeColor: series.length > 1 ? barColor : charts_constants_1.commonProps.strokeColor,
            x: x +
                categoryIndex * (layout.slotWidth + layout.gap) +
                layout.gap +
                clusterOffset +
                seriesIndex * (barWidth + interBarGap),
            y: y - barHeight - layout.gap,
            width: barWidth,
            height: barHeight,
        });
    }));
    const baseElements = (0, charts_helpers_1.chartBaseElements)(spreadsheet, x, y, backgroundColor, layout, max, (0, common_1.isDevEnv)());
    const xLabels = (0, charts_helpers_1.chartXLabels)(spreadsheet, x, y, backgroundColor, layout);
    const xLabelsBottomY = Math.max(y + layout.gap / 2, ...xLabels.map((label) => (0, charts_helpers_1.getRotatedTextElementBottom)(label)));
    const { chartWidth } = (0, charts_helpers_1.getChartDimensions)(spreadsheet, layout);
    const seriesLegend = (0, charts_helpers_1.createSeriesLegend)(series, seriesColors, x + chartWidth / 2, xLabelsBottomY, y + layout.gap * 5, backgroundColor);
    return [...baseElements, ...bars, ...seriesLegend];
};
exports.renderBarChart = renderBarChart;
