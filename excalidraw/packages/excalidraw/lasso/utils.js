"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLassoSelectedElementIds = void 0;
const points_on_curve_1 = require("points-on-curve");
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const getLassoSelectedElementIds = (input) => {
    const { lassoPath, elements, elementsMap, elementsSegments, intersectedElements, enclosedElements, simplifyDistance, } = input;
    // simplify the path to reduce the number of points
    let path = lassoPath;
    if (simplifyDistance) {
        path = (0, points_on_curve_1.simplify)(lassoPath, simplifyDistance);
    }
    const unlockedElements = elements.filter((el) => !el.locked);
    // as the path might not enclose a shape anymore, clear before checking
    enclosedElements.clear();
    intersectedElements.clear();
    const lassoBounds = lassoPath.reduce((acc, item) => {
        return [
            Math.min(acc[0], item[0]),
            Math.min(acc[1], item[1]),
            Math.max(acc[2], item[0]),
            Math.max(acc[3], item[1]),
        ];
    }, [Infinity, Infinity, -Infinity, -Infinity]);
    for (const element of unlockedElements) {
        // First check if the lasso segment intersects the element's axis-aligned
        // bounding box as it is much faster than checking intersection against
        // the element's shape
        const elementBounds = (0, element_1.getElementBounds)(element, elementsMap);
        if ((0, element_1.doBoundsIntersect)(lassoBounds, elementBounds) &&
            !intersectedElements.has(element.id) &&
            !enclosedElements.has(element.id)) {
            const enclosed = enclosureTest(path, element, elementsSegments);
            if (enclosed) {
                enclosedElements.add(element.id);
            }
            else {
                const intersects = intersectionTest(path, element, elementsMap);
                if (intersects) {
                    intersectedElements.add(element.id);
                }
            }
        }
    }
    const results = [...intersectedElements, ...enclosedElements];
    return {
        selectedElementIds: results,
    };
};
exports.getLassoSelectedElementIds = getLassoSelectedElementIds;
const enclosureTest = (lassoPath, element, elementsSegments) => {
    const lassoPolygon = (0, math_1.polygonFromPoints)(lassoPath);
    const segments = elementsSegments.get(element.id);
    if (!segments) {
        return false;
    }
    return segments.some((segment) => {
        return segment.some((point) => (0, math_1.polygonIncludesPointNonZero)(point, lassoPolygon));
    });
};
const intersectionTest = (lassoPath, element, elementsMap) => {
    const lassoSegments = lassoPath
        .slice(1)
        .map((point, index) => (0, math_1.lineSegment)(lassoPath[index], point))
        .concat([(0, math_1.lineSegment)(lassoPath[lassoPath.length - 1], lassoPath[0])]);
    const boundTextElement = (0, element_1.getBoundTextElement)(element, elementsMap);
    return lassoSegments.some((lassoSegment) => (0, element_1.intersectElementWithLineSegment)(element, elementsMap, lassoSegment, 0, true).length > 0 ||
        (!!boundTextElement &&
            (0, element_1.intersectElementWithLineSegment)({
                ...boundTextElement,
                ...(0, element_1.computeBoundTextPosition)(element, boundTextElement, elementsMap),
            }, elementsMap, lassoSegment, 0, true).length > 0));
};
