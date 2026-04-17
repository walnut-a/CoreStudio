"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionedSnapshotStore = void 0;
class VersionedSnapshotStore {
    isEqual;
    version = 0;
    value;
    waiters = new Set();
    subscribers = new Set();
    constructor(initialValue, isEqual = Object.is) {
        this.isEqual = isEqual;
        this.value = initialValue;
    }
    getSnapshot() {
        return { version: this.version, value: this.value };
    }
    set(nextValue) {
        if (this.isEqual(this.value, nextValue)) {
            return false;
        }
        this.value = nextValue;
        this.version += 1;
        const snapshot = this.getSnapshot();
        for (const subscriber of this.subscribers) {
            subscriber(snapshot);
        }
        for (const waiter of this.waiters) {
            waiter(snapshot);
        }
        this.waiters.clear();
        return true;
    }
    update(updater) {
        return this.set(updater(this.value));
    }
    subscribe(subscriber) {
        this.subscribers.add(subscriber);
        return () => {
            this.subscribers.delete(subscriber);
        };
    }
    pull(sinceVersion = -1) {
        if (this.version !== sinceVersion) {
            return Promise.resolve(this.getSnapshot());
        }
        return new Promise((resolve) => {
            this.waiters.add(resolve);
        });
    }
}
exports.VersionedSnapshotStore = VersionedSnapshotStore;
