"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarHeader = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = require("react");
const i18n_1 = require("../../i18n");
const App_1 = require("../App");
const Button_1 = require("../Button");
const Tooltip_1 = require("../Tooltip");
const icons_1 = require("../icons");
const common_1 = require("./common");
const SidebarHeader = ({ children, className, }) => {
    const editorInterface = (0, App_1.useEditorInterface)();
    const props = (0, react_1.useContext)(common_1.SidebarPropsContext);
    const renderDockButton = !!(editorInterface.canFitSidebar && props.shouldRenderDockButton);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("sidebar__header", className), "data-testid": "sidebar-header", children: [children, (0, jsx_runtime_1.jsxs)("div", { className: "sidebar__header__buttons", children: [renderDockButton && ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: (0, i18n_1.t)("labels.sidebarLock"), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { onSelect: () => props.onDock?.(!props.docked), selected: !!props.docked, className: "sidebar__dock", "data-testid": "sidebar-dock", "aria-label": (0, i18n_1.t)("labels.sidebarLock"), children: icons_1.PinIcon }) })), (0, jsx_runtime_1.jsx)(Button_1.Button, { "data-testid": "sidebar-close", className: "sidebar__close", onSelect: props.onCloseRequest, "aria-label": (0, i18n_1.t)("buttons.close"), children: icons_1.CloseIcon })] })] }));
};
exports.SidebarHeader = SidebarHeader;
exports.SidebarHeader.displayName = "SidebarHeader";
