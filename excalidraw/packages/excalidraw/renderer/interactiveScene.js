"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInteractiveScene = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const renderSnaps_1 = require("../renderer/renderSnaps");
const roundRect_1 = require("../renderer/roundRect");
const scrollbars_1 = require("../scene/scrollbars");
const clients_1 = require("../clients");
const textAutoResizeHandle_1 = require("../textAutoResizeHandle");
const helpers_1 = require("./helpers");
const renderElbowArrowMidPointHighlight = (context, appState) => {
    (0, common_1.invariant)(appState.selectedLinearElement, "selectedLinearElement is null");
    const { segmentMidPointHoveredCoords } = appState.selectedLinearElement;
    (0, common_1.invariant)(segmentMidPointHoveredCoords, "midPointCoords is null");
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    highlightPoint(segmentMidPointHoveredCoords, context, appState);
    context.restore();
};
const renderLinearElementPointHighlight = (context, appState, elementsMap) => {
    const { elementId, hoverPointIndex } = appState.selectedLinearElement;
    if (appState.selectedLinearElement?.isEditing &&
        appState.selectedLinearElement?.selectedPointsIndices?.includes(hoverPointIndex)) {
        return;
    }
    if (appState.selectedLinearElement?.isDragging) {
        return;
    }
    const element = element_1.LinearElementEditor.getElement(elementId, elementsMap);
    if (!element) {
        return;
    }
    const point = element_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(element, hoverPointIndex, elementsMap);
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    highlightPoint(point, context, appState);
    context.restore();
};
const highlightPoint = (point, context, appState) => {
    context.fillStyle = "rgba(105, 101, 219, 0.4)";
    (0, helpers_1.fillCircle)(context, point[0], point[1], element_1.LinearElementEditor.POINT_HANDLE_SIZE / appState.zoom.value, false);
};
const renderFocusPointHighlight = (context, appState, focusPoint) => {
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    highlightPoint(focusPoint, context, appState);
    context.restore();
};
const renderSingleLinearPoint = (context, appState, point, radius, isSelected, isPhantomPoint, isOverlappingPoint) => {
    context.strokeStyle = "#5e5ad8";
    context.setLineDash([]);
    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    if (isSelected) {
        context.fillStyle = "rgba(134, 131, 226, 0.9)";
    }
    else if (isPhantomPoint) {
        context.fillStyle = "rgba(177, 151, 252, 0.7)";
    }
    (0, helpers_1.fillCircle)(context, point[0], point[1], (isOverlappingPoint
        ? radius * (appState.selectedLinearElement?.isEditing ? 1.5 : 2)
        : radius) / appState.zoom.value, !isPhantomPoint, !isOverlappingPoint || isSelected);
};
const renderBindingHighlightForBindableElement_simple = (context, suggestedBinding, elementsMap, appState, pointerCoords) => {
    const enclosingFrame = suggestedBinding.element.frameId &&
        elementsMap.get(suggestedBinding.element.frameId);
    if (enclosingFrame && (0, element_1.isFrameLikeElement)(enclosingFrame)) {
        context.translate(enclosingFrame.x, enclosingFrame.y);
        context.beginPath();
        if (common_1.FRAME_STYLE.radius && context.roundRect) {
            context.roundRect(-1, -1, enclosingFrame.width + 1, enclosingFrame.height + 1, common_1.FRAME_STYLE.radius / appState.zoom.value);
        }
        else {
            context.rect(-1, -1, enclosingFrame.width + 1, enclosingFrame.height + 1);
        }
        context.clip();
        context.translate(-enclosingFrame.x, -enclosingFrame.y);
    }
    switch (suggestedBinding.element.type) {
        case "magicframe":
        case "frame":
            context.save();
            context.translate(suggestedBinding.element.x, suggestedBinding.element.y);
            context.lineWidth = common_1.FRAME_STYLE.strokeWidth / appState.zoom.value;
            context.strokeStyle =
                appState.theme === common_1.THEME.DARK
                    ? `rgba(3, 93, 161, 1)`
                    : `rgba(106, 189, 252, 1)`;
            if (common_1.FRAME_STYLE.radius && context.roundRect) {
                context.beginPath();
                context.roundRect(0, 0, suggestedBinding.element.width, suggestedBinding.element.height, common_1.FRAME_STYLE.radius / appState.zoom.value);
                context.stroke();
                context.closePath();
            }
            else {
                context.strokeRect(0, 0, suggestedBinding.element.width, suggestedBinding.element.height);
            }
            context.restore();
            break;
        default:
            context.save();
            const center = (0, element_1.elementCenterPoint)(suggestedBinding.element, elementsMap);
            context.translate(center[0], center[1]);
            context.rotate(suggestedBinding.element.angle);
            context.translate(-center[0], -center[1]);
            context.translate(suggestedBinding.element.x, suggestedBinding.element.y);
            context.lineWidth =
                (0, math_1.clamp)(1.75, suggestedBinding.element.strokeWidth, 4) /
                    Math.max(0.25, appState.zoom.value);
            context.strokeStyle =
                appState.theme === common_1.THEME.DARK
                    ? `rgba(3, 93, 161, 1)`
                    : `rgba(106, 189, 252, 1)`;
            switch (suggestedBinding.element.type) {
                case "ellipse":
                    context.beginPath();
                    context.ellipse(suggestedBinding.element.width / 2, suggestedBinding.element.height / 2, suggestedBinding.element.width / 2, suggestedBinding.element.height / 2, 0, 0, 2 * Math.PI);
                    context.closePath();
                    context.stroke();
                    break;
                case "diamond":
                    {
                        const [segments, curves] = (0, element_1.deconstructDiamondElement)(suggestedBinding.element);
                        // Draw each line segment individually
                        segments.forEach((segment) => {
                            context.beginPath();
                            context.moveTo(segment[0][0] - suggestedBinding.element.x, segment[0][1] - suggestedBinding.element.y);
                            context.lineTo(segment[1][0] - suggestedBinding.element.x, segment[1][1] - suggestedBinding.element.y);
                            context.stroke();
                        });
                        // Draw each curve individually (for rounded corners)
                        curves.forEach((curve) => {
                            const [start, control1, control2, end] = curve;
                            context.beginPath();
                            context.moveTo(start[0] - suggestedBinding.element.x, start[1] - suggestedBinding.element.y);
                            context.bezierCurveTo(control1[0] - suggestedBinding.element.x, control1[1] - suggestedBinding.element.y, control2[0] - suggestedBinding.element.x, control2[1] - suggestedBinding.element.y, end[0] - suggestedBinding.element.x, end[1] - suggestedBinding.element.y);
                            context.stroke();
                        });
                    }
                    break;
                default:
                    {
                        const [segments, curves] = (0, element_1.deconstructRectanguloidElement)(suggestedBinding.element);
                        // Draw each line segment individually
                        segments.forEach((segment) => {
                            context.beginPath();
                            context.moveTo(segment[0][0] - suggestedBinding.element.x, segment[0][1] - suggestedBinding.element.y);
                            context.lineTo(segment[1][0] - suggestedBinding.element.x, segment[1][1] - suggestedBinding.element.y);
                            context.stroke();
                        });
                        // Draw each curve individually (for rounded corners)
                        curves.forEach((curve) => {
                            const [start, control1, control2, end] = curve;
                            context.beginPath();
                            context.moveTo(start[0] - suggestedBinding.element.x, start[1] - suggestedBinding.element.y);
                            context.bezierCurveTo(control1[0] - suggestedBinding.element.x, control1[1] - suggestedBinding.element.y, control2[0] - suggestedBinding.element.x, control2[1] - suggestedBinding.element.y, end[0] - suggestedBinding.element.x, end[1] - suggestedBinding.element.y);
                            context.stroke();
                        });
                    }
                    break;
            }
            context.restore();
            break;
    }
    if (appState.isMidpointSnappingEnabled &&
        ((0, element_1.isFrameLikeElement)(suggestedBinding.element) ||
            (0, element_1.isBindableElement)(suggestedBinding.element))) {
        // Draw midpoint indicators
        const linearElement = appState.selectedLinearElement;
        const arrow = linearElement?.elementId &&
            element_1.LinearElementEditor.getElement(linearElement?.elementId, elementsMap);
        const cursorIsInsideBindable = pointerCoords &&
            (0, element_1.hitElementItself)({
                point: pointerCoords,
                element: suggestedBinding.element,
                elementsMap,
                threshold: 0,
                overrideShouldTestInside: true,
            });
        const isElbow = (arrow && (0, element_1.isElbowArrow)(arrow)) ||
            (appState.activeTool.type === "arrow" &&
                appState.currentItemArrowType === "elbow");
        if (!cursorIsInsideBindable || isElbow) {
            context.save();
            const center = (0, element_1.elementCenterPoint)(suggestedBinding.element, elementsMap);
            let midpoints;
            if (suggestedBinding.element.type === "diamond") {
                const center = (0, element_1.elementCenterPoint)(suggestedBinding.element, elementsMap);
                midpoints = (0, element_1.getDiamondBaseCorners)(suggestedBinding.element).map((curve) => {
                    const point = (0, math_1.bezierEquation)(curve, 0.5);
                    const rotatedPoint = (0, math_1.pointRotateRads)(point, center, suggestedBinding.element.angle);
                    return (0, math_1.pointFrom)(rotatedPoint[0], rotatedPoint[1]);
                });
            }
            else {
                const basePoints = [
                    {
                        x: suggestedBinding.element.width,
                        y: suggestedBinding.element.height / 2,
                    }, // RIGHT
                    {
                        x: suggestedBinding.element.width / 2,
                        y: suggestedBinding.element.height,
                    }, // BOTTOM
                    { x: 0, y: suggestedBinding.element.height / 2 }, // LEFT
                    { x: suggestedBinding.element.width / 2, y: 0 }, // TOP
                ];
                midpoints = basePoints.map((point) => {
                    const globalPoint = (0, math_1.pointFrom)(point.x + suggestedBinding.element.x, point.y + suggestedBinding.element.y);
                    const rotatedPoint = (0, math_1.pointRotateRads)(globalPoint, center, suggestedBinding.element.angle);
                    return (0, math_1.pointFrom)(rotatedPoint[0], rotatedPoint[1]);
                });
            }
            const hoveredMidpoint = pointerCoords &&
                midpoints.reduce((closestIdx, point, idx) => {
                    const distance = (0, math_1.pointDistance)(point, pointerCoords);
                    if (idx === -1 || distance < closestIdx.distance) {
                        return { idx, distance };
                    }
                    return closestIdx;
                }, {
                    idx: -1,
                    distance: Infinity,
                });
            const midpointRadius = 4 / appState.zoom.value;
            const highlightThreshold = (0, element_1.maxBindingDistance_simple)(appState.zoom) +
                suggestedBinding.element.strokeWidth / 2;
            midpoints.forEach((midpoint, idx) => {
                const isHighlighted = (!cursorIsInsideBindable || isElbow) &&
                    hoveredMidpoint?.idx === idx &&
                    hoveredMidpoint.distance <= highlightThreshold;
                // also render midpoint if cursor close but not highlighted
                // (for elbows, always show all points)
                const isShown = !isHighlighted &&
                    (isElbow ||
                        (idx === hoveredMidpoint?.idx &&
                            hoveredMidpoint.distance <= highlightThreshold * 2));
                if (isHighlighted) {
                    context.fillStyle =
                        appState.theme === common_1.THEME.DARK
                            ? `rgba(3, 93, 161, 1)`
                            : `rgba(106, 189, 252, 1)`;
                    context.beginPath();
                    context.arc(midpoint[0], midpoint[1], midpointRadius, 0, 2 * Math.PI);
                    context.fill();
                }
                else if (isShown) {
                    context.fillStyle =
                        appState.theme === common_1.THEME.DARK
                            ? `rgba(0, 0, 0, 0.8)`
                            : `rgba(65, 65, 65, 0.5)`;
                    context.beginPath();
                    context.arc(midpoint[0], midpoint[1], midpointRadius, 0, 2 * Math.PI);
                    context.fill();
                }
            });
            context.restore();
        }
    }
};
const renderBindingHighlightForBindableElement_complex = (app, context, element, allElementsMap, appState, deltaTime, state) => {
    const countdownInProgress = app.state.bindMode === "orbit" && app.bindModeHandler !== null;
    const remainingTime = common_1.BIND_MODE_TIMEOUT -
        (state?.runtime ?? (countdownInProgress ? 0 : common_1.BIND_MODE_TIMEOUT));
    const opacity = (0, math_1.clamp)((1 / common_1.BIND_MODE_TIMEOUT) * remainingTime, 0.0001, 1);
    const offset = element.strokeWidth / 2;
    const enclosingFrame = element.frameId && allElementsMap.get(element.frameId);
    if (enclosingFrame && (0, element_1.isFrameLikeElement)(enclosingFrame)) {
        context.translate(enclosingFrame.x, enclosingFrame.y);
        context.beginPath();
        if (common_1.FRAME_STYLE.radius && context.roundRect) {
            context.roundRect(-1, -1, enclosingFrame.width + 1, enclosingFrame.height + 1, common_1.FRAME_STYLE.radius / appState.zoom.value);
        }
        else {
            context.rect(-1, -1, enclosingFrame.width + 1, enclosingFrame.height + 1);
        }
        context.clip();
        context.translate(-enclosingFrame.x, -enclosingFrame.y);
    }
    switch (element.type) {
        case "magicframe":
        case "frame":
            context.save();
            context.translate(element.x, element.y);
            context.lineWidth = common_1.FRAME_STYLE.strokeWidth / appState.zoom.value;
            context.strokeStyle =
                appState.theme === common_1.THEME.DARK
                    ? `rgba(3, 93, 161, ${opacity})`
                    : `rgba(106, 189, 252, ${opacity})`;
            if (common_1.FRAME_STYLE.radius && context.roundRect) {
                context.beginPath();
                context.roundRect(0, 0, element.width, element.height, common_1.FRAME_STYLE.radius / appState.zoom.value);
                context.stroke();
                context.closePath();
            }
            else {
                context.strokeRect(0, 0, element.width, element.height);
            }
            context.restore();
            break;
        default:
            context.save();
            const center = (0, element_1.elementCenterPoint)(element, allElementsMap);
            const cx = center[0] + appState.scrollX;
            const cy = center[1] + appState.scrollY;
            context.translate(cx, cy);
            context.rotate(element.angle);
            context.translate(-cx, -cy);
            context.translate(element.x + appState.scrollX - offset, element.y + appState.scrollY - offset);
            context.lineWidth =
                (0, math_1.clamp)(2.5, element.strokeWidth * 1.75, 4) /
                    Math.max(0.25, appState.zoom.value);
            context.strokeStyle =
                appState.theme === common_1.THEME.DARK
                    ? `rgba(3, 93, 161, ${opacity / 2})`
                    : `rgba(106, 189, 252, ${opacity / 2})`;
            switch (element.type) {
                case "ellipse":
                    context.beginPath();
                    context.ellipse((element.width + offset * 2) / 2, (element.height + offset * 2) / 2, (element.width + offset * 2) / 2, (element.height + offset * 2) / 2, 0, 0, 2 * Math.PI);
                    context.closePath();
                    context.stroke();
                    break;
                case "diamond":
                    {
                        const [segments, curves] = (0, element_1.deconstructDiamondElement)(element, offset);
                        // Draw each line segment individually
                        segments.forEach((segment) => {
                            context.beginPath();
                            context.moveTo(segment[0][0] - element.x + offset, segment[0][1] - element.y + offset);
                            context.lineTo(segment[1][0] - element.x + offset, segment[1][1] - element.y + offset);
                            context.stroke();
                        });
                        // Draw each curve individually (for rounded corners)
                        curves.forEach((curve) => {
                            const [start, control1, control2, end] = curve;
                            context.beginPath();
                            context.moveTo(start[0] - element.x + offset, start[1] - element.y + offset);
                            context.bezierCurveTo(control1[0] - element.x + offset, control1[1] - element.y + offset, control2[0] - element.x + offset, control2[1] - element.y + offset, end[0] - element.x + offset, end[1] - element.y + offset);
                            context.stroke();
                        });
                    }
                    break;
                default:
                    {
                        const [segments, curves] = (0, element_1.deconstructRectanguloidElement)(element, offset);
                        // Draw each line segment individually
                        segments.forEach((segment) => {
                            context.beginPath();
                            context.moveTo(segment[0][0] - element.x + offset, segment[0][1] - element.y + offset);
                            context.lineTo(segment[1][0] - element.x + offset, segment[1][1] - element.y + offset);
                            context.stroke();
                        });
                        // Draw each curve individually (for rounded corners)
                        curves.forEach((curve) => {
                            const [start, control1, control2, end] = curve;
                            context.beginPath();
                            context.moveTo(start[0] - element.x + offset, start[1] - element.y + offset);
                            context.bezierCurveTo(control1[0] - element.x + offset, control1[1] - element.y + offset, control2[0] - element.x + offset, control2[1] - element.y + offset, end[0] - element.x + offset, end[1] - element.y + offset);
                            context.stroke();
                        });
                    }
                    break;
            }
            context.restore();
            break;
    }
    // Middle indicator is not rendered after it expired
    if (!countdownInProgress || (state?.runtime ?? 0) > common_1.BIND_MODE_TIMEOUT) {
        return;
    }
    const radius = 0.5 * (Math.min(element.width, element.height) / 2);
    // Draw center snap area
    if (!(0, element_1.isFrameLikeElement)(element)) {
        context.save();
        context.translate(element.x + appState.scrollX, element.y + appState.scrollY);
        const PROGRESS_RATIO = (1 / common_1.BIND_MODE_TIMEOUT) * remainingTime;
        context.strokeStyle = "rgba(0, 0, 0, 0.2)";
        context.lineWidth = 1 / appState.zoom.value;
        context.setLineDash([4 / appState.zoom.value, 4 / appState.zoom.value]);
        context.lineDashOffset = (-PROGRESS_RATIO * 10) / appState.zoom.value;
        context.beginPath();
        context.ellipse(element.width / 2, element.height / 2, radius, radius, 0, 0, 2 * Math.PI);
        context.stroke();
        // context.strokeStyle = "transparent";
        context.fillStyle = "rgba(0, 0, 0, 0.04)";
        context.beginPath();
        context.ellipse(element.width / 2, element.height / 2, radius * (1 - opacity), radius * (1 - opacity), 0, 0, 2 * Math.PI);
        context.fill();
        context.restore();
        if (appState.isMidpointSnappingEnabled) {
            // Draw midpoint indicators
            context.save();
            context.translate(element.x + appState.scrollX, element.y + appState.scrollY);
            const midpointRadius = 5 / appState.zoom.value;
            const cutoutPadding = 5 / appState.zoom.value;
            const cutoutRadius = midpointRadius + cutoutPadding;
            let midpoints;
            if (element.type === "diamond") {
                const [, curves] = (0, element_1.deconstructDiamondElement)(element);
                const center = (0, element_1.elementCenterPoint)(element, allElementsMap);
                midpoints = curves.map((curve) => {
                    const point = (0, math_1.bezierEquation)(curve, 0.5);
                    const rotatedPoint = (0, math_1.pointRotateRads)(point, center, element.angle);
                    return {
                        x: rotatedPoint[0] - element.x,
                        y: rotatedPoint[1] - element.y,
                    };
                });
            }
            else {
                const center = (0, element_1.elementCenterPoint)(element, allElementsMap);
                const basePoints = [
                    { x: element.width / 2, y: 0 }, // TOP
                    { x: element.width, y: element.height / 2 }, // RIGHT
                    { x: element.width / 2, y: element.height }, // BOTTOM
                    { x: 0, y: element.height / 2 }, // LEFT
                ];
                midpoints = basePoints.map((point) => {
                    const globalPoint = (0, math_1.pointFrom)(point.x + element.x, point.y + element.y);
                    const rotatedPoint = (0, math_1.pointRotateRads)(globalPoint, center, element.angle);
                    return {
                        x: rotatedPoint[0] - element.x,
                        y: rotatedPoint[1] - element.y,
                    };
                });
            }
            // Clear cutouts around midpoints
            midpoints.forEach((midpoint) => {
                context.clearRect(midpoint.x - cutoutRadius, midpoint.y - cutoutRadius, cutoutRadius * 2, cutoutRadius * 2);
            });
            context.fillStyle =
                appState.theme === common_1.THEME.DARK
                    ? `rgba(3, 93, 161, ${opacity})`
                    : `rgba(106, 189, 252, ${opacity})`;
            midpoints.forEach((midpoint) => {
                context.beginPath();
                context.arc(midpoint.x, midpoint.y, midpointRadius, 0, 2 * Math.PI);
                context.fill();
            });
            context.restore();
        }
    }
    return {
        runtime: (state?.runtime ?? 0) + deltaTime,
    };
};
const renderBindingHighlightForBindableElement = (app, context, suggestedBinding, allElementsMap, appState, deltaTime, state) => {
    if (suggestedBinding === null) {
        return;
    }
    if ((0, common_1.getFeatureFlag)("COMPLEX_BINDINGS")) {
        return renderBindingHighlightForBindableElement_complex(app, context, suggestedBinding.element, allElementsMap, appState, deltaTime, state);
    }
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    const pointerCoords = app.lastPointerMoveCoords
        ? (0, math_1.pointFrom)(app.lastPointerMoveCoords.x, app.lastPointerMoveCoords.y)
        : null;
    renderBindingHighlightForBindableElement_simple(context, suggestedBinding, allElementsMap, appState, pointerCoords);
    context.restore();
};
const renderSelectionBorder = (context, appState, elementProperties) => {
    const { angle, x1, y1, x2, y2, selectionColors, cx, cy, dashed, activeEmbeddable, } = elementProperties;
    const elementWidth = x2 - x1;
    const elementHeight = y2 - y1;
    const padding = elementProperties.padding ?? common_1.DEFAULT_TRANSFORM_HANDLE_SPACING * 2;
    const linePadding = padding / appState.zoom.value;
    const lineWidth = 8 / appState.zoom.value;
    const spaceWidth = 4 / appState.zoom.value;
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    context.lineWidth = (activeEmbeddable ? 4 : 1) / appState.zoom.value;
    const count = selectionColors.length;
    for (let index = 0; index < count; ++index) {
        context.strokeStyle = selectionColors[index];
        if (dashed) {
            context.setLineDash([
                lineWidth,
                spaceWidth + (lineWidth + spaceWidth) * (count - 1),
            ]);
        }
        context.lineDashOffset = (lineWidth + spaceWidth) * index;
        (0, helpers_1.strokeRectWithRotation_simple)(context, x1 - linePadding, y1 - linePadding, elementWidth + linePadding * 2, elementHeight + linePadding * 2, cx, cy, angle);
    }
    context.restore();
};
const renderFrameHighlight = (context, appState, frame, elementsMap) => {
    const [x1, y1, x2, y2] = (0, element_4.getElementAbsoluteCoords)(frame, elementsMap);
    const width = x2 - x1;
    const height = y2 - y1;
    context.strokeStyle = "rgb(0,118,255)";
    context.lineWidth = common_1.FRAME_STYLE.strokeWidth / appState.zoom.value;
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    (0, helpers_1.strokeRectWithRotation_simple)(context, x1, y1, width, height, x1 + width / 2, y1 + height / 2, frame.angle, false, common_1.FRAME_STYLE.radius / appState.zoom.value);
    context.restore();
};
const renderElementsBoxHighlight = (context, appState, elements, config) => {
    const { colors = ["rgb(0,118,255)"], dashed = false } = config || {};
    const individualElements = elements.filter((element) => element.groupIds.length === 0);
    const elementsInGroups = elements.filter((element) => element.groupIds.length > 0);
    const getSelectionFromElements = (elements) => {
        const [x1, y1, x2, y2] = (0, element_4.getCommonBounds)(elements);
        return {
            angle: 0,
            x1,
            x2,
            y1,
            y2,
            selectionColors: colors,
            dashed,
            cx: x1 + (x2 - x1) / 2,
            cy: y1 + (y2 - y1) / 2,
            activeEmbeddable: false,
        };
    };
    const getSelectionForGroupId = (groupId) => {
        const groupElements = (0, element_3.getElementsInGroup)(elements, groupId);
        return getSelectionFromElements(groupElements);
    };
    Object.entries((0, element_3.selectGroupsFromGivenElements)(elementsInGroups, appState))
        .filter(([id, isSelected]) => isSelected)
        .map(([id, isSelected]) => id)
        .map((groupId) => getSelectionForGroupId(groupId))
        .concat(individualElements.map((element) => getSelectionFromElements([element])))
        .forEach((selection) => renderSelectionBorder(context, appState, selection));
};
const renderLinearPointHandles = (context, appState, element, elementsMap) => {
    if (!appState.selectedLinearElement) {
        return;
    }
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    context.lineWidth = 1 / appState.zoom.value;
    const points = element_1.LinearElementEditor.getPointsGlobalCoordinates(element, elementsMap);
    const { POINT_HANDLE_SIZE } = element_1.LinearElementEditor;
    const radius = appState.selectedLinearElement?.isEditing
        ? POINT_HANDLE_SIZE
        : POINT_HANDLE_SIZE / 2;
    const _isElbowArrow = (0, element_1.isElbowArrow)(element);
    const _isLineElement = (0, element_1.isLineElement)(element);
    points.forEach((point, idx) => {
        if (_isElbowArrow && idx !== 0 && idx !== points.length - 1) {
            return;
        }
        const isOverlappingPoint = idx > 0 &&
            (idx !== points.length - 1 || !_isLineElement || !element.polygon) &&
            (0, math_1.pointsEqual)(point, idx === points.length - 1 ? points[0] : points[idx - 1], 2 / appState.zoom.value);
        let isSelected = !!appState.selectedLinearElement?.isEditing &&
            !!appState.selectedLinearElement?.selectedPointsIndices?.includes(idx);
        // when element is a polygon, highlight the last point as well if first
        // point is selected since they overlap and the last point tends to be
        // rendered on top
        if (_isLineElement &&
            element.polygon &&
            !isSelected &&
            idx === element.points.length - 1 &&
            !!appState.selectedLinearElement?.isEditing &&
            !!appState.selectedLinearElement?.selectedPointsIndices?.includes(0)) {
            isSelected = true;
        }
        renderSingleLinearPoint(context, appState, point, radius, isSelected, false, isOverlappingPoint);
    });
    // Rendering segment mid points
    if ((0, element_1.isElbowArrow)(element)) {
        const fixedSegments = element.fixedSegments?.map((segment) => segment.index) || [];
        points.slice(0, -1).forEach((p, idx) => {
            if (!element_1.LinearElementEditor.isSegmentTooShort(element, points[idx + 1], points[idx], idx, appState.zoom, elementsMap)) {
                renderSingleLinearPoint(context, appState, (0, math_1.pointFrom)((p[0] + points[idx + 1][0]) / 2, (p[1] + points[idx + 1][1]) / 2), POINT_HANDLE_SIZE / 2, false, !fixedSegments.includes(idx + 1), false);
            }
        });
    }
    else {
        const midPoints = element_1.LinearElementEditor.getEditorMidPoints(element, elementsMap, appState).filter((midPoint, idx, midPoints) => midPoint !== null &&
            !((0, element_1.isElbowArrow)(element) && (idx === 0 || idx === midPoints.length - 1)));
        midPoints.forEach((segmentMidPoint) => {
            if (appState.selectedLinearElement?.isEditing || points.length === 2) {
                renderSingleLinearPoint(context, appState, segmentMidPoint, POINT_HANDLE_SIZE / 2, false, true, false);
            }
        });
    }
    context.restore();
};
const renderFocusPointConnectionLine = (context, appState, fromPoint, toPoint) => {
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    context.strokeStyle = "rgba(134, 131, 226, 0.6)";
    context.lineWidth = 1 / appState.zoom.value;
    context.setLineDash([4 / appState.zoom.value, 4 / appState.zoom.value]);
    context.beginPath();
    context.moveTo(fromPoint[0], fromPoint[1]);
    context.lineTo(toPoint[0], toPoint[1]);
    context.stroke();
    context.restore();
};
const renderFocusPointCicle = (context, appState, point, radius, isHovered) => {
    context.save();
    context.translate(appState.scrollX, appState.scrollY);
    context.strokeStyle = "rgba(134, 131, 226, 0.6)";
    context.lineWidth = 1 / appState.zoom.value;
    context.setLineDash([]);
    context.fillStyle = isHovered
        ? "rgba(134, 131, 226, 0.9)"
        : "rgba(255, 255, 255, 0.9)";
    (0, helpers_1.fillCircle)(context, point[0], point[1], radius / appState.zoom.value, true, true);
    context.restore();
};
const renderFocusPointIndicator = ({ arrow, appState, type, context, elementsMap, }) => {
    const binding = type === "start" ? arrow.startBinding : arrow.endBinding;
    const bindableElement = binding?.elementId && elementsMap.get(binding.elementId);
    if (!bindableElement ||
        !(0, element_1.isBindableElement)(bindableElement) ||
        bindableElement.isDeleted) {
        return;
    }
    const focusPoint = (0, element_5.getGlobalFixedPointForBindableElement)(binding.fixedPoint, bindableElement, elementsMap);
    // Only render if focus point is within the bindable element
    if (!(0, element_5.isFocusPointVisible)(focusPoint, arrow, bindableElement, elementsMap, appState, type)) {
        return;
    }
    const linearState = appState.selectedLinearElement;
    const isDragging = !!linearState?.isDragging;
    const pointIndex = type === "start" ? 0 : arrow.points.length - 1;
    const pointSelected = !!linearState?.selectedPointsIndices?.includes(pointIndex);
    // render focus point highlight
    // ----------------------------
    if (linearState?.hoveredFocusPointBinding === type &&
        !linearState.draggedFocusPointBinding) {
        renderFocusPointHighlight(context, appState, focusPoint);
    }
    // render focus point
    // ----------------------------
    if (!(pointSelected && isDragging)) {
        const focusPoint = (0, element_5.getGlobalFixedPointForBindableElement)(binding.fixedPoint, bindableElement, elementsMap);
        const isHovered = linearState?.hoveredFocusPointBinding === type;
        // Render dashed line from arrow start point to focus point
        const arrowPoint = element_1.LinearElementEditor.getPointAtIndexGlobalCoordinates(arrow, pointIndex, elementsMap);
        renderFocusPointConnectionLine(context, appState, arrowPoint, focusPoint);
        renderFocusPointCicle(context, appState, focusPoint, element_1.FOCUS_POINT_SIZE / 1.5, isHovered);
    }
};
const renderTransformHandles = (context, renderConfig, appState, transformHandles, angle) => {
    Object.keys(transformHandles).forEach((key) => {
        const transformHandle = transformHandles[key];
        if (transformHandle !== undefined) {
            const [x, y, width, height] = transformHandle;
            context.save();
            context.lineWidth = 1 / appState.zoom.value;
            if (renderConfig.selectionColor) {
                context.strokeStyle = renderConfig.selectionColor;
            }
            if (key === "rotation") {
                (0, helpers_1.fillCircle)(context, x + width / 2, y + height / 2, width / 2, true);
                // prefer round corners if roundRect API is available
            }
            else if (context.roundRect) {
                context.beginPath();
                context.roundRect(x, y, width, height, 2 / appState.zoom.value);
                context.fill();
                context.stroke();
            }
            else {
                (0, helpers_1.strokeRectWithRotation_simple)(context, x, y, width, height, x + width / 2, y + height / 2, angle, true);
            }
            context.restore();
        }
    });
};
const renderCropHandles = (context, renderConfig, appState, croppingElement, elementsMap) => {
    const [x1, y1, , , cx, cy] = (0, element_4.getElementAbsoluteCoords)(croppingElement, elementsMap);
    const LINE_WIDTH = 3;
    const LINE_LENGTH = 20;
    const ZOOMED_LINE_WIDTH = LINE_WIDTH / appState.zoom.value;
    const ZOOMED_HALF_LINE_WIDTH = ZOOMED_LINE_WIDTH / 2;
    const HALF_WIDTH = cx - x1 + ZOOMED_LINE_WIDTH;
    const HALF_HEIGHT = cy - y1 + ZOOMED_LINE_WIDTH;
    const HORIZONTAL_LINE_LENGTH = Math.min(LINE_LENGTH / appState.zoom.value, HALF_WIDTH);
    const VERTICAL_LINE_LENGTH = Math.min(LINE_LENGTH / appState.zoom.value, HALF_HEIGHT);
    context.save();
    context.fillStyle = renderConfig.selectionColor;
    context.strokeStyle = renderConfig.selectionColor;
    context.lineWidth = ZOOMED_LINE_WIDTH;
    const handles = [
        [
            // x, y
            [-HALF_WIDTH, -HALF_HEIGHT],
            // horizontal line: first start and to
            [0, ZOOMED_HALF_LINE_WIDTH],
            [HORIZONTAL_LINE_LENGTH, ZOOMED_HALF_LINE_WIDTH],
            // vertical line: second  start and to
            [ZOOMED_HALF_LINE_WIDTH, 0],
            [ZOOMED_HALF_LINE_WIDTH, VERTICAL_LINE_LENGTH],
        ],
        [
            [HALF_WIDTH - ZOOMED_HALF_LINE_WIDTH, -HALF_HEIGHT],
            [ZOOMED_HALF_LINE_WIDTH, ZOOMED_HALF_LINE_WIDTH],
            [
                -HORIZONTAL_LINE_LENGTH + ZOOMED_HALF_LINE_WIDTH,
                ZOOMED_HALF_LINE_WIDTH,
            ],
            [0, 0],
            [0, VERTICAL_LINE_LENGTH],
        ],
        [
            [-HALF_WIDTH, HALF_HEIGHT],
            [0, -ZOOMED_HALF_LINE_WIDTH],
            [HORIZONTAL_LINE_LENGTH, -ZOOMED_HALF_LINE_WIDTH],
            [ZOOMED_HALF_LINE_WIDTH, 0],
            [ZOOMED_HALF_LINE_WIDTH, -VERTICAL_LINE_LENGTH],
        ],
        [
            [HALF_WIDTH - ZOOMED_HALF_LINE_WIDTH, HALF_HEIGHT],
            [ZOOMED_HALF_LINE_WIDTH, -ZOOMED_HALF_LINE_WIDTH],
            [
                -HORIZONTAL_LINE_LENGTH + ZOOMED_HALF_LINE_WIDTH,
                -ZOOMED_HALF_LINE_WIDTH,
            ],
            [0, 0],
            [0, -VERTICAL_LINE_LENGTH],
        ],
    ];
    handles.forEach((handle) => {
        const [[x, y], [x1s, y1s], [x1t, y1t], [x2s, y2s], [x2t, y2t]] = handle;
        context.save();
        context.translate(cx, cy);
        context.rotate(croppingElement.angle);
        context.beginPath();
        context.moveTo(x + x1s, y + y1s);
        context.lineTo(x + x1t, y + y1t);
        context.stroke();
        context.beginPath();
        context.moveTo(x + x2s, y + y2s);
        context.lineTo(x + x2t, y + y2t);
        context.stroke();
        context.restore();
    });
    context.restore();
};
const renderTextBox = (text, context, appState, selectionColor) => {
    context.save();
    const padding = (0, textAutoResizeHandle_1.getTextBoxPadding)(appState.zoom.value);
    const width = text.width + padding * 2;
    const height = text.height + padding * 2;
    const cx = text.x + text.width / 2;
    const cy = text.y + text.height / 2;
    const shiftX = -(text.width / 2 + padding);
    const shiftY = -(text.height / 2 + padding);
    context.translate(cx + appState.scrollX, cy + appState.scrollY);
    context.rotate(text.angle);
    context.lineWidth = 1 / appState.zoom.value;
    context.strokeStyle = selectionColor;
    context.globalAlpha = 0.5;
    context.setLineDash([6 / appState.zoom.value, 4 / appState.zoom.value]);
    context.strokeRect(shiftX, shiftY, width, height);
    context.restore();
};
const renderResetAutoResizeHandle = (text, context, appState, selectionColor, formFactor) => {
    const autoResizeHandle = (0, textAutoResizeHandle_1.getTextAutoResizeHandle)(text, appState.zoom.value, formFactor);
    if (!autoResizeHandle) {
        return;
    }
    context.save();
    context.globalAlpha = 0.5;
    context.lineWidth = 1.5 / appState.zoom.value;
    context.lineCap = "round";
    context.strokeStyle = selectionColor;
    context.beginPath();
    context.moveTo(autoResizeHandle.start[0] + appState.scrollX, autoResizeHandle.start[1] + appState.scrollY);
    context.lineTo(autoResizeHandle.end[0] + appState.scrollX, autoResizeHandle.end[1] + appState.scrollY);
    context.stroke();
    context.restore();
};
const _renderInteractiveScene = ({ app, canvas, elementsMap, visibleElements, selectedElements, allElementsMap, scale, appState, renderConfig, editorInterface, animationState, deltaTime, }) => {
    if (canvas === null) {
        return { atLeastOneVisibleElement: false, elementsMap };
    }
    const [normalizedWidth, normalizedHeight] = (0, helpers_1.getNormalizedCanvasDimensions)(canvas, scale);
    let nextAnimationState = animationState;
    const context = (0, helpers_1.bootstrapCanvas)({
        canvas,
        scale,
        normalizedWidth,
        normalizedHeight,
    });
    // Apply zoom
    context.save();
    context.scale(appState.zoom.value, appState.zoom.value);
    let editingLinearElement = undefined;
    visibleElements.forEach((element) => {
        // Getting the element using LinearElementEditor during collab mismatches version - being one head of visible elements due to
        // ShapeCache returns empty hence making sure that we get the
        // correct element from visible elements
        if (appState.selectedLinearElement?.isEditing &&
            appState.selectedLinearElement.elementId === element.id) {
            if (element) {
                editingLinearElement = element;
            }
        }
    });
    if (editingLinearElement) {
        renderLinearPointHandles(context, appState, editingLinearElement, elementsMap);
    }
    // Paint selection element
    if (appState.selectionElement && !appState.isCropping) {
        try {
            (0, element_2.renderSelectionElement)(appState.selectionElement, context, appState, renderConfig.selectionColor);
        }
        catch (error) {
            console.error(error);
        }
    }
    const activeTextElement = (0, element_1.getActiveTextElement)(selectedElements, appState);
    if (activeTextElement && !activeTextElement.autoResize) {
        renderResetAutoResizeHandle(activeTextElement, context, appState, renderConfig.selectionColor, editorInterface.formFactor);
    }
    if (appState.editingTextElement) {
        const textElement = allElementsMap.get(appState.editingTextElement.id);
        if (textElement && !textElement.autoResize) {
            renderTextBox(textElement, context, appState, renderConfig.selectionColor);
        }
    }
    if (appState.isBindingEnabled && appState.suggestedBinding) {
        nextAnimationState = {
            ...animationState,
            bindingHighlight: renderBindingHighlightForBindableElement(app, context, appState.suggestedBinding, allElementsMap, appState, deltaTime, animationState?.bindingHighlight),
        };
    }
    else {
        nextAnimationState = {
            ...animationState,
            bindingHighlight: undefined,
        };
    }
    if (appState.frameToHighlight) {
        renderFrameHighlight(context, appState, appState.frameToHighlight, elementsMap);
    }
    if (appState.elementsToHighlight) {
        renderElementsBoxHighlight(context, appState, appState.elementsToHighlight);
    }
    if (appState.activeLockedId) {
        const element = allElementsMap.get(appState.activeLockedId);
        const elements = element
            ? [element]
            : (0, element_3.getElementsInGroup)(allElementsMap, appState.activeLockedId);
        renderElementsBoxHighlight(context, appState, elements, {
            colors: ["#ced4da"],
            dashed: true,
        });
    }
    const isFrameSelected = selectedElements.some((element) => (0, element_1.isFrameLikeElement)(element));
    // Getting the element using LinearElementEditor during collab mismatches version - being one head of visible elements due to
    // ShapeCache returns empty hence making sure that we get the
    // correct element from visible elements
    if (selectedElements.length === 1 &&
        appState.selectedLinearElement?.isEditing &&
        appState.selectedLinearElement.elementId === selectedElements[0].id) {
        renderLinearPointHandles(context, appState, selectedElements[0], elementsMap);
    }
    const linearState = appState.selectedLinearElement;
    const selectedLinearElement = linearState &&
        element_1.LinearElementEditor.getElement(linearState.elementId, allElementsMap);
    // Arrows have a different highlight behavior when
    // they are the only selected element
    if (selectedLinearElement) {
        if (!appState.selectedLinearElement.isDragging) {
            if (linearState.segmentMidPointHoveredCoords) {
                renderElbowArrowMidPointHighlight(context, appState);
            }
            else if ((0, element_1.isElbowArrow)(selectedLinearElement)
                ? linearState.hoverPointIndex === 0 ||
                    linearState.hoverPointIndex ===
                        selectedLinearElement.points.length - 1
                : linearState.hoverPointIndex >= 0) {
                renderLinearElementPointHighlight(context, appState, elementsMap);
            }
        }
        if ((0, element_1.isArrowElement)(selectedLinearElement)) {
            renderFocusPointIndicator({
                arrow: selectedLinearElement,
                elementsMap: allElementsMap,
                appState,
                context,
                type: "start",
            });
            renderFocusPointIndicator({
                arrow: selectedLinearElement,
                elementsMap: allElementsMap,
                appState,
                context,
                type: "end",
            });
        }
    }
    // Paint selected elements
    if (!appState.multiElement &&
        !appState.newElement &&
        !appState.selectedLinearElement?.isEditing) {
        const showBoundingBox = (0, element_1.hasBoundingBox)(selectedElements, appState, editorInterface);
        const isSingleLinearElementSelected = selectedElements.length === 1 && (0, element_1.isLinearElement)(selectedElements[0]);
        // render selected linear element points
        if (isSingleLinearElementSelected &&
            appState.selectedLinearElement?.elementId === selectedElements[0].id &&
            !selectedElements[0].locked) {
            renderLinearPointHandles(context, appState, selectedElements[0], elementsMap);
        }
        const selectionColor = renderConfig.selectionColor || "#000";
        if (showBoundingBox) {
            // Optimisation for finding quickly relevant element ids
            const locallySelectedIds = (0, common_1.arrayToMap)(selectedElements);
            const selections = [];
            for (const element of elementsMap.values()) {
                const selectionColors = [];
                const remoteClients = renderConfig.remoteSelectedElementIds.get(element.id);
                if (!(
                // Elbow arrow elements cannot be selected when bound on either end
                (isSingleLinearElementSelected &&
                    (0, element_1.isElbowArrow)(element) &&
                    (element.startBinding || element.endBinding)))) {
                    // local user
                    if (locallySelectedIds.has(element.id) &&
                        !(0, element_3.isSelectedViaGroup)(appState, element)) {
                        selectionColors.push(selectionColor);
                    }
                    // remote users
                    if (remoteClients) {
                        selectionColors.push(...remoteClients.map((socketId) => {
                            const background = (0, clients_1.getClientColor)(socketId, appState.collaborators.get(socketId));
                            return background;
                        }));
                    }
                }
                if (selectionColors.length) {
                    const [x1, y1, x2, y2, cx, cy] = (0, element_4.getElementAbsoluteCoords)(element, elementsMap, true);
                    selections.push({
                        angle: element.angle,
                        x1,
                        y1,
                        x2,
                        y2,
                        selectionColors: element.locked ? ["#ced4da"] : selectionColors,
                        dashed: !!remoteClients || element.locked,
                        cx,
                        cy,
                        activeEmbeddable: appState.activeEmbeddable?.element === element &&
                            appState.activeEmbeddable.state === "active",
                        padding: element.id === appState.croppingElementId ||
                            (0, element_1.isImageElement)(element)
                            ? 0
                            : undefined,
                    });
                }
            }
            const addSelectionForGroupId = (groupId) => {
                const groupElements = (0, element_3.getElementsInGroup)(elementsMap, groupId);
                const [x1, y1, x2, y2] = (0, element_4.getCommonBounds)(groupElements);
                selections.push({
                    angle: 0,
                    x1,
                    x2,
                    y1,
                    y2,
                    selectionColors: groupElements.some((el) => el.locked)
                        ? ["#ced4da"]
                        : ["#000"],
                    dashed: true,
                    cx: x1 + (x2 - x1) / 2,
                    cy: y1 + (y2 - y1) / 2,
                    activeEmbeddable: false,
                });
            };
            for (const groupId of (0, element_3.getSelectedGroupIds)(appState)) {
                // TODO: support multiplayer selected group IDs
                addSelectionForGroupId(groupId);
            }
            if (appState.editingGroupId) {
                addSelectionForGroupId(appState.editingGroupId);
            }
            selections.forEach((selection) => renderSelectionBorder(context, appState, selection));
        }
        // Paint resize transformHandles
        context.save();
        context.translate(appState.scrollX, appState.scrollY);
        if (selectedElements.length === 1) {
            context.fillStyle = "#fff";
            const transformHandles = (0, element_1.getTransformHandles)(selectedElements[0], appState.zoom, elementsMap, "mouse", // when we render we don't know which pointer type so use mouse,
            (0, element_1.getOmitSidesForEditorInterface)(editorInterface));
            if (!appState.viewModeEnabled &&
                showBoundingBox &&
                // do not show transform handles when text is being edited
                !(0, element_1.isTextElement)(appState.editingTextElement) &&
                // do not show transform handles when image is being cropped
                !appState.croppingElementId) {
                renderTransformHandles(context, renderConfig, appState, transformHandles, selectedElements[0].angle);
            }
            if (appState.croppingElementId && !appState.isCropping) {
                const croppingElement = elementsMap.get(appState.croppingElementId);
                if (croppingElement && (0, element_1.isImageElement)(croppingElement)) {
                    renderCropHandles(context, renderConfig, appState, croppingElement, elementsMap);
                }
            }
        }
        else if (selectedElements.length > 1 &&
            !appState.isRotating &&
            !selectedElements.some((el) => el.locked)) {
            const dashedLinePadding = (common_1.DEFAULT_TRANSFORM_HANDLE_SPACING * 2) / appState.zoom.value;
            context.fillStyle = "#fff";
            const [x1, y1, x2, y2] = (0, element_4.getCommonBounds)(selectedElements, elementsMap);
            const initialLineDash = context.getLineDash();
            context.setLineDash([2 / appState.zoom.value]);
            const lineWidth = context.lineWidth;
            context.lineWidth = 1 / appState.zoom.value;
            context.strokeStyle = selectionColor;
            (0, helpers_1.strokeRectWithRotation_simple)(context, x1 - dashedLinePadding, y1 - dashedLinePadding, x2 - x1 + dashedLinePadding * 2, y2 - y1 + dashedLinePadding * 2, (x1 + x2) / 2, (y1 + y2) / 2, 0);
            context.lineWidth = lineWidth;
            context.setLineDash(initialLineDash);
            const transformHandles = (0, element_1.getTransformHandlesFromCoords)([x1, y1, x2, y2, (x1 + x2) / 2, (y1 + y2) / 2], 0, appState.zoom, "mouse", isFrameSelected
                ? {
                    ...(0, element_1.getOmitSidesForEditorInterface)(editorInterface),
                    rotation: true,
                }
                : (0, element_1.getOmitSidesForEditorInterface)(editorInterface));
            if (selectedElements.some((element) => !element.locked)) {
                renderTransformHandles(context, renderConfig, appState, transformHandles, 0);
            }
        }
        context.restore();
    }
    appState.searchMatches?.matches.forEach(({ id, focus, matchedLines }) => {
        const element = elementsMap.get(id);
        if (element) {
            const [elementX1, elementY1, , , cx, cy] = (0, element_4.getElementAbsoluteCoords)(element, elementsMap, true);
            context.save();
            if (appState.theme === common_1.THEME.LIGHT) {
                if (focus) {
                    context.fillStyle = "rgba(255, 124, 0, 0.4)";
                }
                else {
                    context.fillStyle = "rgba(255, 226, 0, 0.4)";
                }
            }
            else if (focus) {
                context.fillStyle = "rgba(229, 82, 0, 0.4)";
            }
            else {
                context.fillStyle = "rgba(99, 52, 0, 0.4)";
            }
            const zoomFactor = (0, element_1.isFrameLikeElement)(element) ? appState.zoom.value : 1;
            context.translate(appState.scrollX, appState.scrollY);
            context.translate(cx, cy);
            context.rotate(element.angle);
            matchedLines.forEach((matchedLine) => {
                (matchedLine.showOnCanvas || focus) &&
                    context.fillRect(elementX1 + matchedLine.offsetX / zoomFactor - cx, elementY1 + matchedLine.offsetY / zoomFactor - cy, matchedLine.width / zoomFactor, matchedLine.height / zoomFactor);
            });
            context.restore();
        }
    });
    (0, renderSnaps_1.renderSnaps)(context, appState);
    context.restore();
    (0, clients_1.renderRemoteCursors)({
        context,
        renderConfig,
        appState,
        normalizedWidth,
        normalizedHeight,
    });
    // Paint scrollbars
    let scrollBars;
    if (renderConfig.renderScrollbars) {
        scrollBars = (0, scrollbars_1.getScrollBars)(elementsMap, normalizedWidth, normalizedHeight, appState);
        context.save();
        context.fillStyle = scrollbars_1.SCROLLBAR_COLOR;
        context.strokeStyle = "rgba(255,255,255,0.8)";
        [scrollBars.horizontal, scrollBars.vertical].forEach((scrollBar) => {
            if (scrollBar) {
                (0, roundRect_1.roundRect)(context, scrollBar.x, scrollBar.y, scrollBar.width, scrollBar.height, scrollbars_1.SCROLLBAR_WIDTH / 2);
            }
        });
        context.restore();
    }
    return {
        scrollBars,
        atLeastOneVisibleElement: visibleElements.length > 0,
        elementsMap,
        animationState: nextAnimationState,
    };
};
/**
 * Interactive scene is the ui-canvas where we render bounding boxes, selections
 * and other ui stuff.
 */
const renderInteractiveScene = (renderConfig) => {
    const ret = _renderInteractiveScene(renderConfig);
    renderConfig.callback(ret);
    return ret;
};
exports.renderInteractiveScene = renderInteractiveScene;
