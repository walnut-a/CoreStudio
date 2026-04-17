"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObservedAppState = exports.StoreSnapshot = exports.StoreDelta = exports.EphemeralIncrement = exports.DurableIncrement = exports.StoreIncrement = exports.StoreChange = exports.Store = exports.CaptureUpdateAction = void 0;
const common_1 = require("@excalidraw/common");
const duplicate_1 = require("./duplicate");
const mutateElement_1 = require("./mutateElement");
const delta_1 = require("./delta");
const index_1 = require("./index");
exports.CaptureUpdateAction = {
    /**
     * Immediately undoable.
     *
     * Use for updates which should be captured.
     * Should be used for most of the local updates, except ephemerals such as dragging or resizing.
     *
     * These updates will _immediately_ make it to the local undo / redo stacks.
     */
    IMMEDIATELY: "IMMEDIATELY",
    /**
     * Never undoable.
     *
     * Use for updates which should never be recorded, such as remote updates
     * or scene initialization.
     *
     * These updates will _never_ make it to the local undo / redo stacks.
     */
    NEVER: "NEVER",
    /**
     * Eventually undoable.
     *
     * Use for updates which should not be captured immediately - likely
     * exceptions which are part of some async multi-step process. Otherwise, all
     * such updates would end up being captured with the next
     * `CaptureUpdateAction.IMMEDIATELY` - triggered either by the next `updateScene`
     * or internally by the editor.
     *
     * These updates will _eventually_ make it to the local undo / redo stacks.
     */
    EVENTUALLY: "EVENTUALLY",
};
/**
 * Store which captures the observed changes and emits them as `StoreIncrement` events.
 */
class Store {
    app;
    // for internal use by history
    onDurableIncrementEmitter = new common_1.Emitter();
    // for public use as part of onIncrement API
    onStoreIncrementEmitter = new common_1.Emitter();
    scheduledMacroActions = new Set();
    scheduledMicroActions = [];
    _snapshot = StoreSnapshot.empty();
    get snapshot() {
        return this._snapshot;
    }
    set snapshot(snapshot) {
        this._snapshot = snapshot;
    }
    constructor(app) {
        this.app = app;
    }
    scheduleAction(action) {
        this.scheduledMacroActions.add(action);
        this.satisfiesScheduledActionsInvariant();
    }
    /**
     * Use to schedule a delta calculation, which will consquentially be emitted as `DurableStoreIncrement` and pushed in the undo stack.
     */
    // TODO: Suspicious that this is called so many places. Seems error-prone.
    scheduleCapture() {
        this.scheduleAction(exports.CaptureUpdateAction.IMMEDIATELY);
    }
    /**
     * Schedule special "micro" actions, to-be executed before the next commit, before it executes a scheduled "macro" action.
     */
    scheduleMicroAction(params) {
        const { action } = params;
        let change;
        if ("change" in params) {
            change = params.change;
        }
        else {
            // immediately create an immutable change of the scheduled updates,
            // compared to the current state, so that they won't mutate later on during batching
            // also, we have to compare against the current state,
            // as comparing against the snapshot might include yet uncomitted changes (i.e. async freedraw / text / image, etc.)
            const currentSnapshot = StoreSnapshot.create(this.app.scene.getElementsMapIncludingDeleted(), this.app.state);
            const scheduledSnapshot = currentSnapshot.maybeClone(action, 
            // let's sync invalid indices first, so that we could detect this change
            // also have the synced elements immutable, so that we don't mutate elements,
            // that are already in the scene, otherwise we wouldn't see any change
            params.elements
                ? (0, index_1.syncInvalidIndicesImmutable)(params.elements)
                : undefined, params.appState);
            change = StoreChange.create(currentSnapshot, scheduledSnapshot);
        }
        const delta = "delta" in params ? params.delta : undefined;
        this.scheduledMicroActions.push(() => this.processAction({
            action,
            change,
            delta,
        }));
    }
    /**
     * Performs the incoming `CaptureUpdateAction` and emits the corresponding `StoreIncrement`.
     * Emits `DurableStoreIncrement` when action is "capture", emits `EphemeralStoreIncrement` otherwise.
     *
     * @emits StoreIncrement
     */
    commit(elements, appState) {
        // execute all scheduled micro actions first
        // similar to microTasks, there can be many
        this.flushMicroActions();
        try {
            // execute a single scheduled "macro" function
            // similar to macro tasks, there can be only one within a single commit (loop)
            const action = this.getScheduledMacroAction();
            this.processAction({ action, elements, appState });
        }
        finally {
            this.satisfiesScheduledActionsInvariant();
            // defensively reset all scheduled "macro" actions, possibly cleans up other runtime garbage
            this.scheduledMacroActions = new Set();
        }
    }
    /**
     * Clears the store instance.
     */
    clear() {
        this.snapshot = StoreSnapshot.empty();
        this.scheduledMacroActions = new Set();
    }
    /**
     * Performs delta & change calculation and emits a durable increment.
     *
     * @emits StoreIncrement.
     */
    emitDurableIncrement(snapshot, change = undefined, delta = undefined) {
        const prevSnapshot = this.snapshot;
        let storeChange;
        let storeDelta;
        if (change) {
            storeChange = change;
        }
        else {
            storeChange = StoreChange.create(prevSnapshot, snapshot);
        }
        if (delta) {
            // we might have the delta already (i.e. when applying history entry), thus we don't need to calculate it again
            // using the same instance, since in history we have a check against `HistoryEntry`, so that we don't re-record the same delta again
            storeDelta = delta;
        }
        else {
            storeDelta = StoreDelta.calculate(prevSnapshot, snapshot);
        }
        if (!storeDelta.isEmpty()) {
            const increment = new DurableIncrement(storeChange, storeDelta);
            this.onDurableIncrementEmitter.trigger(increment);
            this.onStoreIncrementEmitter.trigger(increment);
        }
    }
    /**
     * Performs change calculation and emits an ephemeral increment.
     *
     * @emits EphemeralStoreIncrement
     */
    emitEphemeralIncrement(snapshot, change = undefined) {
        let storeChange;
        if (change) {
            storeChange = change;
        }
        else {
            const prevSnapshot = this.snapshot;
            storeChange = StoreChange.create(prevSnapshot, snapshot);
        }
        const increment = new EphemeralIncrement(storeChange);
        // Notify listeners with the increment
        this.onStoreIncrementEmitter.trigger(increment);
    }
    applyChangeToSnapshot(change) {
        const prevSnapshot = this.snapshot;
        const nextSnapshot = this.snapshot.applyChange(change);
        if (prevSnapshot === nextSnapshot) {
            return null;
        }
        return nextSnapshot;
    }
    /**
     * Clones the snapshot if there are changes detected.
     */
    maybeCloneSnapshot(action, elements, appState) {
        if (!elements && !appState) {
            return null;
        }
        const prevSnapshot = this.snapshot;
        const nextSnapshot = this.snapshot.maybeClone(action, elements, appState);
        if (prevSnapshot === nextSnapshot) {
            return null;
        }
        return nextSnapshot;
    }
    flushMicroActions() {
        for (const microAction of this.scheduledMicroActions) {
            try {
                microAction();
            }
            catch (error) {
                console.error(`Failed to execute scheduled micro action`, error);
            }
        }
        this.scheduledMicroActions = [];
    }
    processAction(params) {
        const { action } = params;
        // perf. optimisation, since "EVENTUALLY" does not update the snapshot,
        // so if nobody is listening for increments, we don't need to even clone the snapshot
        // as it's only needed for `StoreChange` computation inside `EphemeralIncrement`
        if (action === exports.CaptureUpdateAction.EVENTUALLY &&
            !this.onStoreIncrementEmitter.subscribers.length) {
            return;
        }
        let nextSnapshot;
        if ("change" in params) {
            nextSnapshot = this.applyChangeToSnapshot(params.change);
        }
        else {
            nextSnapshot = this.maybeCloneSnapshot(action, params.elements, params.appState);
        }
        if (!nextSnapshot) {
            // don't continue if there is not change detected
            return;
        }
        const change = "change" in params ? params.change : undefined;
        const delta = "delta" in params ? params.delta : undefined;
        try {
            switch (action) {
                // only immediately emits a durable increment
                case exports.CaptureUpdateAction.IMMEDIATELY:
                    this.emitDurableIncrement(nextSnapshot, change, delta);
                    break;
                // both never and eventually emit an ephemeral increment
                case exports.CaptureUpdateAction.NEVER:
                case exports.CaptureUpdateAction.EVENTUALLY:
                    this.emitEphemeralIncrement(nextSnapshot, change);
                    break;
                default:
                    (0, common_1.assertNever)(action, `Unknown store action`);
            }
        }
        finally {
            // update the snapshot no-matter what, as it would mess up with the next action
            switch (action) {
                // both immediately and never update the snapshot, unlike eventually
                case exports.CaptureUpdateAction.IMMEDIATELY:
                case exports.CaptureUpdateAction.NEVER:
                    this.snapshot = nextSnapshot;
                    break;
            }
        }
    }
    /**
     * Returns the scheduled macro action.
     */
    getScheduledMacroAction() {
        let scheduledAction;
        if (this.scheduledMacroActions.has(exports.CaptureUpdateAction.IMMEDIATELY)) {
            // Capture has a precedence over update, since it also performs snapshot update
            scheduledAction = exports.CaptureUpdateAction.IMMEDIATELY;
        }
        else if (this.scheduledMacroActions.has(exports.CaptureUpdateAction.NEVER)) {
            // Update has a precedence over none, since it also emits an (ephemeral) increment
            scheduledAction = exports.CaptureUpdateAction.NEVER;
        }
        else {
            // Default is to emit ephemeral increment and don't update the snapshot
            scheduledAction = exports.CaptureUpdateAction.EVENTUALLY;
        }
        return scheduledAction;
    }
    /**
     * Ensures that the scheduled actions invariant is satisfied.
     */
    satisfiesScheduledActionsInvariant() {
        if (!(this.scheduledMacroActions.size >= 0 &&
            this.scheduledMacroActions.size <=
                Object.keys(exports.CaptureUpdateAction).length)) {
            const message = `There can be at most three store actions scheduled at the same time, but there are "${this.scheduledMacroActions.size}".`;
            console.error(message, this.scheduledMacroActions.values());
            if ((0, common_1.isTestEnv)() || (0, common_1.isDevEnv)()) {
                throw new Error(message);
            }
        }
    }
}
exports.Store = Store;
/**
 * Repsents a change to the store containing changed elements and appState.
 */
class StoreChange {
    elements;
    appState;
    // so figuring out what has changed should ideally be just quick reference checks
    // TODO: we might need to have binary files here as well, in order to be drop-in replacement for `onChange`
    constructor(elements, appState) {
        this.elements = elements;
        this.appState = appState;
    }
    static create(prevSnapshot, nextSnapshot) {
        const changedElements = nextSnapshot.getChangedElements(prevSnapshot);
        const changedAppState = nextSnapshot.getChangedAppState(prevSnapshot);
        return new StoreChange(changedElements, changedAppState);
    }
}
exports.StoreChange = StoreChange;
/**
 * Encpasulates any change to the store (durable or ephemeral).
 */
class StoreIncrement {
    type;
    change;
    constructor(type, change) {
        this.type = type;
        this.change = change;
    }
    static isDurable(increment) {
        return increment.type === "durable";
    }
    static isEphemeral(increment) {
        return increment.type === "ephemeral";
    }
}
exports.StoreIncrement = StoreIncrement;
/**
 * Represents a durable change to the store.
 */
class DurableIncrement extends StoreIncrement {
    change;
    delta;
    constructor(change, delta) {
        super("durable", change);
        this.change = change;
        this.delta = delta;
    }
}
exports.DurableIncrement = DurableIncrement;
/**
 * Represents an ephemeral change to the store.
 */
class EphemeralIncrement extends StoreIncrement {
    change;
    constructor(change) {
        super("ephemeral", change);
        this.change = change;
    }
}
exports.EphemeralIncrement = EphemeralIncrement;
/**
 * Represents a captured delta by the Store.
 */
class StoreDelta {
    id;
    elements;
    appState;
    constructor(id, elements, appState) {
        this.id = id;
        this.elements = elements;
        this.appState = appState;
    }
    /**
     * Create a new instance of `StoreDelta`.
     */
    static create(elements, appState, opts = {
        id: (0, common_1.randomId)(),
    }) {
        return new this(opts.id, elements, appState);
    }
    /**
     * Calculate the delta between the previous and next snapshot.
     */
    static calculate(prevSnapshot, nextSnapshot) {
        const elementsDelta = nextSnapshot.metadata.didElementsChange
            ? delta_1.ElementsDelta.calculate(prevSnapshot.elements, nextSnapshot.elements)
            : delta_1.ElementsDelta.empty();
        const appStateDelta = nextSnapshot.metadata.didAppStateChange
            ? delta_1.AppStateDelta.calculate(prevSnapshot.appState, nextSnapshot.appState)
            : delta_1.AppStateDelta.empty();
        return this.create(elementsDelta, appStateDelta);
    }
    /**
     * Restore a store delta instance from a DTO.
     */
    static restore(storeDeltaDTO) {
        const { id, elements, appState } = storeDeltaDTO;
        return new this(id, delta_1.ElementsDelta.restore(elements), delta_1.AppStateDelta.restore(appState));
    }
    /**
     * Parse and load the delta from the remote payload.
     */
    static load({ id, elements: { added, removed, updated }, appState: { delta: appStateDelta }, }) {
        const elements = delta_1.ElementsDelta.create(added, removed, updated);
        const appState = delta_1.AppStateDelta.create(appStateDelta);
        return new this(id, elements, appState);
    }
    /**
     * Squash the passed deltas into the aggregated delta instance.
     */
    static squash(...deltas) {
        const aggregatedDelta = StoreDelta.empty();
        for (const delta of deltas) {
            aggregatedDelta.elements.squash(delta.elements);
            aggregatedDelta.appState.squash(delta.appState);
        }
        return aggregatedDelta;
    }
    /**
     * Inverse store delta, creates new instance of `StoreDelta`.
     */
    static inverse(delta) {
        return this.create(delta.elements.inverse(), delta.appState.inverse());
    }
    /**
     * Apply the delta to the passed elements and appState, does not modify the snapshot.
     */
    static applyTo(delta, elements, appState, options) {
        const [nextElements, elementsContainVisibleChange] = delta.elements.applyTo(elements, StoreSnapshot.empty().elements, options);
        const [nextAppState, appStateContainsVisibleChange] = delta.appState.applyTo(appState, nextElements);
        const appliedVisibleChanges = elementsContainVisibleChange || appStateContainsVisibleChange;
        return [nextElements, nextAppState, appliedVisibleChanges];
    }
    /**
     * Apply latest (remote) changes to the delta, creates new instance of `StoreDelta`.
     */
    static applyLatestChanges(delta, prevElements, nextElements, modifierOptions) {
        return this.create(delta.elements.applyLatestChanges(prevElements, nextElements, modifierOptions), delta.appState, {
            id: delta.id,
        });
    }
    static empty() {
        return StoreDelta.create(delta_1.ElementsDelta.empty(), delta_1.AppStateDelta.empty());
    }
    isEmpty() {
        return this.elements.isEmpty() && this.appState.isEmpty();
    }
}
exports.StoreDelta = StoreDelta;
/**
 * Represents a snapshot of the captured or updated changes in the store,
 * used for producing deltas and emitting `DurableStoreIncrement`s.
 */
class StoreSnapshot {
    elements;
    appState;
    metadata;
    _lastChangedElementsHash = 0;
    _lastChangedAppStateHash = 0;
    constructor(elements, appState, metadata = {
        didElementsChange: false,
        didAppStateChange: false,
        isEmpty: false,
    }) {
        this.elements = elements;
        this.appState = appState;
        this.metadata = metadata;
    }
    static create(elements, appState, metadata = {
        didElementsChange: false,
        didAppStateChange: false,
    }) {
        return new StoreSnapshot(elements, isObservedAppState(appState) ? appState : (0, exports.getObservedAppState)(appState), metadata);
    }
    static empty() {
        return new StoreSnapshot(new Map(), getDefaultObservedAppState(), {
            didElementsChange: false,
            didAppStateChange: false,
            isEmpty: true,
        });
    }
    getChangedElements(prevSnapshot) {
        const changedElements = {};
        for (const prevElement of (0, common_1.toIterable)(prevSnapshot.elements)) {
            const nextElement = this.elements.get(prevElement.id);
            if (!nextElement) {
                changedElements[prevElement.id] = (0, mutateElement_1.newElementWith)(prevElement, {
                    isDeleted: true,
                });
            }
        }
        for (const nextElement of (0, common_1.toIterable)(this.elements)) {
            // Due to the structural clone inside `maybeClone`, we can perform just these reference checks
            if (prevSnapshot.elements.get(nextElement.id) !== nextElement) {
                changedElements[nextElement.id] = nextElement;
            }
        }
        return changedElements;
    }
    getChangedAppState(prevSnapshot) {
        return delta_1.Delta.getRightDifferences(prevSnapshot.appState, this.appState).reduce((acc, key) => Object.assign(acc, {
            [key]: this.appState[key],
        }), {});
    }
    isEmpty() {
        return this.metadata.isEmpty;
    }
    /**
     * Apply the change and return a new snapshot instance.
     */
    applyChange(change) {
        const nextElements = new Map(this.elements);
        for (const [id, changedElement] of Object.entries(change.elements)) {
            nextElements.set(id, changedElement);
        }
        const nextAppState = (0, exports.getObservedAppState)({
            ...this.appState,
            ...change.appState,
        });
        return StoreSnapshot.create(nextElements, nextAppState, {
            // by default we assume that change is different from what we have in the snapshot
            // so that we trigger the delta calculation and if it isn't different, delta will be empty
            didElementsChange: Object.keys(change.elements).length > 0,
            didAppStateChange: Object.keys(change.appState).length > 0,
        });
    }
    /**
     * Efficiently clone the existing snapshot, only if we detected changes.
     *
     * @returns same instance if there are no changes detected, new instance otherwise.
     */
    maybeClone(action, elements, appState) {
        const options = {
            shouldCompareHashes: false,
        };
        if (action === exports.CaptureUpdateAction.EVENTUALLY) {
            // actions that do not update the snapshot immediately, must be additionally checked for changes against the latest hash
            // as we are always comparing against the latest snapshot, so they would emit elements or appState as changed on every component update
            // instead of just the first time the elements or appState actually changed
            options.shouldCompareHashes = true;
        }
        const nextElementsSnapshot = this.maybeCreateElementsSnapshot(elements, options);
        const nextAppStateSnapshot = this.maybeCreateAppStateSnapshot(appState, options);
        let didElementsChange = false;
        let didAppStateChange = false;
        if (this.elements !== nextElementsSnapshot) {
            didElementsChange = true;
        }
        if (this.appState !== nextAppStateSnapshot) {
            didAppStateChange = true;
        }
        if (!didElementsChange && !didAppStateChange) {
            return this;
        }
        const snapshot = new StoreSnapshot(nextElementsSnapshot, nextAppStateSnapshot, {
            didElementsChange,
            didAppStateChange,
        });
        return snapshot;
    }
    maybeCreateAppStateSnapshot(appState, options = {
        shouldCompareHashes: false,
    }) {
        if (!appState) {
            return this.appState;
        }
        // Not watching over everything from the app state, just the relevant props
        const nextAppStateSnapshot = !isObservedAppState(appState)
            ? (0, exports.getObservedAppState)(appState)
            : appState;
        const didAppStateChange = this.detectChangedAppState(nextAppStateSnapshot, options);
        if (!didAppStateChange) {
            return this.appState;
        }
        return nextAppStateSnapshot;
    }
    maybeCreateElementsSnapshot(elements, options = {
        shouldCompareHashes: false,
    }) {
        if (!elements) {
            return this.elements;
        }
        const changedElements = this.detectChangedElements(elements, options);
        if (!changedElements?.size) {
            return this.elements;
        }
        const elementsSnapshot = this.createElementsSnapshot(changedElements);
        return elementsSnapshot;
    }
    detectChangedAppState(nextObservedAppState, options = {
        shouldCompareHashes: false,
    }) {
        if (this.appState === nextObservedAppState) {
            return;
        }
        const didAppStateChange = delta_1.Delta.isRightDifferent(this.appState, nextObservedAppState);
        if (!didAppStateChange) {
            return;
        }
        const changedAppStateHash = (0, index_1.hashString)(JSON.stringify(nextObservedAppState));
        if (options.shouldCompareHashes &&
            this._lastChangedAppStateHash === changedAppStateHash) {
            return;
        }
        this._lastChangedAppStateHash = changedAppStateHash;
        return didAppStateChange;
    }
    /**
     * Detect if there are any changed elements.
     */
    detectChangedElements(nextElements, options = {
        shouldCompareHashes: false,
    }) {
        if (this.elements === nextElements) {
            return;
        }
        const changedElements = new Map();
        for (const prevElement of (0, common_1.toIterable)(this.elements)) {
            const nextElement = nextElements.get(prevElement.id);
            if (!nextElement) {
                // element was deleted
                changedElements.set(prevElement.id, (0, mutateElement_1.newElementWith)(prevElement, { isDeleted: true }));
            }
        }
        for (const nextElement of (0, common_1.toIterable)(nextElements)) {
            const prevElement = this.elements.get(nextElement.id);
            if (!prevElement || // element was added
                prevElement.version < nextElement.version // element was updated
            ) {
                if ((0, index_1.isImageElement)(nextElement) &&
                    !(0, index_1.isInitializedImageElement)(nextElement)) {
                    // ignore any updates on uninitialized image elements
                    continue;
                }
                changedElements.set(nextElement.id, nextElement);
            }
        }
        if (!changedElements.size) {
            return;
        }
        const changedElementsHash = (0, index_1.hashElementsVersion)(changedElements);
        if (options.shouldCompareHashes &&
            this._lastChangedElementsHash === changedElementsHash) {
            return;
        }
        this._lastChangedElementsHash = changedElementsHash;
        return changedElements;
    }
    /**
     * Perform structural clone, deep cloning only elements that changed.
     */
    createElementsSnapshot(changedElements) {
        const clonedElements = new Map();
        for (const prevElement of (0, common_1.toIterable)(this.elements)) {
            // Clone previous elements, never delete, in case nextElements would be just a subset of previous elements
            // i.e. during collab, persist or whenenever isDeleted elements get cleared
            clonedElements.set(prevElement.id, prevElement);
        }
        for (const changedElement of (0, common_1.toIterable)(changedElements)) {
            // TODO: consider just creating new instance, once we can ensure that all reference properties on every element are immutable
            // TODO: consider creating a lazy deep clone, having a one-time-usage proxy over the snapshotted element and deep cloning only if it gets mutated
            clonedElements.set(changedElement.id, (0, duplicate_1.deepCopyElement)(changedElement));
        }
        return clonedElements;
    }
}
exports.StoreSnapshot = StoreSnapshot;
// hidden non-enumerable property for runtime checks
const hiddenObservedAppStateProp = "__observedAppState";
const getDefaultObservedAppState = () => {
    return {
        name: null,
        editingGroupId: null,
        viewBackgroundColor: common_1.COLOR_PALETTE.white,
        selectedElementIds: {},
        selectedGroupIds: {},
        selectedLinearElement: null,
        croppingElementId: null,
        activeLockedId: null,
        lockedMultiSelections: {},
    };
};
const getObservedAppState = (appState) => {
    const observedAppState = {
        name: appState.name,
        editingGroupId: appState.editingGroupId,
        viewBackgroundColor: appState.viewBackgroundColor,
        selectedElementIds: appState.selectedElementIds,
        selectedGroupIds: appState.selectedGroupIds,
        croppingElementId: appState.croppingElementId,
        activeLockedId: appState.activeLockedId,
        lockedMultiSelections: appState.lockedMultiSelections,
        selectedLinearElement: appState.selectedLinearElement
            ? {
                elementId: appState.selectedLinearElement.elementId,
                isEditing: !!appState.selectedLinearElement.isEditing,
            }
            : null,
    };
    Reflect.defineProperty(observedAppState, hiddenObservedAppStateProp, {
        value: true,
        enumerable: false,
    });
    return observedAppState;
};
exports.getObservedAppState = getObservedAppState;
const isObservedAppState = (appState) => !!Reflect.get(appState, hiddenObservedAppStateProp);
