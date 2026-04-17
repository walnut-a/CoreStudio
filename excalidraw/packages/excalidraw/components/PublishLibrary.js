"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const export_1 = require("@excalidraw/utils/export");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const EditorLocalStorage_1 = require("../data/EditorLocalStorage");
const blob_1 = require("../data/blob");
const i18n_1 = require("../i18n");
const Dialog_1 = require("./Dialog");
const DialogActionButton_1 = __importDefault(require("./DialogActionButton"));
const ToolButton_1 = require("./ToolButton");
const Trans_1 = __importDefault(require("./Trans"));
const icons_1 = require("./icons");
require("./PublishLibrary.scss");
const generatePreviewImage = async (libraryItems) => {
    const MAX_ITEMS_PER_ROW = 6;
    const BOX_SIZE = 128;
    const BOX_PADDING = Math.round(BOX_SIZE / 16);
    const BORDER_WIDTH = Math.max(Math.round(BOX_SIZE / 64), 2);
    const rows = (0, common_1.chunk)(libraryItems, MAX_ITEMS_PER_ROW);
    const canvas = document.createElement("canvas");
    canvas.width =
        rows[0].length * BOX_SIZE +
            (rows[0].length + 1) * (BOX_PADDING * 2) -
            BOX_PADDING * 2;
    canvas.height =
        rows.length * BOX_SIZE +
            (rows.length + 1) * (BOX_PADDING * 2) -
            BOX_PADDING * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // draw items
    // ---------------------------------------------------------------------------
    for (const [index, item] of libraryItems.entries()) {
        const itemCanvas = await (0, export_1.exportToCanvas)({
            elements: item.elements,
            files: null,
            maxWidthOrHeight: BOX_SIZE,
        });
        const { width, height } = itemCanvas;
        // draw item
        // -------------------------------------------------------------------------
        const rowOffset = Math.floor(index / MAX_ITEMS_PER_ROW) * (BOX_SIZE + BOX_PADDING * 2);
        const colOffset = (index % MAX_ITEMS_PER_ROW) * (BOX_SIZE + BOX_PADDING * 2);
        ctx.drawImage(itemCanvas, colOffset + (BOX_SIZE - width) / 2 + BOX_PADDING, rowOffset + (BOX_SIZE - height) / 2 + BOX_PADDING);
        // draw item border
        // -------------------------------------------------------------------------
        ctx.lineWidth = BORDER_WIDTH;
        ctx.strokeStyle = "#ced4da";
        ctx.strokeRect(colOffset + BOX_PADDING / 2, rowOffset + BOX_PADDING / 2, BOX_SIZE + BOX_PADDING, BOX_SIZE + BOX_PADDING);
    }
    return await (0, blob_1.resizeImageFile)(new File([await (0, blob_1.canvasToBlob)(canvas)], "preview", { type: common_1.MIME_TYPES.png }), {
        outputType: common_1.MIME_TYPES.jpg,
        maxWidthOrHeight: 5000,
    });
};
const SingleLibraryItem = ({ libItem, appState, index, onChange, onRemove, }) => {
    const svgRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const node = svgRef.current;
        if (!node) {
            return;
        }
        (async () => {
            const svg = await (0, export_1.exportToSvg)({
                elements: libItem.elements,
                appState: {
                    ...appState,
                    viewBackgroundColor: "#fff",
                    exportBackground: true,
                },
                files: null,
                skipInliningFonts: true,
            });
            node.innerHTML = svg.outerHTML;
        })();
    }, [libItem.elements, appState]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "single-library-item", children: [libItem.status === "published" && ((0, jsx_runtime_1.jsx)("span", { className: "single-library-item-status", children: (0, i18n_1.t)("labels.statusPublished") })), (0, jsx_runtime_1.jsx)("div", { ref: svgRef, className: "single-library-item__svg" }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { "aria-label": (0, i18n_1.t)("buttons.remove"), type: "button", icon: icons_1.CloseIcon, className: "single-library-item--remove", onClick: onRemove.bind(null, libItem.id), title: (0, i18n_1.t)("buttons.remove") }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: "flex",
                    margin: "0.8rem 0",
                    width: "100%",
                    fontSize: "14px",
                    fontWeight: 500,
                    flexDirection: "column",
                }, children: [(0, jsx_runtime_1.jsxs)("label", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            flexDirection: "column",
                        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { padding: "0.5em 0" }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 500, color: "#868e96" }, children: (0, i18n_1.t)("publishDialog.itemName") }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "required", children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", ref: inputRef, style: { width: "80%", padding: "0.2rem" }, defaultValue: libItem.name, placeholder: "Item name", onChange: (event) => {
                                    onChange(event.target.value, index);
                                } })] }), (0, jsx_runtime_1.jsx)("span", { className: "error", children: libItem.error })] })] }));
};
const PublishLibrary = ({ onClose, libraryItems, appState, onSuccess, onError, updateItemsInStorage, onRemove, }) => {
    const [libraryData, setLibraryData] = (0, react_1.useState)({
        authorName: "",
        githubHandle: "",
        name: "",
        description: "",
        twitterHandle: "",
        website: "",
    });
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const data = EditorLocalStorage_1.EditorLocalStorage.get(common_1.EDITOR_LS_KEYS.PUBLISH_LIBRARY);
        if (data) {
            setLibraryData(data);
        }
    }, []);
    const [clonedLibItems, setClonedLibItems] = (0, react_1.useState)(libraryItems.slice());
    (0, react_1.useEffect)(() => {
        setClonedLibItems(libraryItems.slice());
    }, [libraryItems]);
    const onInputChange = (event) => {
        setLibraryData({
            ...libraryData,
            [event.target.name]: event.target.value,
        });
    };
    const onSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        const erroredLibItems = [];
        let isError = false;
        clonedLibItems.forEach((libItem) => {
            let error = "";
            if (!libItem.name) {
                error = (0, i18n_1.t)("publishDialog.errors.required");
                isError = true;
            }
            erroredLibItems.push({ ...libItem, error });
        });
        if (isError) {
            setClonedLibItems(erroredLibItems);
            setIsSubmitting(false);
            return;
        }
        const previewImage = await generatePreviewImage(clonedLibItems);
        const libContent = {
            type: common_1.EXPORT_DATA_TYPES.excalidrawLibrary,
            version: common_1.VERSIONS.excalidrawLibrary,
            source: (0, common_1.getExportSource)(),
            libraryItems: clonedLibItems,
        };
        const content = JSON.stringify(libContent, null, 2);
        const lib = new Blob([content], { type: "application/json" });
        const formData = new FormData();
        formData.append("excalidrawLib", lib);
        formData.append("previewImage", previewImage);
        formData.append("previewImageType", previewImage.type);
        formData.append("title", libraryData.name);
        formData.append("authorName", libraryData.authorName);
        formData.append("githubHandle", libraryData.githubHandle);
        formData.append("name", libraryData.name);
        formData.append("description", libraryData.description);
        formData.append("twitterHandle", libraryData.twitterHandle);
        formData.append("website", libraryData.website);
        fetch(`${import.meta.env.VITE_APP_LIBRARY_BACKEND}/submit`, {
            method: "post",
            body: formData,
        })
            .then((response) => {
            if (response.ok) {
                return response.json().then(({ url }) => {
                    // flush data from local storage
                    EditorLocalStorage_1.EditorLocalStorage.delete(common_1.EDITOR_LS_KEYS.PUBLISH_LIBRARY);
                    onSuccess({
                        url,
                        authorName: libraryData.authorName,
                        items: clonedLibItems,
                    });
                });
            }
            return response
                .json()
                .catch(() => {
                throw new Error(response.statusText || "something went wrong");
            })
                .then((error) => {
                throw new Error(error.message || response.statusText || "something went wrong");
            });
        }, (err) => {
            console.error(err);
            onError(err);
            setIsSubmitting(false);
        })
            .catch((err) => {
            console.error(err);
            onError(err);
            setIsSubmitting(false);
        });
    };
    const renderLibraryItems = () => {
        const items = [];
        clonedLibItems.forEach((libItem, index) => {
            items.push((0, jsx_runtime_1.jsx)("div", { className: "single-library-item-wrapper", children: (0, jsx_runtime_1.jsx)(SingleLibraryItem, { libItem: libItem, appState: appState, index: index, onChange: (val, index) => {
                        const items = clonedLibItems.slice();
                        items[index].name = val;
                        setClonedLibItems(items);
                    }, onRemove: onRemove }) }, index));
        });
        return (0, jsx_runtime_1.jsx)("div", { className: "selected-library-items", children: items });
    };
    const onDialogClose = (0, react_1.useCallback)(() => {
        updateItemsInStorage(clonedLibItems);
        EditorLocalStorage_1.EditorLocalStorage.set(common_1.EDITOR_LS_KEYS.PUBLISH_LIBRARY, libraryData);
        onClose();
    }, [clonedLibItems, onClose, updateItemsInStorage, libraryData]);
    const shouldRenderForm = !!libraryItems.length;
    const containsPublishedItems = libraryItems.some((item) => item.status === "published");
    return ((0, jsx_runtime_1.jsx)(Dialog_1.Dialog, { onCloseRequest: onDialogClose, title: (0, i18n_1.t)("publishDialog.title"), className: "publish-library", children: shouldRenderForm ? ((0, jsx_runtime_1.jsxs)("form", { onSubmit: onSubmit, children: [(0, jsx_runtime_1.jsx)("div", { className: "publish-library-note", children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "publishDialog.noteDescription", link: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://libraries.excalidraw.com", target: "_blank", rel: "noopener", children: el })) }) }), (0, jsx_runtime_1.jsx)("span", { className: "publish-library-note", children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "publishDialog.noteGuidelines", link: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://github.com/excalidraw/excalidraw-libraries#guidelines", target: "_blank", rel: "noopener noreferrer", children: el })) }) }), (0, jsx_runtime_1.jsx)("div", { className: "publish-library-note", children: (0, i18n_1.t)("publishDialog.noteItems") }), containsPublishedItems && ((0, jsx_runtime_1.jsx)("span", { className: "publish-library-note publish-library-warning", children: (0, i18n_1.t)("publishDialog.republishWarning") })), renderLibraryItems(), (0, jsx_runtime_1.jsxs)("div", { className: "publish-library__fields", children: [(0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.libraryName") }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "required", children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", name: "name", required: true, value: libraryData.name, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.libraryName") })] }), (0, jsx_runtime_1.jsxs)("label", { style: { alignItems: "flex-start" }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.libraryDesc") }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "required", children: "*" })] }), (0, jsx_runtime_1.jsx)("textarea", { name: "description", rows: 4, required: true, value: libraryData.description, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.libraryDesc") })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.authorName") }), (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "required", children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", name: "authorName", required: true, value: libraryData.authorName, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.authorName") })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.githubUsername") }), (0, jsx_runtime_1.jsx)("input", { type: "text", name: "githubHandle", value: libraryData.githubHandle, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.githubHandle") })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.twitterUsername") }), (0, jsx_runtime_1.jsx)("input", { type: "text", name: "twitterHandle", value: libraryData.twitterHandle, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.twitterHandle") })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: (0, i18n_1.t)("publishDialog.website") }), (0, jsx_runtime_1.jsx)("input", { type: "text", name: "website", pattern: "https?://.+", title: (0, i18n_1.t)("publishDialog.errors.website"), value: libraryData.website, onChange: onInputChange, placeholder: (0, i18n_1.t)("publishDialog.placeholder.website") })] }), (0, jsx_runtime_1.jsx)("span", { className: "publish-library-note", children: (0, jsx_runtime_1.jsx)(Trans_1.default, { i18nKey: "publishDialog.noteLicense", link: (el) => ((0, jsx_runtime_1.jsx)("a", { href: "https://github.com/excalidraw/excalidraw-libraries/blob/main/LICENSE", target: "_blank", rel: "noopener noreferrer", children: el })) }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "publish-library__buttons", children: [(0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { label: (0, i18n_1.t)("buttons.saveLibNames"), onClick: onDialogClose, "data-testid": "cancel-clear-canvas-button" }), (0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { type: "submit", label: (0, i18n_1.t)("buttons.submit"), actionType: "primary", isLoading: isSubmitting })] })] })) : ((0, jsx_runtime_1.jsx)("p", { style: { padding: "1em", textAlign: "center", fontWeight: 500 }, children: (0, i18n_1.t)("publishDialog.atleastOneLibItem") })) }));
};
exports.default = PublishLibrary;
