"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversionTypeFromElements = exports.convertElementTypes = exports.adjustBoundTextSize = exports.convertElementTypePopupAtom = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const element_1 = require("@excalidraw/element");
const math_1 = require("@excalidraw/math");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const element_10 = require("@excalidraw/element");
const analytics_1 = require("../analytics");
const editor_jotai_1 = require("../editor-jotai");
require("./ConvertElementTypePopup.scss");
const ToolButton_1 = require("./ToolButton");
const icons_1 = require("./icons");
const GAP_HORIZONTAL = 8;
const GAP_VERTICAL = 10;
// indicates order of switching
const GENERIC_TYPES = ["rectangle", "diamond", "ellipse"];
// indicates order of switching
const LINEAR_TYPES = [
    "line",
    "sharpArrow",
    "curvedArrow",
    "elbowArrow",
];
const CONVERTIBLE_GENERIC_TYPES = new Set(GENERIC_TYPES);
const CONVERTIBLE_LINEAR_TYPES = new Set(LINEAR_TYPES);
const isConvertibleGenericType = (elementType) => CONVERTIBLE_GENERIC_TYPES.has(elementType);
const isConvertibleLinearType = (elementType) => elementType === "arrow" ||
    CONVERTIBLE_LINEAR_TYPES.has(elementType);
exports.convertElementTypePopupAtom = (0, editor_jotai_1.atom)(null);
const FONT_SIZE_CONVERSION_CACHE = new Map();
const LINEAR_ELEMENT_CONVERSION_CACHE = new Map();
const ConvertElementTypePopup = ({ app }) => {
    const selectedElements = app.scene.getSelectedElements(app.state);
    const elementsCategoryRef = (0, react_1.useRef)(null);
    // close shape switch panel if selecting different "types" of elements
    (0, react_1.useEffect)(() => {
        if (selectedElements.length === 0) {
            app.updateEditorAtom(exports.convertElementTypePopupAtom, null);
            return;
        }
        const conversionType = (0, exports.getConversionTypeFromElements)(selectedElements);
        if (conversionType && !elementsCategoryRef.current) {
            elementsCategoryRef.current = conversionType;
        }
        else if ((elementsCategoryRef.current && !conversionType) ||
            (elementsCategoryRef.current &&
                conversionType !== elementsCategoryRef.current)) {
            app.updateEditorAtom(exports.convertElementTypePopupAtom, null);
            elementsCategoryRef.current = null;
        }
    }, [selectedElements, app]);
    (0, react_1.useEffect)(() => {
        return () => {
            FONT_SIZE_CONVERSION_CACHE.clear();
            LINEAR_ELEMENT_CONVERSION_CACHE.clear();
        };
    }, []);
    return (0, jsx_runtime_1.jsx)(Panel, { app: app, elements: selectedElements });
};
const Panel = ({ app, elements, }) => {
    const conversionType = (0, exports.getConversionTypeFromElements)(elements);
    const genericElements = (0, react_1.useMemo)(() => {
        return conversionType === "generic"
            ? filterGenericConvetibleElements(elements)
            : [];
    }, [conversionType, elements]);
    const linearElements = (0, react_1.useMemo)(() => {
        return conversionType === "linear"
            ? filterLinearConvertibleElements(elements)
            : [];
    }, [conversionType, elements]);
    const sameType = conversionType === "generic"
        ? genericElements.every((element) => element.type === genericElements[0].type)
        : conversionType === "linear"
            ? linearElements.every((element) => (0, element_1.getLinearElementSubType)(element) ===
                (0, element_1.getLinearElementSubType)(linearElements[0]))
            : false;
    const [panelPosition, setPanelPosition] = (0, react_1.useState)({ x: 0, y: 0 });
    const positionRef = (0, react_1.useRef)("");
    const panelRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const elements = [...genericElements, ...linearElements].sort((a, b) => a.id.localeCompare(b.id));
        const newPositionRef = `
      ${app.state.scrollX}${app.state.scrollY}${app.state.offsetTop}${app.state.offsetLeft}${app.state.zoom.value}${elements.map((el) => el.id).join(",")}`;
        if (newPositionRef === positionRef.current) {
            return;
        }
        positionRef.current = newPositionRef;
        let bottomLeft;
        if (elements.length === 1) {
            const [x1, , , y2, cx, cy] = (0, element_3.getElementAbsoluteCoords)(elements[0], app.scene.getNonDeletedElementsMap());
            bottomLeft = (0, math_1.pointRotateRads)((0, math_1.pointFrom)(x1, y2), (0, math_1.pointFrom)(cx, cy), elements[0].angle);
        }
        else {
            const { minX, maxY } = (0, element_3.getCommonBoundingBox)(elements);
            bottomLeft = (0, math_1.pointFrom)(minX, maxY);
        }
        const { x, y } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: bottomLeft[0], sceneY: bottomLeft[1] }, app.state);
        setPanelPosition({ x, y });
    }, [genericElements, linearElements, app.scene, app.state]);
    (0, react_1.useEffect)(() => {
        for (const linearElement of linearElements) {
            const cacheKey = toCacheKey(linearElement.id, getConvertibleType(linearElement));
            if (!LINEAR_ELEMENT_CONVERSION_CACHE.has(cacheKey)) {
                LINEAR_ELEMENT_CONVERSION_CACHE.set(cacheKey, linearElement);
            }
        }
    }, [linearElements]);
    (0, react_1.useEffect)(() => {
        for (const element of genericElements) {
            if (!FONT_SIZE_CONVERSION_CACHE.has(element.id)) {
                const boundText = (0, element_4.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap());
                if (boundText) {
                    FONT_SIZE_CONVERSION_CACHE.set(element.id, {
                        fontSize: boundText.fontSize,
                    });
                }
            }
        }
    }, [genericElements, app.scene]);
    const SHAPES = conversionType === "linear"
        ? [
            ["line", icons_1.LineIcon],
            ["sharpArrow", icons_1.sharpArrowIcon],
            ["curvedArrow", icons_1.roundArrowIcon],
            ["elbowArrow", icons_1.elbowArrowIcon],
        ]
        : conversionType === "generic"
            ? [
                ["rectangle", icons_1.RectangleIcon],
                ["diamond", icons_1.DiamondIcon],
                ["ellipse", icons_1.EllipseIcon],
            ]
            : [];
    return ((0, jsx_runtime_1.jsx)("div", { ref: panelRef, tabIndex: -1, style: {
            position: "absolute",
            top: `${panelPosition.y +
                (GAP_VERTICAL + 8) * app.state.zoom.value -
                app.state.offsetTop}px`,
            left: `${panelPosition.x - app.state.offsetLeft - GAP_HORIZONTAL}px`,
            zIndex: 2,
        }, className: common_1.CLASSES.CONVERT_ELEMENT_TYPE_POPUP, children: SHAPES.map(([type, icon]) => {
            const isSelected = sameType &&
                ((conversionType === "generic" && genericElements[0].type === type) ||
                    (conversionType === "linear" &&
                        (0, element_1.getLinearElementSubType)(linearElements[0]) === type));
            return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: "Shape", type: "radio", icon: icon, checked: isSelected, name: "convertElementType-option", title: type, keyBindingLabel: "", "aria-label": type, "data-testid": `toolbar-${type}`, onChange: () => {
                    if (app.state.activeTool.type !== type) {
                        (0, analytics_1.trackEvent)("convertElementType", type, "ui");
                    }
                    (0, exports.convertElementTypes)(app, {
                        conversionType,
                        nextType: type,
                    });
                    panelRef.current?.focus();
                } }, `${elements[0].id}${elements[0].version}_${type}`));
        }) }));
};
const adjustBoundTextSize = (container, boundText, scene) => {
    const maxWidth = (0, element_4.getBoundTextMaxWidth)(container, boundText);
    const maxHeight = (0, element_4.getBoundTextMaxHeight)(container, boundText);
    const wrappedText = (0, element_5.wrapText)(boundText.text, (0, common_1.getFontString)(boundText), maxWidth);
    let metrics = (0, element_6.measureText)(wrappedText, (0, common_1.getFontString)(boundText), boundText.lineHeight);
    let nextFontSize = boundText.fontSize;
    while ((metrics.width > maxWidth || metrics.height > maxHeight) &&
        nextFontSize > 0) {
        nextFontSize -= 1;
        const _updatedTextElement = {
            ...boundText,
            fontSize: nextFontSize,
        };
        metrics = (0, element_6.measureText)(boundText.text, (0, common_1.getFontString)(_updatedTextElement), boundText.lineHeight);
    }
    (0, element_1.mutateElement)(boundText, scene.getNonDeletedElementsMap(), {
        fontSize: nextFontSize,
        width: metrics.width,
        height: metrics.height,
    });
    (0, element_4.redrawTextBoundingBox)(boundText, container, scene);
};
exports.adjustBoundTextSize = adjustBoundTextSize;
const convertElementTypes = (app, { conversionType, nextType, direction = "right", }) => {
    if (!conversionType) {
        return false;
    }
    const selectedElements = app.scene.getSelectedElements(app.state);
    const selectedElementIds = selectedElements.reduce((acc, element) => ({ ...acc, [element.id]: true }), {});
    const advancement = direction === "right" ? 1 : -1;
    if (conversionType === "generic") {
        const convertibleGenericElements = filterGenericConvetibleElements(selectedElements);
        const sameType = convertibleGenericElements.every((element) => element.type === convertibleGenericElements[0].type);
        const index = sameType
            ? GENERIC_TYPES.indexOf(convertibleGenericElements[0].type)
            : -1;
        nextType =
            nextType ??
                GENERIC_TYPES[(index + GENERIC_TYPES.length + advancement) % GENERIC_TYPES.length];
        if (nextType && isConvertibleGenericType(nextType)) {
            const convertedElements = {};
            for (const element of convertibleGenericElements) {
                const convertedElement = convertElementType(element, nextType, app);
                convertedElements[convertedElement.id] = convertedElement;
            }
            const nextElements = [];
            for (const element of app.scene.getElementsIncludingDeleted()) {
                if (convertedElements[element.id]) {
                    nextElements.push(convertedElements[element.id]);
                }
                else {
                    nextElements.push(element);
                }
            }
            app.scene.replaceAllElements(nextElements);
            for (const element of Object.values(convertedElements)) {
                const boundText = (0, element_4.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap());
                if (boundText) {
                    if (FONT_SIZE_CONVERSION_CACHE.get(element.id)) {
                        (0, element_1.mutateElement)(boundText, app.scene.getNonDeletedElementsMap(), {
                            fontSize: FONT_SIZE_CONVERSION_CACHE.get(element.id)?.fontSize ??
                                boundText.fontSize,
                        });
                    }
                    (0, exports.adjustBoundTextSize)(element, boundText, app.scene);
                }
            }
            app.setState((prevState) => {
                return {
                    selectedElementIds,
                    activeTool: (0, common_1.updateActiveTool)(prevState, {
                        type: "selection",
                    }),
                };
            });
        }
    }
    if (conversionType === "linear") {
        const convertibleLinearElements = filterLinearConvertibleElements(selectedElements);
        if (!nextType) {
            const commonSubType = (0, common_1.reduceToCommonValue)(convertibleLinearElements, element_1.getLinearElementSubType);
            const index = commonSubType ? LINEAR_TYPES.indexOf(commonSubType) : -1;
            nextType =
                LINEAR_TYPES[(index + LINEAR_TYPES.length + advancement) % LINEAR_TYPES.length];
        }
        if (isConvertibleLinearType(nextType)) {
            const convertedElements = [];
            const nextElementsMap = app.scene.getElementsMapIncludingDeleted();
            for (const element of convertibleLinearElements) {
                const cachedElement = LINEAR_ELEMENT_CONVERSION_CACHE.get(toCacheKey(element.id, nextType));
                // if switching to the original subType or a subType we've already
                // converted to, reuse the cached element to get the original properties
                // (needed for simple->elbow->simple conversions or between line
                // and arrows)
                if (cachedElement &&
                    (0, element_1.getLinearElementSubType)(cachedElement) === nextType) {
                    nextElementsMap.set(cachedElement.id, cachedElement);
                    convertedElements.push(cachedElement);
                }
                else {
                    const converted = convertElementType(element, nextType, app);
                    nextElementsMap.set(converted.id, converted);
                    convertedElements.push(converted);
                }
            }
            app.scene.replaceAllElements(nextElementsMap);
            // post normalization
            for (const element of convertedElements) {
                if ((0, element_2.isLinearElement)(element)) {
                    if ((0, element_2.isElbowArrow)(element)) {
                        const nextPoints = convertLineToElbow(element);
                        if (nextPoints.length < 2) {
                            // skip if not enough points to form valid segments
                            continue;
                        }
                        const fixedSegments = [];
                        for (let i = 1; i < nextPoints.length - 2; i++) {
                            fixedSegments.push({
                                start: nextPoints[i],
                                end: nextPoints[i + 1],
                                index: i + 1,
                            });
                        }
                        const updates = (0, element_1.updateElbowArrowPoints)(element, app.scene.getNonDeletedElementsMap(), {
                            points: nextPoints,
                            fixedSegments,
                        });
                        (0, element_1.mutateElement)(element, app.scene.getNonDeletedElementsMap(), {
                            ...updates,
                            endArrowhead: "arrow",
                        });
                    }
                    else {
                        // if we're converting to non-elbow linear element, check if
                        // we've already cached one of these linear elements so we can
                        // reuse the points (case: curved->elbow->line and similar)
                        const similarCachedLinearElement = (0, common_1.mapFind)(["line", "sharpArrow", "curvedArrow"], (type) => LINEAR_ELEMENT_CONVERSION_CACHE.get(toCacheKey(element.id, type)));
                        if (similarCachedLinearElement) {
                            const points = similarCachedLinearElement.points;
                            app.scene.mutateElement(element, {
                                points,
                            });
                        }
                    }
                }
            }
        }
        const convertedSelectedLinearElements = filterLinearConvertibleElements(app.scene.getSelectedElements(app.state));
        app.setState((prevState) => ({
            selectedElementIds,
            selectedLinearElement: convertedSelectedLinearElements.length === 1
                ? new element_7.LinearElementEditor(convertedSelectedLinearElements[0], app.scene.getNonDeletedElementsMap())
                : null,
            activeTool: (0, common_1.updateActiveTool)(prevState, {
                type: "selection",
            }),
        }));
    }
    return true;
};
exports.convertElementTypes = convertElementTypes;
const getConversionTypeFromElements = (elements) => {
    if (elements.length === 0) {
        return null;
    }
    let canBeLinear = false;
    for (const element of elements) {
        if (isConvertibleGenericType(element.type)) {
            // generic type conversion have preference
            return "generic";
        }
        if (isEligibleLinearElement(element)) {
            canBeLinear = true;
        }
    }
    if (canBeLinear) {
        return "linear";
    }
    return null;
};
exports.getConversionTypeFromElements = getConversionTypeFromElements;
const isEligibleLinearElement = (element) => {
    return ((0, element_2.isLinearElement)(element) &&
        (!(0, element_2.isArrowElement)(element) ||
            (!(0, element_2.isArrowBoundToElement)(element) && !(0, element_2.hasBoundTextElement)(element))));
};
const toCacheKey = (elementId, convertitleType) => {
    return `${elementId}:${convertitleType}`;
};
const filterGenericConvetibleElements = (elements) => elements.filter((element) => isConvertibleGenericType(element.type));
const filterLinearConvertibleElements = (elements) => elements.filter((element) => isEligibleLinearElement(element));
const THRESHOLD = 20;
const isVert = (a, b) => a[0] === b[0];
const isHorz = (a, b) => a[1] === b[1];
const dist = (a, b) => isVert(a, b) ? Math.abs(a[1] - b[1]) : Math.abs(a[0] - b[0]);
const convertLineToElbow = (line) => {
    // 1. build an *orthogonal* route, snapping offsets < SNAP
    const ortho = [line.points[0]];
    const src = sanitizePoints(line.points);
    for (let i = 1; i < src.length; ++i) {
        const start = ortho[ortho.length - 1];
        const end = [...src[i]]; // clone
        // snap tiny offsets onto the current axis
        if (Math.abs(end[0] - start[0]) < THRESHOLD) {
            end[0] = start[0];
        }
        else if (Math.abs(end[1] - start[1]) < THRESHOLD) {
            end[1] = start[1];
        }
        // straight or needs a 90 ° bend?
        if (isVert(start, end) || isHorz(start, end)) {
            ortho.push(end);
        }
        else {
            ortho.push((0, math_1.pointFrom)(start[0], end[1]));
            ortho.push(end);
        }
    }
    // 2. drop obviously colinear middle points
    const trimmed = [ortho[0]];
    for (let i = 1; i < ortho.length - 1; ++i) {
        if (!((isVert(ortho[i - 1], ortho[i]) && isVert(ortho[i], ortho[i + 1])) ||
            (isHorz(ortho[i - 1], ortho[i]) && isHorz(ortho[i], ortho[i + 1])))) {
            trimmed.push(ortho[i]);
        }
    }
    trimmed.push(ortho[ortho.length - 1]);
    // 3. collapse micro “jogs” (V-H-V / H-V-H whose short leg < SNAP)
    const clean = [trimmed[0]];
    for (let i = 1; i < trimmed.length - 1; ++i) {
        const a = clean[clean.length - 1];
        const b = trimmed[i];
        const c = trimmed[i + 1];
        const v1 = isVert(a, b);
        const v2 = isVert(b, c);
        if (v1 !== v2) {
            const d1 = dist(a, b);
            const d2 = dist(b, c);
            if (d1 < THRESHOLD || d2 < THRESHOLD) {
                // pick the shorter leg to remove
                if (d2 < d1) {
                    // … absorb leg 2 – pull *c* onto axis of *a-b*
                    if (v1) {
                        c[0] = a[0];
                    }
                    else {
                        c[1] = a[1];
                    }
                }
                else {
                    // … absorb leg 1 – slide the whole first leg onto *b-c* axis
                    // eslint-disable-next-line no-lonely-if
                    if (v2) {
                        for (let k = clean.length - 1; k >= 0 && clean[k][0] === a[0]; --k) {
                            clean[k][0] = b[0];
                        }
                    }
                    else {
                        for (let k = clean.length - 1; k >= 0 && clean[k][1] === a[1]; --k) {
                            clean[k][1] = b[1];
                        }
                    }
                }
                // *b* is gone, don’t add it
                continue;
            }
        }
        clean.push(b);
    }
    clean.push(trimmed[trimmed.length - 1]);
    return clean;
};
const sanitizePoints = (points) => {
    if (points.length === 0) {
        return [];
    }
    const sanitized = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const [x1, y1] = sanitized[sanitized.length - 1];
        const [x2, y2] = points[i];
        if (x1 !== x2 || y1 !== y2) {
            sanitized.push(points[i]);
        }
    }
    return sanitized;
};
/**
 * Converts an element to a new type, adding or removing properties as needed
 * so that the element object is always valid.
 *
 * Valid conversions at this point:
 * - switching between generic elements
 *   e.g. rectangle -> diamond
 * - switching between linear elements
 *   e.g. elbow arrow -> line
 */
const convertElementType = (element, targetType, app) => {
    if (!isValidConversion(element.type, targetType)) {
        if (!(0, common_1.isProdEnv)()) {
            throw Error(`Invalid conversion from ${element.type} to ${targetType}.`);
        }
        return element;
    }
    if (element.type === targetType) {
        return element;
    }
    element_9.ShapeCache.delete(element);
    if (isConvertibleGenericType(targetType)) {
        const nextElement = (0, element_1.bumpVersion)((0, element_8.newElement)({
            ...element,
            type: targetType,
            roundness: targetType === "diamond" && element.roundness
                ? {
                    type: (0, element_2.isUsingAdaptiveRadius)(targetType)
                        ? common_1.ROUNDNESS.ADAPTIVE_RADIUS
                        : common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                }
                : element.roundness,
        }));
        (0, element_10.updateBindings)(nextElement, app.scene, app.state);
        return nextElement;
    }
    if (isConvertibleLinearType(targetType)) {
        switch (targetType) {
            case "line": {
                return (0, element_1.bumpVersion)((0, element_8.newLinearElement)({
                    ...element,
                    type: "line",
                }));
            }
            case "sharpArrow": {
                return (0, element_1.bumpVersion)((0, element_8.newArrowElement)({
                    ...element,
                    type: "arrow",
                    elbowed: false,
                    roundness: null,
                    startArrowhead: app.state.currentItemStartArrowhead,
                    endArrowhead: app.state.currentItemEndArrowhead,
                }));
            }
            case "curvedArrow": {
                return (0, element_1.bumpVersion)((0, element_8.newArrowElement)({
                    ...element,
                    type: "arrow",
                    elbowed: false,
                    roundness: {
                        type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                    },
                    startArrowhead: app.state.currentItemStartArrowhead,
                    endArrowhead: app.state.currentItemEndArrowhead,
                }));
            }
            case "elbowArrow": {
                return (0, element_1.bumpVersion)((0, element_8.newArrowElement)({
                    ...element,
                    type: "arrow",
                    elbowed: true,
                    fixedSegments: null,
                    roundness: null,
                }));
            }
        }
    }
    (0, common_1.assertNever)(targetType, `unhandled conversion type: ${targetType}`);
    return element;
};
const isValidConversion = (startType, targetType) => {
    if (isConvertibleGenericType(startType) &&
        isConvertibleGenericType(targetType)) {
        return true;
    }
    if (isConvertibleLinearType(startType) &&
        isConvertibleLinearType(targetType)) {
        return true;
    }
    // NOTE: add more conversions when needed
    return false;
};
const getConvertibleType = (element) => {
    if ((0, element_2.isLinearElement)(element)) {
        return (0, element_1.getLinearElementSubType)(element);
    }
    return element.type;
};
exports.default = ConvertElementTypePopup;
