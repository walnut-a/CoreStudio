"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chartBaseElements = exports.chartXLabels = exports.getRotatedTextElementBottom = exports.createSeriesLegend = exports.createRadarAxisLabels = exports.getRadarDisplayText = exports.getRadarValueScale = exports.getBackgroundColor = exports.getColorOffset = exports.getSeriesColors = exports.getRadarDimensions = exports.getChartDimensions = exports.getCartesianChartLayout = exports.isSpreadsheetValidForChartType = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const charts_constants_1 = require("./charts.constants");
const bgColors = (0, common_1.getAllColorsSpecificShade)(common_1.DEFAULT_CHART_COLOR_INDEX);
const getSpreadsheetDimensionCount = (spreadsheet) => spreadsheet.labels?.length ?? spreadsheet.series[0]?.values.length ?? 0;
const isSpreadsheetValidForChartType = (spreadsheet, chartType) => {
    if (!spreadsheet) {
        return false;
    }
    const dimensionCount = getSpreadsheetDimensionCount(spreadsheet);
    if (dimensionCount < 2) {
        return false;
    }
    if (chartType === "radar") {
        return dimensionCount >= 3;
    }
    return true;
};
exports.isSpreadsheetValidForChartType = isSpreadsheetValidForChartType;
const getSeriesAwareSlotWidth = (baseSlotWidth, seriesCount) => {
    const extraSlotWidth = seriesCount <= 1
        ? 0
        : Math.min(charts_constants_1.CARTESIAN_BAR_SLOT_EXTRA_MAX, (seriesCount - 1) * charts_constants_1.CARTESIAN_BAR_SLOT_EXTRA_PER_SERIES);
    return baseSlotWidth + extraSlotWidth;
};
const getCartesianChartLayout = (chartType, seriesCount) => {
    if (chartType === "line") {
        const slotWidth = getSeriesAwareSlotWidth(charts_constants_1.CARTESIAN_LINE_SLOT_WIDTH, seriesCount);
        return {
            slotWidth,
            gap: charts_constants_1.CARTESIAN_GAP,
            chartHeight: charts_constants_1.CARTESIAN_LINE_HEIGHT,
            xLabelMaxWidth: slotWidth + charts_constants_1.CARTESIAN_GAP * 3 + charts_constants_1.CARTESIAN_LABEL_MAX_WIDTH_BUFFER,
        };
    }
    const slotWidth = getSeriesAwareSlotWidth(charts_constants_1.CARTESIAN_BASE_SLOT_WIDTH, seriesCount);
    return {
        slotWidth,
        gap: charts_constants_1.CARTESIAN_GAP,
        chartHeight: charts_constants_1.CARTESIAN_BAR_HEIGHT,
        xLabelMaxWidth: slotWidth + charts_constants_1.CARTESIAN_GAP * 3 + charts_constants_1.CARTESIAN_LABEL_MAX_WIDTH_BUFFER,
    };
};
exports.getCartesianChartLayout = getCartesianChartLayout;
const getChartDimensions = (spreadsheet, layout) => {
    const chartWidth = (layout.slotWidth + layout.gap) * spreadsheet.series[0].values.length +
        layout.gap;
    const chartHeight = layout.chartHeight + layout.gap * 2;
    return { chartWidth, chartHeight };
};
exports.getChartDimensions = getChartDimensions;
const getRadarDimensions = () => {
    const chartWidth = charts_constants_1.BAR_HEIGHT + charts_constants_1.RADAR_PADDING * 2;
    const chartHeight = charts_constants_1.BAR_HEIGHT + charts_constants_1.RADAR_PADDING * 2;
    return { chartWidth, chartHeight };
};
exports.getRadarDimensions = getRadarDimensions;
const getCircularDistance = (firstIndex, secondIndex, paletteSize) => {
    const absoluteDistance = Math.abs(firstIndex - secondIndex);
    return Math.min(absoluteDistance, paletteSize - absoluteDistance);
};
const getSeriesColors = (seriesCount, colorOffset) => {
    if (seriesCount <= 0 || bgColors.length === 0) {
        return [];
    }
    const paletteSize = bgColors.length;
    const startIndex = ((colorOffset % paletteSize) + paletteSize) % paletteSize;
    const selectedIndices = [startIndex];
    const maxUniqueColors = Math.min(seriesCount, paletteSize);
    const availableIndices = new Set(Array.from({ length: paletteSize }, (_, index) => index).filter((index) => index !== startIndex));
    while (selectedIndices.length < maxUniqueColors) {
        let bestIndex = -1;
        let bestMinDistance = -1;
        let bestAverageDistance = -1;
        for (const candidateIndex of availableIndices) {
            const distances = selectedIndices.map((selectedIndex) => getCircularDistance(candidateIndex, selectedIndex, paletteSize));
            const minDistance = Math.min(...distances);
            const averageDistance = distances.reduce((total, distance) => total + distance, 0) /
                distances.length;
            if (minDistance > bestMinDistance ||
                (minDistance === bestMinDistance &&
                    averageDistance > bestAverageDistance)) {
                bestIndex = candidateIndex;
                bestMinDistance = minDistance;
                bestAverageDistance = averageDistance;
            }
        }
        selectedIndices.push(bestIndex);
        availableIndices.delete(bestIndex);
    }
    return Array.from({ length: seriesCount }, (_, index) => bgColors[selectedIndices[index % selectedIndices.length]]);
};
exports.getSeriesColors = getSeriesColors;
const getColorOffset = (colorSeed) => {
    if (bgColors.length === 0) {
        return 0;
    }
    if (typeof colorSeed !== "number" || !Number.isFinite(colorSeed)) {
        return Math.floor(Math.random() * bgColors.length);
    }
    const seedText = colorSeed.toString();
    let hash = 0;
    for (let index = 0; index < seedText.length; index++) {
        hash = (hash * 31 + seedText.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % bgColors.length;
};
exports.getColorOffset = getColorOffset;
const getBackgroundColor = (colorOffset) => bgColors[colorOffset];
exports.getBackgroundColor = getBackgroundColor;
const getRadarValueScale = (series, _labelsLength) => {
    const allValues = series.flatMap((s) => s.values.map((value) => Math.max(0, value)));
    const positiveValues = allValues.filter((value) => value > 0);
    const max = Math.max(1, ...allValues);
    const minPositive = positiveValues.length > 0 ? Math.min(...positiveValues) : 1;
    const useLogScale = series.length === 1 &&
        minPositive > 0 &&
        max / minPositive >= charts_constants_1.RADAR_SINGLE_SERIES_LOG_SCALE_THRESHOLD;
    return {
        renderSteps: false,
        normalize: (value, _axisIndex) => {
            const safeValue = Math.max(0, value);
            return useLogScale
                ? Math.log10(safeValue + 1) / Math.log10(max + 1)
                : safeValue / max;
        },
    };
};
exports.getRadarValueScale = getRadarValueScale;
const shouldWrapRadarText = (text) => /\s/.test(text.trim());
const getRadarDisplayText = (text, fontString, maxWidth) => {
    return shouldWrapRadarText(text)
        ? (0, element_1.wrapText)(text, fontString, maxWidth)
        : text;
};
exports.getRadarDisplayText = getRadarDisplayText;
const createRadarAxisLabels = (labels, angles, centerX, centerY, radius, backgroundColor) => {
    const fontFamily = common_1.FONT_FAMILY.Excalifont;
    const fontSize = common_1.FONT_SIZES.sm;
    const lineHeight = (0, common_1.getLineHeight)(fontFamily);
    const fontString = (0, common_1.getFontString)({ fontFamily, fontSize });
    const baseLabelWidth = Math.min(charts_constants_1.RADAR_AXIS_LABEL_MAX_WIDTH, radius * (labels.length > 8 ? 0.56 : 0.72));
    const minLabelWidth = (0, element_1.getApproxMinLineWidth)(fontString, lineHeight);
    const axisLabels = labels.map((label, index) => {
        const angle = angles[index];
        const longestWordWidth = Math.max(0, ...label
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => (0, element_1.measureText)(word, fontString, lineHeight).width));
        const maxLabelWidth = Math.max(minLabelWidth, baseLabelWidth, longestWordWidth);
        const displayLabel = (0, exports.getRadarDisplayText)(label, fontString, maxLabelWidth);
        const metrics = (0, element_1.measureText)(displayLabel, fontString, lineHeight);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const textAlign = cos > charts_constants_1.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD
            ? "left"
            : cos < -charts_constants_1.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD
                ? "right"
                : "center";
        // Keep labels outside the radar ring by projecting text extents
        // onto the axis direction.
        const centerAlignedXExtent = textAlign === "center" ? metrics.width / 2 : 0;
        const projectedExtent = Math.abs(cos) * centerAlignedXExtent +
            Math.abs(sin) * (metrics.height / 2);
        const radialOffset = charts_constants_1.RADAR_LABEL_OFFSET + projectedExtent + charts_constants_1.RADAR_AXIS_LABEL_CLEARANCE;
        const anchorX = centerX + cos * (radius + radialOffset);
        const anchorY = centerY + sin * (radius + radialOffset);
        const yNudge = sin > charts_constants_1.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD
            ? charts_constants_1.BAR_GAP / 3
            : sin < -charts_constants_1.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD
                ? -charts_constants_1.BAR_GAP / 3
                : 0;
        return (0, element_1.newTextElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            text: displayLabel,
            originalText: label,
            x: anchorX,
            y: anchorY + yNudge,
            fontFamily,
            fontSize,
            lineHeight,
            textAlign,
            verticalAlign: "middle",
        });
    });
    const axisLabelTopY = Math.min(...axisLabels.map((axisLabel) => axisLabel.y));
    const axisLabelBottomY = Math.max(...axisLabels.map((axisLabel) => axisLabel.y + axisLabel.height));
    return { axisLabels, axisLabelTopY, axisLabelBottomY };
};
exports.createRadarAxisLabels = createRadarAxisLabels;
const createSeriesLegend = (series, seriesColors, centerX, minLegendTopY, fallbackLegendY, backgroundColor) => {
    if (series.length <= 1) {
        return [];
    }
    const fontFamily = common_1.FONT_FAMILY["Lilita One"];
    const fontSize = common_1.FONT_SIZES.lg;
    const lineHeight = (0, common_1.getLineHeight)(fontFamily);
    const fontString = (0, common_1.getFontString)({ fontFamily, fontSize });
    const legendItems = series.map((seriesItem, index) => {
        const label = seriesItem.title?.trim() || `Series ${index + 1}`;
        const displayLabel = (0, exports.getRadarDisplayText)(label, fontString, charts_constants_1.BAR_HEIGHT);
        const metrics = (0, element_1.measureText)(displayLabel, fontString, lineHeight);
        const itemWidth = charts_constants_1.RADAR_LEGEND_SWATCH_SIZE + charts_constants_1.RADAR_LEGEND_TEXT_GAP + metrics.width;
        return {
            label,
            displayLabel,
            color: seriesColors[index],
            width: itemWidth,
            height: metrics.height,
        };
    });
    const maxLegendHalfHeight = Math.max(charts_constants_1.RADAR_LEGEND_SWATCH_SIZE / 2, ...legendItems.map((item) => item.height / 2));
    const legendY = Math.max(fallbackLegendY, minLegendTopY + maxLegendHalfHeight + charts_constants_1.RADAR_LABEL_OFFSET);
    const pillPaddingX = charts_constants_1.RADAR_LEGEND_ITEM_GAP;
    const pillPaddingY = charts_constants_1.RADAR_LEGEND_SWATCH_SIZE * 0.6;
    const totalLegendWidth = legendItems.reduce((total, item) => total + item.width, 0) +
        charts_constants_1.RADAR_LEGEND_ITEM_GAP * Math.max(0, legendItems.length - 1);
    const pillWidth = totalLegendWidth + pillPaddingX * 2;
    const pillHeight = maxLegendHalfHeight * 2 + pillPaddingY * 2;
    const legendElements = [];
    // rounded pill background
    legendElements.push((0, element_1.newElement)({
        ...charts_constants_1.commonProps,
        backgroundColor: "transparent",
        type: "rectangle",
        fillStyle: "solid",
        strokeColor: common_1.COLOR_PALETTE.black,
        x: centerX - pillWidth / 2,
        y: legendY - pillHeight / 2,
        width: pillWidth,
        height: pillHeight,
        roughness: common_1.ROUGHNESS.architect,
        roundness: { type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS },
    }));
    let cursorX = centerX - totalLegendWidth / 2;
    legendItems.forEach((item) => {
        // solid filled swatch
        legendElements.push((0, element_1.newElement)({
            ...charts_constants_1.commonProps,
            backgroundColor: item.color,
            type: "rectangle",
            x: cursorX,
            y: legendY - charts_constants_1.RADAR_LEGEND_SWATCH_SIZE / 2,
            width: charts_constants_1.RADAR_LEGEND_SWATCH_SIZE,
            height: charts_constants_1.RADAR_LEGEND_SWATCH_SIZE,
            fillStyle: "solid",
            strokeColor: item.color,
            roughness: common_1.ROUGHNESS.architect,
            roundness: { type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS },
        }));
        // label in default (black) color
        legendElements.push((0, element_1.newTextElement)({
            ...charts_constants_1.commonProps,
            text: item.displayLabel,
            originalText: item.label,
            autoResize: false,
            x: cursorX + charts_constants_1.RADAR_LEGEND_SWATCH_SIZE + charts_constants_1.RADAR_LEGEND_TEXT_GAP,
            y: legendY,
            fontFamily,
            fontSize,
            lineHeight,
            textAlign: "left",
            verticalAlign: "middle",
        }));
        cursorX += item.width + charts_constants_1.RADAR_LEGEND_ITEM_GAP;
    });
    return legendElements;
};
exports.createSeriesLegend = createSeriesLegend;
const ellipsifyTextToWidth = (text, maxWidth, fontString, lineHeight) => {
    if ((0, element_1.measureText)(text, fontString, lineHeight).width <= maxWidth) {
        return text;
    }
    let end = text.length;
    while (end > 1) {
        const candidate = `${text.slice(0, end)}...`;
        if ((0, element_1.measureText)(candidate, fontString, lineHeight).width <= maxWidth) {
            return candidate;
        }
        end--;
    }
    return text[0] ? `${text[0]}...` : text;
};
const wrapOrEllipsifyTextToWidth = (text, maxWidth, fontString, lineHeight) => {
    if ((0, element_1.measureText)(text, fontString, lineHeight).width <= maxWidth) {
        return { wrapped: false, text };
    }
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        const hasLongWord = words.some((word) => {
            return (0, element_1.measureText)(word, fontString, lineHeight).width > maxWidth;
        });
        if (!hasLongWord &&
            maxWidth >= (0, element_1.getApproxMinLineWidth)(fontString, lineHeight)) {
            return { wrapped: true, text: (0, element_1.wrapText)(text, fontString, maxWidth) };
        }
    }
    return {
        wrapped: false,
        text: ellipsifyTextToWidth(text, maxWidth, fontString, lineHeight),
    };
};
const getRotatedBoundingBox = (width, height, angle) => {
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    return {
        width: width * cos + height * sin,
        height: width * sin + height * cos,
    };
};
const isEllipsifiedLabel = (text) => text.includes("...");
const getCartesianAxisLabelSpec = (label, maxLabelWidth, maxRotatedWidth, fontString, lineHeight) => {
    const minWidth = Math.max(charts_constants_1.CARTESIAN_LABEL_MIN_WIDTH, Math.ceil((0, element_1.getApproxMinLineWidth)(fontString, lineHeight)));
    const maxWidth = Math.max(minWidth, Math.floor(maxLabelWidth));
    const candidateWidths = [];
    for (let width = maxWidth; width >= minWidth; width -= 4) {
        candidateWidths.push(width);
    }
    if (candidateWidths[candidateWidths.length - 1] !== minWidth) {
        candidateWidths.push(minWidth);
    }
    const getRank = (spec) => {
        const ellipsified = isEllipsifiedLabel(spec.text);
        const visibleChars = spec.text
            .replace(/\.\.\./g, "")
            .replace(/\n/g, "").length;
        const lineCount = spec.text.split("\n").length;
        return {
            ellipsified,
            visibleChars,
            lineCount,
        };
    };
    const shouldPrefer = (candidate, current) => {
        const candidateRank = getRank(candidate);
        const currentRank = getRank(current);
        if (candidateRank.ellipsified !== currentRank.ellipsified) {
            return !candidateRank.ellipsified;
        }
        if (candidateRank.visibleChars !== currentRank.visibleChars) {
            return candidateRank.visibleChars > currentRank.visibleChars;
        }
        if (candidateRank.lineCount !== currentRank.lineCount) {
            return candidateRank.lineCount < currentRank.lineCount;
        }
        return candidate.rotatedHeight < current.rotatedHeight;
    };
    let bestFit = null;
    let bestOverflowAny = null;
    let bestOverflowNonEllipsified = null;
    for (const width of candidateWidths) {
        const { wrapped, text } = wrapOrEllipsifyTextToWidth(label, width, fontString, lineHeight);
        const metrics = (0, element_1.measureText)(text, fontString, lineHeight);
        const rotated = getRotatedBoundingBox(metrics.width, metrics.height, charts_constants_1.CARTESIAN_LABEL_ROTATION);
        const spec = {
            originalText: label,
            text,
            metrics,
            rotatedWidth: rotated.width,
            rotatedHeight: rotated.height,
            wrapped,
        };
        const overflow = rotated.width - maxRotatedWidth;
        if (overflow <= 0) {
            if (!bestFit || shouldPrefer(spec, bestFit)) {
                bestFit = spec;
            }
            continue;
        }
        if (!bestOverflowAny ||
            overflow < bestOverflowAny.overflow ||
            (overflow === bestOverflowAny.overflow &&
                shouldPrefer(spec, bestOverflowAny.spec))) {
            bestOverflowAny = { overflow, spec };
        }
        if (!isEllipsifiedLabel(spec.text) &&
            (!bestOverflowNonEllipsified ||
                overflow < bestOverflowNonEllipsified.overflow ||
                (overflow === bestOverflowNonEllipsified.overflow &&
                    shouldPrefer(spec, bestOverflowNonEllipsified.spec)))) {
            bestOverflowNonEllipsified = { overflow, spec };
        }
    }
    if (bestFit) {
        return bestFit;
    }
    if (bestOverflowNonEllipsified &&
        bestOverflowAny &&
        bestOverflowNonEllipsified.overflow <=
            bestOverflowAny.overflow + charts_constants_1.CARTESIAN_LABEL_OVERFLOW_PREFERENCE_BUFFER) {
        return bestOverflowNonEllipsified.spec;
    }
    return bestOverflowAny.spec;
};
const getRotatedTextElementBottom = (element) => {
    if (element.type !== "text") {
        return element.y + element.height;
    }
    const rotated = getRotatedBoundingBox(element.width, element.height, element.angle);
    return element.y + element.height / 2 + rotated.height / 2;
};
exports.getRotatedTextElementBottom = getRotatedTextElementBottom;
const chartXLabels = (spreadsheet, x, y, backgroundColor, layout) => {
    const fontFamily = charts_constants_1.commonProps.fontFamily;
    const fontSize = common_1.FONT_SIZES.sm;
    const lineHeight = (0, common_1.getLineHeight)(fontFamily);
    const fontString = (0, common_1.getFontString)({ fontFamily, fontSize });
    const maxRotatedWidth = Math.max(1, layout.slotWidth +
        layout.gap -
        charts_constants_1.CARTESIAN_LABEL_SLOT_PADDING * 2 +
        charts_constants_1.CARTESIAN_LABEL_ROTATED_WIDTH_BUFFER);
    const axisY = y;
    return (spreadsheet.labels?.map((label, index) => {
        const labelSpec = getCartesianAxisLabelSpec(label, layout.xLabelMaxWidth, maxRotatedWidth, fontString, lineHeight);
        const centerX = x +
            index * (layout.slotWidth + layout.gap) +
            layout.gap +
            layout.slotWidth / 2;
        const labelY = axisY +
            charts_constants_1.CARTESIAN_LABEL_AXIS_CLEARANCE +
            (labelSpec.rotatedHeight - labelSpec.metrics.height) / 2;
        return (0, element_1.newTextElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            text: labelSpec.text,
            originalText: labelSpec.wrapped ? label : labelSpec.text,
            autoResize: !labelSpec.wrapped,
            x: centerX,
            y: labelY,
            angle: charts_constants_1.CARTESIAN_LABEL_ROTATION,
            fontSize,
            lineHeight,
            textAlign: "center",
            verticalAlign: "top",
        });
    }) || []);
};
exports.chartXLabels = chartXLabels;
const chartYLabels = (spreadsheet, x, y, backgroundColor, layout, maxValue = Math.max(...spreadsheet.series[0].values)) => {
    const minYLabel = (0, element_1.newTextElement)({
        backgroundColor,
        ...charts_constants_1.commonProps,
        x: x - layout.gap,
        y: y - layout.gap,
        text: "0",
        textAlign: "right",
    });
    const maxYLabel = (0, element_1.newTextElement)({
        backgroundColor,
        ...charts_constants_1.commonProps,
        x: x - layout.gap,
        y: y - layout.chartHeight - minYLabel.height / 2,
        text: maxValue.toLocaleString(),
        textAlign: "right",
    });
    return [minYLabel, maxYLabel];
};
const chartLines = (spreadsheet, x, y, backgroundColor, layout) => {
    const { chartWidth, chartHeight } = (0, exports.getChartDimensions)(spreadsheet, layout);
    const xLine = (0, element_1.newLinearElement)({
        backgroundColor,
        ...charts_constants_1.commonProps,
        type: "line",
        x,
        y,
        width: chartWidth,
        points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(chartWidth, 0)],
    });
    const yLine = (0, element_1.newLinearElement)({
        backgroundColor,
        ...charts_constants_1.commonProps,
        type: "line",
        x,
        y,
        height: chartHeight,
        points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(0, -chartHeight)],
    });
    const maxLine = (0, element_1.newLinearElement)({
        backgroundColor,
        ...charts_constants_1.commonProps,
        type: "line",
        x,
        y: y - layout.chartHeight - layout.gap,
        strokeStyle: "dotted",
        width: chartWidth,
        opacity: charts_constants_1.GRID_OPACITY,
        points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(chartWidth, 0)],
    });
    return [xLine, yLine, maxLine];
};
// For the maths behind it https://excalidraw.com/#json=6320864370884608,O_5xfD-Agh32tytHpRJx1g
const chartBaseElements = (spreadsheet, x, y, backgroundColor, layout, maxValue = Math.max(...spreadsheet.series[0].values), debug) => {
    const { chartWidth, chartHeight } = (0, exports.getChartDimensions)(spreadsheet, layout);
    const title = spreadsheet.title
        ? (0, element_1.newTextElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            text: spreadsheet.title,
            x: x + chartWidth / 2,
            y: y - layout.chartHeight - layout.gap * 2 - common_1.DEFAULT_FONT_SIZE,
            roundness: null,
            textAlign: "center",
            fontSize: common_1.FONT_SIZES.xl,
            fontFamily: common_1.FONT_FAMILY["Lilita One"],
        })
        : null;
    const debugRect = debug
        ? (0, element_1.newElement)({
            backgroundColor,
            ...charts_constants_1.commonProps,
            type: "rectangle",
            x,
            y: y - chartHeight,
            width: chartWidth,
            height: chartHeight,
            strokeColor: common_1.COLOR_PALETTE.black,
            fillStyle: "solid",
            opacity: 6,
        })
        : null;
    return [
        ...(debugRect ? [debugRect] : []),
        ...(title ? [title] : []),
        ...(0, exports.chartXLabels)(spreadsheet, x, y, backgroundColor, layout),
        ...chartYLabels(spreadsheet, x, y, backgroundColor, layout, maxValue),
        ...chartLines(spreadsheet, x, y, backgroundColor, layout),
    ];
};
exports.chartBaseElements = chartBaseElements;
