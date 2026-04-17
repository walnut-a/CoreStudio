"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationFrameHandler = void 0;
class AnimationFrameHandler {
    targets = new WeakMap();
    rafIds = new WeakMap();
    register(key, callback) {
        this.targets.set(key, { callback, stopped: true });
    }
    start(key) {
        const target = this.targets.get(key);
        if (!target) {
            return;
        }
        if (this.rafIds.has(key)) {
            return;
        }
        this.targets.set(key, { ...target, stopped: false });
        this.scheduleFrame(key);
    }
    stop(key) {
        const target = this.targets.get(key);
        if (target && !target.stopped) {
            this.targets.set(key, { ...target, stopped: true });
        }
        this.cancelFrame(key);
    }
    constructFrame(key) {
        return (timestamp) => {
            const target = this.targets.get(key);
            if (!target) {
                return;
            }
            const shouldAbort = this.onFrame(target, timestamp);
            if (!target.stopped && !shouldAbort) {
                this.scheduleFrame(key);
            }
            else {
                this.cancelFrame(key);
            }
        };
    }
    scheduleFrame(key) {
        const rafId = requestAnimationFrame(this.constructFrame(key));
        this.rafIds.set(key, rafId);
    }
    cancelFrame(key) {
        if (this.rafIds.has(key)) {
            const rafId = this.rafIds.get(key);
            cancelAnimationFrame(rafId);
        }
        this.rafIds.delete(key);
    }
    onFrame(target, timestamp) {
        const shouldAbort = target.callback(timestamp);
        return shouldAbort ?? false;
    }
}
exports.AnimationFrameHandler = AnimationFrameHandler;
