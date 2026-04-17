"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const DialogActionButton_1 = __importDefault(require("./DialogActionButton"));
const TextField_1 = require("./TextField");
const ToolButton_1 = require("./ToolButton");
const icons_1 = require("./icons");
require("./ElementLinkDialog.scss");
const ElementLinkDialog = ({ sourceElementId, onClose, appState, scene, generateLinkForSelection = element_1.defaultGetElementLinkFromSelection, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const originalLink = elementsMap.get(sourceElementId)?.link ?? null;
    const [nextLink, setNextLink] = (0, react_1.useState)(originalLink);
    const [linkEdited, setLinkEdited] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const selectedElements = (0, scene_1.getSelectedElements)(elementsMap, appState);
        let nextLink = originalLink;
        if (selectedElements.length > 0 && generateLinkForSelection) {
            const idAndType = (0, element_1.getLinkIdAndTypeFromSelection)(selectedElements, appState);
            if (idAndType) {
                nextLink = (0, common_1.normalizeLink)(generateLinkForSelection(idAndType.id, idAndType.type));
            }
        }
        setNextLink(nextLink);
    }, [
        elementsMap,
        appState,
        appState.selectedElementIds,
        originalLink,
        generateLinkForSelection,
    ]);
    const handleConfirm = (0, react_1.useCallback)(() => {
        if (nextLink && nextLink !== elementsMap.get(sourceElementId)?.link) {
            const elementToLink = elementsMap.get(sourceElementId);
            elementToLink &&
                scene.mutateElement(elementToLink, {
                    link: nextLink,
                });
        }
        if (!nextLink && linkEdited && sourceElementId) {
            const elementToLink = elementsMap.get(sourceElementId);
            elementToLink &&
                scene.mutateElement(elementToLink, {
                    link: null,
                });
        }
        onClose?.();
    }, [sourceElementId, nextLink, elementsMap, linkEdited, scene, onClose]);
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (event) => {
            if (appState.openDialog?.name === "elementLinkSelector" &&
                event.key === common_1.KEYS.ENTER) {
                handleConfirm();
            }
            if (appState.openDialog?.name === "elementLinkSelector" &&
                event.key === common_1.KEYS.ESCAPE) {
                onClose?.();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [appState, onClose, handleConfirm]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "ElementLinkDialog", children: [(0, jsx_runtime_1.jsxs)("div", { className: "ElementLinkDialog__header", children: [(0, jsx_runtime_1.jsx)("h2", { children: (0, i18n_1.t)("elementLink.title") }), (0, jsx_runtime_1.jsx)("p", { children: (0, i18n_1.t)("elementLink.desc") })] }), (0, jsx_runtime_1.jsxs)("div", { className: "ElementLinkDialog__input", children: [(0, jsx_runtime_1.jsx)(TextField_1.TextField, { value: nextLink ?? "", onChange: (value) => {
                            if (!linkEdited) {
                                setLinkEdited(true);
                            }
                            setNextLink(value);
                        }, onKeyDown: (event) => {
                            if (event.key === common_1.KEYS.ENTER) {
                                handleConfirm();
                            }
                        }, className: "ElementLinkDialog__input-field", selectOnRender: true }), originalLink && nextLink && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", title: (0, i18n_1.t)("buttons.remove"), "aria-label": (0, i18n_1.t)("buttons.remove"), label: (0, i18n_1.t)("buttons.remove"), onClick: () => {
                            // removes the link from the input
                            // but doesn't update the element
                            // when confirmed, will remove the link from the element
                            setNextLink(null);
                            setLinkEdited(true);
                        }, className: "ElementLinkDialog__remove", icon: icons_1.TrashIcon }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "ElementLinkDialog__actions", children: [(0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { label: (0, i18n_1.t)("buttons.cancel"), onClick: () => {
                            onClose?.();
                        }, style: {
                            marginRight: 10,
                        } }), (0, jsx_runtime_1.jsx)(DialogActionButton_1.default, { label: (0, i18n_1.t)("buttons.confirm"), onClick: handleConfirm, actionType: "primary" })] })] }));
};
exports.default = ElementLinkDialog;
