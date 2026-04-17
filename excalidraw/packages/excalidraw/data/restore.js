"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreLibraryItems = exports.restoreAppState = exports.bumpElementVersions = exports.restoreElements = exports.restoreElement = exports.AllowedExcalidrawActiveTools = void 0;
const math_1 = require("@excalidraw/math");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const element_10 = require("@excalidraw/element");
const element_11 = require("@excalidraw/element");
const element_12 = require("@excalidraw/element");
const appState_1 = require("../appState");
const scene_1 = require("../scene");
exports.AllowedExcalidrawActiveTools = {
    selection: true,
    lasso: true,
    text: true,
    rectangle: true,
    diamond: true,
    ellipse: true,
    line: true,
    image: true,
    arrow: true,
    freedraw: true,
    eraser: false,
    custom: true,
    frame: true,
    embeddable: true,
    hand: true,
    laser: false,
    magicframe: false,
};
const getFontFamilyByName = (fontFamilyName) => {
    if (Object.keys(common_1.FONT_FAMILY).includes(fontFamilyName)) {
        return common_1.FONT_FAMILY[fontFamilyName];
    }
    return common_1.DEFAULT_FONT_FAMILY;
};
const repairBinding = (element, binding, targetElementsMap, 
/** used for context (arrow bindings) */
existingElementsMap, startOrEnd) => {
    try {
        if (!binding) {
            return null;
        }
        // ---------------------------------------------------------------------------
        // elbow arrows
        // ---------------------------------------------------------------------------
        if ((0, element_8.isElbowArrow)(element)) {
            const fixedPointBinding = {
                ...binding,
                fixedPoint: (0, element_2.normalizeFixedPoint)(binding.fixedPoint),
                mode: binding.mode || "orbit",
            };
            return fixedPointBinding;
        }
        // ---------------------------------------------------------------------------
        // simple arrows
        // ---------------------------------------------------------------------------
        // binding schema v2
        // ---------------------------------------------------------------------------
        if (binding.mode) {
            // if latest binding schema, don't check if binding.elementId exists
            // (it's done in a separate pass)
            if (binding.elementId) {
                return {
                    elementId: binding.elementId,
                    mode: binding.mode,
                    fixedPoint: (0, element_2.normalizeFixedPoint)(binding.fixedPoint),
                };
            }
            return null;
        }
        // binding schema v1 (legacy) -> attempt to migrate to v2
        // ---------------------------------------------------------------------------
        const targetBoundElement = targetElementsMap.get(binding.elementId);
        const boundElement = targetBoundElement ||
            existingElementsMap?.get(binding.elementId);
        const elementsMap = targetBoundElement
            ? targetElementsMap
            : existingElementsMap;
        // migrating legacy focus point bindings
        if (boundElement && elementsMap) {
            const p = element_4.LinearElementEditor.getPointAtIndexGlobalCoordinates(element, startOrEnd === "start" ? 0 : element.points.length - 1, elementsMap);
            const mode = (0, element_1.isPointInElement)(p, boundElement, elementsMap)
                ? "inside"
                : "orbit";
            const safeElement = {
                ...element,
                startBinding: element.startBinding?.elementId
                    ? {
                        ...element.startBinding,
                        mode,
                        fixedPoint: (0, element_2.normalizeFixedPoint)(element.startBinding.fixedPoint),
                    }
                    : null,
                endBinding: element.endBinding?.elementId
                    ? {
                        ...element.endBinding,
                        mode,
                        fixedPoint: (0, element_2.normalizeFixedPoint)(element.endBinding.fixedPoint),
                    }
                    : null,
            };
            const focusPoint = mode === "inside"
                ? p
                : (0, element_1.projectFixedPointOntoDiagonal)(safeElement, p, boundElement, startOrEnd, elementsMap, { value: 1 }) || p;
            const { fixedPoint } = (0, element_1.calculateFixedPointForNonElbowArrowBinding)(safeElement, boundElement, startOrEnd, elementsMap, focusPoint);
            return {
                mode,
                elementId: binding.elementId,
                fixedPoint,
            };
        }
        console.error(`Could not repair binding for element "${boundElement?.id}" out of (${elementsMap?.size}) elements`);
    }
    catch (error) {
        console.error("Error repairing binding:", error);
    }
    return null;
};
const restoreElementWithProperties = (element, extra) => {
    const base = {
        type: extra.type || element.type,
        // all elements must have version > 0 so getSceneVersion() will pick up
        // newly added elements
        version: element.version || 1,
        versionNonce: element.versionNonce ?? 0,
        index: element.index ?? null,
        isDeleted: element.isDeleted ?? false,
        id: element.id || (0, common_1.randomId)(),
        fillStyle: element.fillStyle || common_1.DEFAULT_ELEMENT_PROPS.fillStyle,
        strokeWidth: element.strokeWidth || common_1.DEFAULT_ELEMENT_PROPS.strokeWidth,
        strokeStyle: element.strokeStyle ?? common_1.DEFAULT_ELEMENT_PROPS.strokeStyle,
        roughness: element.roughness ?? common_1.DEFAULT_ELEMENT_PROPS.roughness,
        opacity: element.opacity == null ? common_1.DEFAULT_ELEMENT_PROPS.opacity : element.opacity,
        angle: element.angle || 0,
        x: extra.x ?? element.x ?? 0,
        y: extra.y ?? element.y ?? 0,
        strokeColor: element.strokeColor || common_1.DEFAULT_ELEMENT_PROPS.strokeColor,
        backgroundColor: element.backgroundColor || common_1.DEFAULT_ELEMENT_PROPS.backgroundColor,
        width: element.width || 0,
        height: element.height || 0,
        seed: element.seed ?? 1,
        groupIds: element.groupIds ?? [],
        frameId: element.frameId ?? null,
        roundness: element.roundness
            ? element.roundness
            : element.strokeSharpness === "round"
                ? {
                    // for old elements that would now use adaptive radius algo,
                    // use legacy algo instead
                    type: (0, element_8.isUsingAdaptiveRadius)(element.type)
                        ? common_1.ROUNDNESS.LEGACY
                        : common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                }
                : null,
        boundElements: element.boundElementIds
            ? element.boundElementIds.map((id) => ({ type: "arrow", id }))
            : element.boundElements ?? [],
        updated: element.updated ?? (0, common_1.getUpdatedTimestamp)(),
        link: element.link ? (0, common_1.normalizeLink)(element.link) : null,
        locked: element.locked ?? false,
    };
    if ("customData" in element || "customData" in extra) {
        base.customData =
            "customData" in extra ? extra.customData : element.customData;
    }
    const ret = {
        // spread the original element properties to not lose unknown ones
        // for forward-compatibility
        ...element,
        // normalized properties
        ...base,
        ...(0, element_11.getNormalizedDimensions)(base),
        ...extra,
    };
    // strip legacy props (migrated in previous steps)
    delete ret.strokeSharpness;
    delete ret.boundElementIds;
    return ret;
};
const restoreElement = (
/** element to be restored */
element, 
/** all elements to be restored */
targetElementsMap, 
/** used for additional context */
existingElementsMap, opts) => {
    element = { ...element };
    switch (element.type) {
        case "text":
            // temp fix: cleanup legacy obsidian-excalidraw attribute else it'll
            // conflict when porting between the apps
            delete element.rawText;
            let fontSize = element.fontSize;
            let fontFamily = element.fontFamily;
            if ("font" in element) {
                const [fontPx, _fontFamily] = element.font.split(" ");
                fontSize = parseFloat(fontPx);
                fontFamily = getFontFamilyByName(_fontFamily);
            }
            const text = (typeof element.text === "string" && element.text) || "";
            // line-height might not be specified either when creating elements
            // programmatically, or when importing old diagrams.
            // For the latter we want to detect the original line height which
            // will likely differ from our per-font fixed line height we now use,
            // to maintain backward compatibility.
            const lineHeight = element.lineHeight ||
                (element.height
                    ? // detect line-height from current element height and font-size
                        (0, element_7.detectLineHeight)(element)
                    : // no element height likely means programmatic use, so default
                        // to a fixed line height
                        (0, common_1.getLineHeight)(element.fontFamily));
            element = restoreElementWithProperties(element, {
                fontSize,
                fontFamily,
                text,
                textAlign: element.textAlign || common_1.DEFAULT_TEXT_ALIGN,
                verticalAlign: element.verticalAlign || common_1.DEFAULT_VERTICAL_ALIGN,
                containerId: element.containerId ?? null,
                originalText: element.originalText || text,
                autoResize: element.autoResize ?? true,
                lineHeight,
            });
            // if empty text, mark as deleted. We keep in array
            // for data integrity purposes (collab etc.)
            if (opts?.deleteInvisibleElements && !text && !element.isDeleted) {
                // TODO: we should not do this since it breaks sync / versioning when we exchange / apply just deltas and restore the elements (deletion isn't recorded)
                element = { ...element, originalText: text, isDeleted: true };
                element = (0, element_5.bumpVersion)(element);
            }
            return element;
        case "freedraw": {
            return restoreElementWithProperties(element, {
                points: element.points,
                simulatePressure: element.simulatePressure,
                pressures: element.pressures,
            });
        }
        case "image":
            return restoreElementWithProperties(element, {
                status: element.status || "pending",
                fileId: element.fileId,
                scale: element.scale || [1, 1],
                crop: element.crop ?? null,
            });
        case "line":
        // @ts-ignore LEGACY type
        // eslint-disable-next-line no-fallthrough
        case "draw":
            const startArrowhead = (0, element_1.normalizeArrowhead)(element.startArrowhead);
            const endArrowhead = (0, element_1.normalizeArrowhead)(element.endArrowhead);
            let x = element.x;
            let y = element.y;
            let points = // migrate old arrow model to new one
             !Array.isArray(element.points) || element.points.length < 2
                ? [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(element.width, element.height)]
                : element.points;
            if (points[0][0] !== 0 || points[0][1] !== 0) {
                ({ points, x, y } =
                    element_4.LinearElementEditor.getNormalizeElementPointsAndCoords(element));
            }
            return restoreElementWithProperties(element, {
                type: "line",
                startBinding: null,
                endBinding: null,
                startArrowhead,
                endArrowhead,
                points,
                x,
                y,
                ...((0, element_8.isLineElement)(element)
                    ? {
                        polygon: (0, element_1.isValidPolygon)(element.points)
                            ? element.polygon ?? false
                            : false,
                    }
                    : {}),
                ...(0, common_1.getSizeFromPoints)(points),
            });
        case "arrow": {
            const startArrowhead = (0, element_1.normalizeArrowhead)(element.startArrowhead);
            const endArrowhead = element.endArrowhead === undefined
                ? "arrow"
                : (0, element_1.normalizeArrowhead)(element.endArrowhead);
            const x = element.x;
            const y = element.y;
            const points = // migrate old arrow model to new one
             !Array.isArray(element.points) || element.points.length < 2
                ? [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(element.width, element.height)]
                : element.points;
            const base = {
                type: element.type,
                startBinding: repairBinding(element, element.startBinding, targetElementsMap, existingElementsMap, "start"),
                endBinding: repairBinding(element, element.endBinding, targetElementsMap, existingElementsMap, "end"),
                startArrowhead,
                endArrowhead,
                points,
                x,
                y,
                elbowed: element.elbowed,
                ...(0, common_1.getSizeFromPoints)(points),
            };
            // TODO: Separate arrow from linear element
            const restoredElement = (0, element_8.isElbowArrow)(element)
                ? restoreElementWithProperties(element, {
                    ...base,
                    elbowed: true,
                    fixedSegments: element.fixedSegments?.length && base.points.length >= 4
                        ? element.fixedSegments
                        : null,
                    startIsSpecial: element.startIsSpecial,
                    endIsSpecial: element.endIsSpecial,
                })
                : restoreElementWithProperties(element, base);
            return {
                ...restoredElement,
                ...element_4.LinearElementEditor.getNormalizeElementPointsAndCoords(restoredElement),
            };
        }
        // generic elements
        case "ellipse":
        case "rectangle":
        case "diamond":
        case "iframe":
        case "embeddable":
            return restoreElementWithProperties(element, {});
        case "magicframe":
        case "frame":
            return restoreElementWithProperties(element, {
                name: element.name ?? null,
            });
        // Don't use default case so as to catch a missing an element type case.
        // We also don't want to throw, but instead return void so we filter
        // out these unsupported elements from the restored array.
    }
    return null;
};
exports.restoreElement = restoreElement;
/**
 * Repairs container element's boundElements array by removing duplicates and
 * fixing containerId of bound elements if not present. Also removes any
 * bound elements that do not exist in the elements array.
 *
 * NOTE mutates elements.
 */
const repairContainerElement = (container, elementsMap) => {
    if (container.boundElements) {
        // copy because we're not cloning on restore, and we don't want to mutate upstream
        const boundElements = container.boundElements.slice();
        // dedupe bindings & fix boundElement.containerId if not set already
        const boundIds = new Set();
        container.boundElements = boundElements.reduce((acc, binding) => {
            const boundElement = elementsMap.get(binding.id);
            if (boundElement && !boundIds.has(binding.id)) {
                boundIds.add(binding.id);
                if (boundElement.isDeleted) {
                    return acc;
                }
                acc.push(binding);
                if ((0, element_8.isTextElement)(boundElement) &&
                    // being slightly conservative here, preserving existing containerId
                    // if defined, lest boundElements is stale
                    !boundElement.containerId) {
                    boundElement.containerId =
                        container.id;
                }
            }
            return acc;
        }, []);
    }
};
/**
 * Repairs target bound element's container's boundElements array,
 * or removes contaienrId if container does not exist.
 *
 * NOTE mutates elements.
 */
const repairBoundElement = (boundElement, elementsMap) => {
    const container = boundElement.containerId
        ? elementsMap.get(boundElement.containerId)
        : null;
    boundElement.angle = ((0, element_8.isArrowElement)(container) ? 0 : container?.angle ?? 0);
    if (!container) {
        boundElement.containerId = null;
        return;
    }
    if (boundElement.isDeleted) {
        return;
    }
    if (container.boundElements &&
        !container.boundElements.find((binding) => binding.id === boundElement.id)) {
        // copy because we're not cloning on restore, and we don't want to mutate upstream
        const boundElements = (container.boundElements || (container.boundElements = [])).slice();
        boundElements.push({ type: "text", id: boundElement.id });
        container.boundElements = boundElements;
    }
};
/**
 * Remove an element's frameId if its containing frame is non-existent
 *
 * NOTE mutates elements.
 */
const repairFrameMembership = (element, elementsMap) => {
    if (element.frameId) {
        const containingFrame = elementsMap.get(element.frameId);
        if (!containingFrame) {
            element.frameId = null;
        }
    }
};
const restoreElements = (targetElements, 
/** used for additional context (e.g. repairing arrow bindings) */
existingElements, opts) => {
    // used to detect duplicate top-level element ids
    const existingIds = new Set();
    const targetElementsMap = (0, common_1.arrayToMap)(targetElements || []);
    const existingElementsMap = existingElements
        ? (0, common_1.arrayToMap)(existingElements)
        : null;
    const restoredElements = (0, element_9.syncInvalidIndices)((targetElements || []).reduce((elements, element) => {
        // filtering out selection, which is legacy, no longer kept in elements,
        // and causing issues if retained
        if (element.type === "selection") {
            return elements;
        }
        let migratedElement;
        try {
            migratedElement = (0, exports.restoreElement)(element, targetElementsMap, existingElementsMap, {
                deleteInvisibleElements: opts?.deleteInvisibleElements,
            });
        }
        catch (error) {
            console.error("Error restoring element:", error);
            migratedElement = null;
        }
        if (migratedElement) {
            const localElement = existingElementsMap?.get(element.id);
            const shouldMarkAsDeleted = opts?.deleteInvisibleElements && (0, element_12.isInvisiblySmallElement)(element);
            if (shouldMarkAsDeleted) {
                migratedElement = (0, element_5.bumpVersion)(migratedElement, localElement?.version);
            }
            if (shouldMarkAsDeleted) {
                migratedElement = { ...migratedElement, isDeleted: true };
            }
            if (existingIds.has(migratedElement.id)) {
                migratedElement = { ...migratedElement, id: (0, common_1.randomId)() };
            }
            existingIds.add(migratedElement.id);
            elements.push(migratedElement);
        }
        return elements;
    }, []));
    if (!opts?.repairBindings) {
        return restoredElements;
    }
    // repair binding. Mutates elements.
    const restoredElementsMap = (0, common_1.arrayToMap)(restoredElements);
    for (const element of restoredElements) {
        if (element.frameId) {
            repairFrameMembership(element, restoredElementsMap);
        }
        if ((0, element_8.isTextElement)(element) && element.containerId) {
            repairBoundElement(element, restoredElementsMap);
        }
        else if (element.boundElements) {
            repairContainerElement(element, restoredElementsMap);
        }
        if (opts.refreshDimensions && (0, element_8.isTextElement)(element)) {
            Object.assign(element, (0, element_10.refreshTextDimensions)(element, (0, element_6.getContainerElement)(element, restoredElementsMap), restoredElementsMap));
        }
        if ((0, element_8.isLinearElement)(element)) {
            if (element.startBinding &&
                (!restoredElementsMap.has(element.startBinding.elementId) ||
                    !(0, element_8.isArrowElement)(element))) {
                element.startBinding = null;
            }
            if (element.endBinding &&
                (!restoredElementsMap.has(element.endBinding.elementId) ||
                    !(0, element_8.isArrowElement)(element))) {
                element.endBinding = null;
            }
        }
    }
    // NOTE (mtolmacs): Temporary fix for extremely large arrows
    // Need to iterate again so we have attached text nodes in elementsMap
    return restoredElements.map((element) => {
        if ((0, element_8.isElbowArrow)(element) &&
            !(0, element_8.isArrowBoundToElement)(element) &&
            !(0, element_3.validateElbowPoints)(element.points)) {
            return {
                ...element,
                ...(0, element_3.updateElbowArrowPoints)(element, restoredElementsMap, {
                    points: [
                        (0, math_1.pointFrom)(0, 0),
                        element.points[element.points.length - 1],
                    ],
                }),
                index: element.index,
            };
        }
        if ((0, element_8.isElbowArrow)(element) &&
            element.startBinding &&
            element.endBinding &&
            element.startBinding.elementId === element.endBinding.elementId &&
            element.points.length > 1 &&
            element.points.some(([rx, ry]) => Math.abs(rx) > 1e6 || Math.abs(ry) > 1e6)) {
            console.error("Fixing self-bound elbow arrow", element.id);
            const boundElement = restoredElementsMap.get(element.startBinding.elementId);
            if (!boundElement) {
                console.error("Bound element not found", element.startBinding.elementId);
                return element;
            }
            return {
                ...element,
                x: boundElement.x + boundElement.width / 2,
                y: boundElement.y - 5,
                width: boundElement.width,
                height: boundElement.height,
                points: [
                    (0, math_1.pointFrom)(0, 0),
                    (0, math_1.pointFrom)(0, -10),
                    (0, math_1.pointFrom)(boundElement.width / 2 + 5, -10),
                    (0, math_1.pointFrom)(boundElement.width / 2 + 5, boundElement.height / 2 + 5),
                ],
            };
        }
        return element;
    });
};
exports.restoreElements = restoreElements;
/**
 * When replacing elements that may exist locally, this bumps their versions
 * to the local version + 1. Mainly for later reconciliation to work properly.
 *
 * See https://github.com/excalidraw/excalidraw/issues/3795
 *
 * Generally use this on editor boundaries (importing from file etc.), though
 * it does not apply universally (e.g. we don't want to do this for collab
 * updates).
 */
const bumpElementVersions = (targetElements, localElements) => {
    const localElementsMap = localElements ? (0, common_1.arrayToMap)(localElements) : null;
    return targetElements.map((element) => {
        const localElement = localElementsMap?.get(element.id);
        if (localElement &&
            (localElement.version > element.version ||
                // same versions but different versionNonce means different edits
                // (this often means the element was bumped during restore e.g. due
                // to re-indexing, and the original element was modified elsewhere
                // and supplied as localElements)
                (localElement.version === element.version &&
                    localElement.versionNonce !== element.versionNonce))) {
            return (0, element_5.bumpVersion)(element, localElement.version);
        }
        return element;
    });
};
exports.bumpElementVersions = bumpElementVersions;
const coalesceAppStateValue = (key, appState, defaultAppState) => {
    const value = appState[key];
    // NOTE the value! assertion is needed in TS 4.5.5 (fixed in newer versions)
    return value !== undefined ? value : defaultAppState[key];
};
const LegacyAppStateMigrations = {
    isSidebarDocked: (appState, defaultAppState) => {
        return [
            "defaultSidebarDockedPreference",
            appState.isSidebarDocked ??
                coalesceAppStateValue("defaultSidebarDockedPreference", appState, defaultAppState),
        ];
    },
};
const restoreAppState = (appState, localAppState) => {
    appState = appState || {};
    const defaultAppState = (0, appState_1.getDefaultAppState)();
    const nextAppState = {};
    // first, migrate all legacy AppState properties to new ones. We do it
    // in one go before migrate the rest of the properties in case the new ones
    // depend on checking any other key (i.e. they are coupled)
    for (const legacyKey of Object.keys(LegacyAppStateMigrations)) {
        if (legacyKey in appState) {
            const [nextKey, nextValue] = LegacyAppStateMigrations[legacyKey](appState, defaultAppState);
            nextAppState[nextKey] = nextValue;
        }
    }
    for (const [key, defaultValue] of Object.entries(defaultAppState)) {
        // if AppState contains a legacy key, prefer that one and migrate its
        // value to the new one
        const suppliedValue = appState[key];
        const localValue = localAppState ? localAppState[key] : undefined;
        nextAppState[key] =
            suppliedValue !== undefined
                ? suppliedValue
                : localValue !== undefined
                    ? localValue
                    : defaultValue;
    }
    const boxSelectionMode = appState.boxSelectionMode ?? localAppState?.boxSelectionMode;
    if (boxSelectionMode !== undefined) {
        nextAppState.boxSelectionMode = boxSelectionMode;
    }
    return {
        ...nextAppState,
        cursorButton: localAppState?.cursorButton || "up",
        // reset on fresh restore so as to hide the UI button if penMode not active
        penDetected: localAppState?.penDetected ??
            (appState.penMode ? appState.penDetected ?? false : false),
        activeTool: {
            ...(0, common_1.updateActiveTool)(defaultAppState, nextAppState.activeTool.type &&
                exports.AllowedExcalidrawActiveTools[nextAppState.activeTool.type]
                ? nextAppState.activeTool
                : { type: "selection" }),
            lastActiveTool: null,
            locked: nextAppState.activeTool.locked ?? false,
        },
        // Migrates from previous version where appState.zoom was a number
        zoom: {
            value: (0, scene_1.getNormalizedZoom)((0, math_1.isFiniteNumber)(appState.zoom)
                ? appState.zoom
                : appState.zoom?.value ?? defaultAppState.zoom.value),
        },
        openSidebar: 
        // string (legacy)
        typeof appState.openSidebar === "string"
            ? { name: common_1.DEFAULT_SIDEBAR.name }
            : nextAppState.openSidebar,
        gridSize: (0, scene_1.getNormalizedGridSize)((0, math_1.isFiniteNumber)(appState.gridSize) ? appState.gridSize : common_1.DEFAULT_GRID_SIZE),
        gridStep: (0, scene_1.getNormalizedGridStep)((0, math_1.isFiniteNumber)(appState.gridStep) ? appState.gridStep : common_1.DEFAULT_GRID_STEP),
        editingFrame: null,
    };
};
exports.restoreAppState = restoreAppState;
const restoreLibraryItem = (libraryItem) => {
    const elements = (0, exports.restoreElements)((0, element_1.getNonDeletedElements)(libraryItem.elements), null);
    return elements.length ? { ...libraryItem, elements } : null;
};
const restoreLibraryItems = (libraryItems = [], defaultStatus) => {
    const restoredItems = [];
    for (const item of libraryItems) {
        // migrate older libraries
        if (Array.isArray(item)) {
            const restoredItem = restoreLibraryItem({
                status: defaultStatus,
                elements: item,
                id: (0, common_1.randomId)(),
                created: Date.now(),
            });
            if (restoredItem) {
                restoredItems.push(restoredItem);
            }
        }
        else {
            const _item = item;
            const restoredItem = restoreLibraryItem({
                ..._item,
                id: _item.id || (0, common_1.randomId)(),
                status: _item.status || defaultStatus,
                created: _item.created || Date.now(),
            });
            if (restoredItem) {
                restoredItems.push(restoredItem);
            }
        }
    }
    return restoredItems;
};
exports.restoreLibraryItems = restoreLibraryItems;
