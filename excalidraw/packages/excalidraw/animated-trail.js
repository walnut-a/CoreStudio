"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimatedTrail = void 0;
const laser_pointer_1 = require("@excalidraw/laser-pointer");
const common_1 = require("@excalidraw/common");
class AnimatedTrail {
    animationFrameHandler;
    app;
    options;
    currentTrail;
    pastTrails = [];
    container;
    trailElement;
    trailAnimation;
    constructor(animationFrameHandler, app, options) {
        this.animationFrameHandler = animationFrameHandler;
        this.app = app;
        this.options = options;
        this.animationFrameHandler.register(this, this.onFrame.bind(this));
        this.trailElement = document.createElementNS(common_1.SVG_NS, "path");
        if (this.options.animateTrail) {
            this.trailAnimation = document.createElementNS(common_1.SVG_NS, "animate");
            // TODO: make this configurable
            this.trailAnimation.setAttribute("attributeName", "stroke-dashoffset");
            this.trailElement.setAttribute("stroke-dasharray", "7 7");
            this.trailElement.setAttribute("stroke-dashoffset", "10");
            this.trailAnimation.setAttribute("from", "0");
            this.trailAnimation.setAttribute("to", `-14`);
            this.trailAnimation.setAttribute("dur", "0.3s");
            this.trailElement.appendChild(this.trailAnimation);
        }
    }
    get hasCurrentTrail() {
        return !!this.currentTrail;
    }
    hasLastPoint(x, y) {
        if (this.currentTrail) {
            const len = this.currentTrail.originalPoints.length;
            return (this.currentTrail.originalPoints[len - 1][0] === x &&
                this.currentTrail.originalPoints[len - 1][1] === y);
        }
        return false;
    }
    start(container) {
        if (container) {
            this.container = container;
        }
        if (this.trailElement.parentNode !== this.container && this.container) {
            this.container.appendChild(this.trailElement);
        }
        this.animationFrameHandler.start(this);
    }
    stop() {
        this.animationFrameHandler.stop(this);
        if (this.trailElement.parentNode === this.container) {
            this.container?.removeChild(this.trailElement);
        }
    }
    startPath(x, y) {
        this.currentTrail = new laser_pointer_1.LaserPointer(this.options);
        this.currentTrail.addPoint([x, y, performance.now()]);
        this.update();
    }
    addPointToPath(x, y) {
        if (this.currentTrail) {
            this.currentTrail.addPoint([x, y, performance.now()]);
            this.update();
        }
    }
    endPath() {
        if (this.currentTrail) {
            this.currentTrail.close();
            this.currentTrail.options.keepHead = false;
            this.pastTrails.push(this.currentTrail);
            this.currentTrail = undefined;
            this.update();
        }
    }
    getCurrentTrail() {
        return this.currentTrail;
    }
    clearTrails() {
        this.pastTrails = [];
        this.currentTrail = undefined;
        this.update();
    }
    update() {
        this.start();
        if (this.trailAnimation) {
            this.trailAnimation.setAttribute("begin", "indefinite");
            this.trailAnimation.setAttribute("repeatCount", "indefinite");
        }
    }
    onFrame() {
        const paths = [];
        for (const trail of this.pastTrails) {
            paths.push(this.drawTrail(trail, this.app.state));
        }
        if (this.currentTrail) {
            const currentPath = this.drawTrail(this.currentTrail, this.app.state);
            paths.push(currentPath);
        }
        this.pastTrails = this.pastTrails.filter((trail) => {
            return trail.getStrokeOutline().length !== 0;
        });
        if (paths.length === 0) {
            this.stop();
        }
        const svgPaths = paths.join(" ").trim();
        this.trailElement.setAttribute("d", svgPaths);
        if (this.trailAnimation) {
            this.trailElement.setAttribute("fill", (this.options.fill ?? (() => "black"))(this));
            this.trailElement.setAttribute("stroke", (this.options.stroke ?? (() => "black"))(this));
        }
        else {
            this.trailElement.setAttribute("fill", (this.options.fill ?? (() => "black"))(this));
        }
    }
    drawTrail(trail, state) {
        const _stroke = trail
            .getStrokeOutline(trail.options.size / state.zoom.value)
            .map(([x, y]) => {
            const result = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: x, sceneY: y }, state);
            return [result.x, result.y];
        });
        const stroke = this.trailAnimation
            ? _stroke.slice(0, _stroke.length / 2)
            : _stroke;
        return (0, common_1.getSvgPathFromStroke)(stroke, true);
    }
}
exports.AnimatedTrail = AnimatedTrail;
