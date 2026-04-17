"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolPopover = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const common_1 = require("@excalidraw/common");
const radix_ui_1 = require("radix-ui");
const analytics_1 = require("../analytics");
const ToolButton_1 = require("./ToolButton");
require("./ToolPopover.scss");
const App_1 = require("./App");
const ToolPopover = ({ app, options, activeTool, defaultOption, className = "Shape", namePrefix, title, "data-testid": dataTestId, onToolChange, displayedOption, fillable = false, }) => {
    const [isPopupOpen, setIsPopupOpen] = (0, react_1.useState)(false);
    const currentType = activeTool.type;
    const isActive = displayedOption.type === currentType;
    const SIDE_OFFSET = 32 / 2 + 10;
    const { container } = (0, App_1.useExcalidrawContainer)();
    // if currentType is not in options, close popup
    if (!options.some((o) => o.type === currentType) && isPopupOpen) {
        setIsPopupOpen(false);
    }
    // Close popover when user starts interacting with the canvas (pointer down)
    (0, react_1.useEffect)(() => {
        // app.onPointerDownEmitter emits when pointer down happens on canvas area
        const unsubscribe = app.onPointerDownEmitter.on(() => {
            setIsPopupOpen(false);
        });
        return () => unsubscribe?.();
    }, [app]);
    return ((0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { open: isPopupOpen, children: [(0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Trigger, { asChild: true, children: (0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)(className, {
                        fillable,
                        active: options.some((o) => o.type === activeTool.type),
                    }), type: "radio", icon: displayedOption.icon, checked: isActive, name: "editor-current-shape", title: title, "aria-label": title, "data-testid": dataTestId, onPointerDown: () => {
                        setIsPopupOpen((v) => !v);
                        onToolChange(defaultOption);
                    } }) }), (0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Content, { className: "tool-popover-content", sideOffset: SIDE_OFFSET, collisionBoundary: container ?? undefined, children: options.map(({ type, icon, title }) => ((0, jsx_runtime_1.jsx)(ToolButton_1.ToolButton, { className: (0, clsx_1.default)(className, {
                        active: currentType === type,
                    }), type: "radio", icon: icon, checked: currentType === type, name: `${namePrefix}-option`, title: title || (0, common_1.capitalizeString)(type), keyBindingLabel: "", "aria-label": title || (0, common_1.capitalizeString)(type), "data-testid": `toolbar-${type}`, onChange: () => {
                        if (app.state.activeTool.type !== type) {
                            (0, analytics_1.trackEvent)("toolbar", type, "ui");
                        }
                        app.setActiveTool({ type: type });
                        onToolChange?.(type);
                    } }, type))) })] }));
};
exports.ToolPopover = ToolPopover;
