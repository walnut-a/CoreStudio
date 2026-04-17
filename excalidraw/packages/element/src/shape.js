"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFreedrawOutlinePoints = exports.toggleLinePolygonState = exports.getElementShape = exports.generateLinearCollisionShape = exports.generateRoughOptions = exports.ShapeCache = void 0;
const points_on_curve_1 = require("points-on-curve");
const perfect_freehand_1 = require("perfect-freehand");
const shape_1 = require("@excalidraw/utils/shape");
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const generator_1 = require("roughjs/bin/generator");
const renderElement_1 = require("./renderElement");
const typeChecks_1 = require("./typeChecks");
const utils_1 = require("./utils");
const heading_1 = require("./heading");
const comparisons_1 = require("./comparisons");
const bounds_1 = require("./bounds");
const collision_1 = require("./collision");
class ShapeCache {
    static rg = new generator_1.RoughGenerator();
    static cache = new WeakMap();
    /**
     * Retrieves shape from cache if available. Use this only if shape
     * is optional and you have a fallback in case it's not cached.
     */
    static get = (element, theme) => {
        const cached = ShapeCache.cache.get(element);
        if (cached && (theme === null || cached.theme === theme)) {
            return cached.shape;
        }
        return undefined;
    };
    static delete = (element) => {
        ShapeCache.cache.delete(element);
        renderElement_1.elementWithCanvasCache.delete(element);
    };
    static destroy = () => {
        ShapeCache.cache = new WeakMap();
    };
    /**
     * Generates & caches shape for element if not already cached, otherwise
     * returns cached shape.
     */
    static generateElementShape = (element, renderConfig) => {
        // when exporting, always regenerated to guarantee the latest shape
        const cachedShape = renderConfig?.isExporting
            ? undefined
            : ShapeCache.get(element, renderConfig ? renderConfig.theme : null);
        // `null` indicates no rc shape applicable for this element type,
        // but it's considered a valid cache value (= do not regenerate)
        if (cachedShape !== undefined) {
            return cachedShape;
        }
        renderElement_1.elementWithCanvasCache.delete(element);
        const shape = _generateElementShape(element, ShapeCache.rg, renderConfig || {
            isExporting: false,
            canvasBackgroundColor: common_1.COLOR_PALETTE.white,
            embedsValidationStatus: null,
            theme: common_1.THEME.LIGHT,
        });
        if (!renderConfig?.isExporting) {
            ShapeCache.cache.set(element, {
                shape,
                theme: renderConfig?.theme || common_1.THEME.LIGHT,
            });
        }
        return shape;
    };
}
exports.ShapeCache = ShapeCache;
const getDashArrayDashed = (strokeWidth) => [8, 8 + strokeWidth];
const getDashArrayDotted = (strokeWidth) => [1.5, 6 + strokeWidth];
function adjustRoughness(element) {
    const roughness = element.roughness;
    const maxSize = Math.max(element.width, element.height);
    const minSize = Math.min(element.width, element.height);
    // don't reduce roughness if
    if (
    // both sides relatively big
    (minSize >= 20 && maxSize >= 50) ||
        // is round & both sides above 15px
        (minSize >= 15 &&
            !!element.roundness &&
            (0, comparisons_1.canChangeRoundness)(element.type)) ||
        // relatively long linear element
        ((0, typeChecks_1.isLinearElement)(element) && maxSize >= 50)) {
        return roughness;
    }
    return Math.min(roughness / (maxSize < 10 ? 3 : 2), 2.5);
}
const generateRoughOptions = (element, continuousPath = false, isDarkMode = false) => {
    const options = {
        seed: element.seed,
        strokeLineDash: element.strokeStyle === "dashed"
            ? getDashArrayDashed(element.strokeWidth)
            : element.strokeStyle === "dotted"
                ? getDashArrayDotted(element.strokeWidth)
                : undefined,
        // for non-solid strokes, disable multiStroke because it tends to make
        // dashes/dots overlay each other
        disableMultiStroke: element.strokeStyle !== "solid",
        // for non-solid strokes, increase the width a bit to make it visually
        // similar to solid strokes, because we're also disabling multiStroke
        strokeWidth: element.strokeStyle !== "solid"
            ? element.strokeWidth + 0.5
            : element.strokeWidth,
        // when increasing strokeWidth, we must explicitly set fillWeight and
        // hachureGap because if not specified, roughjs uses strokeWidth to
        // calculate them (and we don't want the fills to be modified)
        fillWeight: element.strokeWidth / 2,
        hachureGap: element.strokeWidth * 4,
        roughness: adjustRoughness(element),
        stroke: isDarkMode
            ? (0, common_1.applyDarkModeFilter)(element.strokeColor)
            : element.strokeColor,
        preserveVertices: continuousPath || element.roughness < common_1.ROUGHNESS.cartoonist,
    };
    switch (element.type) {
        case "rectangle":
        case "iframe":
        case "embeddable":
        case "diamond":
        case "ellipse": {
            options.fillStyle = element.fillStyle;
            options.fill = (0, common_1.isTransparent)(element.backgroundColor)
                ? undefined
                : isDarkMode
                    ? (0, common_1.applyDarkModeFilter)(element.backgroundColor)
                    : element.backgroundColor;
            if (element.type === "ellipse") {
                options.curveFitting = 1;
            }
            return options;
        }
        case "line":
        case "freedraw": {
            if ((0, utils_1.isPathALoop)(element.points)) {
                options.fillStyle = element.fillStyle;
                options.fill =
                    element.backgroundColor === "transparent"
                        ? undefined
                        : isDarkMode
                            ? (0, common_1.applyDarkModeFilter)(element.backgroundColor)
                            : element.backgroundColor;
            }
            return options;
        }
        case "arrow":
            return options;
        default: {
            throw new Error(`Unimplemented type ${element.type}`);
        }
    }
};
exports.generateRoughOptions = generateRoughOptions;
const modifyIframeLikeForRoughOptions = (element, isExporting, embedsValidationStatus) => {
    if ((0, typeChecks_1.isIframeLikeElement)(element) &&
        (isExporting ||
            ((0, typeChecks_1.isEmbeddableElement)(element) &&
                embedsValidationStatus?.get(element.id) !== true)) &&
        (0, common_1.isTransparent)(element.backgroundColor) &&
        (0, common_1.isTransparent)(element.strokeColor)) {
        return {
            ...element,
            roughness: 0,
            backgroundColor: "#d3d3d3",
            fillStyle: "solid",
        };
    }
    else if ((0, typeChecks_1.isIframeElement)(element)) {
        return {
            ...element,
            strokeColor: (0, common_1.isTransparent)(element.strokeColor)
                ? "#000000"
                : element.strokeColor,
            backgroundColor: (0, common_1.isTransparent)(element.backgroundColor)
                ? "#f4f4f6"
                : element.backgroundColor,
        };
    }
    return element;
};
const generateArrowheadCardinalityOne = (generator, arrowheadPoints, lineOptions) => {
    if (arrowheadPoints === null) {
        return [];
    }
    const [, , x3, y3, x4, y4] = arrowheadPoints;
    return [generator.line(x3, y3, x4, y4, lineOptions)];
};
const generateArrowheadLinesToTip = (generator, arrowheadPoints, lineOptions) => {
    if (arrowheadPoints === null) {
        return [];
    }
    const [x2, y2, x3, y3, x4, y4] = arrowheadPoints;
    return [
        generator.line(x3, y3, x2, y2, lineOptions),
        generator.line(x4, y4, x2, y2, lineOptions),
    ];
};
const getArrowheadLineOptions = (element, options) => {
    const lineOptions = { ...options };
    if (element.strokeStyle === "dotted") {
        // for dotted arrows caps, reduce gap to make it more legible
        const dash = getDashArrayDotted(element.strokeWidth - 1);
        lineOptions.strokeLineDash = [dash[0], dash[1] - 1];
    }
    else {
        // for solid/dashed, keep solid arrow cap
        delete lineOptions.strokeLineDash;
    }
    lineOptions.roughness = Math.min(1, lineOptions.roughness || 0);
    return lineOptions;
};
const generateArrowheadOutlineCircle = (generator, options, strokeColor, arrowheadPoints, fill, diameterScale = 1) => {
    if (arrowheadPoints === null) {
        return [];
    }
    const [x, y, diameter] = arrowheadPoints;
    const circleOptions = {
        ...options,
        fill,
        fillStyle: "solid",
        stroke: strokeColor,
        roughness: Math.min(0.5, options.roughness || 0),
    };
    delete circleOptions.strokeLineDash;
    return [generator.circle(x, y, diameter * diameterScale, circleOptions)];
};
const getArrowheadShapes = (element, shape, position, arrowhead, generator, options, canvasBackgroundColor, isDarkMode) => {
    if (arrowhead === null) {
        return [];
    }
    const strokeColor = isDarkMode
        ? (0, common_1.applyDarkModeFilter)(element.strokeColor)
        : element.strokeColor;
    const backgroundFillColor = isDarkMode
        ? (0, common_1.applyDarkModeFilter)(canvasBackgroundColor)
        : canvasBackgroundColor;
    const cardinalityOneOrManyOffset = -0.25;
    const cardinalityZeroCircleScale = 0.8;
    switch (arrowhead) {
        case "circle":
        case "circle_outline": {
            return generateArrowheadOutlineCircle(generator, options, strokeColor, (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead), arrowhead === "circle_outline" ? backgroundFillColor : strokeColor);
        }
        case "triangle":
        case "triangle_outline": {
            const arrowheadPoints = (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead);
            if (arrowheadPoints === null) {
                return [];
            }
            const [x, y, x2, y2, x3, y3] = arrowheadPoints;
            const triangleOptions = {
                ...options,
                fill: arrowhead === "triangle_outline" ? backgroundFillColor : strokeColor,
                fillStyle: "solid",
                roughness: Math.min(1, options.roughness || 0),
            };
            // always use solid stroke for arrowhead
            delete triangleOptions.strokeLineDash;
            return [
                generator.polygon([
                    [x, y],
                    [x2, y2],
                    [x3, y3],
                    [x, y],
                ], triangleOptions),
            ];
        }
        case "diamond":
        case "diamond_outline": {
            const arrowheadPoints = (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead);
            if (arrowheadPoints === null) {
                return [];
            }
            const [x, y, x2, y2, x3, y3, x4, y4] = arrowheadPoints;
            const diamondOptions = {
                ...options,
                fill: arrowhead === "diamond_outline" ? backgroundFillColor : strokeColor,
                fillStyle: "solid",
                roughness: Math.min(1, options.roughness || 0),
            };
            // always use solid stroke for arrowhead
            delete diamondOptions.strokeLineDash;
            return [
                generator.polygon([
                    [x, y],
                    [x2, y2],
                    [x3, y3],
                    [x4, y4],
                    [x, y],
                ], diamondOptions),
            ];
        }
        case "cardinality_one":
            return generateArrowheadCardinalityOne(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead), getArrowheadLineOptions(element, options));
        case "cardinality_many":
            return generateArrowheadLinesToTip(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead), getArrowheadLineOptions(element, options));
        case "cardinality_one_or_many": {
            const lineOptions = getArrowheadLineOptions(element, options);
            return [
                ...generateArrowheadLinesToTip(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_many"), lineOptions),
                ...generateArrowheadCardinalityOne(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_one", cardinalityOneOrManyOffset), lineOptions),
            ];
        }
        case "cardinality_exactly_one": {
            const lineOptions = getArrowheadLineOptions(element, options);
            return [
                ...generateArrowheadCardinalityOne(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_one", -0.5), lineOptions),
                ...generateArrowheadCardinalityOne(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_one"), lineOptions),
            ];
        }
        case "cardinality_zero_or_one": {
            const lineOptions = getArrowheadLineOptions(element, options);
            return [
                ...generateArrowheadOutlineCircle(generator, options, strokeColor, (0, bounds_1.getArrowheadPoints)(element, shape, position, "circle_outline", 1.5), backgroundFillColor, cardinalityZeroCircleScale),
                ...generateArrowheadCardinalityOne(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_one", -0.5), lineOptions),
            ];
        }
        case "cardinality_zero_or_many": {
            const lineOptions = getArrowheadLineOptions(element, options);
            return [
                ...generateArrowheadLinesToTip(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, "cardinality_many"), lineOptions),
                ...generateArrowheadOutlineCircle(generator, options, strokeColor, (0, bounds_1.getArrowheadPoints)(element, shape, position, "circle_outline", 1.5), backgroundFillColor, cardinalityZeroCircleScale),
            ];
        }
        case "bar":
        case "arrow":
        default: {
            return generateArrowheadLinesToTip(generator, (0, bounds_1.getArrowheadPoints)(element, shape, position, arrowhead), getArrowheadLineOptions(element, options));
        }
    }
};
const generateLinearCollisionShape = (element, elementsMap) => {
    const generator = new generator_1.RoughGenerator();
    const options = {
        seed: element.seed,
        disableMultiStroke: true,
        disableMultiStrokeFill: true,
        roughness: 0,
        preserveVertices: true,
    };
    const center = (0, bounds_1.elementCenterPoint)(element, elementsMap);
    switch (element.type) {
        case "line":
        case "arrow": {
            // points array can be empty in the beginning, so it is important to add
            // initial position to it
            const points = element.points.length
                ? element.points
                : [(0, math_1.pointFrom)(0, 0)];
            if ((0, typeChecks_1.isElbowArrow)(element)) {
                return generator.path(generateElbowArrowShape(points, 16), options)
                    .sets[0].ops;
            }
            else if (!element.roundness) {
                return points.map((point, idx) => {
                    const p = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + point[0], element.y + point[1]), center, element.angle);
                    return {
                        op: idx === 0 ? "move" : "lineTo",
                        data: (0, math_1.pointFrom)(p[0] - element.x, p[1] - element.y),
                    };
                });
            }
            return generator
                .curve(points, options)
                .sets[0].ops.slice(0, element.points.length)
                .map((op, i) => {
                if (i === 0) {
                    const p = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1]), center, element.angle);
                    return {
                        op: "move",
                        data: (0, math_1.pointFrom)(p[0] - element.x, p[1] - element.y),
                    };
                }
                return {
                    op: "bcurveTo",
                    data: [
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1]), center, element.angle),
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[2], element.y + op.data[3]), center, element.angle),
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[4], element.y + op.data[5]), center, element.angle),
                    ]
                        .map((p) => (0, math_1.pointFrom)(p[0] - element.x, p[1] - element.y))
                        .flat(),
                };
            });
        }
        case "freedraw": {
            if (element.points.length < 2) {
                return [];
            }
            const simplifiedPoints = (0, points_on_curve_1.simplify)(element.points, 0.75);
            return generator
                .curve(simplifiedPoints, options)
                .sets[0].ops.slice(0, element.points.length)
                .map((op, i) => {
                if (i === 0) {
                    const p = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1]), center, element.angle);
                    return {
                        op: "move",
                        data: (0, math_1.pointFrom)(p[0] - element.x, p[1] - element.y),
                    };
                }
                return {
                    op: "bcurveTo",
                    data: [
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[0], element.y + op.data[1]), center, element.angle),
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[2], element.y + op.data[3]), center, element.angle),
                        (0, math_1.pointRotateRads)((0, math_1.pointFrom)(element.x + op.data[4], element.y + op.data[5]), center, element.angle),
                    ]
                        .map((p) => (0, math_1.pointFrom)(p[0] - element.x, p[1] - element.y))
                        .flat(),
                };
            });
        }
    }
};
exports.generateLinearCollisionShape = generateLinearCollisionShape;
/**
 * Generates the roughjs shape for given element.
 *
 * Low-level. Use `ShapeCache.generateElementShape` instead.
 *
 * @private
 */
const _generateElementShape = (element, generator, { isExporting, canvasBackgroundColor, embedsValidationStatus, theme, }) => {
    const isDarkMode = theme === common_1.THEME.DARK;
    switch (element.type) {
        case "rectangle":
        case "iframe":
        case "embeddable": {
            let shape;
            // this is for rendering the stroke/bg of the embeddable, especially
            // when the src url is not set
            if (element.roundness) {
                const w = element.width;
                const h = element.height;
                const r = (0, utils_1.getCornerRadius)(Math.min(w, h), element);
                shape = generator.path(`M ${r} 0 L ${w - r} 0 Q ${w} 0, ${w} ${r} L ${w} ${h - r} Q ${w} ${h}, ${w - r} ${h} L ${r} ${h} Q 0 ${h}, 0 ${h - r} L 0 ${r} Q 0 0, ${r} 0`, (0, exports.generateRoughOptions)(modifyIframeLikeForRoughOptions(element, isExporting, embedsValidationStatus), true, isDarkMode));
            }
            else {
                shape = generator.rectangle(0, 0, element.width, element.height, (0, exports.generateRoughOptions)(modifyIframeLikeForRoughOptions(element, isExporting, embedsValidationStatus), false, isDarkMode));
            }
            return shape;
        }
        case "diamond": {
            let shape;
            const [topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY] = (0, bounds_1.getDiamondPoints)(element);
            if (element.roundness) {
                const verticalRadius = (0, utils_1.getCornerRadius)(Math.abs(topX - leftX), element);
                const horizontalRadius = (0, utils_1.getCornerRadius)(Math.abs(rightY - topY), element);
                shape = generator.path(`M ${topX + verticalRadius} ${topY + horizontalRadius} L ${rightX - verticalRadius} ${rightY - horizontalRadius}
            C ${rightX} ${rightY}, ${rightX} ${rightY}, ${rightX - verticalRadius} ${rightY + horizontalRadius}
            L ${bottomX + verticalRadius} ${bottomY - horizontalRadius}
            C ${bottomX} ${bottomY}, ${bottomX} ${bottomY}, ${bottomX - verticalRadius} ${bottomY - horizontalRadius}
            L ${leftX + verticalRadius} ${leftY + horizontalRadius}
            C ${leftX} ${leftY}, ${leftX} ${leftY}, ${leftX + verticalRadius} ${leftY - horizontalRadius}
            L ${topX - verticalRadius} ${topY + horizontalRadius}
            C ${topX} ${topY}, ${topX} ${topY}, ${topX + verticalRadius} ${topY + horizontalRadius}`, (0, exports.generateRoughOptions)(element, true, isDarkMode));
            }
            else {
                shape = generator.polygon([
                    [topX, topY],
                    [rightX, rightY],
                    [bottomX, bottomY],
                    [leftX, leftY],
                ], (0, exports.generateRoughOptions)(element, false, isDarkMode));
            }
            return shape;
        }
        case "ellipse": {
            const shape = generator.ellipse(element.width / 2, element.height / 2, element.width, element.height, (0, exports.generateRoughOptions)(element, false, isDarkMode));
            return shape;
        }
        case "line":
        case "arrow": {
            let shape;
            const options = (0, exports.generateRoughOptions)(element, false, isDarkMode);
            // points array can be empty in the beginning, so it is important to add
            // initial position to it
            const points = element.points.length
                ? element.points
                : [(0, math_1.pointFrom)(0, 0)];
            if ((0, typeChecks_1.isElbowArrow)(element)) {
                // NOTE (mtolmacs): Temporary fix for extremely big arrow shapes
                if (!points.every((point) => Math.abs(point[0]) <= 1e6 && Math.abs(point[1]) <= 1e6)) {
                    console.error(`Elbow arrow with extreme point positions detected. Arrow not rendered.`, element.id, JSON.stringify(points));
                    shape = [];
                }
                else {
                    shape = [
                        generator.path(generateElbowArrowShape(points, 16), (0, exports.generateRoughOptions)(element, true, isDarkMode)),
                    ];
                }
            }
            else if (!element.roundness) {
                // curve is always the first element
                // this simplifies finding the curve for an element
                if (options.fill) {
                    shape = [
                        generator.polygon(points, options),
                    ];
                }
                else {
                    shape = [
                        generator.linearPath(points, options),
                    ];
                }
            }
            else {
                shape = [generator.curve(points, options)];
            }
            // add lines only in arrow
            if (element.type === "arrow") {
                const { startArrowhead = null, endArrowhead = "arrow" } = element;
                if (startArrowhead !== null) {
                    const shapes = getArrowheadShapes(element, shape, "start", startArrowhead, generator, options, canvasBackgroundColor, isDarkMode);
                    shape.push(...shapes);
                }
                if (endArrowhead !== null) {
                    if (endArrowhead === undefined) {
                        // Hey, we have an old arrow here!
                    }
                    const shapes = getArrowheadShapes(element, shape, "end", endArrowhead, generator, options, canvasBackgroundColor, isDarkMode);
                    shape.push(...shapes);
                }
            }
            return shape;
        }
        case "freedraw": {
            // oredered in terms of z-index [background, stroke]
            const shapes = [];
            // (1) background fill (rc shape), optional
            if ((0, utils_1.isPathALoop)(element.points)) {
                // generate rough polygon to fill freedraw shape
                const simplifiedPoints = (0, points_on_curve_1.simplify)(element.points, 0.75);
                shapes.push(generator.curve(simplifiedPoints, {
                    ...(0, exports.generateRoughOptions)(element, false, isDarkMode),
                    stroke: "none",
                }));
            }
            // (2) stroke
            shapes.push(getFreeDrawSvgPath(element));
            return shapes;
        }
        case "frame":
        case "magicframe":
        case "text":
        case "image": {
            const shape = null;
            // we return (and cache) `null` to make sure we don't regenerate
            // `element.canvas` on rerenders
            return shape;
        }
        default: {
            (0, common_1.assertNever)(element, `generateElementShape(): Unimplemented type ${element?.type}`);
            return null;
        }
    }
};
const generateElbowArrowShape = (points, radius) => {
    const subpoints = [];
    for (let i = 1; i < points.length - 1; i += 1) {
        const prev = points[i - 1];
        const next = points[i + 1];
        const point = points[i];
        const prevIsHorizontal = (0, heading_1.headingForPointIsHorizontal)(point, prev);
        const nextIsHorizontal = (0, heading_1.headingForPointIsHorizontal)(next, point);
        const corner = Math.min(radius, (0, math_1.pointDistance)(points[i], next) / 2, (0, math_1.pointDistance)(points[i], prev) / 2);
        if (prevIsHorizontal) {
            if (prev[0] < point[0]) {
                // LEFT
                subpoints.push([points[i][0] - corner, points[i][1]]);
            }
            else {
                // RIGHT
                subpoints.push([points[i][0] + corner, points[i][1]]);
            }
        }
        else if (prev[1] < point[1]) {
            // UP
            subpoints.push([points[i][0], points[i][1] - corner]);
        }
        else {
            subpoints.push([points[i][0], points[i][1] + corner]);
        }
        subpoints.push(points[i]);
        if (nextIsHorizontal) {
            if (next[0] < point[0]) {
                // LEFT
                subpoints.push([points[i][0] - corner, points[i][1]]);
            }
            else {
                // RIGHT
                subpoints.push([points[i][0] + corner, points[i][1]]);
            }
        }
        else if (next[1] < point[1]) {
            // UP
            subpoints.push([points[i][0], points[i][1] - corner]);
        }
        else {
            // DOWN
            subpoints.push([points[i][0], points[i][1] + corner]);
        }
    }
    const d = [`M ${points[0][0]} ${points[0][1]}`];
    for (let i = 0; i < subpoints.length; i += 3) {
        d.push(`L ${subpoints[i][0]} ${subpoints[i][1]}`);
        d.push(`Q ${subpoints[i + 1][0]} ${subpoints[i + 1][1]}, ${subpoints[i + 2][0]} ${subpoints[i + 2][1]}`);
    }
    d.push(`L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`);
    return d.join(" ");
};
/**
 * get the pure geometric shape of an excalidraw elementw
 * which is then used for hit detection
 */
const getElementShape = (element, elementsMap) => {
    switch (element.type) {
        case "rectangle":
        case "diamond":
        case "frame":
        case "magicframe":
        case "embeddable":
        case "image":
        case "iframe":
        case "text":
        case "selection":
            return (0, shape_1.getPolygonShape)(element);
        case "arrow":
        case "line": {
            const roughShape = ShapeCache.generateElementShape(element, null)[0];
            const [, , , , cx, cy] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
            return (0, collision_1.shouldTestInside)(element)
                ? (0, shape_1.getClosedCurveShape)(element, roughShape, (0, math_1.pointFrom)(element.x, element.y), element.angle, (0, math_1.pointFrom)(cx, cy))
                : (0, shape_1.getCurveShape)(roughShape, (0, math_1.pointFrom)(element.x, element.y), element.angle, (0, math_1.pointFrom)(cx, cy));
        }
        case "ellipse":
            return (0, shape_1.getEllipseShape)(element);
        case "freedraw": {
            const [, , , , cx, cy] = (0, bounds_1.getElementAbsoluteCoords)(element, elementsMap);
            return (0, shape_1.getFreedrawShape)(element, (0, math_1.pointFrom)(cx, cy), (0, collision_1.shouldTestInside)(element));
        }
    }
};
exports.getElementShape = getElementShape;
const toggleLinePolygonState = (element, nextPolygonState) => {
    const updatedPoints = [...element.points];
    if (nextPolygonState) {
        if (!(0, typeChecks_1.canBecomePolygon)(element.points)) {
            return null;
        }
        const firstPoint = updatedPoints[0];
        const lastPoint = updatedPoints[updatedPoints.length - 1];
        const distance = Math.hypot(firstPoint[0] - lastPoint[0], firstPoint[1] - lastPoint[1]);
        if (distance > common_1.LINE_POLYGON_POINT_MERGE_DISTANCE ||
            updatedPoints.length < 4) {
            updatedPoints.push((0, math_1.pointFrom)(firstPoint[0], firstPoint[1]));
        }
        else {
            updatedPoints[updatedPoints.length - 1] = (0, math_1.pointFrom)(firstPoint[0], firstPoint[1]);
        }
    }
    // TODO: satisfies ElementUpdate<ExcalidrawLineElement>
    const ret = {
        polygon: nextPolygonState,
        points: updatedPoints,
    };
    return ret;
};
exports.toggleLinePolygonState = toggleLinePolygonState;
// -----------------------------------------------------------------------------
//                         freedraw shape helper
// -----------------------------------------------------------------------------
// NOTE not cached (-> for SVG export)
const getFreeDrawSvgPath = (element) => {
    return getSvgPathFromStroke((0, exports.getFreedrawOutlinePoints)(element));
};
const getFreedrawOutlinePoints = (element) => {
    // If input points are empty (should they ever be?) return a dot
    const inputPoints = element.simulatePressure
        ? element.points
        : element.points.length
            ? element.points.map(([x, y], i) => [x, y, element.pressures[i]])
            : [[0, 0, 0.5]];
    return (0, perfect_freehand_1.getStroke)(inputPoints, {
        simulatePressure: element.simulatePressure,
        size: element.strokeWidth * 4.25,
        thinning: 0.6,
        smoothing: 0.5,
        streamline: 0.5,
        easing: (t) => Math.sin((t * Math.PI) / 2), // https://easings.net/#easeOutSine
        last: true,
    });
};
exports.getFreedrawOutlinePoints = getFreedrawOutlinePoints;
const med = (A, B) => {
    return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
};
// Trim SVG path data so number are each two decimal points. This
// improves SVG exports, and prevents rendering errors on points
// with long decimals.
const TO_FIXED_PRECISION = /(\s?[A-Z]?,?-?[0-9]*\.[0-9]{0,2})(([0-9]|e|-)*)/g;
const getSvgPathFromStroke = (points) => {
    if (!points.length) {
        return "";
    }
    const max = points.length - 1;
    return points
        .reduce((acc, point, i, arr) => {
        if (i === max) {
            acc.push(point, med(point, arr[0]), "L", arr[0], "Z");
        }
        else {
            acc.push(point, med(point, arr[i + 1]));
        }
        return acc;
    }, ["M", points[0], "Q"])
        .join(" ")
        .replace(TO_FIXED_PRECISION, "$1");
};
// -----------------------------------------------------------------------------
