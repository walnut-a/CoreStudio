"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppEventBus = void 0;
const emitter_1 = require("./emitter");
const utils_1 = require("./utils");
class AppEventBus {
    behavior;
    emitters = new Map();
    lastPayload = new Map();
    emittedOnce = new Set();
    constructor(behavior) {
        this.behavior = behavior;
    }
    getEmitter(name) {
        let emitter = this.emitters.get(name);
        if (!emitter) {
            emitter = new emitter_1.Emitter();
            this.emitters.set(name, emitter);
        }
        return emitter;
    }
    toPromiseValue(args) {
        return (args.length === 1 ? args[0] : args);
    }
    on(name, callback) {
        const eventBehavior = this.behavior[name];
        const cachedPayload = this.lastPayload.get(name);
        if (callback) {
            if (eventBehavior.replay === "last" && cachedPayload) {
                queueMicrotask(() => callback(...cachedPayload));
                if (eventBehavior.cardinality === "once") {
                    return () => { };
                }
            }
            return this.getEmitter(name).on(callback);
        }
        if (eventBehavior.cardinality !== "once" ||
            eventBehavior.replay !== "last") {
            throw new Error(`Event "${String(name)}" requires a callback`);
        }
        if (cachedPayload) {
            return Promise.resolve(this.toPromiseValue(cachedPayload));
        }
        return new Promise((resolve) => {
            this.getEmitter(name).once((...args) => {
                resolve(this.toPromiseValue(args));
            });
        });
    }
    emit(name, ...args) {
        const eventBehavior = this.behavior[name];
        if (!(0, utils_1.isProdEnv)()) {
            if (eventBehavior.cardinality === "once") {
                if (this.emittedOnce.has(name)) {
                    throw new Error(`Event "${String(name)}" can only be emitted once`);
                }
                this.emittedOnce.add(name);
            }
        }
        if (eventBehavior.replay === "last") {
            this.lastPayload.set(name, args);
        }
        try {
            this.getEmitter(name).trigger(...args);
        }
        finally {
            if (eventBehavior.cardinality === "once") {
                this.getEmitter(name).clear();
            }
        }
    }
    clear() {
        this.lastPayload.clear();
        this.emittedOnce.clear();
        for (const emitter of this.emitters.values()) {
            emitter.clear();
        }
        this.emitters.clear();
    }
}
exports.AppEventBus = AppEventBus;
