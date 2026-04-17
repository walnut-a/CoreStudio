"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hideHyperlinkToolip = exports.showHyperlinkTooltip = exports.getContextMenuLabel = exports.Hyperlink = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const common_2 = require("@excalidraw/common");
const element_5 = require("@excalidraw/element");
const analytics_1 = require("../../analytics");
const Tooltip_1 = require("../../components/Tooltip");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const ToolButton_1 = require("../ToolButton");
const icons_1 = require("../icons");
const scene_1 = require("../../scene");
const helpers_1 = require("./helpers");
require("./Hyperlink.scss");
const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 42;
const POPUP_PADDING = 5;
const SPACE_BOTTOM = 85;
const AUTO_HIDE_TIMEOUT = 500;
let IS_HYPERLINK_TOOLTIP_VISIBLE = false;
const embeddableLinkCache = new Map();
const Hyperlink = ({ element, scene, setAppState, onLinkOpen, setToast, updateEmbedValidationStatus, }) => {
    const elementsMap = scene.getNonDeletedElementsMap();
    const appState = (0, App_1.useExcalidrawAppState)();
    const appProps = (0, App_1.useAppProps)();
    const editorInterface = (0, App_1.useEditorInterface)();
    const linkVal = element.link || "";
    const [inputVal, setInputVal] = (0, react_1.useState)(linkVal);
    const inputRef = (0, react_1.useRef)(null);
    const isEditing = appState.showHyperlinkPopup === "editor";
    const handleSubmit = (0, react_1.useCallback)(() => {
        if (!inputRef.current) {
            return;
        }
        const link = (0, common_2.normalizeLink)(inputRef.current.value) || null;
        if (!element.link && link) {
            (0, analytics_1.trackEvent)("hyperlink", "create");
        }
        if ((0, element_5.isEmbeddableElement)(element)) {
            if (appState.activeEmbeddable?.element === element) {
                setAppState({ activeEmbeddable: null });
            }
            if (!link) {
                scene.mutateElement(element, {
                    link: null,
                });
                updateEmbedValidationStatus(element, false);
                return;
            }
            if (!(0, element_4.embeddableURLValidator)(link, appProps.validateEmbeddable)) {
                if (link) {
                    setToast({ message: (0, i18n_1.t)("toast.unableToEmbed"), closable: true });
                }
                element.link && embeddableLinkCache.set(element.id, element.link);
                scene.mutateElement(element, {
                    link,
                });
                updateEmbedValidationStatus(element, false);
            }
            else {
                const { width, height } = element;
                const embedLink = (0, element_4.getEmbedLink)(link);
                if (embedLink?.error instanceof URIError) {
                    setToast({
                        message: (0, i18n_1.t)("toast.unrecognizedLinkFormat"),
                        closable: true,
                    });
                }
                const ar = embedLink
                    ? embedLink.intrinsicSize.w / embedLink.intrinsicSize.h
                    : 1;
                const hasLinkChanged = embeddableLinkCache.get(element.id) !== element.link;
                scene.mutateElement(element, {
                    ...(hasLinkChanged
                        ? {
                            width: embedLink?.type === "video"
                                ? width > height
                                    ? width
                                    : height * ar
                                : width,
                            height: embedLink?.type === "video"
                                ? width > height
                                    ? width / ar
                                    : height
                                : height,
                        }
                        : {}),
                    link,
                });
                updateEmbedValidationStatus(element, true);
                if (embeddableLinkCache.has(element.id)) {
                    embeddableLinkCache.delete(element.id);
                }
            }
        }
        else {
            scene.mutateElement(element, { link });
        }
    }, [
        element,
        scene,
        setToast,
        appProps.validateEmbeddable,
        appState.activeEmbeddable,
        setAppState,
        updateEmbedValidationStatus,
    ]);
    (0, react_1.useLayoutEffect)(() => {
        return () => {
            handleSubmit();
        };
    }, [handleSubmit]);
    (0, react_1.useEffect)(() => {
        if (isEditing &&
            inputRef?.current &&
            !(editorInterface.formFactor === "phone" || editorInterface.isTouchScreen)) {
            inputRef.current.select();
        }
    }, [isEditing, editorInterface.formFactor, editorInterface.isTouchScreen]);
    (0, react_1.useEffect)(() => {
        let timeoutId = null;
        const handlePointerMove = (event) => {
            if (isEditing) {
                return;
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            const shouldHide = shouldHideLinkPopup(element, elementsMap, appState, (0, math_1.pointFrom)(event.clientX, event.clientY));
            if (shouldHide) {
                timeoutId = window.setTimeout(() => {
                    setAppState({ showHyperlinkPopup: false });
                }, AUTO_HIDE_TIMEOUT);
            }
        };
        window.addEventListener(common_1.EVENT.POINTER_MOVE, handlePointerMove, false);
        return () => {
            window.removeEventListener(common_1.EVENT.POINTER_MOVE, handlePointerMove, false);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [appState, element, isEditing, setAppState, elementsMap]);
    const handleRemove = (0, react_1.useCallback)(() => {
        (0, analytics_1.trackEvent)("hyperlink", "delete");
        scene.mutateElement(element, { link: null });
        setAppState({ showHyperlinkPopup: false });
    }, [setAppState, element, scene]);
    const onEdit = () => {
        (0, analytics_1.trackEvent)("hyperlink", "edit", "popup-ui");
        setAppState({ showHyperlinkPopup: "editor" });
    };
    const { x, y } = getCoordsForPopover(element, appState, elementsMap);
    if (appState.contextMenu ||
        appState.selectedElementsAreBeingDragged ||
        appState.resizingElement ||
        appState.isRotating ||
        appState.openMenu ||
        appState.viewModeEnabled) {
        return null;
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "excalidraw-hyperlinkContainer", style: {
            top: `${y}px`,
            left: `${x}px`,
            width: POPUP_WIDTH,
            padding: POPUP_PADDING,
        }, children: [isEditing ? ((0, jsx_runtime_1.jsx)("input", { className: (0, clsx_1.default)("excalidraw-hyperlinkContainer-input"), placeholder: (0, i18n_1.t)("labels.link.hint"), ref: inputRef, value: inputVal, onChange: (event) => setInputVal(event.target.value), autoFocus: true, onKeyDown: (event) => {
                    event.stopPropagation();
                    // prevent cmd/ctrl+k shortcut when editing link
                    if (event[common_1.KEYS.CTRL_OR_CMD] && event.key === common_1.KEYS.K) {
                        event.preventDefault();
                    }
                    if (event.key === common_1.KEYS.ENTER || event.key === common_1.KEYS.ESCAPE) {
                        handleSubmit();
                        setAppState({ showHyperlinkPopup: "info" });
                    }
                } })) : element.link ? ((0, jsx_runtime_1.jsx)("a", { href: (0, common_2.normalizeLink)(element.link || ""), className: "excalidraw-hyperlinkContainer-link", target: (0, common_2.isLocalLink)(element.link) ? "_self" : "_blank", onClick: (event) => {
                    if (element.link && onLinkOpen) {
                        const customEvent = (0, common_2.wrapEvent)(common_1.EVENT.EXCALIDRAW_LINK, event.nativeEvent);
                        onLinkOpen({
                            ...element,
                            link: (0, common_2.normalizeLink)(element.link),
                        }, customEvent);
                        if (customEvent.defaultPrevented) {
                            event.preventDefault();
                        }
                    }
                }, rel: "noopener noreferrer", children: element.link })) : ((0, jsx_runtime_1.jsx)("div", { className: "excalidraw-hyperlinkContainer-link", children: (0, i18n_1.t)("labels.link.empty") })), (0, jsx_runtime_1.jsxs)("div", { className: "excalidraw-hyperlinkContainer__buttons", children: [!isEditing && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", title: (0, i18n_1.t)("buttons.edit"), "aria-label": (0, i18n_1.t)("buttons.edit"), label: (0, i18n_1.t)("buttons.edit"), onClick: onEdit, className: "excalidraw-hyperlinkContainer--edit", icon: icons_1.FreedrawIcon })), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", title: (0, i18n_1.t)("labels.linkToElement"), "aria-label": (0, i18n_1.t)("labels.linkToElement"), label: (0, i18n_1.t)("labels.linkToElement"), onClick: () => {
                            setAppState({
                                openDialog: {
                                    name: "elementLinkSelector",
                                    sourceElementId: element.id,
                                },
                            });
                        }, icon: icons_1.elementLinkIcon }), linkVal && !(0, element_5.isEmbeddableElement)(element) && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { type: "button", title: (0, i18n_1.t)("buttons.remove"), "aria-label": (0, i18n_1.t)("buttons.remove"), label: (0, i18n_1.t)("buttons.remove"), onClick: handleRemove, className: "excalidraw-hyperlinkContainer--remove", icon: icons_1.TrashIcon }))] })] }));
};
exports.Hyperlink = Hyperlink;
const getCoordsForPopover = (element, appState, elementsMap) => {
    const [x1, y1] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap);
    const { x: viewportX, y: viewportY } = (0, common_2.sceneCoordsToViewportCoords)({ sceneX: x1 + element.width / 2, sceneY: y1 }, appState);
    const x = viewportX - appState.offsetLeft - POPUP_WIDTH / 2;
    const y = viewportY - appState.offsetTop - SPACE_BOTTOM;
    return { x, y };
};
const getContextMenuLabel = (elements, appState) => {
    const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
    const label = (0, element_5.isEmbeddableElement)(selectedElements[0])
        ? "labels.link.editEmbed"
        : selectedElements[0]?.link
            ? "labels.link.edit"
            : "labels.link.create";
    return label;
};
exports.getContextMenuLabel = getContextMenuLabel;
let HYPERLINK_TOOLTIP_TIMEOUT_ID = null;
const showHyperlinkTooltip = (element, appState, elementsMap) => {
    if (HYPERLINK_TOOLTIP_TIMEOUT_ID) {
        clearTimeout(HYPERLINK_TOOLTIP_TIMEOUT_ID);
    }
    HYPERLINK_TOOLTIP_TIMEOUT_ID = window.setTimeout(() => renderTooltip(element, appState, elementsMap), common_1.HYPERLINK_TOOLTIP_DELAY);
};
exports.showHyperlinkTooltip = showHyperlinkTooltip;
const renderTooltip = (element, appState, elementsMap) => {
    if (!element.link) {
        return;
    }
    const tooltipDiv = (0, Tooltip_1.getTooltipDiv)();
    tooltipDiv.classList.add("excalidraw-tooltip--visible");
    tooltipDiv.style.maxWidth = "20rem";
    tooltipDiv.textContent = (0, element_3.isElementLink)(element.link)
        ? (0, i18n_1.t)("labels.link.goToElement")
        : element.link;
    const [x1, y1, x2, y2] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap);
    const [linkX, linkY, linkWidth, linkHeight] = (0, helpers_1.getLinkHandleFromCoords)([x1, y1, x2, y2], element.angle, appState);
    const linkViewportCoords = (0, common_2.sceneCoordsToViewportCoords)({ sceneX: linkX, sceneY: linkY }, appState);
    (0, Tooltip_1.updateTooltipPosition)(tooltipDiv, {
        left: linkViewportCoords.x,
        top: linkViewportCoords.y,
        width: linkWidth,
        height: linkHeight,
    }, "top");
    (0, analytics_1.trackEvent)("hyperlink", "tooltip", "link-icon");
    IS_HYPERLINK_TOOLTIP_VISIBLE = true;
};
const hideHyperlinkToolip = () => {
    if (HYPERLINK_TOOLTIP_TIMEOUT_ID) {
        clearTimeout(HYPERLINK_TOOLTIP_TIMEOUT_ID);
    }
    if (IS_HYPERLINK_TOOLTIP_VISIBLE) {
        IS_HYPERLINK_TOOLTIP_VISIBLE = false;
        (0, Tooltip_1.getTooltipDiv)().classList.remove("excalidraw-tooltip--visible");
    }
};
exports.hideHyperlinkToolip = hideHyperlinkToolip;
const shouldHideLinkPopup = (element, elementsMap, appState, [clientX, clientY]) => {
    const { x: sceneX, y: sceneY } = (0, common_2.viewportCoordsToSceneCoords)({ clientX, clientY }, appState);
    const threshold = 15 / appState.zoom.value;
    // hitbox to prevent hiding when hovered in element bounding box
    if ((0, element_2.hitElementBoundingBox)((0, math_1.pointFrom)(sceneX, sceneY), element, elementsMap)) {
        return false;
    }
    const [x1, y1, x2] = (0, element_1.getElementAbsoluteCoords)(element, elementsMap);
    // hit box to prevent hiding when hovered in the vertical area between element and popover
    if (sceneX >= x1 &&
        sceneX <= x2 &&
        sceneY >= y1 - SPACE_BOTTOM &&
        sceneY <= y1) {
        return false;
    }
    // hit box to prevent hiding when hovered around popover within threshold
    const { x: popoverX, y: popoverY } = getCoordsForPopover(element, appState, elementsMap);
    if (clientX >= popoverX - threshold &&
        clientX <= popoverX + POPUP_WIDTH + POPUP_PADDING * 2 + threshold &&
        clientY >= popoverY - threshold &&
        clientY <= popoverY + threshold + POPUP_PADDING * 2 + POPUP_HEIGHT) {
        return false;
    }
    return true;
};
