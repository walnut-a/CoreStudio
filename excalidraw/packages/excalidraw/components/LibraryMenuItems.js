"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LibraryMenuItems;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const clsx_1 = __importDefault(require("clsx"));
const deburr_1 = require("../deburr");
const useLibraryItemSvg_1 = require("../hooks/useLibraryItemSvg");
const useScrollPosition_1 = require("../hooks/useScrollPosition");
const i18n_1 = require("../i18n");
const LibraryMenuControlButtons_1 = require("./LibraryMenuControlButtons");
const LibraryMenuHeaderContent_1 = require("./LibraryMenuHeaderContent");
const LibraryMenuSection_1 = require("./LibraryMenuSection");
const Spinner_1 = __importDefault(require("./Spinner"));
const Stack_1 = __importDefault(require("./Stack"));
require("./LibraryMenuItems.scss");
const TextField_1 = require("./TextField");
const App_1 = require("./App");
const Button_1 = require("./Button");
// using an odd number of items per batch so the rendering creates an irregular
// pattern which looks more organic
const ITEMS_RENDERED_PER_BATCH = 17;
// when render outputs cached we can render many more items per batch to
// speed it up
const CACHED_ITEMS_RENDERED_PER_BATCH = 64;
function LibraryMenuItems({ isLoading, libraryItems, onAddToLibrary, onInsertLibraryItems, pendingElements, theme, id, libraryReturnUrl, onSelectItems, selectedItems, }) {
    const editorInterface = (0, App_1.useEditorInterface)();
    const libraryContainerRef = (0, react_1.useRef)(null);
    const scrollPosition = (0, useScrollPosition_1.useScrollPosition)(libraryContainerRef);
    // This effect has to be called only on first render, therefore  `scrollPosition` isn't in the dependency array
    (0, react_1.useEffect)(() => {
        if (scrollPosition > 0) {
            libraryContainerRef.current?.scrollTo(0, scrollPosition);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const { svgCache } = (0, useLibraryItemSvg_1.useLibraryCache)();
    const [lastSelectedItem, setLastSelectedItem] = (0, react_1.useState)(null);
    const [searchInputValue, setSearchInputValue] = (0, react_1.useState)("");
    const IS_LIBRARY_EMPTY = !libraryItems.length && !pendingElements.length;
    const IS_SEARCHING = !IS_LIBRARY_EMPTY && !!searchInputValue.trim();
    const filteredItems = (0, react_1.useMemo)(() => {
        const searchQuery = (0, deburr_1.deburr)(searchInputValue.trim().toLowerCase());
        if (!searchQuery) {
            return [];
        }
        return libraryItems.filter((item) => {
            const itemName = item.name || "";
            return (itemName.trim() && (0, deburr_1.deburr)(itemName.toLowerCase()).includes(searchQuery));
        });
    }, [libraryItems, searchInputValue]);
    const unpublishedItems = (0, react_1.useMemo)(() => libraryItems.filter((item) => item.status !== "published"), [libraryItems]);
    const publishedItems = (0, react_1.useMemo)(() => libraryItems.filter((item) => item.status === "published"), [libraryItems]);
    const onItemSelectToggle = (0, react_1.useCallback)((id, event) => {
        const shouldSelect = !selectedItems.includes(id);
        const orderedItems = [...unpublishedItems, ...publishedItems];
        if (shouldSelect) {
            if (event.shiftKey && lastSelectedItem) {
                const rangeStart = orderedItems.findIndex((item) => item.id === lastSelectedItem);
                const rangeEnd = orderedItems.findIndex((item) => item.id === id);
                if (rangeStart === -1 || rangeEnd === -1) {
                    onSelectItems([...selectedItems, id]);
                    return;
                }
                const selectedItemsMap = (0, common_1.arrayToMap)(selectedItems);
                // Support both top-down and bottom-up selection by using min/max
                const minRange = Math.min(rangeStart, rangeEnd);
                const maxRange = Math.max(rangeStart, rangeEnd);
                const nextSelectedIds = orderedItems.reduce((acc, item, idx) => {
                    if ((idx >= minRange && idx <= maxRange) ||
                        selectedItemsMap.has(item.id)) {
                        acc.push(item.id);
                    }
                    return acc;
                }, []);
                onSelectItems(nextSelectedIds);
            }
            else {
                onSelectItems([...selectedItems, id]);
            }
            setLastSelectedItem(id);
        }
        else {
            setLastSelectedItem(null);
            onSelectItems(selectedItems.filter((_id) => _id !== id));
        }
    }, [
        lastSelectedItem,
        onSelectItems,
        publishedItems,
        selectedItems,
        unpublishedItems,
    ]);
    (0, react_1.useEffect)(() => {
        // if selection is removed (e.g. via esc), reset last selected item
        // so that subsequent shift+clicks don't select a large range
        if (!selectedItems.length) {
            setLastSelectedItem(null);
        }
    }, [selectedItems]);
    const getInsertedElements = (0, react_1.useCallback)((id) => {
        let targetElements;
        if (selectedItems.includes(id)) {
            targetElements = libraryItems.filter((item) => selectedItems.includes(item.id));
        }
        else {
            targetElements = libraryItems.filter((item) => item.id === id);
        }
        return targetElements.map((item) => {
            return {
                ...item,
                // duplicate each library item before inserting on canvas to confine
                // ids and bindings to each library item. See #6465
                elements: (0, element_1.duplicateElements)({
                    type: "everything",
                    elements: item.elements,
                    randomizeSeed: true,
                }).duplicatedElements,
            };
        });
    }, [libraryItems, selectedItems]);
    const onItemDrag = (0, react_1.useCallback)((id, event) => {
        // we want to serialize just the ids so the operation is fast and there's
        // no race condition if people drop the library items on canvas too fast
        const data = {
            itemIds: selectedItems.includes(id) ? selectedItems : [id],
        };
        event.dataTransfer.setData(common_1.MIME_TYPES.excalidrawlibIds, JSON.stringify(data));
    }, [selectedItems]);
    const isItemSelected = (0, react_1.useCallback)((id) => {
        if (!id) {
            return false;
        }
        return selectedItems.includes(id);
    }, [selectedItems]);
    const onAddToLibraryClick = (0, react_1.useCallback)(() => {
        onAddToLibrary(pendingElements);
    }, [pendingElements, onAddToLibrary]);
    const onItemClick = (0, react_1.useCallback)((id) => {
        if (id) {
            onInsertLibraryItems(getInsertedElements(id));
        }
    }, [getInsertedElements, onInsertLibraryItems]);
    const itemsRenderedPerBatch = svgCache.size >=
        (filteredItems.length ? filteredItems : libraryItems).length
        ? CACHED_ITEMS_RENDERED_PER_BATCH
        : ITEMS_RENDERED_PER_BATCH;
    const searchInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // focus could be stolen by tab trigger button
        (0, common_1.nextAnimationFrame)(() => {
            searchInputRef.current?.focus();
        });
    }, []);
    const JSX_whenNotSearching = !IS_SEARCHING && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [!IS_LIBRARY_EMPTY && ((0, jsx_runtime_1.jsx)("div", { className: "library-menu-items-container__header", children: (0, i18n_1.t)("labels.personalLib") })), !pendingElements.length && !unpublishedItems.length ? ((0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items__no-items", children: [!publishedItems.length && ((0, jsx_runtime_1.jsx)("div", { className: "library-menu-items__no-items__label", children: (0, i18n_1.t)("library.noItems") })), (0, jsx_runtime_1.jsx)("div", { className: "library-menu-items__no-items__hint", children: publishedItems.length > 0
                            ? (0, i18n_1.t)("library.hint_emptyPrivateLibrary")
                            : (0, i18n_1.t)("library.hint_emptyLibrary") })] })) : ((0, jsx_runtime_1.jsxs)(LibraryMenuSection_1.LibraryMenuSectionGrid, { children: [pendingElements.length > 0 && ((0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSection, { itemsRenderedPerBatch: itemsRenderedPerBatch, items: [{ id: null, elements: pendingElements }], onItemSelectToggle: onItemSelectToggle, onItemDrag: onItemDrag, onClick: onAddToLibraryClick, isItemSelected: isItemSelected, svgCache: svgCache })), (0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSection, { itemsRenderedPerBatch: itemsRenderedPerBatch, items: unpublishedItems, onItemSelectToggle: onItemSelectToggle, onItemDrag: onItemDrag, onClick: onItemClick, isItemSelected: isItemSelected, svgCache: svgCache })] })), publishedItems.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "library-menu-items-container__header", style: { marginTop: "0.75rem" }, children: (0, i18n_1.t)("labels.excalidrawLib") })), publishedItems.length > 0 && ((0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSectionGrid, { children: (0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSection, { itemsRenderedPerBatch: itemsRenderedPerBatch, items: publishedItems, onItemSelectToggle: onItemSelectToggle, onItemDrag: onItemDrag, onClick: onItemClick, isItemSelected: isItemSelected, svgCache: svgCache }) }))] }));
    const JSX_whenSearching = IS_SEARCHING && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items-container__header", children: [(0, i18n_1.t)("library.search.heading"), !isLoading && ((0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items-container__header__hint", style: { cursor: "pointer" }, onPointerDown: (e) => e.preventDefault(), onClick: (event) => {
                            setSearchInputValue("");
                        }, children: [(0, jsx_runtime_1.jsx)("kbd", { children: "esc" }), " to clear"] }))] }), filteredItems.length > 0 ? ((0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSectionGrid, { children: (0, jsx_runtime_1.jsx)(LibraryMenuSection_1.LibraryMenuSection, { itemsRenderedPerBatch: itemsRenderedPerBatch, items: filteredItems, onItemSelectToggle: onItemSelectToggle, onItemDrag: onItemDrag, onClick: onItemClick, isItemSelected: isItemSelected, svgCache: svgCache }) })) : ((0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items__no-items", children: [(0, jsx_runtime_1.jsx)("div", { className: "library-menu-items__no-items__hint", children: (0, i18n_1.t)("library.search.noResults") }), (0, jsx_runtime_1.jsx)(Button_1.Button, { onPointerDown: (e) => e.preventDefault(), onSelect: () => {
                            setSearchInputValue("");
                        }, style: { width: "auto", marginTop: "1rem" }, children: (0, i18n_1.t)("library.search.clearSearch") })] }))] }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items-container", style: pendingElements.length ||
            unpublishedItems.length ||
            publishedItems.length
            ? { justifyContent: "flex-start" }
            : { borderBottom: 0 }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "library-menu-items-header", children: [!IS_LIBRARY_EMPTY && ((0, jsx_runtime_1.jsx)(TextField_1.TextField, { ref: searchInputRef, type: "search", className: (0, clsx_1.default)("library-menu-items-container__search", {
                            hideCancelButton: editorInterface.formFactor !== "phone",
                        }), placeholder: (0, i18n_1.t)("library.search.inputPlaceholder"), value: searchInputValue, onChange: (value) => setSearchInputValue(value) })), (0, jsx_runtime_1.jsx)(LibraryMenuHeaderContent_1.LibraryDropdownMenu, { selectedItems: selectedItems, onSelectItems: onSelectItems, className: "library-menu-dropdown-container--in-heading" })] }), (0, jsx_runtime_1.jsxs)(Stack_1.default.Col, { className: "library-menu-items-container__items", align: "start", gap: 1, style: {
                    flex: publishedItems.length > 0 ? 1 : "0 1 auto",
                    margin: IS_LIBRARY_EMPTY ? "auto" : 0,
                }, ref: libraryContainerRef, children: [isLoading && ((0, jsx_runtime_1.jsx)("div", { style: {
                            position: "absolute",
                            top: "var(--container-padding-y)",
                            right: "var(--container-padding-x)",
                            transform: "translateY(50%)",
                        }, children: (0, jsx_runtime_1.jsx)(Spinner_1.default, {}) })), JSX_whenNotSearching, JSX_whenSearching, IS_LIBRARY_EMPTY && ((0, jsx_runtime_1.jsx)(LibraryMenuControlButtons_1.LibraryMenuControlButtons, { style: { padding: "16px 0", width: "100%" }, id: id, libraryReturnUrl: libraryReturnUrl, theme: theme }))] })] }));
}
