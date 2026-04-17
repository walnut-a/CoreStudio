"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EraserTrail = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const math_1 = require("@excalidraw/math");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const animated_trail_1 = require("../animated-trail");
class EraserTrail extends animated_trail_1.AnimatedTrail {
    elementsToErase = new Set();
    groupsToErase = new Set();
    constructor(animationFrameHandler, app) {
        super(animationFrameHandler, app, {
            streamline: 0.2,
            size: 5,
            keepHead: true,
            sizeMapping: (c) => {
                const DECAY_TIME = 200;
                const DECAY_LENGTH = 10;
                const t = Math.max(0, 1 - (performance.now() - c.pressure) / DECAY_TIME);
                const l = (DECAY_LENGTH -
                    Math.min(DECAY_LENGTH, c.totalLength - c.currentIndex)) /
                    DECAY_LENGTH;
                return Math.min((0, common_1.easeOut)(l), (0, common_1.easeOut)(t));
            },
            fill: () => app.state.theme === common_1.THEME.LIGHT
                ? "rgba(0, 0, 0, 0.2)"
                : "rgba(255, 255, 255, 0.2)",
        });
    }
    startPath(x, y) {
        this.endPath();
        super.startPath(x, y);
        this.elementsToErase.clear();
    }
    addPointToPath(x, y, restore = false) {
        super.addPointToPath(x, y);
        const elementsToEraser = this.updateElementsToBeErased(restore);
        return elementsToEraser;
    }
    updateElementsToBeErased(restoreToErase) {
        const eraserPath = super
            .getCurrentTrail()
            ?.originalPoints?.map((p) => (0, math_1.pointFrom)(p[0], p[1])) || [];
        if (eraserPath.length < 2) {
            return [];
        }
        // for efficiency and avoid unnecessary calculations,
        // take only POINTS_ON_TRAIL points to form some number of segments
        const pathSegment = (0, math_1.lineSegment)(eraserPath[eraserPath.length - 1], eraserPath[eraserPath.length - 2]);
        const candidateElements = this.app.visibleElements.filter((el) => !el.locked);
        const candidateElementsMap = (0, common_1.arrayToMap)(candidateElements);
        for (const element of candidateElements) {
            // restore only if already added to the to-be-erased set
            if (restoreToErase && this.elementsToErase.has(element.id)) {
                const intersects = eraserTest(pathSegment, element, candidateElementsMap, this.app.state.zoom.value);
                if (intersects) {
                    const shallowestGroupId = element.groupIds.at(-1);
                    if (this.groupsToErase.has(shallowestGroupId)) {
                        const elementsInGroup = (0, element_2.getElementsInGroup)(this.app.scene.getNonDeletedElementsMap(), shallowestGroupId);
                        for (const elementInGroup of elementsInGroup) {
                            this.elementsToErase.delete(elementInGroup.id);
                        }
                        this.groupsToErase.delete(shallowestGroupId);
                    }
                    if ((0, element_4.isBoundToContainer)(element)) {
                        this.elementsToErase.delete(element.containerId);
                    }
                    if ((0, element_4.hasBoundTextElement)(element)) {
                        const boundText = (0, element_5.getBoundTextElementId)(element);
                        if (boundText) {
                            this.elementsToErase.delete(boundText);
                        }
                    }
                    this.elementsToErase.delete(element.id);
                }
            }
            else if (!restoreToErase && !this.elementsToErase.has(element.id)) {
                const intersects = eraserTest(pathSegment, element, candidateElementsMap, this.app.state.zoom.value);
                if (intersects) {
                    const shallowestGroupId = element.groupIds.at(-1);
                    if (!this.groupsToErase.has(shallowestGroupId)) {
                        const elementsInGroup = (0, element_2.getElementsInGroup)(this.app.scene.getNonDeletedElementsMap(), shallowestGroupId);
                        for (const elementInGroup of elementsInGroup) {
                            this.elementsToErase.add(elementInGroup.id);
                        }
                        this.groupsToErase.add(shallowestGroupId);
                    }
                    if ((0, element_4.hasBoundTextElement)(element)) {
                        const boundText = (0, element_5.getBoundTextElementId)(element);
                        if (boundText) {
                            this.elementsToErase.add(boundText);
                        }
                    }
                    if ((0, element_4.isBoundToContainer)(element)) {
                        this.elementsToErase.add(element.containerId);
                    }
                    this.elementsToErase.add(element.id);
                }
            }
        }
        return Array.from(this.elementsToErase);
    }
    endPath() {
        super.endPath();
        super.clearTrails();
        this.elementsToErase.clear();
        this.groupsToErase.clear();
    }
}
exports.EraserTrail = EraserTrail;
const eraserTest = (pathSegment, element, elementsMap, zoom) => {
    const lastPoint = pathSegment[1];
    // PERF: Do a quick bounds intersection test first because it's cheap
    const threshold = (0, element_1.isFreeDrawElement)(element) ? 15 : element.strokeWidth / 2;
    const segmentBounds = [
        Math.min(pathSegment[0][0], pathSegment[1][0]) - threshold,
        Math.min(pathSegment[0][1], pathSegment[1][1]) - threshold,
        Math.max(pathSegment[0][0], pathSegment[1][0]) + threshold,
        Math.max(pathSegment[0][1], pathSegment[1][1]) + threshold,
    ];
    const origElementBounds = (0, element_1.getElementBounds)(element, elementsMap);
    const elementBounds = [
        origElementBounds[0] - threshold,
        origElementBounds[1] - threshold,
        origElementBounds[2] + threshold,
        origElementBounds[3] + threshold,
    ];
    if (!(0, element_1.doBoundsIntersect)(segmentBounds, elementBounds)) {
        return false;
    }
    // There are shapes where the inner area should trigger erasing
    // even though the eraser path segment doesn't intersect with or
    // get close to the shape's stroke
    if ((0, element_3.shouldTestInside)(element) &&
        (0, element_1.isPointInElement)(lastPoint, element, elementsMap)) {
        return true;
    }
    // Freedraw elements are tested for erasure by measuring the distance
    // of the eraser path and the freedraw shape outline lines to a tolerance
    // which offers a good visual precision at various zoom levels
    if ((0, element_1.isFreeDrawElement)(element)) {
        const outlinePoints = (0, element_1.getFreedrawOutlinePoints)(element);
        const strokeSegments = (0, element_1.getFreedrawOutlineAsSegments)(element, outlinePoints, elementsMap);
        const tolerance = Math.max(2.25, 5 / zoom); // NOTE: Visually fine-tuned approximation
        for (const seg of strokeSegments) {
            if ((0, math_1.lineSegmentsDistance)(seg, pathSegment) <= tolerance) {
                return true;
            }
        }
        const poly = (0, math_1.polygon)(...outlinePoints.map(([x, y]) => (0, math_1.pointFrom)(element.x + x, element.y + y)));
        // PERF: Check only one point of the eraser segment. If the eraser segment
        // start is inside the closed freedraw shape, the other point is either also
        // inside or the eraser segment will intersect the shape outline anyway
        if ((0, math_1.polygonIncludesPointNonZero)(pathSegment[0], poly)) {
            return true;
        }
        return false;
    }
    const boundTextElement = (0, element_1.getBoundTextElement)(element, elementsMap);
    if ((0, element_1.isArrowElement)(element) || ((0, element_1.isLineElement)(element) && !element.polygon)) {
        const tolerance = Math.max(element.strokeWidth, (element.strokeWidth * 2) / zoom);
        // If the eraser movement is so fast that a large distance is covered
        // between the last two points, the distanceToElement miss, so we test
        // agaist each segment of the linear element
        const segments = (0, element_1.getElementLineSegments)(element, elementsMap);
        for (const seg of segments) {
            if ((0, math_1.lineSegmentsDistance)(seg, pathSegment) <= tolerance) {
                return true;
            }
        }
        return false;
    }
    return ((0, element_1.intersectElementWithLineSegment)(element, elementsMap, pathSegment, 0, true)
        .length > 0 ||
        (!!boundTextElement &&
            (0, element_1.intersectElementWithLineSegment)({
                ...boundTextElement,
                ...(0, element_1.computeBoundTextPosition)(element, boundTextElement, elementsMap),
            }, elementsMap, pathSegment, 0, true).length > 0));
};
