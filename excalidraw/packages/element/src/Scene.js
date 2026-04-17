"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scene = void 0;
const lodash_throttle_1 = __importDefault(require("lodash.throttle"));
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const getNonDeletedElements = (allElements) => {
    const elementsMap = new Map();
    const elements = [];
    for (const element of allElements) {
        if (!element.isDeleted) {
            elements.push(element);
            elementsMap.set(element.id, element);
        }
    }
    return { elementsMap, elements };
};
const validateIndicesThrottled = (0, lodash_throttle_1.default)((elements) => {
    if ((0, common_1.isDevEnv)() || (0, common_1.isTestEnv)() || window?.DEBUG_FRACTIONAL_INDICES) {
        (0, element_4.validateFractionalIndices)(elements, {
            // throw only in dev & test, to remain functional on `DEBUG_FRACTIONAL_INDICES`
            shouldThrow: (0, common_1.isDevEnv)() || (0, common_1.isTestEnv)(),
            includeBoundTextValidation: true,
        });
    }
}, 1000 * 60, { leading: true, trailing: false });
const hashSelectionOpts = (opts) => {
    const keys = ["includeBoundTextElement", "includeElementsInFrames"];
    let hash = "";
    for (const key of keys) {
        hash += `${key}:${opts[key] ? "1" : "0"}`;
    }
    return hash;
};
class Scene {
    // ---------------------------------------------------------------------------
    // instance methods/props
    // ---------------------------------------------------------------------------
    callbacks = new Set();
    nonDeletedElements = [];
    nonDeletedElementsMap = (0, common_1.toBrandedType)(new Map());
    // ideally all elements within the scene should be wrapped around with `Ordered` type, but right now there is no real benefit doing so
    elements = [];
    nonDeletedFramesLikes = [];
    frames = [];
    elementsMap = (0, common_1.toBrandedType)(new Map());
    selectedElementsCache = {
        selectedElementIds: null,
        elements: null,
        cache: new Map(),
    };
    /**
     * Random integer regenerated each scene update.
     *
     * Does not relate to elements versions, it's only a renderer
     * cache-invalidation nonce at the moment.
     */
    sceneNonce;
    getSceneNonce() {
        return this.sceneNonce;
    }
    getNonDeletedElementsMap() {
        return this.nonDeletedElementsMap;
    }
    getElementsIncludingDeleted() {
        return this.elements;
    }
    getElementsMapIncludingDeleted() {
        return this.elementsMap;
    }
    getNonDeletedElements() {
        return this.nonDeletedElements;
    }
    getFramesIncludingDeleted() {
        return this.frames;
    }
    constructor(elements = null, options) {
        if (elements) {
            this.replaceAllElements(elements, options);
        }
    }
    getSelectedElements(opts) {
        const hash = hashSelectionOpts(opts);
        const elements = opts?.elements || this.nonDeletedElements;
        if (this.selectedElementsCache.elements === elements &&
            this.selectedElementsCache.selectedElementIds === opts.selectedElementIds) {
            const cached = this.selectedElementsCache.cache.get(hash);
            if (cached) {
                return cached;
            }
        }
        else if (opts?.elements == null) {
            // if we're operating on latest scene elements and the cache is not
            //  storing the latest elements, clear the cache
            this.selectedElementsCache.cache.clear();
        }
        const selectedElements = (0, element_5.getSelectedElements)(elements, { selectedElementIds: opts.selectedElementIds }, opts);
        // cache only if we're not using custom elements
        if (opts?.elements == null) {
            this.selectedElementsCache.selectedElementIds = opts.selectedElementIds;
            this.selectedElementsCache.elements = this.nonDeletedElements;
            this.selectedElementsCache.cache.set(hash, selectedElements);
        }
        return selectedElements;
    }
    getNonDeletedFramesLikes() {
        return this.nonDeletedFramesLikes;
    }
    getElement(id) {
        return this.elementsMap.get(id) || null;
    }
    getNonDeletedElement(id) {
        const element = this.getElement(id);
        if (element && (0, element_1.isNonDeletedElement)(element)) {
            return element;
        }
        return null;
    }
    /**
     * A utility method to help with updating all scene elements, with the added
     * performance optimization of not renewing the array if no change is made.
     *
     * Maps all current excalidraw elements, invoking the callback for each
     * element. The callback should either return a new mapped element, or the
     * original element if no changes are made. If no changes are made to any
     * element, this results in a no-op. Otherwise, the newly mapped elements
     * are set as the next scene's elements.
     *
     * @returns whether a change was made
     */
    mapElements(iteratee) {
        let didChange = false;
        const newElements = this.elements.map((element) => {
            const nextElement = iteratee(element);
            if (nextElement !== element) {
                didChange = true;
            }
            return nextElement;
        });
        if (didChange) {
            this.replaceAllElements(newElements);
        }
        return didChange;
    }
    replaceAllElements(nextElements, options) {
        // we do trust the insertion order on the map, though maybe we shouldn't and should prefer order defined by fractional indices
        const _nextElements = (0, common_1.toArray)(nextElements);
        const nextFrameLikes = [];
        if (!options?.skipValidation) {
            validateIndicesThrottled(_nextElements);
        }
        this.elements = (0, element_4.syncInvalidIndices)(_nextElements);
        this.elementsMap.clear();
        this.elements.forEach((element) => {
            if ((0, element_2.isFrameLikeElement)(element)) {
                nextFrameLikes.push(element);
            }
            this.elementsMap.set(element.id, element);
        });
        const nonDeletedElements = getNonDeletedElements(this.elements);
        this.nonDeletedElements = nonDeletedElements.elements;
        this.nonDeletedElementsMap = nonDeletedElements.elementsMap;
        this.frames = nextFrameLikes;
        this.nonDeletedFramesLikes = getNonDeletedElements(this.frames).elements;
        this.triggerUpdate();
    }
    triggerUpdate() {
        this.sceneNonce = (0, common_1.randomInteger)();
        for (const callback of Array.from(this.callbacks)) {
            callback();
        }
    }
    onUpdate(cb) {
        if (this.callbacks.has(cb)) {
            throw new Error();
        }
        this.callbacks.add(cb);
        return () => {
            if (!this.callbacks.has(cb)) {
                throw new Error();
            }
            this.callbacks.delete(cb);
        };
    }
    destroy() {
        this.elements = [];
        this.nonDeletedElements = [];
        this.nonDeletedFramesLikes = [];
        this.frames = [];
        this.elementsMap.clear();
        this.selectedElementsCache.selectedElementIds = null;
        this.selectedElementsCache.elements = null;
        this.selectedElementsCache.cache.clear();
        // done not for memory leaks, but to guard against possible late fires
        // (I guess?)
        this.callbacks.clear();
    }
    insertElementAtIndex(element, index) {
        if (!Number.isFinite(index) || index < 0) {
            throw new Error("insertElementAtIndex can only be called with index >= 0");
        }
        const nextElements = [
            ...this.elements.slice(0, index),
            element,
            ...this.elements.slice(index),
        ];
        (0, element_4.syncMovedIndices)(nextElements, (0, common_1.arrayToMap)([element]));
        this.replaceAllElements(nextElements);
    }
    insertElementsAtIndex(elements, index) {
        if (!elements.length) {
            return;
        }
        if (!Number.isFinite(index) || index < 0) {
            throw new Error("insertElementAtIndex can only be called with index >= 0");
        }
        const nextElements = [
            ...this.elements.slice(0, index),
            ...elements,
            ...this.elements.slice(index),
        ];
        (0, element_4.syncMovedIndices)(nextElements, (0, common_1.arrayToMap)(elements));
        this.replaceAllElements(nextElements);
    }
    insertElement = (element) => {
        const index = element.frameId
            ? this.getElementIndex(element.frameId)
            : this.elements.length;
        this.insertElementAtIndex(element, index);
    };
    insertElements = (elements) => {
        if (!elements.length) {
            return;
        }
        const index = elements[0]?.frameId
            ? this.getElementIndex(elements[0].frameId)
            : this.elements.length;
        this.insertElementsAtIndex(elements, index);
    };
    getElementIndex(elementId) {
        return this.elements.findIndex((element) => element.id === elementId);
    }
    getContainerElement = (element) => {
        if (!element) {
            return null;
        }
        if (element.containerId) {
            return this.getElement(element.containerId) || null;
        }
        return null;
    };
    getElementsFromId = (id) => {
        const elementsMap = this.getNonDeletedElementsMap();
        // first check if the id is an element
        const el = elementsMap.get(id);
        if (el) {
            return [el];
        }
        // then, check if the id is a group
        return (0, element_3.getElementsInGroup)(elementsMap, id);
    };
    // Mutate an element with passed updates and trigger the component to update. Make sure you
    // are calling it either from a React event handler or within unstable_batchedUpdates().
    mutateElement(element, updates, options = {
        informMutation: true,
        isDragging: false,
    }) {
        const elementsMap = this.getNonDeletedElementsMap();
        const { version: prevVersion } = element;
        const { version: nextVersion } = (0, element_6.mutateElement)(element, elementsMap, updates, options);
        if (
        // skip if the element is not in the scene (i.e. selection)
        this.elementsMap.has(element.id) &&
            // skip if the element's version hasn't changed, as mutateElement returned the same element
            prevVersion !== nextVersion &&
            options.informMutation) {
            this.triggerUpdate();
        }
        return element;
    }
}
exports.Scene = Scene;
