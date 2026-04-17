"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppStateObserver = void 0;
class AppStateObserver {
    getState;
    listeners = [];
    constructor(getState) {
        this.getState = getState;
    }
    isStateChangePredicateOptions(propOrOpts) {
        return (typeof propOrOpts === "object" &&
            !Array.isArray(propOrOpts) &&
            "predicate" in propOrOpts);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((existingListener) => existingListener !== listener);
        };
    }
    normalize(propOrOpts, callback, opts) {
        let predicate;
        let getValue;
        let normalizedCallback = callback;
        let once = opts?.once ?? false;
        let matchesImmediately = false;
        if (this.isStateChangePredicateOptions(propOrOpts)) {
            const { predicate: predicateFn, callback: callbackFromOpts, once: onceFromOpts, } = propOrOpts;
            predicate = predicateFn;
            getValue = (appState) => appState;
            normalizedCallback = callbackFromOpts
                ? (_value, appState) => callbackFromOpts(appState)
                : undefined;
            once = onceFromOpts ?? false;
            matchesImmediately = predicateFn(this.getState());
        }
        else if (typeof propOrOpts === "function") {
            const selector = propOrOpts;
            predicate = (appState, prevState) => selector(appState) !== selector(prevState);
            getValue = (appState) => selector(appState);
        }
        else if (Array.isArray(propOrOpts)) {
            const keys = propOrOpts;
            predicate = (appState, prevState) => keys.some((key) => appState[key] !== prevState[key]);
            getValue = (appState) => appState;
        }
        else {
            const key = propOrOpts;
            predicate = (appState, prevState) => appState[key] !== prevState[key];
            getValue = (appState) => appState[key];
        }
        return {
            predicate,
            getValue,
            callback: normalizedCallback,
            once,
            matchesImmediately,
        };
    }
    onStateChange = ((propOrOpts, callback, opts) => {
        const { predicate, getValue, callback: stateChangeCallback, once, matchesImmediately, } = this.normalize(propOrOpts, callback, opts);
        if (stateChangeCallback) {
            if (matchesImmediately) {
                queueMicrotask(() => {
                    const state = this.getState();
                    stateChangeCallback(getValue(state), state);
                });
                if (once) {
                    return () => { };
                }
            }
            return this.subscribe({
                predicate,
                getValue,
                callback: stateChangeCallback,
                once,
            });
        }
        if (matchesImmediately) {
            return Promise.resolve(getValue(this.getState()));
        }
        return new Promise((resolve) => {
            this.subscribe({
                predicate,
                getValue,
                callback: (value) => resolve(value),
                once: true,
            });
        });
    });
    flush(prevState) {
        if (!this.listeners.length) {
            return;
        }
        const state = this.getState();
        const listenersToKeep = [];
        for (const listener of this.listeners) {
            if (listener.predicate(state, prevState)) {
                listener.callback(listener.getValue(state), state);
                if (!listener.once) {
                    listenersToKeep.push(listener);
                }
            }
            else {
                listenersToKeep.push(listener);
            }
        }
        this.listeners = listenersToKeep;
    }
    clear() {
        this.listeners = [];
    }
}
exports.AppStateObserver = AppStateObserver;
