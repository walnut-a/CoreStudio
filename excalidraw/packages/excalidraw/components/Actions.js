"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitViewModeButton = exports.ExitZenModeButton = exports.UndoRedoActions = exports.ZoomActions = exports.ShapesSwitcher = exports.MobileShapeActions = exports.CompactShapeActions = exports.SelectedShapeActions = exports.canChangeBackgroundColor = exports.canChangeStrokeColor = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const radix_ui_1 = require("radix-ui");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const actions_1 = require("../actions");
const actionAlign_1 = require("../actions/actionAlign");
const analytics_1 = require("../analytics");
const tunnels_1 = require("../context/tunnels");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const actionProperties_1 = require("../actions/actionProperties");
const useTextEditorFocus_1 = require("../hooks/useTextEditorFocus");
const actionToggleViewMode_1 = require("../actions/actionToggleViewMode");
const shapes_1 = require("./shapes");
require("./Actions.scss");
const App_1 = require("./App");
const Stack_1 = __importDefault(require("./Stack"));
const ToolButton_1 = require("./ToolButton");
const ToolPopover_1 = require("./ToolPopover");
const Tooltip_1 = require("./Tooltip");
const DropdownMenu_1 = __importDefault(require("./dropdownMenu/DropdownMenu"));
const PropertiesPopover_1 = require("./PropertiesPopover");
const icons_1 = require("./icons");
const Island_1 = require("./Island");
// Common CSS class combinations
const PROPERTIES_CLASSES = (0, clsx_1.default)([
    common_1.CLASSES.SHAPE_ACTIONS_THEME_SCOPE,
    "properties-content",
]);
const canChangeStrokeColor = (appState, targetElements) => {
    let commonSelectedType = targetElements[0]?.type || null;
    for (const element of targetElements) {
        if (element.type !== commonSelectedType) {
            commonSelectedType = null;
            break;
        }
    }
    return (((0, element_1.hasStrokeColor)(appState.activeTool.type) &&
        commonSelectedType !== "image" &&
        commonSelectedType !== "frame" &&
        commonSelectedType !== "magicframe") ||
        targetElements.some((element) => (0, element_1.hasStrokeColor)(element.type)));
};
exports.canChangeStrokeColor = canChangeStrokeColor;
const canChangeBackgroundColor = (appState, targetElements) => {
    return ((0, scene_1.hasBackground)(appState.activeTool.type) ||
        targetElements.some((element) => (0, scene_1.hasBackground)(element.type)));
};
exports.canChangeBackgroundColor = canChangeBackgroundColor;
const SelectedShapeActions = ({ appState, elementsMap, renderAction, app, }) => {
    const targetElements = (0, scene_1.getTargetElements)(elementsMap, appState);
    let isSingleElementBoundContainer = false;
    if (targetElements.length === 2 &&
        ((0, element_1.hasBoundTextElement)(targetElements[0]) ||
            (0, element_1.hasBoundTextElement)(targetElements[1]))) {
        isSingleElementBoundContainer = true;
    }
    const isEditingTextOrNewElement = Boolean(appState.editingTextElement || appState.newElement);
    const editorInterface = (0, App_1.useEditorInterface)();
    const isRTL = document.documentElement.getAttribute("dir") === "rtl";
    const showFillIcons = ((0, scene_1.hasBackground)(appState.activeTool.type) &&
        !(0, common_1.isTransparent)(appState.currentItemBackgroundColor)) ||
        targetElements.some((element) => (0, scene_1.hasBackground)(element.type) && !(0, common_1.isTransparent)(element.backgroundColor));
    const showLinkIcon = targetElements.length === 1 || isSingleElementBoundContainer;
    const showLineEditorAction = !appState.selectedLinearElement?.isEditing &&
        targetElements.length === 1 &&
        (0, element_1.isLinearElement)(targetElements[0]) &&
        !(0, element_1.isElbowArrow)(targetElements[0]);
    const showCropEditorAction = !appState.croppingElementId &&
        targetElements.length === 1 &&
        (0, element_1.isImageElement)(targetElements[0]);
    const showAlignActions = !isSingleElementBoundContainer && (0, actionAlign_1.alignActionsPredicate)(appState, app);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "selected-shape-actions", children: [(0, jsx_runtime_1.jsx)("div", { children: (0, exports.canChangeStrokeColor)(appState, targetElements) &&
                    renderAction("changeStrokeColor") }), (0, exports.canChangeBackgroundColor)(appState, targetElements) && ((0, jsx_runtime_1.jsx)("div", { children: renderAction("changeBackgroundColor") })), showFillIcons && renderAction("changeFillStyle"), ((0, scene_1.hasStrokeWidth)(appState.activeTool.type) ||
                targetElements.some((element) => (0, scene_1.hasStrokeWidth)(element.type))) &&
                renderAction("changeStrokeWidth"), (appState.activeTool.type === "freedraw" ||
                targetElements.some((element) => element.type === "freedraw")) &&
                renderAction("changeStrokeShape"), ((0, scene_1.hasStrokeStyle)(appState.activeTool.type) ||
                targetElements.some((element) => (0, scene_1.hasStrokeStyle)(element.type))) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("changeStrokeStyle"), renderAction("changeSloppiness")] })), ((0, scene_1.canChangeRoundness)(appState.activeTool.type) ||
                targetElements.some((element) => (0, scene_1.canChangeRoundness)(element.type))) && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderAction("changeRoundness") })), ((0, element_1.toolIsArrow)(appState.activeTool.type) ||
                targetElements.some((element) => (0, element_1.toolIsArrow)(element.type))) && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderAction("changeArrowType") })), (appState.activeTool.type === "text" ||
                targetElements.some(element_1.isTextElement)) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("fieldset", { children: renderAction("changeFontFamily") }), renderAction("changeFontSize"), (appState.activeTool.type === "text" ||
                        (0, element_1.suppportsHorizontalAlign)(targetElements, elementsMap)) &&
                        renderAction("changeTextAlign")] })), (0, element_1.shouldAllowVerticalAlign)(targetElements, elementsMap) &&
                renderAction("changeVerticalAlign"), ((0, scene_1.canHaveArrowheads)(appState.activeTool.type) ||
                targetElements.some((element) => (0, scene_1.canHaveArrowheads)(element.type))) && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderAction("changeArrowhead") })), renderAction("changeOpacity"), (0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.layers") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [renderAction("sendToBack"), renderAction("sendBackward"), renderAction("bringForward"), renderAction("bringToFront")] })] }), showAlignActions && !isSingleElementBoundContainer && ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.align") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [isRTL ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("alignRight"), renderAction("alignHorizontallyCentered"), renderAction("alignLeft")] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("alignLeft"), renderAction("alignHorizontallyCentered"), renderAction("alignRight")] })), targetElements.length > 2 &&
                                renderAction("distributeHorizontally"), (0, jsx_runtime_1.jsx)("div", { style: { flexBasis: "100%", height: 0 } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: ".5rem",
                                    marginTop: "-0.5rem",
                                }, children: [renderAction("alignTop"), renderAction("alignVerticallyCentered"), renderAction("alignBottom"), targetElements.length > 2 &&
                                        renderAction("distributeVertically")] })] })] })), !isEditingTextOrNewElement && targetElements.length > 0 && ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.actions") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [editorInterface.formFactor !== "phone" &&
                                renderAction("duplicateSelection"), editorInterface.formFactor !== "phone" &&
                                renderAction("deleteSelectedElements"), renderAction("group"), renderAction("ungroup"), showLinkIcon && renderAction("hyperlink"), showCropEditorAction && renderAction("cropEditor"), showLineEditorAction && renderAction("toggleLinearEditor")] })] }))] }));
};
exports.SelectedShapeActions = SelectedShapeActions;
const CombinedShapeProperties = ({ appState, renderAction, setAppState, targetElements, container, }) => {
    const showFillIcons = ((0, scene_1.hasBackground)(appState.activeTool.type) &&
        !(0, common_1.isTransparent)(appState.currentItemBackgroundColor)) ||
        targetElements.some((element) => (0, scene_1.hasBackground)(element.type) && !(0, common_1.isTransparent)(element.backgroundColor));
    const shouldShowCombinedProperties = targetElements.length > 0 ||
        (appState.activeTool.type !== "selection" &&
            appState.activeTool.type !== "eraser" &&
            appState.activeTool.type !== "hand" &&
            appState.activeTool.type !== "laser" &&
            appState.activeTool.type !== "lasso");
    const isOpen = appState.openPopup === "compactStrokeStyles";
    if (!shouldShowCombinedProperties) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isOpen, onOpenChange: (open) => {
                if (open) {
                    setAppState({ openPopup: "compactStrokeStyles" });
                }
                else {
                    setAppState({ openPopup: null });
                }
            }, children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, clsx_1.default)("compact-action-button properties-trigger", {
                            active: isOpen,
                        }), title: (0, i18n_1.t)("labels.stroke"), onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAppState({
                                openPopup: isOpen ? null : "compactStrokeStyles",
                            });
                        }, children: icons_1.adjustmentsIcon }) }), isOpen && ((0, jsx_runtime_1.jsx)(PropertiesPopover_1.PropertiesPopover, { className: PROPERTIES_CLASSES, container: container, style: { maxWidth: "13rem" }, onClose: () => { }, children: (0, jsx_runtime_1.jsxs)("div", { className: "selected-shape-actions", children: [showFillIcons && renderAction("changeFillStyle"), ((0, scene_1.hasStrokeWidth)(appState.activeTool.type) ||
                                targetElements.some((element) => (0, scene_1.hasStrokeWidth)(element.type))) &&
                                renderAction("changeStrokeWidth"), ((0, scene_1.hasStrokeStyle)(appState.activeTool.type) ||
                                targetElements.some((element) => (0, scene_1.hasStrokeStyle)(element.type))) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("changeStrokeStyle"), renderAction("changeSloppiness")] })), ((0, scene_1.canChangeRoundness)(appState.activeTool.type) ||
                                targetElements.some((element) => (0, scene_1.canChangeRoundness)(element.type))) &&
                                renderAction("changeRoundness"), renderAction("changeOpacity")] }) }))] }) }));
};
const CombinedArrowProperties = ({ appState, renderAction, setAppState, targetElements, container, app, }) => {
    const showShowArrowProperties = (0, element_1.toolIsArrow)(appState.activeTool.type) ||
        targetElements.some((element) => (0, element_1.toolIsArrow)(element.type));
    const isOpen = appState.openPopup === "compactArrowProperties";
    if (!showShowArrowProperties) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isOpen, onOpenChange: (open) => {
                if (open) {
                    setAppState({ openPopup: "compactArrowProperties" });
                }
                else {
                    setAppState({ openPopup: null });
                }
            }, children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, clsx_1.default)("compact-action-button properties-trigger", {
                            active: isOpen,
                        }), title: (0, i18n_1.t)("labels.arrowtypes"), onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAppState({
                                openPopup: isOpen ? null : "compactArrowProperties",
                            });
                        }, children: (() => {
                            // Show an icon based on the current arrow type
                            const arrowType = (0, actionProperties_1.getFormValue)(targetElements, app, (element) => {
                                if ((0, element_1.isArrowElement)(element)) {
                                    return element.elbowed
                                        ? "elbow"
                                        : element.roundness
                                            ? "round"
                                            : "sharp";
                                }
                                return null;
                            }, (element) => (0, element_1.isArrowElement)(element), (hasSelection) => hasSelection ? null : appState.currentItemArrowType);
                            if (arrowType === "elbow") {
                                return icons_1.elbowArrowIcon;
                            }
                            if (arrowType === "round") {
                                return icons_1.roundArrowIcon;
                            }
                            return icons_1.sharpArrowIcon;
                        })() }) }), isOpen && ((0, jsx_runtime_1.jsx)(PropertiesPopover_1.PropertiesPopover, { container: container, className: "properties-content", style: { maxWidth: "13rem" }, onClose: () => { }, children: renderAction("changeArrowProperties") }))] }) }));
};
const CombinedTextProperties = ({ appState, renderAction, setAppState, targetElements, container, elementsMap, }) => {
    const { saveCaretPosition, restoreCaretPosition } = (0, useTextEditorFocus_1.useTextEditorFocus)();
    const isOpen = appState.openPopup === "compactTextProperties";
    return ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isOpen, onOpenChange: (open) => {
                if (open) {
                    if (appState.editingTextElement) {
                        saveCaretPosition();
                    }
                    setAppState({ openPopup: "compactTextProperties" });
                }
                else {
                    setAppState({ openPopup: null });
                    if (appState.editingTextElement) {
                        restoreCaretPosition();
                    }
                }
            }, children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, clsx_1.default)("compact-action-button properties-trigger", {
                            active: isOpen,
                        }), title: (0, i18n_1.t)("labels.textAlign"), onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isOpen) {
                                setAppState({ openPopup: null });
                            }
                            else {
                                if (appState.editingTextElement) {
                                    saveCaretPosition();
                                }
                                setAppState({ openPopup: "compactTextProperties" });
                            }
                        }, children: icons_1.TextSizeIcon }) }), appState.openPopup === "compactTextProperties" && ((0, jsx_runtime_1.jsx)(PropertiesPopover_1.PropertiesPopover, { className: PROPERTIES_CLASSES, container: container, style: { maxWidth: "13rem" }, 
                    // Improve focus handling for text editing scenarios
                    preventAutoFocusOnTouch: !!appState.editingTextElement, onClose: () => {
                        // Refocus text editor when popover closes with caret restoration
                        if (appState.editingTextElement) {
                            restoreCaretPosition();
                        }
                    }, children: (0, jsx_runtime_1.jsxs)("div", { className: "selected-shape-actions", children: [(appState.activeTool.type === "text" ||
                                targetElements.some(element_1.isTextElement)) &&
                                renderAction("changeFontSize"), (appState.activeTool.type === "text" ||
                                (0, element_1.suppportsHorizontalAlign)(targetElements, elementsMap)) &&
                                renderAction("changeTextAlign"), (0, element_1.shouldAllowVerticalAlign)(targetElements, elementsMap) &&
                                renderAction("changeVerticalAlign")] }) }))] }) }));
};
const CombinedExtraActions = ({ appState, renderAction, targetElements, setAppState, container, app, showDuplicate, showDelete, }) => {
    const isEditingTextOrNewElement = Boolean(appState.editingTextElement || appState.newElement);
    const showCropEditorAction = !appState.croppingElementId &&
        targetElements.length === 1 &&
        (0, element_1.isImageElement)(targetElements[0]);
    const showLinkIcon = targetElements.length === 1;
    const showAlignActions = (0, actionAlign_1.alignActionsPredicate)(appState, app);
    let isSingleElementBoundContainer = false;
    if (targetElements.length === 2 &&
        ((0, element_1.hasBoundTextElement)(targetElements[0]) ||
            (0, element_1.hasBoundTextElement)(targetElements[1]))) {
        isSingleElementBoundContainer = true;
    }
    const isRTL = document.documentElement.getAttribute("dir") === "rtl";
    const isOpen = appState.openPopup === "compactOtherProperties";
    if (isEditingTextOrNewElement || targetElements.length === 0) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: (0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isOpen, onOpenChange: (open) => {
                if (open) {
                    setAppState({ openPopup: "compactOtherProperties" });
                }
                else {
                    setAppState({ openPopup: null });
                }
            }, children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, clsx_1.default)("compact-action-button properties-trigger", {
                            active: isOpen,
                        }), title: (0, i18n_1.t)("labels.actions"), onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAppState({
                                openPopup: isOpen ? null : "compactOtherProperties",
                            });
                        }, children: icons_1.DotsHorizontalIcon }) }), isOpen && ((0, jsx_runtime_1.jsx)(PropertiesPopover_1.PropertiesPopover, { className: PROPERTIES_CLASSES, container: container, style: {
                        maxWidth: "12rem",
                        justifyContent: "center",
                        alignItems: "center",
                    }, onClose: () => { }, children: (0, jsx_runtime_1.jsxs)("div", { className: "selected-shape-actions", children: [(0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.layers") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [renderAction("sendToBack"), renderAction("sendBackward"), renderAction("bringForward"), renderAction("bringToFront")] })] }), showAlignActions && !isSingleElementBoundContainer && ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.align") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [isRTL ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("alignRight"), renderAction("alignHorizontallyCentered"), renderAction("alignLeft")] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [renderAction("alignLeft"), renderAction("alignHorizontallyCentered"), renderAction("alignRight")] })), targetElements.length > 2 &&
                                                renderAction("distributeHorizontally"), (0, jsx_runtime_1.jsx)("div", { style: { flexBasis: "100%", height: 0 } }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: ".5rem",
                                                    marginTop: "-0.5rem",
                                                }, children: [renderAction("alignTop"), renderAction("alignVerticallyCentered"), renderAction("alignBottom"), targetElements.length > 2 &&
                                                        renderAction("distributeVertically")] })] })] })), (0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.actions") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [renderAction("group"), renderAction("ungroup"), showLinkIcon && renderAction("hyperlink"), showCropEditorAction && renderAction("cropEditor"), showDuplicate && renderAction("duplicateSelection"), showDelete && renderAction("deleteSelectedElements")] })] })] }) }))] }) }));
};
const LinearEditorAction = ({ appState, renderAction, targetElements, }) => {
    const showLineEditorAction = !appState.selectedLinearElement?.isEditing &&
        targetElements.length === 1 &&
        (0, element_1.isLinearElement)(targetElements[0]) &&
        !(0, element_1.isElbowArrow)(targetElements[0]);
    if (!showLineEditorAction) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("toggleLinearEditor") }));
};
const CompactShapeActions = ({ appState, elementsMap, renderAction, app, setAppState, }) => {
    const targetElements = (0, scene_1.getTargetElements)(elementsMap, appState);
    const { container } = (0, App_1.useExcalidrawContainer)();
    const isEditingTextOrNewElement = Boolean(appState.editingTextElement || appState.newElement);
    const showLineEditorAction = !appState.selectedLinearElement?.isEditing &&
        targetElements.length === 1 &&
        (0, element_1.isLinearElement)(targetElements[0]) &&
        !(0, element_1.isElbowArrow)(targetElements[0]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "compact-shape-actions", children: [(0, exports.canChangeStrokeColor)(appState, targetElements) && ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("compact-action-item"), children: renderAction("changeStrokeColor") })), (0, exports.canChangeBackgroundColor)(appState, targetElements) && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("changeBackgroundColor") })), (0, jsx_runtime_1.jsx)(CombinedShapeProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container }), (0, jsx_runtime_1.jsx)(CombinedArrowProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container, app: app }), showLineEditorAction && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("toggleLinearEditor") })), (appState.activeTool.type === "text" ||
                targetElements.some(element_1.isTextElement)) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("changeFontFamily") }), (0, jsx_runtime_1.jsx)(CombinedTextProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container, elementsMap: elementsMap })] })), !isEditingTextOrNewElement && targetElements.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("duplicateSelection") })), !isEditingTextOrNewElement && targetElements.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("deleteSelectedElements") })), (0, jsx_runtime_1.jsx)(CombinedExtraActions, { appState: appState, renderAction: renderAction, targetElements: targetElements, setAppState: setAppState, container: container, app: app })] }));
};
exports.CompactShapeActions = CompactShapeActions;
const MobileShapeActions = ({ appState, elementsMap, renderAction, app, setAppState, }) => {
    const targetElements = (0, scene_1.getTargetElements)(elementsMap, appState);
    const { container } = (0, App_1.useExcalidrawContainer)();
    const mobileActionsRef = (0, react_1.useRef)(null);
    const ACTIONS_WIDTH = mobileActionsRef.current?.getBoundingClientRect()?.width ?? 0;
    // 7 actions + 2 for undo/redo
    const MIN_ACTIONS = 9;
    const GAP = 6;
    const WIDTH = 32;
    const MIN_WIDTH = MIN_ACTIONS * WIDTH + (MIN_ACTIONS - 1) * GAP;
    const ADDITIONAL_WIDTH = WIDTH + GAP;
    const showDeleteOutside = ACTIONS_WIDTH >= MIN_WIDTH + ADDITIONAL_WIDTH;
    const showDuplicateOutside = ACTIONS_WIDTH >= MIN_WIDTH + 2 * ADDITIONAL_WIDTH;
    return ((0, jsx_runtime_1.jsxs)(Island_1.Island, { className: "compact-shape-actions mobile-shape-actions", style: {
            flexDirection: "row",
            boxShadow: "none",
            padding: 0,
            zIndex: 2,
            backgroundColor: "transparent",
            height: WIDTH * 1.35,
            marginBottom: 4,
            alignItems: "center",
            gap: GAP,
            pointerEvents: "none",
        }, ref: mobileActionsRef, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    display: "flex",
                    flexDirection: "row",
                    gap: GAP,
                    flex: 1,
                }, children: [(0, exports.canChangeStrokeColor)(appState, targetElements) && ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("compact-action-item"), children: renderAction("changeStrokeColor") })), (0, exports.canChangeBackgroundColor)(appState, targetElements) && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("changeBackgroundColor") })), (0, jsx_runtime_1.jsx)(CombinedShapeProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container }), (0, jsx_runtime_1.jsx)(CombinedArrowProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container, app: app }), (0, jsx_runtime_1.jsx)(LinearEditorAction, { appState: appState, renderAction: renderAction, targetElements: targetElements }), (appState.activeTool.type === "text" ||
                        targetElements.some(element_1.isTextElement)) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("changeFontFamily") }), (0, jsx_runtime_1.jsx)(CombinedTextProperties, { appState: appState, renderAction: renderAction, setAppState: setAppState, targetElements: targetElements, container: container, elementsMap: elementsMap })] })), (0, jsx_runtime_1.jsx)(CombinedExtraActions, { appState: appState, renderAction: renderAction, targetElements: targetElements, setAppState: setAppState, container: container, app: app, showDuplicate: !showDuplicateOutside, showDelete: !showDeleteOutside })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: "flex",
                    flexDirection: "row",
                    gap: GAP,
                }, children: [(0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("undo") }), (0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("redo") }), showDuplicateOutside && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("duplicateSelection") })), showDeleteOutside && ((0, jsx_runtime_1.jsx)("div", { className: "compact-action-item", children: renderAction("deleteSelectedElements") }))] })] }));
};
exports.MobileShapeActions = MobileShapeActions;
const ShapesSwitcher = ({ activeTool, setAppState, app, UIOptions, }) => {
    const [isExtraToolsMenuOpen, setIsExtraToolsMenuOpen] = (0, react_1.useState)(false);
    const stylesPanelMode = (0, App_1.useStylesPanelMode)();
    const isFullStylesPanel = stylesPanelMode === "full";
    const isCompactStylesPanel = stylesPanelMode === "compact";
    const SELECTION_TOOLS = [
        {
            type: "selection",
            icon: icons_1.SelectionIcon,
            title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.selection")),
        },
        {
            type: "lasso",
            icon: icons_1.LassoIcon,
            title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.lasso")),
        },
    ];
    const frameToolSelected = activeTool.type === "frame";
    const laserToolSelected = activeTool.type === "laser";
    const lassoToolSelected = isFullStylesPanel &&
        activeTool.type === "lasso" &&
        app.state.preferredSelectionTool.type !== "lasso";
    const embeddableToolSelected = activeTool.type === "embeddable";
    const { TTDDialogTriggerTunnel } = (0, tunnels_1.useTunnels)();
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, shapes_1.getToolbarTools)(app).map(({ value, icon, key, numericKey, fillable, toolbar }) => {
                if (toolbar === false ||
                    UIOptions.tools?.[value] === false) {
                    return null;
                }
                const label = (0, i18n_1.t)(`toolBar.${value}`);
                const letter = key && (0, common_1.capitalizeString)(typeof key === "string" ? key : key[0]);
                const shortcut = letter
                    ? `${letter} ${(0, i18n_1.t)("helpDialog.or")} ${numericKey}`
                    : `${numericKey}`;
                const keybindingLabel = value === "hand" ? undefined : numericKey || letter;
                // when in compact styles panel mode (tablet)
                // use a ToolPopover for selection/lasso toggle as well
                if ((value === "selection" || value === "lasso") &&
                    isCompactStylesPanel) {
                    return ((0, jsx_runtime_1.jsx)(ToolPopover_1.ToolPopover, { app: app, options: SELECTION_TOOLS, activeTool: activeTool, defaultOption: app.state.preferredSelectionTool.type, namePrefix: "selectionType", title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.selection")), "data-testid": "toolbar-selection", onToolChange: (type) => {
                            if (type === "selection" || type === "lasso") {
                                app.setActiveTool({ type });
                                setAppState({
                                    preferredSelectionTool: { type, initialized: true },
                                });
                            }
                        }, displayedOption: SELECTION_TOOLS.find((tool) => tool.type === app.state.preferredSelectionTool.type) || SELECTION_TOOLS[0], fillable: activeTool.type === "selection" }, "selection-popover"));
                }
                return ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)("Shape", { fillable }), type: "radio", icon: icon, checked: activeTool.type === value, name: "editor-current-shape", title: `${(0, common_1.capitalizeString)(label)} — ${shortcut}`, keyBindingLabel: keybindingLabel, "aria-label": (0, common_1.capitalizeString)(label), "aria-keyshortcuts": shortcut, "data-testid": `toolbar-${value}`, onPointerDown: ({ pointerType }) => {
                        if (!app.state.penDetected && pointerType === "pen") {
                            app.togglePenMode(true);
                        }
                        if (value === "selection") {
                            if (app.state.activeTool.type === "selection") {
                                app.setActiveTool({ type: "lasso" });
                            }
                            else {
                                app.setActiveTool({ type: "selection" });
                            }
                        }
                    }, onChange: ({ pointerType }) => {
                        if (app.state.activeTool.type !== value) {
                            (0, analytics_1.trackEvent)("toolbar", value, "ui");
                        }
                        if (value === "image") {
                            app.setActiveTool({
                                type: value,
                            });
                        }
                        else {
                            app.setActiveTool({ type: value });
                        }
                    } }, value));
            }), (0, jsx_runtime_1.jsx)("div", { className: "App-toolbar__divider" }), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default, { open: isExtraToolsMenuOpen, children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Trigger, { className: (0, clsx_1.default)("App-toolbar__extra-tools-trigger", {
                            "App-toolbar__extra-tools-trigger--selected": frameToolSelected ||
                                embeddableToolSelected ||
                                lassoToolSelected ||
                                // in collab we're already highlighting the laser button
                                // outside toolbar, so let's not highlight extra-tools button
                                // on top of it
                                (laserToolSelected && !app.props.isCollaborating),
                        }), onToggle: () => {
                            setIsExtraToolsMenuOpen(!isExtraToolsMenuOpen);
                            setAppState({ openMenu: null, openPopup: null });
                        }, title: (0, i18n_1.t)("toolBar.extraTools"), children: frameToolSelected
                            ? icons_1.frameToolIcon
                            : embeddableToolSelected
                                ? icons_1.EmbedIcon
                                : laserToolSelected && !app.props.isCollaborating
                                    ? icons_1.laserPointerToolIcon
                                    : lassoToolSelected
                                        ? icons_1.LassoIcon
                                        : icons_1.extraToolsIcon }), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default.Content, { onClickOutside: () => setIsExtraToolsMenuOpen(false), onSelect: () => setIsExtraToolsMenuOpen(false), className: "App-toolbar__extra-tools-dropdown", children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "frame" }), icon: icons_1.frameToolIcon, shortcut: common_1.KEYS.F.toLocaleUpperCase(), "data-testid": "toolbar-frame", selected: frameToolSelected, children: (0, i18n_1.t)("toolBar.frame") }), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "embeddable" }), icon: icons_1.EmbedIcon, "data-testid": "toolbar-embeddable", selected: embeddableToolSelected, children: (0, i18n_1.t)("toolBar.embeddable") }), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "laser" }), icon: icons_1.laserPointerToolIcon, "data-testid": "toolbar-laser", selected: laserToolSelected, shortcut: common_1.KEYS.K.toLocaleUpperCase(), children: (0, i18n_1.t)("toolBar.laser") }), isFullStylesPanel && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "lasso" }), icon: icons_1.LassoIcon, "data-testid": "toolbar-lasso", selected: lassoToolSelected, children: (0, i18n_1.t)("toolBar.lasso") })), (0, jsx_runtime_1.jsx)("div", { style: { margin: "6px 0", fontSize: 14, fontWeight: 600 }, children: "Generate" }), app.props.aiEnabled !== false && (0, jsx_runtime_1.jsx)(TTDDialogTriggerTunnel.Out, {}), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setOpenDialog({ name: "ttd", tab: "mermaid" }), icon: icons_1.mermaidLogoIcon, "data-testid": "toolbar-embeddable", children: (0, i18n_1.t)("toolBar.mermaidToExcalidraw") }), app.props.aiEnabled !== false && app.plugins.diagramToCode && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.onMagicframeToolSelect(), icon: icons_1.MagicIcon, "data-testid": "toolbar-magicframe", badge: (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item.Badge, { children: "AI" }), children: (0, i18n_1.t)("toolBar.magicframe") }))] })] })] }));
};
exports.ShapesSwitcher = ShapesSwitcher;
const ZoomActions = ({ renderAction, zoom, }) => ((0, jsx_runtime_1.jsx)(Stack_1.default.Col, { gap: 1, className: common_1.CLASSES.ZOOM_ACTIONS, children: (0, jsx_runtime_1.jsxs)(Stack_1.default.Row, { align: "center", children: [renderAction("zoomOut"), renderAction("resetZoom"), renderAction("zoomIn")] }) }));
exports.ZoomActions = ZoomActions;
const UndoRedoActions = ({ renderAction, className, }) => ((0, jsx_runtime_1.jsxs)("div", { className: `undo-redo-buttons ${className}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "undo-button-container", children: (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: (0, i18n_1.t)("buttons.undo"), children: renderAction("undo") }) }), (0, jsx_runtime_1.jsx)("div", { className: "redo-button-container", children: (0, jsx_runtime_1.jsxs)(Tooltip_1.Tooltip, { label: (0, i18n_1.t)("buttons.redo"), children: [" ", renderAction("redo")] }) })] }));
exports.UndoRedoActions = UndoRedoActions;
const ExitZenModeButton = ({ actionManager, showExitZenModeBtn, }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: (0, clsx_1.default)("disable-zen-mode", {
        "disable-zen-mode--visible": showExitZenModeBtn,
    }), onClick: () => actionManager.executeAction(actions_1.actionToggleZenMode), children: (0, i18n_1.t)("buttons.exitZenMode") }));
exports.ExitZenModeButton = ExitZenModeButton;
const ExitViewModeButton = ({ actionManager, }) => ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "disable-view-mode", onClick: () => actionManager.executeAction(actionToggleViewMode_1.actionToggleViewMode), children: icons_1.pencilIcon }));
exports.ExitViewModeButton = ExitViewModeButton;
