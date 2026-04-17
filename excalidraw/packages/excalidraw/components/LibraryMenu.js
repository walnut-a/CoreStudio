"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryMenu = exports.isLibraryMenuOpenAtom = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const analytics_1 = require("../analytics");
const ui_appState_1 = require("../context/ui-appState");
const library_1 = require("../data/library");
const editor_jotai_1 = require("../editor-jotai");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const App_1 = require("./App");
const LibraryMenuControlButtons_1 = require("./LibraryMenuControlButtons");
const LibraryMenuItems_1 = __importDefault(require("./LibraryMenuItems"));
const Spinner_1 = __importDefault(require("./Spinner"));
require("./LibraryMenu.scss");
exports.isLibraryMenuOpenAtom = (0, editor_jotai_1.atom)(false);
const LibraryMenuWrapper = ({ children }) => {
    return (0, jsx_runtime_1.jsx)("div", { className: "layer-ui__library", children: children });
};
const LibraryMenuContent = (0, react_1.memo)(({ onInsertLibraryItems, pendingElements, onAddToLibrary, setAppState, libraryReturnUrl, library, id, theme, selectedItems, onSelectItems, }) => {
    const [libraryItemsData] = (0, editor_jotai_1.useAtom)(library_1.libraryItemsAtom);
    const _onAddToLibrary = (0, react_1.useCallback)((elements) => {
        const addToLibrary = async (processedElements, libraryItems) => {
            (0, analytics_1.trackEvent)("element", "addToLibrary", "ui");
            for (const type of common_1.LIBRARY_DISABLED_TYPES) {
                if (processedElements.some((element) => element.type === type)) {
                    return setAppState({
                        errorMessage: (0, i18n_1.t)(`errors.libraryElementTypeError.${type}`),
                    });
                }
            }
            const nextItems = [
                {
                    status: "unpublished",
                    elements: processedElements,
                    id: (0, common_1.randomId)(),
                    created: Date.now(),
                },
                ...libraryItems,
            ];
            onAddToLibrary();
            library.setLibrary(nextItems).catch(() => {
                setAppState({ errorMessage: (0, i18n_1.t)("alerts.errorAddingToLibrary") });
            });
        };
        addToLibrary(elements, libraryItemsData.libraryItems);
    }, [onAddToLibrary, library, setAppState, libraryItemsData.libraryItems]);
    const libraryItems = (0, react_1.useMemo)(() => libraryItemsData.libraryItems, [libraryItemsData]);
    if (libraryItemsData.status === "loading" &&
        !libraryItemsData.isInitialized) {
        return ((0, jsx_runtime_1.jsx)(LibraryMenuWrapper, { children: (0, jsx_runtime_1.jsx)("div", { className: "layer-ui__library-message", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Spinner_1.default, { size: "2em" }), (0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("labels.libraryLoadingMessage") })] }) }) }));
    }
    const showBtn = libraryItemsData.libraryItems.length > 0 || pendingElements.length > 0;
    return ((0, jsx_runtime_1.jsxs)(LibraryMenuWrapper, { children: [(0, jsx_runtime_1.jsx)(LibraryMenuItems_1.default, { isLoading: libraryItemsData.status === "loading", libraryItems: libraryItems, onAddToLibrary: _onAddToLibrary, onInsertLibraryItems: onInsertLibraryItems, pendingElements: pendingElements, id: id, libraryReturnUrl: libraryReturnUrl, theme: theme, onSelectItems: onSelectItems, selectedItems: selectedItems }), showBtn && ((0, jsx_runtime_1.jsx)(LibraryMenuControlButtons_1.LibraryMenuControlButtons, { className: "library-menu-control-buttons--at-bottom", style: { padding: "16px 12px 0 12px" }, id: id, libraryReturnUrl: libraryReturnUrl, theme: theme }))] }));
});
const getPendingElements = (elements, selectedElementIds) => ({
    elements,
    pending: (0, scene_1.getSelectedElements)(elements, { selectedElementIds }, {
        includeBoundTextElement: true,
        includeElementsInFrames: true,
    }),
    selectedElementIds,
});
const usePendingElementsMemo = (appState, app) => {
    const elements = (0, App_1.useExcalidrawElements)();
    const [state, setState] = (0, react_1.useState)(() => getPendingElements(elements, appState.selectedElementIds));
    const selectedElementVersions = (0, react_1.useRef)(new Map());
    (0, react_1.useEffect)(() => {
        for (const element of state.pending) {
            selectedElementVersions.current.set(element.id, element.version);
        }
    }, [state.pending]);
    (0, react_1.useEffect)(() => {
        if (
        // Only update once pointer is released.
        // Reading directly from app.state to make it clear it's not reactive
        // (hence, there's potential for stale state)
        app.state.cursorButton === "up" &&
            app.state.activeTool.type === "selection") {
            setState((prev) => {
                // if selectedElementIds changed, we don't have to compare versions
                // ---------------------------------------------------------------------
                if (!(0, common_1.isShallowEqual)(prev.selectedElementIds, appState.selectedElementIds)) {
                    selectedElementVersions.current.clear();
                    return getPendingElements(elements, appState.selectedElementIds);
                }
                // otherwise we need to check whether selected elements changed
                // ---------------------------------------------------------------------
                const elementsMap = app.scene.getNonDeletedElementsMap();
                for (const id of Object.keys(appState.selectedElementIds)) {
                    const currVersion = elementsMap.get(id)?.version;
                    if (currVersion &&
                        currVersion !== selectedElementVersions.current.get(id)) {
                        // we can't update the selectedElementVersions in here
                        // because of double render in StrictMode which would overwrite
                        // the state in the second pass with the old `prev` state.
                        // Thus, we update versions in a separate effect. May create
                        // a race condition since current effect is not fully reactive.
                        return getPendingElements(elements, appState.selectedElementIds);
                    }
                }
                // nothing changed
                // ---------------------------------------------------------------------
                return prev;
            });
        }
    }, [
        app,
        app.state.cursorButton,
        app.state.activeTool.type,
        appState.selectedElementIds,
        elements,
    ]);
    return state.pending;
};
/**
 * This component is meant to be rendered inside <Sidebar.Tab/> inside our
 * <DefaultSidebar/> or host apps Sidebar components.
 */
exports.LibraryMenu = (0, react_1.memo)(() => {
    const app = (0, App_1.useApp)();
    const { onInsertElements } = app;
    const appProps = (0, App_1.useAppProps)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const [selectedItems, setSelectedItems] = (0, react_1.useState)([]);
    const memoizedLibrary = (0, react_1.useMemo)(() => app.library, [app.library]);
    const pendingElements = usePendingElementsMemo(appState, app);
    (0, react_1.useEffect)(() => {
        return (0, common_1.addEventListener)(document, common_1.EVENT.KEYDOWN, (event) => {
            if (event.key === common_1.KEYS.ESCAPE && event.target instanceof HTMLElement) {
                const target = event.target;
                if (target.closest(`.${common_1.CLASSES.SIDEBAR}`)) {
                    // stop propagation so that we don't prevent it downstream
                    // (default browser behavior is to clear search input on ESC)
                    if (selectedItems.length > 0) {
                        event.stopPropagation();
                        setSelectedItems([]);
                    }
                    else if ((0, common_1.isWritableElement)(target) &&
                        target instanceof HTMLInputElement &&
                        !target.value) {
                        event.stopPropagation();
                        // if search input empty -> close library
                        // (maybe not a good idea?)
                        setAppState({ openSidebar: null });
                        app.focusContainer();
                    }
                }
                else if (selectedItems.length > 0) {
                    const { x, y } = app.lastViewportPosition;
                    const elementUnderCursor = document.elementFromPoint(x, y);
                    // also deselect elements if sidebar doesn't have focus but the
                    // cursor is over it
                    if (elementUnderCursor?.closest(`.${common_1.CLASSES.SIDEBAR}`)) {
                        event.stopPropagation();
                        setSelectedItems([]);
                    }
                }
            }
        }, { capture: true });
    }, [selectedItems, setAppState, app]);
    const onInsertLibraryItems = (0, react_1.useCallback)((libraryItems) => {
        onInsertElements((0, library_1.distributeLibraryItemsOnSquareGrid)(libraryItems));
        app.focusContainer();
    }, [onInsertElements, app]);
    const deselectItems = (0, react_1.useCallback)(() => {
        setAppState({
            selectedElementIds: {},
            selectedGroupIds: {},
            activeEmbeddable: null,
        });
    }, [setAppState]);
    return ((0, jsx_runtime_1.jsx)(LibraryMenuContent, { pendingElements: pendingElements, onInsertLibraryItems: onInsertLibraryItems, onAddToLibrary: deselectItems, setAppState: setAppState, libraryReturnUrl: appProps.libraryReturnUrl, library: memoizedLibrary, id: app.id, theme: appState.theme, selectedItems: selectedItems, onSelectItems: setSelectedItems }));
});
