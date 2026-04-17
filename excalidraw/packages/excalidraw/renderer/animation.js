"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationController = void 0;
const reactUtils_1 = require("../reactUtils");
class AnimationController {
    static isRunning = false;
    static animations = new Map();
    static start(key, animation) {
        const initialState = animation({
            deltaTime: 0,
            state: undefined,
        });
        if (initialState) {
            AnimationController.animations.set(key, {
                animation,
                lastTime: 0,
                state: initialState,
            });
            if (!AnimationController.isRunning) {
                AnimationController.isRunning = true;
                if ((0, reactUtils_1.isRenderThrottlingEnabled)()) {
                    requestAnimationFrame(AnimationController.tick);
                }
                else {
                    setTimeout(AnimationController.tick, 0);
                }
            }
        }
    }
    static tick() {
        if (AnimationController.animations.size > 0) {
            for (const [key, animation] of AnimationController.animations) {
                const now = performance.now();
                const deltaTime = animation.lastTime === 0 ? 0 : now - animation.lastTime;
                const state = animation.animation({
                    deltaTime,
                    state: animation.state,
                });
                if (!state) {
                    AnimationController.animations.delete(key);
                    if (AnimationController.animations.size === 0) {
                        AnimationController.isRunning = false;
                        return;
                    }
                }
                else {
                    animation.lastTime = now;
                    animation.state = state;
                }
            }
            if ((0, reactUtils_1.isRenderThrottlingEnabled)()) {
                requestAnimationFrame(AnimationController.tick);
            }
            else {
                setTimeout(AnimationController.tick, 0);
            }
        }
    }
    static running(key) {
        return AnimationController.animations.has(key);
    }
    static cancel(key) {
        AnimationController.animations.delete(key);
    }
}
exports.AnimationController = AnimationController;
