"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateElbowPoints = exports.updateElbowArrowPoints = exports.BASE_PADDING = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const binding_1 = require("./binding");
const distance_1 = require("./distance");
const heading_1 = require("./heading");
const typeChecks_1 = require("./typeChecks");
const bounds_1 = require("./bounds");
const collision_1 = require("./collision");
const DEDUP_TRESHOLD = 1;
exports.BASE_PADDING = 40;
const handleSegmentRenormalization = (arrow, elementsMap) => {
    const nextFixedSegments = arrow.fixedSegments
        ? arrow.fixedSegments.slice()
        : null;
    if (nextFixedSegments) {
        const _nextPoints = [];
        arrow.points
            .map((p) => (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1]))
            .forEach((p, i, points) => {
            if (i < 2) {
                return _nextPoints.push(p);
            }
            const currentSegmentIsHorizontal = (0, heading_1.headingForPoint)(p, points[i - 1]);
            const prevSegmentIsHorizontal = (0, heading_1.headingForPoint)(points[i - 1], points[i - 2]);
            if (
            // Check if previous two points are on the same line
            (0, heading_1.compareHeading)(currentSegmentIsHorizontal, prevSegmentIsHorizontal)) {
                const prevSegmentIdx = nextFixedSegments?.findIndex((segment) => segment.index === i - 1) ?? -1;
                const segmentIdx = nextFixedSegments?.findIndex((segment) => segment.index === i) ??
                    -1;
                // If the current segment is a fixed segment, update its start point
                if (segmentIdx !== -1) {
                    nextFixedSegments[segmentIdx].start = (0, math_1.pointFrom)(points[i - 2][0] - arrow.x, points[i - 2][1] - arrow.y);
                }
                // Remove the fixed segment status from the previous segment if it is
                // a fixed segment, because we are going to unify that segment with
                // the current one
                if (prevSegmentIdx !== -1) {
                    nextFixedSegments.splice(prevSegmentIdx, 1);
                }
                // Remove the duplicate point
                _nextPoints.splice(-1, 1);
                // Update fixed point indices
                nextFixedSegments.forEach((segment) => {
                    if (segment.index > i - 1) {
                        segment.index -= 1;
                    }
                });
            }
            return _nextPoints.push(p);
        });
        const nextPoints = [];
        _nextPoints.forEach((p, i, points) => {
            if (i < 3) {
                return nextPoints.push(p);
            }
            if (
            // Remove segments that are too short
            (0, math_1.pointDistance)(points[i - 2], points[i - 1]) < DEDUP_TRESHOLD) {
                const prevPrevSegmentIdx = nextFixedSegments?.findIndex((segment) => segment.index === i - 2) ??
                    -1;
                const prevSegmentIdx = nextFixedSegments?.findIndex((segment) => segment.index === i - 1) ??
                    -1;
                // Remove the previous fixed segment if it exists (i.e. the segment
                // which will be removed due to being parallel or too short)
                if (prevSegmentIdx !== -1) {
                    nextFixedSegments.splice(prevSegmentIdx, 1);
                }
                // Remove the fixed segment status from the segment 2 steps back
                // if it is a fixed segment, because we are going to unify that
                // segment with the current one
                if (prevPrevSegmentIdx !== -1) {
                    nextFixedSegments.splice(prevPrevSegmentIdx, 1);
                }
                nextPoints.splice(-2, 2);
                // Since we have to remove two segments, update any fixed segment
                nextFixedSegments.forEach((segment) => {
                    if (segment.index > i - 2) {
                        segment.index -= 2;
                    }
                });
                // Remove aligned segment points
                const isHorizontal = (0, heading_1.headingForPointIsHorizontal)(p, points[i - 1]);
                return nextPoints.push((0, math_1.pointFrom)(!isHorizontal ? points[i - 2][0] : p[0], isHorizontal ? points[i - 2][1] : p[1]));
            }
            nextPoints.push(p);
        });
        const filteredNextFixedSegments = nextFixedSegments.filter((segment) => segment.index !== 1 && segment.index !== nextPoints.length - 1);
        if (filteredNextFixedSegments.length === 0) {
            return normalizeArrowElementUpdate(getElbowArrowCornerPoints(removeElbowArrowShortSegments(routeElbowArrow(arrow, getElbowArrowData(arrow, elementsMap, nextPoints.map((p) => (0, math_1.pointFrom)(p[0] - arrow.x, p[1] - arrow.y)))) ?? [])), filteredNextFixedSegments, null, null);
        }
        (0, common_1.isDevEnv)() &&
            (0, common_1.invariant)((0, exports.validateElbowPoints)(nextPoints), "Invalid elbow points with fixed segments");
        return normalizeArrowElementUpdate(nextPoints, filteredNextFixedSegments, arrow.startIsSpecial, arrow.endIsSpecial);
    }
    return {
        x: arrow.x,
        y: arrow.y,
        points: arrow.points,
        fixedSegments: arrow.fixedSegments,
        startIsSpecial: arrow.startIsSpecial,
        endIsSpecial: arrow.endIsSpecial,
    };
};
const handleSegmentRelease = (arrow, fixedSegments, elementsMap) => {
    const newFixedSegmentIndices = fixedSegments.map((segment) => segment.index);
    const oldFixedSegmentIndices = arrow.fixedSegments?.map((segment) => segment.index) ?? [];
    const deletedSegmentIdx = oldFixedSegmentIndices.findIndex((idx) => !newFixedSegmentIndices.includes(idx));
    if (deletedSegmentIdx === -1 || !arrow.fixedSegments?.[deletedSegmentIdx]) {
        return {
            points: arrow.points,
        };
    }
    const deletedIdx = arrow.fixedSegments[deletedSegmentIdx].index;
    // Find prev and next fixed segments
    const prevSegment = arrow.fixedSegments[deletedSegmentIdx - 1];
    const nextSegment = arrow.fixedSegments[deletedSegmentIdx + 1];
    // We need to render a sub-arrow path to restore deleted segments
    const x = arrow.x + (prevSegment ? prevSegment.end[0] : 0);
    const y = arrow.y + (prevSegment ? prevSegment.end[1] : 0);
    const startBinding = prevSegment ? null : arrow.startBinding;
    const endBinding = nextSegment ? null : arrow.endBinding;
    const { startHeading, endHeading, startGlobalPoint, endGlobalPoint, hoveredStartElement, hoveredEndElement, ...rest } = getElbowArrowData({
        x,
        y,
        startBinding,
        endBinding,
        startArrowhead: null,
        endArrowhead: null,
        points: arrow.points,
    }, elementsMap, [
        (0, math_1.pointFrom)(0, 0),
        (0, math_1.pointFrom)(arrow.x +
            (nextSegment?.start[0] ?? arrow.points[arrow.points.length - 1][0]) -
            x, arrow.y +
            (nextSegment?.start[1] ?? arrow.points[arrow.points.length - 1][1]) -
            y),
    ], { isDragging: false });
    const { points: restoredPoints } = normalizeArrowElementUpdate(getElbowArrowCornerPoints(removeElbowArrowShortSegments(routeElbowArrow(arrow, {
        startHeading,
        endHeading,
        startGlobalPoint,
        endGlobalPoint,
        hoveredStartElement,
        hoveredEndElement,
        ...rest,
    }) ?? [])), fixedSegments, null, null);
    if (!restoredPoints || restoredPoints.length < 2) {
        throw new Error("Property 'points' is required in the update returned by normalizeArrowElementUpdate()");
    }
    const nextPoints = [];
    // First part of the arrow are the old points
    if (prevSegment) {
        for (let i = 0; i < prevSegment.index; i++) {
            nextPoints.push((0, math_1.pointFrom)(arrow.x + arrow.points[i][0], arrow.y + arrow.points[i][1]));
        }
    }
    restoredPoints.forEach((p) => {
        nextPoints.push((0, math_1.pointFrom)(arrow.x + (prevSegment ? prevSegment.end[0] : 0) + p[0], arrow.y + (prevSegment ? prevSegment.end[1] : 0) + p[1]));
    });
    // Last part of the arrow are the old points too
    if (nextSegment) {
        for (let i = nextSegment.index; i < arrow.points.length; i++) {
            nextPoints.push((0, math_1.pointFrom)(arrow.x + arrow.points[i][0], arrow.y + arrow.points[i][1]));
        }
    }
    // Update nextFixedSegments
    const originalSegmentCountDiff = (nextSegment?.index ?? arrow.points.length) - (prevSegment?.index ?? 0) - 1;
    const nextFixedSegments = fixedSegments.map((segment) => {
        if (segment.index > deletedIdx) {
            return {
                ...segment,
                index: segment.index -
                    originalSegmentCountDiff +
                    (restoredPoints.length - 1),
            };
        }
        return segment;
    });
    const simplifiedPoints = nextPoints.flatMap((p, i) => {
        const prev = nextPoints[i - 1];
        const next = nextPoints[i + 1];
        if (prev && next) {
            const prevHeading = (0, heading_1.headingForPoint)(p, prev);
            const nextHeading = (0, heading_1.headingForPoint)(next, p);
            if ((0, heading_1.compareHeading)(prevHeading, nextHeading)) {
                // Update subsequent fixed segment indices
                nextFixedSegments.forEach((segment) => {
                    if (segment.index > i) {
                        segment.index -= 1;
                    }
                });
                return [];
            }
            else if ((0, heading_1.compareHeading)(prevHeading, (0, heading_1.flipHeading)(nextHeading))) {
                // Update subsequent fixed segment indices
                nextFixedSegments.forEach((segment) => {
                    if (segment.index > i) {
                        segment.index += 1;
                    }
                });
                return [p, p];
            }
        }
        return [p];
    });
    return normalizeArrowElementUpdate(simplifiedPoints, nextFixedSegments, false, false);
};
/**
 *
 */
const handleSegmentMove = (arrow, fixedSegments, startHeading, endHeading, hoveredStartElement, hoveredEndElement) => {
    const activelyModifiedSegmentIdx = fixedSegments
        .map((segment, i) => {
        if (arrow.fixedSegments == null ||
            arrow.fixedSegments[i] === undefined ||
            arrow.fixedSegments[i].index !== segment.index) {
            return i;
        }
        return (segment.start[0] !== arrow.fixedSegments[i].start[0] &&
            segment.end[0] !== arrow.fixedSegments[i].end[0]) !==
            (segment.start[1] !== arrow.fixedSegments[i].start[1] &&
                segment.end[1] !== arrow.fixedSegments[i].end[1])
            ? i
            : null;
    })
        .filter((idx) => idx !== null)
        .shift();
    if (activelyModifiedSegmentIdx == null) {
        return { points: arrow.points };
    }
    const firstSegmentIdx = arrow.fixedSegments?.findIndex((segment) => segment.index === 1) ?? -1;
    const lastSegmentIdx = arrow.fixedSegments?.findIndex((segment) => segment.index === arrow.points.length - 1) ?? -1;
    // Handle special case for first segment move
    const segmentLength = (0, math_1.pointDistance)(fixedSegments[activelyModifiedSegmentIdx].start, fixedSegments[activelyModifiedSegmentIdx].end);
    const segmentIsTooShort = segmentLength < exports.BASE_PADDING + 5;
    if (firstSegmentIdx === -1 &&
        fixedSegments[activelyModifiedSegmentIdx].index === 1 &&
        hoveredStartElement) {
        const startIsHorizontal = (0, heading_1.headingIsHorizontal)(startHeading);
        const startIsPositive = startIsHorizontal
            ? (0, heading_1.compareHeading)(startHeading, heading_1.HEADING_RIGHT)
            : (0, heading_1.compareHeading)(startHeading, heading_1.HEADING_DOWN);
        const padding = startIsPositive
            ? segmentIsTooShort
                ? segmentLength / 2
                : exports.BASE_PADDING
            : segmentIsTooShort
                ? -segmentLength / 2
                : -exports.BASE_PADDING;
        fixedSegments[activelyModifiedSegmentIdx].start = (0, math_1.pointFrom)(fixedSegments[activelyModifiedSegmentIdx].start[0] +
            (startIsHorizontal ? padding : 0), fixedSegments[activelyModifiedSegmentIdx].start[1] +
            (!startIsHorizontal ? padding : 0));
    }
    // Handle special case for last segment move
    if (lastSegmentIdx === -1 &&
        fixedSegments[activelyModifiedSegmentIdx].index ===
            arrow.points.length - 1 &&
        hoveredEndElement) {
        const endIsHorizontal = (0, heading_1.headingIsHorizontal)(endHeading);
        const endIsPositive = endIsHorizontal
            ? (0, heading_1.compareHeading)(endHeading, heading_1.HEADING_RIGHT)
            : (0, heading_1.compareHeading)(endHeading, heading_1.HEADING_DOWN);
        const padding = endIsPositive
            ? segmentIsTooShort
                ? segmentLength / 2
                : exports.BASE_PADDING
            : segmentIsTooShort
                ? -segmentLength / 2
                : -exports.BASE_PADDING;
        fixedSegments[activelyModifiedSegmentIdx].end = (0, math_1.pointFrom)(fixedSegments[activelyModifiedSegmentIdx].end[0] +
            (endIsHorizontal ? padding : 0), fixedSegments[activelyModifiedSegmentIdx].end[1] +
            (!endIsHorizontal ? padding : 0));
    }
    // Translate all fixed segments to global coordinates
    const nextFixedSegments = fixedSegments.map((segment) => ({
        ...segment,
        start: (0, math_1.pointFrom)(arrow.x + segment.start[0], arrow.y + segment.start[1]),
        end: (0, math_1.pointFrom)(arrow.x + segment.end[0], arrow.y + segment.end[1]),
    }));
    // For start, clone old arrow points
    const newPoints = arrow.points.map((p, i) => (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1]));
    const startIdx = nextFixedSegments[activelyModifiedSegmentIdx].index - 1;
    const endIdx = nextFixedSegments[activelyModifiedSegmentIdx].index;
    const start = nextFixedSegments[activelyModifiedSegmentIdx].start;
    const end = nextFixedSegments[activelyModifiedSegmentIdx].end;
    const prevSegmentIsHorizontal = newPoints[startIdx - 1] &&
        !(0, math_1.pointsEqual)(newPoints[startIdx], newPoints[startIdx - 1])
        ? (0, heading_1.headingForPointIsHorizontal)(newPoints[startIdx - 1], newPoints[startIdx])
        : undefined;
    const nextSegmentIsHorizontal = newPoints[endIdx + 1] &&
        !(0, math_1.pointsEqual)(newPoints[endIdx], newPoints[endIdx + 1])
        ? (0, heading_1.headingForPointIsHorizontal)(newPoints[endIdx + 1], newPoints[endIdx])
        : undefined;
    // Override the segment points with the actively moved fixed segment
    if (prevSegmentIsHorizontal !== undefined) {
        const dir = prevSegmentIsHorizontal ? 1 : 0;
        newPoints[startIdx - 1][dir] = start[dir];
    }
    newPoints[startIdx] = start;
    newPoints[endIdx] = end;
    if (nextSegmentIsHorizontal !== undefined) {
        const dir = nextSegmentIsHorizontal ? 1 : 0;
        newPoints[endIdx + 1][dir] = end[dir];
    }
    // Override neighboring fixedSegment start/end points, if any
    const prevSegmentIdx = nextFixedSegments.findIndex((segment) => segment.index === startIdx);
    if (prevSegmentIdx !== -1) {
        // Align the next segment points with the moved segment
        const dir = (0, heading_1.headingForPointIsHorizontal)(nextFixedSegments[prevSegmentIdx].end, nextFixedSegments[prevSegmentIdx].start)
            ? 1
            : 0;
        nextFixedSegments[prevSegmentIdx].start[dir] = start[dir];
        nextFixedSegments[prevSegmentIdx].end = start;
    }
    const nextSegmentIdx = nextFixedSegments.findIndex((segment) => segment.index === endIdx + 1);
    if (nextSegmentIdx !== -1) {
        // Align the next segment points with the moved segment
        const dir = (0, heading_1.headingForPointIsHorizontal)(nextFixedSegments[nextSegmentIdx].end, nextFixedSegments[nextSegmentIdx].start)
            ? 1
            : 0;
        nextFixedSegments[nextSegmentIdx].end[dir] = end[dir];
        nextFixedSegments[nextSegmentIdx].start = end;
    }
    // First segment move needs an additional segment
    if (firstSegmentIdx === -1 && startIdx === 0) {
        const startIsHorizontal = hoveredStartElement
            ? (0, heading_1.headingIsHorizontal)(startHeading)
            : (0, heading_1.headingForPointIsHorizontal)(newPoints[1], newPoints[0]);
        newPoints.unshift((0, math_1.pointFrom)(startIsHorizontal ? start[0] : arrow.x + arrow.points[0][0], !startIsHorizontal ? start[1] : arrow.y + arrow.points[0][1]));
        if (hoveredStartElement) {
            newPoints.unshift((0, math_1.pointFrom)(arrow.x + arrow.points[0][0], arrow.y + arrow.points[0][1]));
        }
        for (const segment of nextFixedSegments) {
            segment.index += hoveredStartElement ? 2 : 1;
        }
    }
    // Last segment move needs an additional segment
    if (lastSegmentIdx === -1 && endIdx === arrow.points.length - 1) {
        const endIsHorizontal = (0, heading_1.headingIsHorizontal)(endHeading);
        newPoints.push((0, math_1.pointFrom)(endIsHorizontal
            ? end[0]
            : arrow.x + arrow.points[arrow.points.length - 1][0], !endIsHorizontal
            ? end[1]
            : arrow.y + arrow.points[arrow.points.length - 1][1]));
        if (hoveredEndElement) {
            newPoints.push((0, math_1.pointFrom)(arrow.x + arrow.points[arrow.points.length - 1][0], arrow.y + arrow.points[arrow.points.length - 1][1]));
        }
    }
    return normalizeArrowElementUpdate(newPoints, nextFixedSegments.map((segment) => ({
        ...segment,
        start: (0, math_1.pointFrom)(segment.start[0] - arrow.x, segment.start[1] - arrow.y),
        end: (0, math_1.pointFrom)(segment.end[0] - arrow.x, segment.end[1] - arrow.y),
    })), false, // If you move a segment, there is no special point anymore
    false);
};
const handleEndpointDrag = (arrow, updatedPoints, fixedSegments, startHeading, endHeading, startGlobalPoint, endGlobalPoint, hoveredStartElement, hoveredEndElement) => {
    let startIsSpecial = arrow.startIsSpecial ?? null;
    let endIsSpecial = arrow.endIsSpecial ?? null;
    const globalUpdatedPoints = updatedPoints.map((p, i) => i === 0
        ? (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1])
        : i === updatedPoints.length - 1
            ? (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1])
            : (0, math_1.pointFrom)(arrow.x + arrow.points[i][0], arrow.y + arrow.points[i][1]));
    const nextFixedSegments = fixedSegments.map((segment) => ({
        ...segment,
        start: (0, math_1.pointFrom)(arrow.x + (segment.start[0] - updatedPoints[0][0]), arrow.y + (segment.start[1] - updatedPoints[0][1])),
        end: (0, math_1.pointFrom)(arrow.x + (segment.end[0] - updatedPoints[0][0]), arrow.y + (segment.end[1] - updatedPoints[0][1])),
    }));
    const newPoints = [];
    // Add the inside points
    const offset = 2 + (startIsSpecial ? 1 : 0);
    const endOffset = 2 + (endIsSpecial ? 1 : 0);
    while (newPoints.length + offset < globalUpdatedPoints.length - endOffset) {
        newPoints.push(globalUpdatedPoints[newPoints.length + offset]);
    }
    // Calculate the moving second point connection and add the start point
    {
        const secondPoint = globalUpdatedPoints.at(startIsSpecial ? 2 : 1);
        const thirdPoint = globalUpdatedPoints.at(startIsSpecial ? 3 : 2);
        if (!secondPoint || !thirdPoint) {
            throw new Error(`Second and third points must exist when handling endpoint drag (${startIsSpecial})`);
        }
        const startIsHorizontal = (0, heading_1.headingIsHorizontal)(startHeading);
        const secondIsHorizontal = (0, heading_1.headingIsHorizontal)((0, heading_1.vectorToHeading)((0, math_1.vectorFromPoint)(secondPoint, thirdPoint)));
        if (hoveredStartElement && startIsHorizontal === secondIsHorizontal) {
            const positive = startIsHorizontal
                ? (0, heading_1.compareHeading)(startHeading, heading_1.HEADING_RIGHT)
                : (0, heading_1.compareHeading)(startHeading, heading_1.HEADING_DOWN);
            newPoints.unshift((0, math_1.pointFrom)(!secondIsHorizontal
                ? thirdPoint[0]
                : startGlobalPoint[0] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING), secondIsHorizontal
                ? thirdPoint[1]
                : startGlobalPoint[1] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)));
            newPoints.unshift((0, math_1.pointFrom)(startIsHorizontal
                ? startGlobalPoint[0] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)
                : startGlobalPoint[0], !startIsHorizontal
                ? startGlobalPoint[1] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)
                : startGlobalPoint[1]));
            if (!startIsSpecial) {
                startIsSpecial = true;
                for (const segment of nextFixedSegments) {
                    if (segment.index > 1) {
                        segment.index += 1;
                    }
                }
            }
        }
        else {
            newPoints.unshift((0, math_1.pointFrom)(!secondIsHorizontal ? secondPoint[0] : startGlobalPoint[0], secondIsHorizontal ? secondPoint[1] : startGlobalPoint[1]));
            if (startIsSpecial) {
                startIsSpecial = false;
                for (const segment of nextFixedSegments) {
                    if (segment.index > 1) {
                        segment.index -= 1;
                    }
                }
            }
        }
        newPoints.unshift(startGlobalPoint);
    }
    // Calculate the moving second to last point connection
    {
        const secondToLastPoint = globalUpdatedPoints.at(globalUpdatedPoints.length - (endIsSpecial ? 3 : 2));
        const thirdToLastPoint = globalUpdatedPoints.at(globalUpdatedPoints.length - (endIsSpecial ? 4 : 3));
        if (!secondToLastPoint || !thirdToLastPoint) {
            throw new Error(`Second and third to last points must exist when handling endpoint drag (${endIsSpecial})`);
        }
        const endIsHorizontal = (0, heading_1.headingIsHorizontal)(endHeading);
        const secondIsHorizontal = (0, heading_1.headingForPointIsHorizontal)(thirdToLastPoint, secondToLastPoint);
        if (hoveredEndElement && endIsHorizontal === secondIsHorizontal) {
            const positive = endIsHorizontal
                ? (0, heading_1.compareHeading)(endHeading, heading_1.HEADING_RIGHT)
                : (0, heading_1.compareHeading)(endHeading, heading_1.HEADING_DOWN);
            newPoints.push((0, math_1.pointFrom)(!secondIsHorizontal
                ? thirdToLastPoint[0]
                : endGlobalPoint[0] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING), secondIsHorizontal
                ? thirdToLastPoint[1]
                : endGlobalPoint[1] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)));
            newPoints.push((0, math_1.pointFrom)(endIsHorizontal
                ? endGlobalPoint[0] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)
                : endGlobalPoint[0], !endIsHorizontal
                ? endGlobalPoint[1] + (positive ? exports.BASE_PADDING : -exports.BASE_PADDING)
                : endGlobalPoint[1]));
            if (!endIsSpecial) {
                endIsSpecial = true;
            }
        }
        else {
            newPoints.push((0, math_1.pointFrom)(!secondIsHorizontal ? secondToLastPoint[0] : endGlobalPoint[0], secondIsHorizontal ? secondToLastPoint[1] : endGlobalPoint[1]));
            if (endIsSpecial) {
                endIsSpecial = false;
            }
        }
    }
    newPoints.push(endGlobalPoint);
    return normalizeArrowElementUpdate(newPoints, nextFixedSegments
        .map(({ index }) => ({
        index,
        start: newPoints[index - 1],
        end: newPoints[index],
    }))
        .map((segment) => ({
        ...segment,
        start: (0, math_1.pointFrom)(segment.start[0] - startGlobalPoint[0], segment.start[1] - startGlobalPoint[1]),
        end: (0, math_1.pointFrom)(segment.end[0] - startGlobalPoint[0], segment.end[1] - startGlobalPoint[1]),
    })), startIsSpecial, endIsSpecial);
};
const MAX_POS = 1e6;
/**
 *
 */
const updateElbowArrowPoints = (arrow, elementsMap, updates, options) => {
    if (arrow.points.length < 2) {
        return { points: updates.points ?? arrow.points };
    }
    if (!import.meta.env.PROD) {
        (0, common_1.invariant)(!updates.points || updates.points.length >= 2, "Updated point array length must match the arrow point length, contain " +
            "exactly the new start and end points or not be specified at all (i.e. " +
            "you can't add new points between start and end manually to elbow arrows)");
        (0, common_1.invariant)(!arrow.fixedSegments ||
            arrow.fixedSegments
                .map((s) => s.start[0] === s.end[0] || s.start[1] === s.end[1])
                .every(Boolean), "Fixed segments must be either horizontal or vertical");
        (0, common_1.invariant)(!updates.fixedSegments ||
            updates.fixedSegments
                .map((s) => s.start[0] === s.end[0] || s.start[1] === s.end[1])
                .every(Boolean), "Updates to fixed segments must be either horizontal or vertical");
        (0, common_1.invariant)(arrow.points
            .slice(1)
            .map((p, i) => p[0] === arrow.points[i][0] || p[1] === arrow.points[i][1]), "Elbow arrow segments must be either horizontal or vertical");
        (0, common_1.invariant)(updates.fixedSegments?.find((segment) => segment.index === 1 &&
            (0, math_1.pointsEqual)(segment.start, (updates.points ?? arrow.points)[0])) == null &&
            updates.fixedSegments?.find((segment) => segment.index === (updates.points ?? arrow.points).length - 1 &&
                (0, math_1.pointsEqual)(segment.end, (updates.points ?? arrow.points)[(updates.points ?? arrow.points).length - 1])) == null, "The first and last segments cannot be fixed");
    }
    const fixedSegments = updates.fixedSegments ?? arrow.fixedSegments ?? [];
    const updatedPoints = updates.points
        ? updates.points && updates.points.length === 2
            ? arrow.points.map((p, idx) => idx === 0
                ? updates.points[0]
                : idx === arrow.points.length - 1
                    ? updates.points[1]
                    : p)
            : updates.points.slice()
        : arrow.points.slice();
    // During all element replacement in the scene, we just need to renormalize
    // the arrow
    // TODO (dwelle,mtolmacs): Remove this once Scene.getScene() is removed
    const { startBinding: updatedStartBinding, endBinding: updatedEndBinding, ...restOfTheUpdates } = updates;
    const startBinding = typeof updatedStartBinding !== "undefined"
        ? updatedStartBinding
        : arrow.startBinding;
    const endBinding = typeof updatedEndBinding !== "undefined"
        ? updatedEndBinding
        : arrow.endBinding;
    const startElement = startBinding &&
        getBindableElementForId(startBinding.elementId, elementsMap);
    const endElement = endBinding && getBindableElementForId(endBinding.elementId, elementsMap);
    const areUpdatedPointsValid = (0, exports.validateElbowPoints)(updatedPoints);
    if ((startBinding && !startElement && areUpdatedPointsValid) ||
        (endBinding && !endElement && areUpdatedPointsValid) ||
        (elementsMap.size === 0 && areUpdatedPointsValid) ||
        (Object.keys(restOfTheUpdates).length === 0 &&
            (startElement?.id !== startBinding?.elementId ||
                endElement?.id !== endBinding?.elementId))) {
        return normalizeArrowElementUpdate(updatedPoints.map((p) => (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1])), arrow.fixedSegments, arrow.startIsSpecial, arrow.endIsSpecial);
    }
    const { startHeading, endHeading, startGlobalPoint, endGlobalPoint, hoveredStartElement, hoveredEndElement, ...rest } = getElbowArrowData({
        x: arrow.x,
        y: arrow.y,
        startBinding,
        endBinding,
        startArrowhead: arrow.startArrowhead,
        endArrowhead: arrow.endArrowhead,
        points: arrow.points,
    }, elementsMap, updatedPoints, options);
    // 0. During all element replacement in the scene, we just need to renormalize
    // the arrow
    // TODO (dwelle,mtolmacs): Remove this once Scene.getScene() is removed
    if (elementsMap.size === 0 && areUpdatedPointsValid) {
        return normalizeArrowElementUpdate(updatedPoints.map((p) => (0, math_1.pointFrom)(arrow.x + p[0], arrow.y + p[1])), arrow.fixedSegments, arrow.startIsSpecial, arrow.endIsSpecial);
    }
    ////
    // 1. Renormalize the arrow
    ////
    if (!updates.points &&
        !updates.fixedSegments &&
        !updates.startBinding &&
        !updates.endBinding) {
        return handleSegmentRenormalization(arrow, elementsMap);
    }
    // Short circuit on no-op to avoid huge performance hit
    if (updates.startBinding === arrow.startBinding &&
        updates.endBinding === arrow.endBinding &&
        (updates.points ?? []).every((p, i) => (0, math_1.pointsEqual)(p, arrow.points[i] ?? (0, math_1.pointFrom)(Infinity, Infinity))) &&
        areUpdatedPointsValid) {
        return {};
    }
    ////
    // 2. Just normal elbow arrow things
    ////
    if (fixedSegments.length === 0) {
        return normalizeArrowElementUpdate(getElbowArrowCornerPoints(removeElbowArrowShortSegments(routeElbowArrow(arrow, {
            startHeading,
            endHeading,
            startGlobalPoint,
            endGlobalPoint,
            hoveredStartElement,
            hoveredEndElement,
            ...rest,
        }) ?? [])), fixedSegments, null, null);
    }
    ////
    // 3. Handle releasing a fixed segment
    if ((arrow.fixedSegments?.length ?? 0) > fixedSegments.length) {
        return handleSegmentRelease(arrow, fixedSegments, elementsMap);
    }
    ////
    // 4. Handle manual segment move
    ////
    if (!updates.points) {
        return handleSegmentMove(arrow, fixedSegments, startHeading, endHeading, hoveredStartElement, hoveredEndElement);
    }
    ////
    // 5. Handle resize
    ////
    if (updates.points && updates.fixedSegments) {
        return updates;
    }
    ////
    // 6. One or more segments are fixed and endpoints are moved
    //
    // The key insights are:
    // - When segments are fixed, the arrow will keep the exact amount of segments
    // - Fixed segments are "replacements" for exactly one segment in the old arrow
    ////
    return handleEndpointDrag(arrow, updatedPoints, fixedSegments, startHeading, endHeading, startGlobalPoint, endGlobalPoint, hoveredStartElement, hoveredEndElement);
};
exports.updateElbowArrowPoints = updateElbowArrowPoints;
/**
 * Retrieves data necessary for calculating the elbow arrow path.
 *
 * @param arrow - The arrow object containing its properties.
 * @param elementsMap - A map of elements in the scene.
 * @param nextPoints - The next set of points for the arrow.
 * @param options - Optional parameters for the calculation.
 * @param options.isDragging - Indicates if the arrow is being dragged.
 * @param options.startIsMidPoint - Indicates if the start point is a midpoint.
 * @param options.endIsMidPoint - Indicates if the end point is a midpoint.
 *
 * @returns An object containing various properties needed for elbow arrow calculations:
 * - dynamicAABBs: Dynamically generated axis-aligned bounding boxes.
 * - startDonglePosition: The position of the start dongle.
 * - startGlobalPoint: The global coordinates of the start point.
 * - startHeading: The heading direction from the start point.
 * - endDonglePosition: The position of the end dongle.
 * - endGlobalPoint: The global coordinates of the end point.
 * - endHeading: The heading direction from the end point.
 * - commonBounds: The common bounding box that encompasses both start and end points.
 * - hoveredStartElement: The element being hovered over at the start point.
 * - hoveredEndElement: The element being hovered over at the end point.
 */
const getElbowArrowData = (arrow, elementsMap, nextPoints, options) => {
    const origStartGlobalPoint = (0, math_1.pointTranslate)(nextPoints[0], (0, math_1.vector)(arrow.x, arrow.y));
    const origEndGlobalPoint = (0, math_1.pointTranslate)(nextPoints[nextPoints.length - 1], (0, math_1.vector)(arrow.x, arrow.y));
    let hoveredStartElement = null;
    let hoveredEndElement = null;
    if (options?.isDragging && options?.isBindingEnabled !== false) {
        const elements = Array.from(elementsMap.values());
        hoveredStartElement =
            getHoveredElement(origStartGlobalPoint, elementsMap, elements, options?.zoom) || null;
        hoveredEndElement =
            getHoveredElement(origEndGlobalPoint, elementsMap, elements, options?.zoom) || null;
    }
    else {
        hoveredStartElement = arrow.startBinding
            ? getBindableElementForId(arrow.startBinding.elementId, elementsMap) ||
                null
            : null;
        hoveredEndElement = arrow.endBinding
            ? getBindableElementForId(arrow.endBinding.elementId, elementsMap) || null
            : null;
    }
    const startGlobalPoint = getGlobalPoint({
        ...arrow,
        angle: 0,
        type: "arrow",
        elbowed: true,
        points: nextPoints,
    }, "start", arrow.startBinding?.fixedPoint, origStartGlobalPoint, hoveredStartElement, elementsMap, options?.isDragging, options?.isBindingEnabled, options?.isMidpointSnappingEnabled);
    const endGlobalPoint = getGlobalPoint({
        ...arrow,
        angle: 0,
        type: "arrow",
        elbowed: true,
        points: nextPoints,
    }, "end", arrow.endBinding?.fixedPoint, origEndGlobalPoint, hoveredEndElement, elementsMap, options?.isDragging, options?.isBindingEnabled, options?.isMidpointSnappingEnabled);
    const startHeading = getBindPointHeading(startGlobalPoint, endGlobalPoint, hoveredStartElement, origStartGlobalPoint, elementsMap, options?.zoom);
    const endHeading = getBindPointHeading(endGlobalPoint, startGlobalPoint, hoveredEndElement, origEndGlobalPoint, elementsMap, options?.zoom);
    const startPointBounds = [
        startGlobalPoint[0] - 2,
        startGlobalPoint[1] - 2,
        startGlobalPoint[0] + 2,
        startGlobalPoint[1] + 2,
    ];
    const endPointBounds = [
        endGlobalPoint[0] - 2,
        endGlobalPoint[1] - 2,
        endGlobalPoint[0] + 2,
        endGlobalPoint[1] + 2,
    ];
    const startElementBounds = hoveredStartElement
        ? (0, bounds_1.aabbForElement)(hoveredStartElement, elementsMap, offsetFromHeading(startHeading, arrow.startArrowhead
            ? (0, binding_1.getBindingGap)(hoveredStartElement, { elbowed: true }) * 6
            : (0, binding_1.getBindingGap)(hoveredStartElement, { elbowed: true }) * 2, 1))
        : startPointBounds;
    const endElementBounds = hoveredEndElement
        ? (0, bounds_1.aabbForElement)(hoveredEndElement, elementsMap, offsetFromHeading(endHeading, arrow.endArrowhead
            ? (0, binding_1.getBindingGap)(hoveredEndElement, { elbowed: true }) * 6
            : (0, binding_1.getBindingGap)(hoveredEndElement, { elbowed: true }) * 2, 1))
        : endPointBounds;
    const boundsOverlap = (0, bounds_1.pointInsideBounds)(startGlobalPoint, hoveredEndElement
        ? (0, bounds_1.aabbForElement)(hoveredEndElement, elementsMap, offsetFromHeading(endHeading, exports.BASE_PADDING, exports.BASE_PADDING))
        : endPointBounds) ||
        (0, bounds_1.pointInsideBounds)(endGlobalPoint, hoveredStartElement
            ? (0, bounds_1.aabbForElement)(hoveredStartElement, elementsMap, offsetFromHeading(startHeading, exports.BASE_PADDING, exports.BASE_PADDING))
            : startPointBounds);
    const commonBounds = commonAABB(boundsOverlap
        ? [startPointBounds, endPointBounds]
        : [startElementBounds, endElementBounds]);
    const dynamicAABBs = generateDynamicAABBs(boundsOverlap ? startPointBounds : startElementBounds, boundsOverlap ? endPointBounds : endElementBounds, commonBounds, boundsOverlap
        ? offsetFromHeading(startHeading, !hoveredStartElement && !hoveredEndElement ? 0 : exports.BASE_PADDING, 0)
        : offsetFromHeading(startHeading, !hoveredStartElement && !hoveredEndElement
            ? 0
            : exports.BASE_PADDING -
                (arrow.startArrowhead
                    ? binding_1.BASE_BINDING_GAP_ELBOW * 6
                    : binding_1.BASE_BINDING_GAP_ELBOW * 2), exports.BASE_PADDING), boundsOverlap
        ? offsetFromHeading(endHeading, !hoveredStartElement && !hoveredEndElement ? 0 : exports.BASE_PADDING, 0)
        : offsetFromHeading(endHeading, !hoveredStartElement && !hoveredEndElement
            ? 0
            : exports.BASE_PADDING -
                (arrow.endArrowhead
                    ? binding_1.BASE_BINDING_GAP_ELBOW * 6
                    : binding_1.BASE_BINDING_GAP_ELBOW * 2), exports.BASE_PADDING), boundsOverlap, hoveredStartElement && (0, bounds_1.aabbForElement)(hoveredStartElement, elementsMap), hoveredEndElement && (0, bounds_1.aabbForElement)(hoveredEndElement, elementsMap));
    const startDonglePosition = getDonglePosition(dynamicAABBs[0], startHeading, startGlobalPoint);
    const endDonglePosition = getDonglePosition(dynamicAABBs[1], endHeading, endGlobalPoint);
    return {
        dynamicAABBs,
        startDonglePosition,
        startGlobalPoint,
        startHeading,
        endDonglePosition,
        endGlobalPoint,
        endHeading,
        commonBounds,
        hoveredStartElement,
        hoveredEndElement,
        boundsOverlap,
        startElementBounds,
        endElementBounds,
    };
};
/**
 * Generate the elbow arrow segments
 *
 * @param arrow
 * @param elementsMap
 * @param nextPoints
 * @param options
 * @returns
 */
const routeElbowArrow = (arrow, elbowArrowData) => {
    const { dynamicAABBs, startDonglePosition, startGlobalPoint, startHeading, endDonglePosition, endGlobalPoint, endHeading, commonBounds, hoveredEndElement, } = elbowArrowData;
    // Canculate Grid positions
    const grid = calculateGrid(dynamicAABBs, startDonglePosition ? startDonglePosition : startGlobalPoint, startHeading, endDonglePosition ? endDonglePosition : endGlobalPoint, endHeading, commonBounds);
    const startDongle = startDonglePosition && pointToGridNode(startDonglePosition, grid);
    const endDongle = endDonglePosition && pointToGridNode(endDonglePosition, grid);
    // Do not allow stepping on the true end or true start points
    const endNode = pointToGridNode(endGlobalPoint, grid);
    if (endNode && hoveredEndElement) {
        endNode.closed = true;
    }
    const startNode = pointToGridNode(startGlobalPoint, grid);
    if (startNode && arrow.startBinding) {
        startNode.closed = true;
    }
    const dongleOverlap = startDongle &&
        endDongle &&
        ((0, bounds_1.pointInsideBounds)(startDongle.pos, dynamicAABBs[1]) ||
            (0, bounds_1.pointInsideBounds)(endDongle.pos, dynamicAABBs[0]));
    // Create path to end dongle from start dongle
    const path = astar(startDongle ? startDongle : startNode, endDongle ? endDongle : endNode, grid, startHeading ? startHeading : heading_1.HEADING_RIGHT, endHeading ? endHeading : heading_1.HEADING_RIGHT, dongleOverlap ? [] : dynamicAABBs);
    if (path) {
        const points = path.map((node) => [
            node.pos[0],
            node.pos[1],
        ]);
        startDongle && points.unshift(startGlobalPoint);
        endDongle && points.push(endGlobalPoint);
        return points;
    }
    return null;
};
const offsetFromHeading = (heading, head, side) => {
    switch (heading) {
        case heading_1.HEADING_UP:
            return [head, side, side, side];
        case heading_1.HEADING_RIGHT:
            return [side, head, side, side];
        case heading_1.HEADING_DOWN:
            return [side, side, head, side];
    }
    return [side, side, side, head];
};
/**
 * Routing algorithm based on the A* path search algorithm.
 * @see https://www.geeksforgeeks.org/a-search-algorithm/
 *
 * Binary heap is used to optimize node lookup.
 * See {@link calculateGrid} for the grid calculation details.
 *
 * Additional modifications added due to aesthetic route reasons:
 * 1) Arrow segment direction change is penalized by specific linear constant (bendMultiplier)
 * 2) Arrow segments are not allowed to go "backwards", overlapping with the previous segment
 */
const astar = (start, end, grid, startHeading, endHeading, aabbs) => {
    const bendMultiplier = m_dist(start.pos, end.pos);
    const open = new common_1.BinaryHeap((node) => node.f);
    open.push(start);
    while (open.size() > 0) {
        // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
        const current = open.pop();
        if (!current || current.closed) {
            // Current is not passable, continue with next element
            continue;
        }
        // End case -- result has been found, return the traced path.
        if (current === end) {
            return pathTo(start, current);
        }
        // Normal case -- move current from open to closed, process each of its neighbors.
        current.closed = true;
        // Find all neighbors for the current node.
        const neighbors = getNeighbors(current.addr, grid);
        for (let i = 0; i < 4; i++) {
            const neighbor = neighbors[i];
            if (!neighbor || neighbor.closed) {
                // Not a valid node to process, skip to next neighbor.
                continue;
            }
            // Intersect
            const neighborHalfPoint = (0, math_1.pointScaleFromOrigin)(neighbor.pos, current.pos, 0.5);
            if ((0, common_1.isAnyTrue)(...aabbs.map((aabb) => (0, bounds_1.pointInsideBounds)(neighborHalfPoint, aabb)))) {
                continue;
            }
            // The g score is the shortest distance from start to current node.
            // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
            const neighborHeading = neighborIndexToHeading(i);
            const previousDirection = current.parent
                ? (0, heading_1.vectorToHeading)((0, math_1.vectorFromPoint)(current.pos, current.parent.pos))
                : startHeading;
            // Do not allow going in reverse
            const reverseHeading = (0, heading_1.flipHeading)(previousDirection);
            const neighborIsReverseRoute = (0, heading_1.compareHeading)(reverseHeading, neighborHeading) ||
                (gridAddressesEqual(start.addr, neighbor.addr) &&
                    (0, heading_1.compareHeading)(neighborHeading, startHeading)) ||
                (gridAddressesEqual(end.addr, neighbor.addr) &&
                    (0, heading_1.compareHeading)(neighborHeading, endHeading));
            if (neighborIsReverseRoute) {
                continue;
            }
            const directionChange = previousDirection !== neighborHeading;
            const gScore = current.g +
                m_dist(neighbor.pos, current.pos) +
                (directionChange ? Math.pow(bendMultiplier, 3) : 0);
            const beenVisited = neighbor.visited;
            if (!beenVisited || gScore < neighbor.g) {
                const estBendCount = estimateSegmentCount(neighbor, end, neighborHeading, endHeading);
                // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                neighbor.visited = true;
                neighbor.parent = current;
                neighbor.h =
                    m_dist(end.pos, neighbor.pos) +
                        estBendCount * Math.pow(bendMultiplier, 2);
                neighbor.g = gScore;
                neighbor.f = neighbor.g + neighbor.h;
                if (!beenVisited) {
                    // Pushing to heap will put it in proper place based on the 'f' value.
                    open.push(neighbor);
                }
                else {
                    // Already seen the node, but since it has been rescored we need to reorder it in the heap
                    open.rescoreElement(neighbor);
                }
            }
        }
    }
    return null;
};
const pathTo = (start, node) => {
    let curr = node;
    const path = [];
    while (curr.parent) {
        path.unshift(curr);
        curr = curr.parent;
    }
    path.unshift(start);
    return path;
};
const m_dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
/**
 * Create dynamically resizing, always touching
 * bounding boxes having a minimum extent represented
 * by the given static bounds.
 */
const generateDynamicAABBs = (a, b, common, startDifference, endDifference, disableSideHack, startElementBounds, endElementBounds) => {
    const startEl = startElementBounds ?? a;
    const endEl = endElementBounds ?? b;
    const [startUp, startRight, startDown, startLeft] = startDifference ?? [
        0, 0, 0, 0,
    ];
    const [endUp, endRight, endDown, endLeft] = endDifference ?? [0, 0, 0, 0];
    const first = [
        a[0] > b[2]
            ? a[1] > b[3] || a[3] < b[1]
                ? Math.min((startEl[0] + endEl[2]) / 2, a[0] - startLeft)
                : (startEl[0] + endEl[2]) / 2
            : a[0] > b[0]
                ? a[0] - startLeft
                : common[0] - startLeft,
        a[1] > b[3]
            ? a[0] > b[2] || a[2] < b[0]
                ? Math.min((startEl[1] + endEl[3]) / 2, a[1] - startUp)
                : (startEl[1] + endEl[3]) / 2
            : a[1] > b[1]
                ? a[1] - startUp
                : common[1] - startUp,
        a[2] < b[0]
            ? a[1] > b[3] || a[3] < b[1]
                ? Math.max((startEl[2] + endEl[0]) / 2, a[2] + startRight)
                : (startEl[2] + endEl[0]) / 2
            : a[2] < b[2]
                ? a[2] + startRight
                : common[2] + startRight,
        a[3] < b[1]
            ? a[0] > b[2] || a[2] < b[0]
                ? Math.max((startEl[3] + endEl[1]) / 2, a[3] + startDown)
                : (startEl[3] + endEl[1]) / 2
            : a[3] < b[3]
                ? a[3] + startDown
                : common[3] + startDown,
    ];
    const second = [
        b[0] > a[2]
            ? b[1] > a[3] || b[3] < a[1]
                ? Math.min((endEl[0] + startEl[2]) / 2, b[0] - endLeft)
                : (endEl[0] + startEl[2]) / 2
            : b[0] > a[0]
                ? b[0] - endLeft
                : common[0] - endLeft,
        b[1] > a[3]
            ? b[0] > a[2] || b[2] < a[0]
                ? Math.min((endEl[1] + startEl[3]) / 2, b[1] - endUp)
                : (endEl[1] + startEl[3]) / 2
            : b[1] > a[1]
                ? b[1] - endUp
                : common[1] - endUp,
        b[2] < a[0]
            ? b[1] > a[3] || b[3] < a[1]
                ? Math.max((endEl[2] + startEl[0]) / 2, b[2] + endRight)
                : (endEl[2] + startEl[0]) / 2
            : b[2] < a[2]
                ? b[2] + endRight
                : common[2] + endRight,
        b[3] < a[1]
            ? b[0] > a[2] || b[2] < a[0]
                ? Math.max((endEl[3] + startEl[1]) / 2, b[3] + endDown)
                : (endEl[3] + startEl[1]) / 2
            : b[3] < a[3]
                ? b[3] + endDown
                : common[3] + endDown,
    ];
    const c = commonAABB([first, second]);
    if (!disableSideHack &&
        first[2] - first[0] + second[2] - second[0] > c[2] - c[0] + 0.00000000001 &&
        first[3] - first[1] + second[3] - second[1] > c[3] - c[1] + 0.00000000001) {
        const [endCenterX, endCenterY] = [
            (second[0] + second[2]) / 2,
            (second[1] + second[3]) / 2,
        ];
        if (b[0] > a[2] && a[1] > b[3]) {
            // BOTTOM LEFT
            const cX = first[2] + (second[0] - first[2]) / 2;
            const cY = second[3] + (first[1] - second[3]) / 2;
            if ((0, math_1.vectorCross)((0, math_1.vector)(a[2] - endCenterX, a[1] - endCenterY), (0, math_1.vector)(a[0] - endCenterX, a[3] - endCenterY)) > 0) {
                return [
                    [first[0], first[1], cX, first[3]],
                    [cX, second[1], second[2], second[3]],
                ];
            }
            return [
                [first[0], cY, first[2], first[3]],
                [second[0], second[1], second[2], cY],
            ];
        }
        else if (a[2] < b[0] && a[3] < b[1]) {
            // TOP LEFT
            const cX = first[2] + (second[0] - first[2]) / 2;
            const cY = first[3] + (second[1] - first[3]) / 2;
            if ((0, math_1.vectorCross)((0, math_1.vector)(a[0] - endCenterX, a[1] - endCenterY), (0, math_1.vector)(a[2] - endCenterX, a[3] - endCenterY)) > 0) {
                return [
                    [first[0], first[1], first[2], cY],
                    [second[0], cY, second[2], second[3]],
                ];
            }
            return [
                [first[0], first[1], cX, first[3]],
                [cX, second[1], second[2], second[3]],
            ];
        }
        else if (a[0] > b[2] && a[3] < b[1]) {
            // TOP RIGHT
            const cX = second[2] + (first[0] - second[2]) / 2;
            const cY = first[3] + (second[1] - first[3]) / 2;
            if ((0, math_1.vectorCross)((0, math_1.vector)(a[2] - endCenterX, a[1] - endCenterY), (0, math_1.vector)(a[0] - endCenterX, a[3] - endCenterY)) > 0) {
                return [
                    [cX, first[1], first[2], first[3]],
                    [second[0], second[1], cX, second[3]],
                ];
            }
            return [
                [first[0], first[1], first[2], cY],
                [second[0], cY, second[2], second[3]],
            ];
        }
        else if (a[0] > b[2] && a[1] > b[3]) {
            // BOTTOM RIGHT
            const cX = second[2] + (first[0] - second[2]) / 2;
            const cY = second[3] + (first[1] - second[3]) / 2;
            if ((0, math_1.vectorCross)((0, math_1.vector)(a[0] - endCenterX, a[1] - endCenterY), (0, math_1.vector)(a[2] - endCenterX, a[3] - endCenterY)) > 0) {
                return [
                    [cX, first[1], first[2], first[3]],
                    [second[0], second[1], cX, second[3]],
                ];
            }
            return [
                [first[0], cY, first[2], first[3]],
                [second[0], second[1], second[2], cY],
            ];
        }
    }
    return [first, second];
};
/**
 * Calculates the grid which is used as nodes at
 * the grid line intersections by the A* algorithm.
 *
 * NOTE: This is not a uniform grid. It is built at
 * various intersections of bounding boxes.
 */
const calculateGrid = (aabbs, start, startHeading, end, endHeading, common) => {
    const horizontal = new Set();
    const vertical = new Set();
    if (startHeading === heading_1.HEADING_LEFT || startHeading === heading_1.HEADING_RIGHT) {
        vertical.add(start[1]);
    }
    else {
        horizontal.add(start[0]);
    }
    if (endHeading === heading_1.HEADING_LEFT || endHeading === heading_1.HEADING_RIGHT) {
        vertical.add(end[1]);
    }
    else {
        horizontal.add(end[0]);
    }
    aabbs.forEach((aabb) => {
        horizontal.add(aabb[0]);
        horizontal.add(aabb[2]);
        vertical.add(aabb[1]);
        vertical.add(aabb[3]);
    });
    horizontal.add(common[0]);
    horizontal.add(common[2]);
    vertical.add(common[1]);
    vertical.add(common[3]);
    const _vertical = Array.from(vertical).sort((a, b) => a - b);
    const _horizontal = Array.from(horizontal).sort((a, b) => a - b);
    return {
        row: _vertical.length,
        col: _horizontal.length,
        data: _vertical.flatMap((y, row) => _horizontal.map((x, col) => ({
            f: 0,
            g: 0,
            h: 0,
            closed: false,
            visited: false,
            parent: null,
            addr: [col, row],
            pos: [x, y],
        }))),
    };
};
const getDonglePosition = (bounds, heading, p) => {
    switch (heading) {
        case heading_1.HEADING_UP:
            return (0, math_1.pointFrom)(p[0], bounds[1]);
        case heading_1.HEADING_RIGHT:
            return (0, math_1.pointFrom)(bounds[2], p[1]);
        case heading_1.HEADING_DOWN:
            return (0, math_1.pointFrom)(p[0], bounds[3]);
    }
    return (0, math_1.pointFrom)(bounds[0], p[1]);
};
const estimateSegmentCount = (start, end, startHeading, endHeading) => {
    if (endHeading === heading_1.HEADING_RIGHT) {
        switch (startHeading) {
            case heading_1.HEADING_RIGHT: {
                if (start.pos[0] >= end.pos[0]) {
                    return 4;
                }
                if (start.pos[1] === end.pos[1]) {
                    return 0;
                }
                return 2;
            }
            case heading_1.HEADING_UP:
                if (start.pos[1] > end.pos[1] && start.pos[0] < end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_DOWN:
                if (start.pos[1] < end.pos[1] && start.pos[0] < end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_LEFT:
                if (start.pos[1] === end.pos[1]) {
                    return 4;
                }
                return 2;
        }
    }
    else if (endHeading === heading_1.HEADING_LEFT) {
        switch (startHeading) {
            case heading_1.HEADING_RIGHT:
                if (start.pos[1] === end.pos[1]) {
                    return 4;
                }
                return 2;
            case heading_1.HEADING_UP:
                if (start.pos[1] > end.pos[1] && start.pos[0] > end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_DOWN:
                if (start.pos[1] < end.pos[1] && start.pos[0] > end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_LEFT:
                if (start.pos[0] <= end.pos[0]) {
                    return 4;
                }
                if (start.pos[1] === end.pos[1]) {
                    return 0;
                }
                return 2;
        }
    }
    else if (endHeading === heading_1.HEADING_UP) {
        switch (startHeading) {
            case heading_1.HEADING_RIGHT:
                if (start.pos[1] > end.pos[1] && start.pos[0] < end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_UP:
                if (start.pos[1] >= end.pos[1]) {
                    return 4;
                }
                if (start.pos[0] === end.pos[0]) {
                    return 0;
                }
                return 2;
            case heading_1.HEADING_DOWN:
                if (start.pos[0] === end.pos[0]) {
                    return 4;
                }
                return 2;
            case heading_1.HEADING_LEFT:
                if (start.pos[1] > end.pos[1] && start.pos[0] > end.pos[0]) {
                    return 1;
                }
                return 3;
        }
    }
    else if (endHeading === heading_1.HEADING_DOWN) {
        switch (startHeading) {
            case heading_1.HEADING_RIGHT:
                if (start.pos[1] < end.pos[1] && start.pos[0] < end.pos[0]) {
                    return 1;
                }
                return 3;
            case heading_1.HEADING_UP:
                if (start.pos[0] === end.pos[0]) {
                    return 4;
                }
                return 2;
            case heading_1.HEADING_DOWN:
                if (start.pos[1] <= end.pos[1]) {
                    return 4;
                }
                if (start.pos[0] === end.pos[0]) {
                    return 0;
                }
                return 2;
            case heading_1.HEADING_LEFT:
                if (start.pos[1] < end.pos[1] && start.pos[0] > end.pos[0]) {
                    return 1;
                }
                return 3;
        }
    }
    return 0;
};
/**
 * Get neighboring points for a gived grid address
 */
const getNeighbors = ([col, row], grid) => [
    gridNodeFromAddr([col, row - 1], grid),
    gridNodeFromAddr([col + 1, row], grid),
    gridNodeFromAddr([col, row + 1], grid),
    gridNodeFromAddr([col - 1, row], grid),
];
const gridNodeFromAddr = ([col, row], grid) => {
    if (col < 0 || col >= grid.col || row < 0 || row >= grid.row) {
        return null;
    }
    return grid.data[row * grid.col + col] ?? null;
};
/**
 * Get node for global point on canvas (if exists)
 */
const pointToGridNode = (point, grid) => {
    for (let col = 0; col < grid.col; col++) {
        for (let row = 0; row < grid.row; row++) {
            const candidate = gridNodeFromAddr([col, row], grid);
            if (candidate &&
                point[0] === candidate.pos[0] &&
                point[1] === candidate.pos[1]) {
                return candidate;
            }
        }
    }
    return null;
};
const commonAABB = (aabbs) => [
    Math.min(...aabbs.map((aabb) => aabb[0])),
    Math.min(...aabbs.map((aabb) => aabb[1])),
    Math.max(...aabbs.map((aabb) => aabb[2])),
    Math.max(...aabbs.map((aabb) => aabb[3])),
];
/// #region Utils
const getBindableElementForId = (id, elementsMap) => {
    const element = elementsMap.get(id);
    if (element && (0, typeChecks_1.isBindableElement)(element)) {
        return element;
    }
    return null;
};
const normalizeArrowElementUpdate = (global, nextFixedSegments, startIsSpecial, endIsSpecial) => {
    const offsetX = global[0][0];
    const offsetY = global[0][1];
    let points = global.map((p) => (0, math_1.pointTranslate)(p, (0, math_1.vectorScale)((0, math_1.vectorFromPoint)(global[0]), -1)));
    // NOTE (mtolmacs): This is a temporary check to see if the normalization
    // creates an overly large arrow. This should be removed once we have an answer.
    if (offsetX < -MAX_POS ||
        offsetX > MAX_POS ||
        offsetY < -MAX_POS ||
        offsetY > MAX_POS ||
        offsetX + points[points.length - 1][0] < -MAX_POS ||
        offsetY + points[points.length - 1][0] > MAX_POS ||
        offsetX + points[points.length - 1][1] < -MAX_POS ||
        offsetY + points[points.length - 1][1] > MAX_POS) {
        console.error("Elbow arrow normalization is outside reasonable bounds (> 1e6)", {
            x: offsetX,
            y: offsetY,
            points,
            ...(0, common_1.getSizeFromPoints)(points),
        });
    }
    points = points.map(([x, y]) => (0, math_1.pointFrom)((0, math_1.clamp)(x, -1e6, 1e6), (0, math_1.clamp)(y, -1e6, 1e6)));
    return {
        points,
        x: (0, math_1.clamp)(offsetX, -1e6, 1e6),
        y: (0, math_1.clamp)(offsetY, -1e6, 1e6),
        fixedSegments: (nextFixedSegments?.length ?? 0) > 0 ? nextFixedSegments : null,
        ...(0, common_1.getSizeFromPoints)(points),
        startIsSpecial,
        endIsSpecial,
    };
};
const getElbowArrowCornerPoints = (points) => {
    if (points.length > 1) {
        let previousHorizontal = Math.abs(points[0][1] - points[1][1]) <
            Math.abs(points[0][0] - points[1][0]);
        return points.filter((p, idx) => {
            // The very first and last points are always kept
            if (idx === 0 || idx === points.length - 1) {
                return true;
            }
            const next = points[idx + 1];
            const nextHorizontal = Math.abs(p[1] - next[1]) < Math.abs(p[0] - next[0]);
            if (previousHorizontal === nextHorizontal) {
                previousHorizontal = nextHorizontal;
                return false;
            }
            previousHorizontal = nextHorizontal;
            return true;
        });
    }
    return points;
};
const removeElbowArrowShortSegments = (points) => {
    if (points.length >= 4) {
        return points.filter((p, idx) => {
            if (idx === 0 || idx === points.length - 1) {
                return true;
            }
            const prev = points[idx - 1];
            const prevDist = (0, math_1.pointDistance)(prev, p);
            return prevDist > DEDUP_TRESHOLD;
        });
    }
    return points;
};
const neighborIndexToHeading = (idx) => {
    switch (idx) {
        case 0:
            return heading_1.HEADING_UP;
        case 1:
            return heading_1.HEADING_RIGHT;
        case 2:
            return heading_1.HEADING_DOWN;
    }
    return heading_1.HEADING_LEFT;
};
const getGlobalPoint = (arrow, startOrEnd, fixedPointRatio, initialPoint, element, elementsMap, isDragging, isBindingEnabled = true, isMidpointSnappingEnabled = true) => {
    if (isDragging) {
        if (isBindingEnabled && element && elementsMap) {
            return (0, binding_1.bindPointToSnapToElementOutline)(arrow, element, startOrEnd, elementsMap, undefined, isMidpointSnappingEnabled);
        }
        return initialPoint;
    }
    if (element) {
        return (0, binding_1.getGlobalFixedPointForBindableElement)(fixedPointRatio || [0, 0], element, elementsMap ?? (0, common_1.arrayToMap)([element]));
    }
    return initialPoint;
};
const getBindPointHeading = (p, otherPoint, hoveredElement, origPoint, elementsMap, zoom) => (0, binding_1.getHeadingForElbowArrowSnap)(p, otherPoint, hoveredElement, hoveredElement &&
    (0, bounds_1.aabbForElement)(hoveredElement, elementsMap, Array(4).fill((0, distance_1.distanceToElement)(hoveredElement, elementsMap, p))), origPoint, elementsMap, zoom);
const getHoveredElement = (origPoint, elementsMap, elements, zoom) => {
    return (0, collision_1.getHoveredElementForBinding)(origPoint, elements, elementsMap, (0, binding_1.maxBindingDistance_simple)(zoom));
};
const gridAddressesEqual = (a, b) => a[0] === b[0] && a[1] === b[1];
const validateElbowPoints = (points, tolerance = DEDUP_TRESHOLD) => points
    .slice(1)
    .map((p, i) => Math.abs(p[0] - points[i][0]) < tolerance ||
    Math.abs(p[1] - points[i][1]) < tolerance)
    .every(Boolean);
exports.validateElbowPoints = validateElbowPoints;
