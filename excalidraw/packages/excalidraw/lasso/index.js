"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LassoTrail = void 0;
const math_1 = require("@excalidraw/math");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const animated_trail_1 = require("../animated-trail");
const utils_1 = require("./utils");
class LassoTrail extends animated_trail_1.AnimatedTrail {
    intersectedElements = new Set();
    enclosedElements = new Set();
    elementsSegments = null;
    canvasTranslate = null;
    keepPreviousSelection = false;
    constructor(animationFrameHandler, app) {
        super(animationFrameHandler, app, {
            animateTrail: true,
            streamline: 0.4,
            sizeMapping: (c) => {
                const DECAY_TIME = Infinity;
                const DECAY_LENGTH = 5000;
                const t = Math.max(0, 1 - (performance.now() - c.pressure) / DECAY_TIME);
                const l = (DECAY_LENGTH -
                    Math.min(DECAY_LENGTH, c.totalLength - c.currentIndex)) /
                    DECAY_LENGTH;
                return Math.min((0, common_1.easeOut)(l), (0, common_1.easeOut)(t));
            },
            fill: () => "rgba(105,101,219,0.05)",
            stroke: () => "rgba(105,101,219)",
        });
    }
    startPath(x, y, keepPreviousSelection = false) {
        // clear any existing trails just in case
        this.endPath();
        super.startPath(x, y);
        this.intersectedElements.clear();
        this.enclosedElements.clear();
        this.keepPreviousSelection = keepPreviousSelection;
        if (!this.keepPreviousSelection) {
            this.app.setState({
                selectedElementIds: {},
                selectedGroupIds: {},
                selectedLinearElement: null,
            });
        }
    }
    selectElementsFromIds = (ids) => {
        this.app.setState((prevState) => {
            const nextSelectedElementIds = ids.reduce((acc, id) => {
                acc[id] = true;
                return acc;
            }, {});
            if (this.keepPreviousSelection) {
                for (const id of Object.keys(prevState.selectedElementIds)) {
                    nextSelectedElementIds[id] = true;
                }
            }
            for (const [id] of Object.entries(nextSelectedElementIds)) {
                const element = this.app.scene.getNonDeletedElement(id);
                if (element && (0, element_3.isTextElement)(element)) {
                    const container = (0, element_6.getContainerElement)(element, this.app.scene.getNonDeletedElementsMap());
                    if (container) {
                        nextSelectedElementIds[container.id] = true;
                        delete nextSelectedElementIds[element.id];
                    }
                }
            }
            // remove all children of selected frames
            for (const [id] of Object.entries(nextSelectedElementIds)) {
                const element = this.app.scene.getNonDeletedElement(id);
                if (element && (0, element_3.isFrameLikeElement)(element)) {
                    const elementsInFrame = (0, element_4.getFrameChildren)(this.app.scene.getNonDeletedElementsMap(), element.id);
                    for (const child of elementsInFrame) {
                        delete nextSelectedElementIds[child.id];
                    }
                }
            }
            const nextSelection = (0, element_5.selectGroupsForSelectedElements)({
                editingGroupId: prevState.editingGroupId,
                selectedElementIds: nextSelectedElementIds,
            }, this.app.scene.getNonDeletedElements(), prevState, this.app);
            const selectedIds = [...Object.keys(nextSelection.selectedElementIds)];
            const selectedGroupIds = [...Object.keys(nextSelection.selectedGroupIds)];
            return {
                selectedElementIds: nextSelection.selectedElementIds,
                selectedGroupIds: nextSelection.selectedGroupIds,
                selectedLinearElement: selectedIds.length === 1 &&
                    !selectedGroupIds.length &&
                    (0, element_3.isLinearElement)(this.app.scene.getNonDeletedElement(selectedIds[0]))
                    ? new element_2.LinearElementEditor(this.app.scene.getNonDeletedElement(selectedIds[0]), this.app.scene.getNonDeletedElementsMap())
                    : null,
            };
        });
    };
    addPointToPath = (x, y, keepPreviousSelection = false) => {
        super.addPointToPath(x, y);
        this.keepPreviousSelection = keepPreviousSelection;
        this.updateSelection();
    };
    updateSelection = () => {
        const lassoPath = super
            .getCurrentTrail()
            ?.originalPoints?.map((p) => (0, math_1.pointFrom)(p[0], p[1]));
        const currentCanvasTranslate = {
            scrollX: this.app.state.scrollX,
            scrollY: this.app.state.scrollY,
            zoom: this.app.state.zoom.value,
        };
        if (!this.elementsSegments ||
            !(0, common_1.isShallowEqual)(currentCanvasTranslate, this.canvasTranslate ?? {})) {
            this.canvasTranslate = currentCanvasTranslate;
            this.elementsSegments = new Map();
            const visibleElementsMap = (0, common_1.arrayToMap)(this.app.visibleElements);
            for (const element of this.app.visibleElements) {
                const segments = (0, element_1.getElementLineSegments)(element, visibleElementsMap);
                this.elementsSegments.set(element.id, segments);
            }
        }
        if (lassoPath) {
            const { selectedElementIds } = (0, utils_1.getLassoSelectedElementIds)({
                lassoPath,
                elements: this.app.visibleElements,
                elementsMap: this.app.scene.getNonDeletedElementsMap(),
                elementsSegments: this.elementsSegments,
                intersectedElements: this.intersectedElements,
                enclosedElements: this.enclosedElements,
                simplifyDistance: 5 / this.app.state.zoom.value,
            });
            this.selectElementsFromIds(selectedElementIds);
        }
    };
    endPath() {
        super.endPath();
        super.clearTrails();
        this.intersectedElements.clear();
        this.enclosedElements.clear();
        this.elementsSegments = null;
    }
}
exports.LassoTrail = LassoTrail;
