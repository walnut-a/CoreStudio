"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryDropdownMenu = exports.LibraryDropdownMenuButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const ui_appState_1 = require("../context/ui-appState");
const filesystem_1 = require("../data/filesystem");
const json_1 = require("../data/json");
const library_1 = require("../data/library");
const editor_jotai_1 = require("../editor-jotai");
const useLibraryItemSvg_1 = require("../hooks/useLibraryItemSvg");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const ConfirmDialog_1 = __importDefault(require("./ConfirmDialog"));
const Dialog_1 = require("./Dialog");
const LibraryMenu_1 = require("./LibraryMenu");
const PublishLibrary_1 = __importDefault(require("./PublishLibrary"));
const ToolButton_1 = require("./ToolButton");
const Trans_1 = __importDefault(require("./Trans"));
const DropdownMenu_1 = __importDefault(require("./dropdownMenu/DropdownMenu"));
const icons_1 = require("./icons");
const getSelectedItems = (libraryItems, selectedItems) => libraryItems.filter((item) => selectedItems.includes(item.id));
const LibraryDropdownMenuButton = ({ setAppState, selectedItems, library, onRemoveFromLibrary, resetLibrary, onSelectItems, appState, className, }) => {
    const [libraryItemsData] = (0, editor_jotai_1.useAtom)(library_1.libraryItemsAtom);
    const [isLibraryMenuOpen, setIsLibraryMenuOpen] = (0, editor_jotai_1.useAtom)(LibraryMenu_1.isLibraryMenuOpenAtom);
    const renderRemoveLibAlert = () => {
        const content = selectedItems.length
            ? (0, i18n_1.t)("alerts.removeItemsFromsLibrary", { count: selectedItems.length })
            : (0, i18n_1.t)("alerts.resetLibrary");
        const title = selectedItems.length
            ? (0, i18n_1.t)("confirmDialog.removeItemsFromLib")
            : (0, i18n_1.t)("confirmDialog.resetLibrary");
        return ((0, jsx_runtime_1.jsx)(ConfirmDialog_1.default, { onConfirm: () => {
                if (selectedItems.length) {
                    onRemoveFromLibrary();
                }
                else {
                    resetLibrary();
                }
                setShowRemoveLibAlert(false);
            }, onCancel: () => {
                setShowRemoveLibAlert(false);
            }, title: title, children: (0, jsx_runtime_1.jsx)("p", { children: content }) }));
    };
    const [showRemoveLibAlert, setShowRemoveLibAlert] = (0, react_1.useState)(false);
    const itemsSelected = !!selectedItems.length;
    const items = itemsSelected
        ? libraryItemsData.libraryItems.filter((item) => selectedItems.includes(item.id))
        : libraryItemsData.libraryItems;
    const resetLabel = itemsSelected
        ? (0, i18n_1.t)("buttons.remove")
        : (0, i18n_1.t)("buttons.resetLibrary");
    const [showPublishLibraryDialog, setShowPublishLibraryDialog] = (0, react_1.useState)(false);
    const [publishLibSuccess, setPublishLibSuccess] = (0, react_1.useState)(null);
    const renderPublishSuccess = (0, react_1.useCallback)(() => {
        return ((0, jsx_runtime_1.jsxs)(Dialog_1.Dialog, { onCloseRequest: () => setPublishLibSuccess(null), title: (0, i18n_1.t)("publishSuccessDialog.title"), className: "publish-library-success", size: "small", children: [(0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "publishSuccessDialog.content", authorName: publishLibSuccess.authorName, link: (el) => ((0, jsx_runtime_1.jsx)("a", { href: publishLibSuccess?.url, target: "_blank", rel: "noopener noreferrer", children: el })) }) }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", title: (0, i18n_1.t)("buttons.close"), "aria-label": (0, i18n_1.t)("buttons.close"), label: (0, i18n_1.t)("buttons.close"), onClick: () => setPublishLibSuccess(null), "data-testid": "publish-library-success-close", className: "publish-library-success-close" })] }));
    }, [setPublishLibSuccess, publishLibSuccess]);
    const onPublishLibSuccess = (data, libraryItems) => {
        setShowPublishLibraryDialog(false);
        setPublishLibSuccess({ url: data.url, authorName: data.authorName });
        const nextLibItems = libraryItems.slice();
        nextLibItems.forEach((libItem) => {
            if (selectedItems.includes(libItem.id)) {
                libItem.status = "published";
            }
        });
        library.setLibrary(nextLibItems);
    };
    const onLibraryImport = async () => {
        try {
            await library.updateLibrary({
                libraryItems: (0, filesystem_1.fileOpen)({
                    description: "Excalidraw library files",
                    // ToDo: Be over-permissive until https://bugs.webkit.org/show_bug.cgi?id=34442
                    // gets resolved. Else, iOS users cannot open `.excalidraw` files.
                    /*
                      extensions: [".json", ".excalidrawlib"],
                      */
                }),
                merge: true,
                openLibraryMenu: true,
            });
        }
        catch (error) {
            if (error?.name === "AbortError") {
                console.warn(error);
                return;
            }
            setAppState({ errorMessage: (0, i18n_1.t)("errors.importLibraryError") });
        }
    };
    const onLibraryExport = async () => {
        const libraryItems = itemsSelected
            ? items
            : await library.getLatestLibrary();
        (0, json_1.saveLibraryAsJSON)(libraryItems)
            .catch(common_1.muteFSAbortError)
            .catch((error) => {
            setAppState({ errorMessage: error.message });
        });
    };
    const renderLibraryMenu = () => {
        return ((0, jsx_runtime_1.jsxs)(DropdownMenu_1.default, { open: isLibraryMenuOpen, children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Trigger, { onToggle: () => setIsLibraryMenuOpen(!isLibraryMenuOpen), children: icons_1.DotsIcon }), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default.Content, { onClickOutside: () => setIsLibraryMenuOpen(false), onSelect: () => setIsLibraryMenuOpen(false), className: "library-menu", children: [!itemsSelected && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: onLibraryImport, icon: icons_1.LoadIcon, "data-testid": "lib-dropdown--load", children: (0, i18n_1.t)("buttons.load") })), !!items.length && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: onLibraryExport, icon: icons_1.ExportIcon, "data-testid": "lib-dropdown--export", children: (0, i18n_1.t)("buttons.export") })), itemsSelected && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { icon: icons_1.publishIcon, onSelect: () => setShowPublishLibraryDialog(true), "data-testid": "lib-dropdown--remove", children: (0, i18n_1.t)("buttons.publishLibrary") })), !!items.length && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => setShowRemoveLibAlert(true), icon: icons_1.TrashIcon, children: resetLabel }))] })] }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("library-menu-dropdown-container", className), children: [renderLibraryMenu(), selectedItems.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "library-actions-counter", children: selectedItems.length })), showRemoveLibAlert && renderRemoveLibAlert(), showPublishLibraryDialog && ((0, jsx_runtime_1.jsx)(PublishLibrary_1.default, { onClose: () => setShowPublishLibraryDialog(false), libraryItems: getSelectedItems(libraryItemsData.libraryItems, selectedItems), appState: appState, onSuccess: (data) => onPublishLibSuccess(data, libraryItemsData.libraryItems), onError: (error) => window.alert(error), updateItemsInStorage: () => library.setLibrary(libraryItemsData.libraryItems), onRemove: (id) => onSelectItems(selectedItems.filter((_id) => _id !== id)) })), publishLibSuccess && renderPublishSuccess()] }));
};
exports.LibraryDropdownMenuButton = LibraryDropdownMenuButton;
const LibraryDropdownMenu = ({ selectedItems, onSelectItems, className, }) => {
    const { library } = (0, App_1.useApp)();
    const { clearLibraryCache, deleteItemsFromLibraryCache } = (0, useLibraryItemSvg_1.useLibraryCache)();
    const appState = (0, ui_appState_1.useUIAppState)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const [libraryItemsData] = (0, editor_jotai_1.useAtom)(library_1.libraryItemsAtom);
    const removeFromLibrary = async (libraryItems) => {
        const nextItems = libraryItems.filter((item) => !selectedItems.includes(item.id));
        library.setLibrary(nextItems).catch(() => {
            setAppState({ errorMessage: (0, i18n_1.t)("alerts.errorRemovingFromLibrary") });
        });
        deleteItemsFromLibraryCache(selectedItems);
        onSelectItems([]);
    };
    const resetLibrary = () => {
        library.resetLibrary();
        clearLibraryCache();
    };
    return ((0, jsx_runtime_1.jsx)(exports.LibraryDropdownMenuButton, { appState: appState, setAppState: setAppState, selectedItems: selectedItems, onSelectItems: onSelectItems, library: library, onRemoveFromLibrary: () => removeFromLibrary(libraryItemsData.libraryItems), resetLibrary: resetLibrary, className: className }));
};
exports.LibraryDropdownMenu = LibraryDropdownMenu;
