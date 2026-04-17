"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.History = exports.HistoryChangedEvent = exports.HistoryDelta = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
class HistoryDelta extends element_1.StoreDelta {
    /**
     * Apply the delta to the passed elements and appState, does not modify the snapshot.
     */
    applyTo(elements, appState, snapshot) {
        const [nextElements, elementsContainVisibleChange] = this.elements.applyTo(elements, 
        // used to fallback into local snapshot in case we couldn't apply the delta
        // due to a missing (force deleted) elements in the scene
        snapshot.elements, 
        // we don't want to apply the `version` and `versionNonce` properties for history
        // as we always need to end up with a new version due to collaboration,
        // approaching each undo / redo as a new user action
        {
            excludedProperties: new Set(["version", "versionNonce"]),
        });
        const [nextAppState, appStateContainsVisibleChange] = this.appState.applyTo(appState, nextElements);
        const appliedVisibleChanges = elementsContainVisibleChange || appStateContainsVisibleChange;
        return [nextElements, nextAppState, appliedVisibleChanges];
    }
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static calculate(prevSnapshot, nextSnapshot) {
        return super.calculate(prevSnapshot, nextSnapshot);
    }
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static inverse(delta) {
        return super.inverse(delta);
    }
    /**
     * Overriding once to avoid type casting everywhere.
     */
    static applyLatestChanges(delta, prevElements, nextElements, modifierOptions) {
        return super.applyLatestChanges(delta, prevElements, nextElements, modifierOptions);
    }
}
exports.HistoryDelta = HistoryDelta;
class HistoryChangedEvent {
    isUndoStackEmpty;
    isRedoStackEmpty;
    constructor(isUndoStackEmpty = true, isRedoStackEmpty = true) {
        this.isUndoStackEmpty = isUndoStackEmpty;
        this.isRedoStackEmpty = isRedoStackEmpty;
    }
}
exports.HistoryChangedEvent = HistoryChangedEvent;
class History {
    store;
    onHistoryChangedEmitter = new common_1.Emitter();
    undoStack = [];
    redoStack = [];
    get isUndoStackEmpty() {
        return this.undoStack.length === 0;
    }
    get isRedoStackEmpty() {
        return this.redoStack.length === 0;
    }
    constructor(store) {
        this.store = store;
    }
    clear() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }
    /**
     * Record a non-empty local durable increment, which will go into the undo stack..
     * Do not re-record history entries, which were already pushed to undo / redo stack, as part of history action.
     */
    record(delta) {
        if (delta.isEmpty() || delta instanceof HistoryDelta) {
            return;
        }
        // construct history entry, so once it's emitted, it's not recorded again
        const historyDelta = HistoryDelta.inverse(delta);
        this.undoStack.push(historyDelta);
        if (!historyDelta.elements.isEmpty()) {
            // don't reset redo stack on local appState changes,
            // as a simple click (unselect) could lead to losing all the redo entries
            // only reset on non empty elements changes!
            this.redoStack.length = 0;
        }
        this.onHistoryChangedEmitter.trigger(new HistoryChangedEvent(this.isUndoStackEmpty, this.isRedoStackEmpty));
    }
    undo(elements, appState) {
        return this.perform(elements, appState, () => History.pop(this.undoStack), (entry) => History.push(this.redoStack, entry));
    }
    redo(elements, appState) {
        return this.perform(elements, appState, () => History.pop(this.redoStack), (entry) => History.push(this.undoStack, entry));
    }
    perform(elements, appState, pop, push) {
        try {
            let historyDelta = pop();
            if (historyDelta === null) {
                return;
            }
            const action = element_1.CaptureUpdateAction.IMMEDIATELY;
            let prevSnapshot = this.store.snapshot;
            let nextElements = elements;
            let nextAppState = appState;
            let containsVisibleChange = false;
            // iterate through the history entries in case they result in no visible changes
            while (historyDelta) {
                try {
                    [nextElements, nextAppState, containsVisibleChange] =
                        historyDelta.applyTo(nextElements, nextAppState, prevSnapshot);
                    const prevElements = prevSnapshot.elements;
                    const nextSnapshot = prevSnapshot.maybeClone(action, nextElements, nextAppState);
                    const change = element_1.StoreChange.create(prevSnapshot, nextSnapshot);
                    const delta = HistoryDelta.applyLatestChanges(historyDelta, prevElements, nextElements);
                    if (!delta.isEmpty()) {
                        // schedule immediate capture, so that it's emitted for the sync purposes
                        this.store.scheduleMicroAction({
                            action,
                            change,
                            delta,
                        });
                        historyDelta = delta;
                    }
                    prevSnapshot = nextSnapshot;
                }
                finally {
                    push(historyDelta);
                }
                if (containsVisibleChange) {
                    break;
                }
                historyDelta = pop();
            }
            return [nextElements, nextAppState];
        }
        finally {
            // trigger the history change event before returning completely
            // also trigger it just once, no need doing so on each entry
            this.onHistoryChangedEmitter.trigger(new HistoryChangedEvent(this.isUndoStackEmpty, this.isRedoStackEmpty));
        }
    }
    static pop(stack) {
        if (!stack.length) {
            return null;
        }
        const entry = stack.pop();
        if (entry !== undefined) {
            return entry;
        }
        return null;
    }
    static push(stack, entry) {
        const inversedEntry = HistoryDelta.inverse(entry);
        return stack.push(inversedEntry);
    }
}
exports.History = History;
