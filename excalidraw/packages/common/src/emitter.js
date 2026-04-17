"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emitter = void 0;
class Emitter {
    subscribers = [];
    /**
     * Attaches subscriber
     *
     * @returns unsubscribe function
     */
    on(...handlers) {
        const _handlers = handlers
            .flat()
            .filter((item) => typeof item === "function");
        this.subscribers.push(..._handlers);
        return () => this.off(_handlers);
    }
    once(...handlers) {
        const _handlers = handlers
            .flat()
            .filter((item) => typeof item === "function");
        _handlers.push(() => detach());
        const detach = this.on(..._handlers);
        return detach;
    }
    off(...handlers) {
        const _handlers = handlers.flat();
        this.subscribers = this.subscribers.filter((handler) => !_handlers.includes(handler));
    }
    trigger(...payload) {
        for (const handler of this.subscribers) {
            handler(...payload);
        }
        return this;
    }
    clear() {
        this.subscribers = [];
    }
}
exports.Emitter = Emitter;
