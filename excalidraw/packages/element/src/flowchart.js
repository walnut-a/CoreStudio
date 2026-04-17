"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNodeInFlowchart = exports.FlowChartCreator = exports.FlowChartNavigator = exports.addNewNodes = exports.getPredecessors = exports.getLinkDirectionFromKey = void 0;
const common_1 = require("@excalidraw/common");
const math_1 = require("@excalidraw/math");
const binding_1 = require("./binding");
const elbowArrow_1 = require("./elbowArrow");
const heading_1 = require("./heading");
const linearElementEditor_1 = require("./linearElementEditor");
const mutateElement_1 = require("./mutateElement");
const newElement_1 = require("./newElement");
const bounds_1 = require("./bounds");
const frame_1 = require("./frame");
const typeChecks_1 = require("./typeChecks");
const VERTICAL_OFFSET = 100;
const HORIZONTAL_OFFSET = 100;
const getLinkDirectionFromKey = (key) => {
    switch (key) {
        case common_1.KEYS.ARROW_UP:
            return "up";
        case common_1.KEYS.ARROW_DOWN:
            return "down";
        case common_1.KEYS.ARROW_RIGHT:
            return "right";
        case common_1.KEYS.ARROW_LEFT:
            return "left";
        default:
            return "right";
    }
};
exports.getLinkDirectionFromKey = getLinkDirectionFromKey;
const getNodeRelatives = (type, node, elementsMap, direction) => {
    const items = [...elementsMap.values()].reduce((acc, el) => {
        let oppositeBinding;
        if ((0, typeChecks_1.isElbowArrow)(el) &&
            // we want check existence of the opposite binding, in the direction
            // we're interested in
            (oppositeBinding =
                el[type === "predecessors" ? "startBinding" : "endBinding"]) &&
            // similarly, we need to filter only arrows bound to target node
            el[type === "predecessors" ? "endBinding" : "startBinding"]
                ?.elementId === node.id) {
            const relative = elementsMap.get(oppositeBinding.elementId);
            if (!relative) {
                return acc;
            }
            (0, common_1.invariant)((0, typeChecks_1.isBindableElement)(relative), "not an ExcalidrawBindableElement");
            const edgePoint = (type === "predecessors" ? el.points[el.points.length - 1] : [0, 0]);
            const heading = (0, heading_1.headingForPointFromElement)(node, (0, bounds_1.aabbForElement)(node, elementsMap), [edgePoint[0] + el.x, edgePoint[1] + el.y]);
            acc.push({
                relative,
                heading,
            });
        }
        return acc;
    }, []);
    switch (direction) {
        case "up":
            return items
                .filter((item) => (0, heading_1.compareHeading)(item.heading, heading_1.HEADING_UP))
                .map((item) => item.relative);
        case "down":
            return items
                .filter((item) => (0, heading_1.compareHeading)(item.heading, heading_1.HEADING_DOWN))
                .map((item) => item.relative);
        case "right":
            return items
                .filter((item) => (0, heading_1.compareHeading)(item.heading, heading_1.HEADING_RIGHT))
                .map((item) => item.relative);
        case "left":
            return items
                .filter((item) => (0, heading_1.compareHeading)(item.heading, heading_1.HEADING_LEFT))
                .map((item) => item.relative);
    }
};
const getSuccessors = (node, elementsMap, direction) => {
    return getNodeRelatives("successors", node, elementsMap, direction);
};
const getPredecessors = (node, elementsMap, direction) => {
    return getNodeRelatives("predecessors", node, elementsMap, direction);
};
exports.getPredecessors = getPredecessors;
const getOffsets = (element, linkedNodes, direction) => {
    const _HORIZONTAL_OFFSET = HORIZONTAL_OFFSET + element.width;
    // check if vertical space or horizontal space is available first
    if (direction === "up" || direction === "down") {
        const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
        // check vertical space
        const minX = element.x;
        const maxX = element.x + element.width;
        // vertical space is available
        if (linkedNodes.every((linkedNode) => linkedNode.x + linkedNode.width < minX || linkedNode.x > maxX)) {
            return {
                x: 0,
                y: _VERTICAL_OFFSET * (direction === "up" ? -1 : 1),
            };
        }
    }
    else if (direction === "right" || direction === "left") {
        const minY = element.y;
        const maxY = element.y + element.height;
        if (linkedNodes.every((linkedNode) => linkedNode.y + linkedNode.height < minY || linkedNode.y > maxY)) {
            return {
                x: (HORIZONTAL_OFFSET + element.width) * (direction === "left" ? -1 : 1),
                y: 0,
            };
        }
    }
    if (direction === "up" || direction === "down") {
        const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
        const y = linkedNodes.length === 0 ? _VERTICAL_OFFSET : _VERTICAL_OFFSET;
        const x = linkedNodes.length === 0
            ? 0
            : (linkedNodes.length + 1) % 2 === 0
                ? ((linkedNodes.length + 1) / 2) * _HORIZONTAL_OFFSET
                : (linkedNodes.length / 2) * _HORIZONTAL_OFFSET * -1;
        if (direction === "up") {
            return {
                x,
                y: y * -1,
            };
        }
        return {
            x,
            y,
        };
    }
    const _VERTICAL_OFFSET = VERTICAL_OFFSET + element.height;
    const x = (linkedNodes.length === 0 ? HORIZONTAL_OFFSET : HORIZONTAL_OFFSET) +
        element.width;
    const y = linkedNodes.length === 0
        ? 0
        : (linkedNodes.length + 1) % 2 === 0
            ? ((linkedNodes.length + 1) / 2) * _VERTICAL_OFFSET
            : (linkedNodes.length / 2) * _VERTICAL_OFFSET * -1;
    if (direction === "left") {
        return {
            x: x * -1,
            y,
        };
    }
    return {
        x,
        y,
    };
};
const addNewNode = (element, appState, direction, scene) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const successors = getSuccessors(element, elementsMap, direction);
    const predeccessors = (0, exports.getPredecessors)(element, elementsMap, direction);
    const offsets = getOffsets(element, [...successors, ...predeccessors], direction);
    const nextNode = (0, newElement_1.newElement)({
        type: element.type,
        x: element.x + offsets.x,
        y: element.y + offsets.y,
        // TODO: extract this to a util
        width: element.width,
        height: element.height,
        roundness: element.roundness,
        roughness: element.roughness,
        backgroundColor: element.backgroundColor,
        strokeColor: element.strokeColor,
        strokeWidth: element.strokeWidth,
        opacity: element.opacity,
        fillStyle: element.fillStyle,
        strokeStyle: element.strokeStyle,
    });
    (0, common_1.invariant)((0, typeChecks_1.isFlowchartNodeElement)(nextNode), "not an ExcalidrawFlowchartNodeElement");
    const bindingArrow = createBindingArrow(element, nextNode, direction, appState, scene);
    return {
        nextNode,
        bindingArrow,
    };
};
const addNewNodes = (startNode, appState, direction, scene, numberOfNodes) => {
    // always start from 0 and distribute evenly
    const newNodes = [];
    for (let i = 0; i < numberOfNodes; i++) {
        let nextX;
        let nextY;
        if (direction === "left" || direction === "right") {
            const totalHeight = VERTICAL_OFFSET * (numberOfNodes - 1) +
                numberOfNodes * startNode.height;
            const startY = startNode.y + startNode.height / 2 - totalHeight / 2;
            let offsetX = HORIZONTAL_OFFSET + startNode.width;
            if (direction === "left") {
                offsetX *= -1;
            }
            nextX = startNode.x + offsetX;
            const offsetY = (VERTICAL_OFFSET + startNode.height) * i;
            nextY = startY + offsetY;
        }
        else {
            const totalWidth = HORIZONTAL_OFFSET * (numberOfNodes - 1) +
                numberOfNodes * startNode.width;
            const startX = startNode.x + startNode.width / 2 - totalWidth / 2;
            let offsetY = VERTICAL_OFFSET + startNode.height;
            if (direction === "up") {
                offsetY *= -1;
            }
            nextY = startNode.y + offsetY;
            const offsetX = (HORIZONTAL_OFFSET + startNode.width) * i;
            nextX = startX + offsetX;
        }
        const nextNode = (0, newElement_1.newElement)({
            type: startNode.type,
            x: nextX,
            y: nextY,
            // TODO: extract this to a util
            width: startNode.width,
            height: startNode.height,
            roundness: startNode.roundness,
            roughness: startNode.roughness,
            backgroundColor: startNode.backgroundColor,
            strokeColor: startNode.strokeColor,
            strokeWidth: startNode.strokeWidth,
            opacity: startNode.opacity,
            fillStyle: startNode.fillStyle,
            strokeStyle: startNode.strokeStyle,
        });
        (0, common_1.invariant)((0, typeChecks_1.isFlowchartNodeElement)(nextNode), "not an ExcalidrawFlowchartNodeElement");
        const bindingArrow = createBindingArrow(startNode, nextNode, direction, appState, scene);
        newNodes.push(nextNode);
        newNodes.push(bindingArrow);
    }
    return newNodes;
};
exports.addNewNodes = addNewNodes;
const createBindingArrow = (startBindingElement, endBindingElement, direction, appState, scene) => {
    let startX;
    let startY;
    const PADDING = 6;
    switch (direction) {
        case "up": {
            startX = startBindingElement.x + startBindingElement.width / 2;
            startY = startBindingElement.y - PADDING;
            break;
        }
        case "down": {
            startX = startBindingElement.x + startBindingElement.width / 2;
            startY = startBindingElement.y + startBindingElement.height + PADDING;
            break;
        }
        case "right": {
            startX = startBindingElement.x + startBindingElement.width + PADDING;
            startY = startBindingElement.y + startBindingElement.height / 2;
            break;
        }
        case "left": {
            startX = startBindingElement.x - PADDING;
            startY = startBindingElement.y + startBindingElement.height / 2;
            break;
        }
    }
    let endX;
    let endY;
    switch (direction) {
        case "up": {
            endX = endBindingElement.x + endBindingElement.width / 2 - startX;
            endY = endBindingElement.y + endBindingElement.height - startY + PADDING;
            break;
        }
        case "down": {
            endX = endBindingElement.x + endBindingElement.width / 2 - startX;
            endY = endBindingElement.y - startY - PADDING;
            break;
        }
        case "right": {
            endX = endBindingElement.x - startX - PADDING;
            endY = endBindingElement.y - startY + endBindingElement.height / 2;
            break;
        }
        case "left": {
            endX = endBindingElement.x + endBindingElement.width - startX + PADDING;
            endY = endBindingElement.y - startY + endBindingElement.height / 2;
            break;
        }
    }
    const bindingArrow = (0, newElement_1.newArrowElement)({
        type: "arrow",
        x: startX,
        y: startY,
        startArrowhead: null,
        endArrowhead: appState.currentItemEndArrowhead,
        strokeColor: startBindingElement.strokeColor,
        strokeStyle: startBindingElement.strokeStyle,
        strokeWidth: startBindingElement.strokeWidth,
        opacity: startBindingElement.opacity,
        roughness: startBindingElement.roughness,
        points: [(0, math_1.pointFrom)(0, 0), (0, math_1.pointFrom)(endX, endY)],
        elbowed: true,
    });
    const elementsMap = scene.getNonDeletedElementsMap();
    (0, binding_1.bindBindingElement)(bindingArrow, startBindingElement, "orbit", "start", scene);
    (0, binding_1.bindBindingElement)(bindingArrow, endBindingElement, "orbit", "end", scene);
    const changedElements = new Map();
    changedElements.set(startBindingElement.id, startBindingElement);
    changedElements.set(endBindingElement.id, endBindingElement);
    changedElements.set(bindingArrow.id, bindingArrow);
    linearElementEditor_1.LinearElementEditor.movePoints(bindingArrow, scene, new Map([
        [
            1,
            {
                point: bindingArrow.points[1],
            },
        ],
    ]));
    const update = (0, elbowArrow_1.updateElbowArrowPoints)(bindingArrow, (0, common_1.toBrandedType)(new Map([
        ...elementsMap.entries(),
        [startBindingElement.id, startBindingElement],
        [endBindingElement.id, endBindingElement],
        [bindingArrow.id, bindingArrow],
    ])), { points: bindingArrow.points });
    return {
        ...bindingArrow,
        ...update,
    };
};
class FlowChartNavigator {
    isExploring = false;
    // nodes that are ONE link away (successor and predecessor both included)
    sameLevelNodes = [];
    sameLevelIndex = 0;
    // set it to the opposite of the defalut creation direction
    direction = null;
    // for speedier navigation
    visitedNodes = new Set();
    clear() {
        this.isExploring = false;
        this.sameLevelNodes = [];
        this.sameLevelIndex = 0;
        this.direction = null;
        this.visitedNodes.clear();
    }
    exploreByDirection(element, elementsMap, direction) {
        if (!(0, typeChecks_1.isBindableElement)(element)) {
            return null;
        }
        // clear if going at a different direction
        if (direction !== this.direction) {
            this.clear();
        }
        // add the current node to the visited
        if (!this.visitedNodes.has(element.id)) {
            this.visitedNodes.add(element.id);
        }
        /**
         * CASE:
         * - already started exploring, AND
         * - there are multiple nodes at the same level, AND
         * - still going at the same direction, AND
         *
         * RESULT:
         * - loop through nodes at the same level
         *
         * WHY:
         * - provides user the capability to loop through nodes at the same level
         */
        if (this.isExploring &&
            direction === this.direction &&
            this.sameLevelNodes.length > 1) {
            this.sameLevelIndex =
                (this.sameLevelIndex + 1) % this.sameLevelNodes.length;
            return this.sameLevelNodes[this.sameLevelIndex].id;
        }
        const nodes = [
            ...getSuccessors(element, elementsMap, direction),
            ...(0, exports.getPredecessors)(element, elementsMap, direction),
        ];
        /**
         * CASE:
         * - just started exploring at the given direction
         *
         * RESULT:
         * - go to the first node in the given direction
         */
        if (nodes.length > 0) {
            this.sameLevelIndex = 0;
            this.isExploring = true;
            this.sameLevelNodes = nodes;
            this.direction = direction;
            this.visitedNodes.add(nodes[0].id);
            return nodes[0].id;
        }
        /**
         * CASE:
         * - (just started exploring or still going at the same direction) OR
         * - there're no nodes at the given direction
         *
         * RESULT:
         * - go to some other unvisited linked node
         *
         * WHY:
         * - provide a speedier navigation from a given node to some predecessor
         *   without the user having to change arrow key
         */
        if (direction === this.direction || !this.isExploring) {
            if (!this.isExploring) {
                // just started and no other nodes at the given direction
                // so the current node is technically the first visited node
                // (this is needed so that we don't get stuck between looping through )
                this.visitedNodes.add(element.id);
            }
            const otherDirections = [
                "up",
                "right",
                "down",
                "left",
            ].filter((dir) => dir !== direction);
            const otherLinkedNodes = otherDirections
                .map((dir) => [
                ...getSuccessors(element, elementsMap, dir),
                ...(0, exports.getPredecessors)(element, elementsMap, dir),
            ])
                .flat()
                .filter((linkedNode) => !this.visitedNodes.has(linkedNode.id));
            for (const linkedNode of otherLinkedNodes) {
                if (!this.visitedNodes.has(linkedNode.id)) {
                    this.visitedNodes.add(linkedNode.id);
                    this.isExploring = true;
                    this.direction = direction;
                    return linkedNode.id;
                }
            }
        }
        return null;
    }
}
exports.FlowChartNavigator = FlowChartNavigator;
class FlowChartCreator {
    isCreatingChart = false;
    numberOfNodes = 0;
    direction = "right";
    pendingNodes = null;
    createNodes(startNode, appState, direction, scene) {
        const elementsMap = scene.getNonDeletedElementsMap();
        if (direction !== this.direction) {
            const { nextNode, bindingArrow } = addNewNode(startNode, appState, direction, scene);
            this.numberOfNodes = 1;
            this.isCreatingChart = true;
            this.direction = direction;
            this.pendingNodes = [nextNode, bindingArrow];
        }
        else {
            this.numberOfNodes += 1;
            const newNodes = (0, exports.addNewNodes)(startNode, appState, direction, scene, this.numberOfNodes);
            this.isCreatingChart = true;
            this.direction = direction;
            this.pendingNodes = newNodes;
        }
        // add pending nodes to the same frame as the start node
        // if every pending node is at least intersecting with the frame
        if (startNode.frameId) {
            const frame = elementsMap.get(startNode.frameId);
            (0, common_1.invariant)(frame && (0, typeChecks_1.isFrameElement)(frame), "not an ExcalidrawFrameElement");
            if (frame &&
                this.pendingNodes.every((node) => (0, frame_1.elementsAreInFrameBounds)([node], frame, elementsMap) ||
                    (0, frame_1.elementOverlapsWithFrame)(node, frame, elementsMap))) {
                this.pendingNodes = this.pendingNodes.map((node) => (0, mutateElement_1.mutateElement)(node, elementsMap, {
                    frameId: startNode.frameId,
                }));
            }
        }
    }
    clear() {
        this.isCreatingChart = false;
        this.pendingNodes = null;
        this.direction = null;
        this.numberOfNodes = 0;
    }
}
exports.FlowChartCreator = FlowChartCreator;
const isNodeInFlowchart = (element, elementsMap) => {
    for (const [, el] of elementsMap) {
        if (el.type === "arrow" &&
            (el.startBinding?.elementId === element.id ||
                el.endBinding?.elementId === element.id)) {
            return true;
        }
    }
    return false;
};
exports.isNodeInFlowchart = isNodeInFlowchart;
