"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = exports.SidebarInner = exports.isSidebarDockedAtom = void 0;
const react_1 = require("react");
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const react_2 = require("react");
const common_1 = require("@excalidraw/common");
const ui_appState_1 = require("../../context/ui-appState");
const editor_jotai_1 = require("../../editor-jotai");
const useOutsideClick_1 = require("../../hooks/useOutsideClick");
const App_1 = require("../App");
const Island_1 = require("../Island");
const SidebarHeader_1 = require("./SidebarHeader");
const SidebarTabTrigger_1 = require("./SidebarTabTrigger");
const SidebarTabTriggers_1 = require("./SidebarTabTriggers");
const SidebarTrigger_1 = require("./SidebarTrigger");
const common_2 = require("./common");
const SidebarTabs_1 = require("./SidebarTabs");
const SidebarTab_1 = require("./SidebarTab");
require("./Sidebar.scss");
/**
 * Flags whether the currently rendered Sidebar is docked or not, for use
 * in upstream components that need to act on this (e.g. LayerUI to shift the
 * UI). We use an atom because of potential host app sidebars (for the default
 * sidebar we could just read from appState.defaultSidebarDockedPreference).
 *
 * Since we can only render one Sidebar at a time, we can use a simple flag.
 */
exports.isSidebarDockedAtom = (0, editor_jotai_1.atom)(false);
exports.SidebarInner = (0, react_2.forwardRef)(({ name, children, onDock, docked, className, ...rest }, ref) => {
    if ((0, common_1.isDevEnv)() && onDock && docked == null) {
        console.warn("Sidebar: `docked` must be set when `onDock` is supplied for the sidebar to be user-dockable. To hide this message, either pass `docked` or remove `onDock`");
    }
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const setIsSidebarDockedAtom = (0, editor_jotai_1.useSetAtom)(exports.isSidebarDockedAtom);
    (0, react_2.useLayoutEffect)(() => {
        setIsSidebarDockedAtom(!!docked);
        return () => {
            setIsSidebarDockedAtom(false);
        };
    }, [setIsSidebarDockedAtom, docked]);
    const headerPropsRef = (0, react_2.useRef)({});
    headerPropsRef.current.onCloseRequest = () => {
        setAppState({ openSidebar: null });
    };
    headerPropsRef.current.onDock = (isDocked) => onDock?.(isDocked);
    // renew the ref object if the following props change since we want to
    // rerender. We can't pass down as component props manually because
    // the <Sidebar.Header/> can be rendered upstream.
    headerPropsRef.current = (0, common_1.updateObject)(headerPropsRef.current, {
        docked,
        // explicit prop to rerender on update
        shouldRenderDockButton: !!onDock && docked != null,
    });
    const islandRef = (0, react_2.useRef)(null);
    (0, react_2.useImperativeHandle)(ref, () => {
        return islandRef.current;
    });
    const editorInterface = (0, App_1.useEditorInterface)();
    const closeLibrary = (0, react_2.useCallback)(() => {
        const isDialogOpen = !!document.querySelector(".Dialog");
        // Prevent closing if any dialog is open
        if (isDialogOpen) {
            return;
        }
        setAppState({ openSidebar: null });
    }, [setAppState]);
    (0, useOutsideClick_1.useOutsideClick)(islandRef, (0, react_2.useCallback)((event) => {
        // If click on the library icon, do nothing so that LibraryButton
        // can toggle library menu
        if (event.target.closest(".sidebar-trigger")) {
            return;
        }
        if (!docked || !editorInterface.canFitSidebar) {
            closeLibrary();
        }
    }, [closeLibrary, docked, editorInterface.canFitSidebar]));
    (0, react_2.useEffect)(() => {
        const handleKeyDown = (event) => {
            if (event.key === common_1.KEYS.ESCAPE &&
                (!docked || !editorInterface.canFitSidebar)) {
                closeLibrary();
            }
        };
        document.addEventListener(common_1.EVENT.KEYDOWN, handleKeyDown);
        return () => {
            document.removeEventListener(common_1.EVENT.KEYDOWN, handleKeyDown);
        };
    }, [closeLibrary, docked, editorInterface.canFitSidebar]);
    return ((0, jsx_runtime_1.jsx)(Island_1.Island, { ...rest, className: (0, clsx_1.default)(common_1.CLASSES.SIDEBAR, { "sidebar--docked": docked }, className), ref: islandRef, children: (0, jsx_runtime_1.jsx)(common_2.SidebarPropsContext.Provider, { value: headerPropsRef.current, children: children }) }));
});
exports.SidebarInner.displayName = "SidebarInner";
exports.Sidebar = Object.assign((0, react_2.forwardRef)((props, ref) => {
    const appState = (0, ui_appState_1.useUIAppState)();
    const { onStateChange } = props;
    const refPrevOpenSidebar = (0, react_2.useRef)(appState.openSidebar);
    (0, react_2.useEffect)(() => {
        if (
        // closing sidebar
        ((!appState.openSidebar &&
            refPrevOpenSidebar?.current?.name === props.name) ||
            // opening current sidebar
            (appState.openSidebar?.name === props.name &&
                refPrevOpenSidebar?.current?.name !== props.name) ||
            // switching tabs or switching to a different sidebar
            refPrevOpenSidebar.current?.name === props.name) &&
            appState.openSidebar !== refPrevOpenSidebar.current) {
            onStateChange?.(appState.openSidebar?.name !== props.name
                ? null
                : appState.openSidebar);
        }
        refPrevOpenSidebar.current = appState.openSidebar;
    }, [appState.openSidebar, onStateChange, props.name]);
    const [mounted, setMounted] = (0, react_2.useState)(false);
    (0, react_2.useLayoutEffect)(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    // We want to render in the next tick (hence `mounted` flag) so that it's
    // guaranteed to happen after unmount of the previous sidebar (in case the
    // previous sidebar is mounted after the next one). This is necessary to
    // prevent flicker of subcomponents that support fallbacks
    // (e.g. SidebarHeader). This is because we're using flags to determine
    // whether prefer the fallback component or not (otherwise both will render
    // initially), and the flag won't be reset in time if the unmount order
    // it not correct.
    //
    // Alternative, and more general solution would be to namespace the fallback
    // HoC so that state is not shared between subcomponents when the wrapping
    // component is of the same type (e.g. Sidebar -> SidebarHeader).
    const shouldRender = mounted && appState.openSidebar?.name === props.name;
    if (!shouldRender) {
        return null;
    }
    return (0, react_1.createElement)(exports.SidebarInner, { ...props, ref: ref, key: props.name });
}), {
    Header: SidebarHeader_1.SidebarHeader,
    TabTriggers: SidebarTabTriggers_1.SidebarTabTriggers,
    TabTrigger: SidebarTabTrigger_1.SidebarTabTrigger,
    Tabs: SidebarTabs_1.SidebarTabs,
    Tab: SidebarTab_1.SidebarTab,
    Trigger: SidebarTrigger_1.SidebarTrigger,
});
exports.Sidebar.displayName = "Sidebar";
