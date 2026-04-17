"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const staticScene_1 = require("../renderer/staticScene");
class Renderer {
    scene;
    constructor(scene) {
        this.scene = scene;
    }
    getRenderableElements = (() => {
        const getVisibleCanvasElements = ({ elementsMap, zoom, offsetLeft, offsetTop, scrollX, scrollY, height, width, }) => {
            const visibleElements = [];
            for (const element of elementsMap.values()) {
                if ((0, element_1.isElementInViewport)(element, width, height, {
                    zoom,
                    offsetLeft,
                    offsetTop,
                    scrollX,
                    scrollY,
                }, elementsMap)) {
                    visibleElements.push(element);
                }
            }
            return visibleElements;
        };
        const getRenderableElements = ({ elements, editingTextElement, newElementId, }) => {
            const elementsMap = (0, common_1.toBrandedType)(new Map());
            for (const element of elements) {
                if (newElementId === element.id) {
                    continue;
                }
                // we don't want to render text element that's being currently edited
                // (it's rendered on remote only)
                if (!editingTextElement ||
                    editingTextElement.type !== "text" ||
                    element.id !== editingTextElement.id) {
                    elementsMap.set(element.id, element);
                }
            }
            return elementsMap;
        };
        return (0, common_1.memoize)(({ zoom, offsetLeft, offsetTop, scrollX, scrollY, height, width, editingTextElement, newElementId, 
        // cache-invalidation nonce
        sceneNonce: _sceneNonce, }) => {
            const elements = this.scene.getNonDeletedElements();
            const elementsMap = getRenderableElements({
                elements,
                editingTextElement,
                newElementId,
            });
            const visibleElements = getVisibleCanvasElements({
                elementsMap,
                zoom,
                offsetLeft,
                offsetTop,
                scrollX,
                scrollY,
                height,
                width,
            });
            return { elementsMap, visibleElements };
        });
    })();
    // NOTE Doesn't destroy everything (scene, rc, etc.) because it may not be
    // safe to break TS contract here (for upstream cases)
    destroy() {
        staticScene_1.renderStaticSceneThrottled.cancel();
        this.getRenderableElements.clear();
    }
}
exports.Renderer = Renderer;
