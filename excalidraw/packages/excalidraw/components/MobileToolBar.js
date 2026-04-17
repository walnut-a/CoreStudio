"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileToolBar = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const analytics_1 = require("../analytics");
const i18n_1 = require("../i18n");
const appState_1 = require("../appState");
const tunnels_1 = require("../context/tunnels");
const HandButton_1 = require("./HandButton");
const ToolButton_1 = require("./ToolButton");
const DropdownMenu_1 = __importDefault(require("./dropdownMenu/DropdownMenu"));
const ToolPopover_1 = require("./ToolPopover");
const icons_1 = require("./icons");
require("./ToolIcon.scss");
require("./MobileToolBar.scss");
const SHAPE_TOOLS = [
    {
        type: "rectangle",
        icon: icons_1.RectangleIcon,
        title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.rectangle")),
    },
    {
        type: "diamond",
        icon: icons_1.DiamondIcon,
        title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.diamond")),
    },
    {
        type: "ellipse",
        icon: icons_1.EllipseIcon,
        title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.ellipse")),
    },
];
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
const LINEAR_ELEMENT_TOOLS = [
    {
        type: "arrow",
        icon: icons_1.ArrowIcon,
        title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.arrow")),
    },
    { type: "line", icon: icons_1.LineIcon, title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.line")) },
];
const MobileToolBar = ({ app, onHandToolToggle, setAppState, }) => {
    const activeTool = app.state.activeTool;
    const [isOtherShapesMenuOpen, setIsOtherShapesMenuOpen] = (0, react_1.useState)(false);
    const [lastActiveGenericShape, setLastActiveGenericShape] = (0, react_1.useState)("rectangle");
    const [lastActiveLinearElement, setLastActiveLinearElement] = (0, react_1.useState)("arrow");
    // keep lastActiveGenericShape in sync with active tool if user switches via other UI
    (0, react_1.useEffect)(() => {
        if (activeTool.type === "rectangle" ||
            activeTool.type === "diamond" ||
            activeTool.type === "ellipse") {
            setLastActiveGenericShape(activeTool.type);
        }
    }, [activeTool.type]);
    // keep lastActiveLinearElement in sync with active tool if user switches via other UI
    (0, react_1.useEffect)(() => {
        if (activeTool.type === "arrow" || activeTool.type === "line") {
            setLastActiveLinearElement(activeTool.type);
        }
    }, [activeTool.type]);
    const frameToolSelected = activeTool.type === "frame";
    const laserToolSelected = activeTool.type === "laser";
    const embeddableToolSelected = activeTool.type === "embeddable";
    const { TTDDialogTriggerTunnel } = (0, tunnels_1.useTunnels)();
    const handleToolChange = (toolType, pointerType) => {
        if (app.state.activeTool.type !== toolType) {
            (0, analytics_1.trackEvent)("toolbar", toolType, "ui");
        }
        if (toolType === "selection") {
            if (app.state.activeTool.type === "selection") {
                // Toggle selection tool behavior if needed
            }
            else {
                app.setActiveTool({ type: "selection" });
            }
        }
        else {
            app.setActiveTool({ type: toolType });
        }
    };
    const [toolbarWidth, setToolbarWidth] = (0, react_1.useState)(0);
    const WIDTH = 36;
    const GAP = 4;
    // hand, selection, freedraw, eraser, rectangle, arrow, others
    const MIN_TOOLS = 7;
    const MIN_WIDTH = MIN_TOOLS * WIDTH + (MIN_TOOLS - 1) * GAP;
    const ADDITIONAL_WIDTH = WIDTH + GAP;
    const showTextToolOutside = toolbarWidth >= MIN_WIDTH + 1 * ADDITIONAL_WIDTH;
    const showImageToolOutside = toolbarWidth >= MIN_WIDTH + 2 * ADDITIONAL_WIDTH;
    const showFrameToolOutside = toolbarWidth >= MIN_WIDTH + 3 * ADDITIONAL_WIDTH;
    const extraTools = [
        "text",
        "frame",
        "embeddable",
        "laser",
        "magicframe",
    ].filter((tool) => {
        if (showTextToolOutside && tool === "text") {
            return false;
        }
        if (showImageToolOutside && tool === "image") {
            return false;
        }
        if (showFrameToolOutside && tool === "frame") {
            return false;
        }
        return true;
    });
    const extraToolSelected = extraTools.includes(activeTool.type);
    const extraIcon = extraToolSelected
        ? activeTool.type === "text"
            ? icons_1.TextIcon
            : activeTool.type === "image"
                ? icons_1.ImageIcon
                : activeTool.type === "frame"
                    ? icons_1.frameToolIcon
                    : activeTool.type === "embeddable"
                        ? icons_1.EmbedIcon
                        : activeTool.type === "laser"
                            ? icons_1.laserPointerToolIcon
                            : activeTool.type === "magicframe"
                                ? icons_1.MagicIcon
                                : icons_1.extraToolsIcon
        : icons_1.extraToolsIcon;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mobile-toolbar", ref: (div) => {
            if (div) {
                setToolbarWidth(div.getBoundingClientRect().width);
            }
        }, children: [(0, jsx_runtime_1.jsx)(HandButton_1.HandButton, { checked: (0, appState_1.isHandToolActive)(app.state), onChange: onHandToolToggle, title: (0, i18n_1.t)("toolBar.hand"), isMobile: true }), (0, jsx_runtime_1.jsx)(ToolPopover_1.ToolPopover, { app: app, options: SELECTION_TOOLS, activeTool: activeTool, defaultOption: app.state.preferredSelectionTool.type, namePrefix: "selectionType", title: (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.selection")), "data-testid": "toolbar-selection", onToolChange: (type) => {
                    if (type === "selection" || type === "lasso") {
                        app.setActiveTool({ type });
                        setAppState({
                            preferredSelectionTool: { type, initialized: true },
                        });
                    }
                }, displayedOption: SELECTION_TOOLS.find((tool) => tool.type === app.state.preferredSelectionTool.type) || SELECTION_TOOLS[0] }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)({
                    active: activeTool.type === "freedraw",
                }), type: "radio", icon: icons_1.FreedrawIcon, checked: activeTool.type === "freedraw", name: "editor-current-shape", title: `${(0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.freedraw"))}`, "aria-label": (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.freedraw")), "data-testid": "toolbar-freedraw", onChange: () => handleToolChange("freedraw") }), (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)({
                    active: activeTool.type === "eraser",
                }), type: "radio", icon: icons_1.EraserIcon, checked: activeTool.type === "eraser", name: "editor-current-shape", title: `${(0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.eraser"))}`, "aria-label": (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.eraser")), "data-testid": "toolbar-eraser", onChange: () => handleToolChange("eraser") }), (0, jsx_runtime_1.jsx)(ToolPopover_1.ToolPopover, { app: app, options: SHAPE_TOOLS, activeTool: activeTool, defaultOption: lastActiveGenericShape, namePrefix: "shapeType", title: (0, common_1.capitalizeString)((0, i18n_1.t)(lastActiveGenericShape === "rectangle"
                    ? "toolBar.rectangle"
                    : lastActiveGenericShape === "diamond"
                        ? "toolBar.diamond"
                        : lastActiveGenericShape === "ellipse"
                            ? "toolBar.ellipse"
                            : "toolBar.rectangle")), "data-testid": "toolbar-rectangle", onToolChange: (type) => {
                    if (type === "rectangle" ||
                        type === "diamond" ||
                        type === "ellipse") {
                        setLastActiveGenericShape(type);
                        app.setActiveTool({ type });
                    }
                }, displayedOption: SHAPE_TOOLS.find((tool) => tool.type === lastActiveGenericShape) ||
                    SHAPE_TOOLS[0] }), (0, jsx_runtime_1.jsx)(ToolPopover_1.ToolPopover, { app: app, options: LINEAR_ELEMENT_TOOLS, activeTool: activeTool, defaultOption: lastActiveLinearElement, namePrefix: "linearElementType", title: (0, common_1.capitalizeString)((0, i18n_1.t)(lastActiveLinearElement === "arrow"
                    ? "toolBar.arrow"
                    : "toolBar.line")), "data-testid": "toolbar-arrow", fillable: true, onToolChange: (type) => {
                    if (type === "arrow" || type === "line") {
                        setLastActiveLinearElement(type);
                        app.setActiveTool({ type });
                    }
                }, displayedOption: LINEAR_ELEMENT_TOOLS.find((tool) => tool.type === lastActiveLinearElement) || LINEAR_ELEMENT_TOOLS[0] }), showTextToolOutside && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)({
                    active: activeTool.type === "text",
                }), type: "radio", icon: icons_1.TextIcon, checked: activeTool.type === "text", name: "editor-current-shape", title: `${(0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.text"))}`, "aria-label": (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.text")), "data-testid": "toolbar-text", onChange: () => handleToolChange("text") })), showImageToolOutside && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)({
                    active: activeTool.type === "image",
                }), type: "radio", icon: icons_1.ImageIcon, checked: activeTool.type === "image", name: "editor-current-shape", title: `${(0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.image"))}`, "aria-label": (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.image")), "data-testid": "toolbar-image", onChange: () => handleToolChange("image") })), showFrameToolOutside && ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)({ active: frameToolSelected }), type: "radio", icon: icons_1.frameToolIcon, checked: frameToolSelected, name: "editor-current-shape", title: `${(0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.frame"))}`, "aria-label": (0, common_1.capitalizeString)((0, i18n_1.t)("toolBar.frame")), "data-testid": "toolbar-frame", onChange: () => handleToolChange("frame") })), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default, { open: isOtherShapesMenuOpen, children: [(0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Trigger, { className: (0, clsx_1.default)("App-toolbar__extra-tools-trigger App-toolbar__extra-tools-trigger--mobile", {
                            "App-toolbar__extra-tools-trigger--selected": extraToolSelected || isOtherShapesMenuOpen,
                        }), onToggle: () => {
                            setIsOtherShapesMenuOpen(!isOtherShapesMenuOpen);
                            setAppState({ openMenu: null, openPopup: null });
                        }, title: (0, i18n_1.t)("toolBar.extraTools"), style: {
                            width: WIDTH,
                            height: WIDTH,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }, children: extraIcon }), (0, jsx_runtime_1.jsxs)(DropdownMenu_1.default.Content, { onClickOutside: () => setIsOtherShapesMenuOpen(false), onSelect: () => setIsOtherShapesMenuOpen(false), className: "App-toolbar__extra-tools-dropdown", align: "start", children: [!showTextToolOutside && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "text" }), icon: icons_1.TextIcon, shortcut: common_1.KEYS.T.toLocaleUpperCase(), "data-testid": "toolbar-text", selected: activeTool.type === "text", children: (0, i18n_1.t)("toolBar.text") })), !showImageToolOutside && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "image" }), icon: icons_1.ImageIcon, "data-testid": "toolbar-image", selected: activeTool.type === "image", children: (0, i18n_1.t)("toolBar.image") })), !showFrameToolOutside && ((0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "frame" }), icon: icons_1.frameToolIcon, shortcut: common_1.KEYS.F.toLocaleUpperCase(), "data-testid": "toolbar-frame", selected: frameToolSelected, children: (0, i18n_1.t)("toolBar.frame") })), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "embeddable" }), icon: icons_1.EmbedIcon, "data-testid": "toolbar-embeddable", selected: embeddableToolSelected, children: (0, i18n_1.t)("toolBar.embeddable") }), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setActiveTool({ type: "laser" }), icon: icons_1.laserPointerToolIcon, "data-testid": "toolbar-laser", selected: laserToolSelected, shortcut: common_1.KEYS.K.toLocaleUpperCase(), children: (0, i18n_1.t)("toolBar.laser") }), (0, jsx_runtime_1.jsx)("div", { style: { margin: "6px 0", fontSize: 14, fontWeight: 600 }, children: "Generate" }), app.props.aiEnabled !== false && (0, jsx_runtime_1.jsx)(TTDDialogTriggerTunnel.Out, {}), (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.setOpenDialog({ name: "ttd", tab: "mermaid" }), icon: icons_1.mermaidLogoIcon, "data-testid": "toolbar-embeddable", children: (0, i18n_1.t)("toolBar.mermaidToExcalidraw") }), app.props.aiEnabled !== false && app.plugins.diagramToCode && ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item, { onSelect: () => app.onMagicframeToolSelect(), icon: icons_1.MagicIcon, "data-testid": "toolbar-magicframe", badge: (0, jsx_runtime_1.jsx)(DropdownMenu_1.default.Item.Badge, { children: "AI" }), children: (0, i18n_1.t)("toolBar.magicframe") }) }))] })] })] }));
};
exports.MobileToolBar = MobileToolBar;
