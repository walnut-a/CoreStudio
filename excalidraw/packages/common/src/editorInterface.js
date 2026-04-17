"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDesktopUIMode = exports.loadDesktopUIModePreference = exports.createUserAgentDescriptor = exports.deriveStylesPanelMode = exports.getFormFactor = exports.isTabletBreakpoint = exports.isMobileBreakpoint = exports.isBrave = exports.isIOS = exports.isSafari = exports.isChrome = exports.isFirefox = exports.isAndroid = exports.isWindows = exports.isDarwin = exports.MQ_RIGHT_SIDEBAR_MIN_WIDTH = exports.MQ_MIN_WIDTH_DESKTOP = exports.MQ_MAX_TABLET = exports.MQ_MIN_TABLET = exports.MQ_MAX_HEIGHT_LANDSCAPE = exports.MQ_MAX_WIDTH_LANDSCAPE = exports.MQ_MAX_MOBILE = void 0;
// storage key
const DESKTOP_UI_MODE_STORAGE_KEY = "excalidraw.desktopUIMode";
// breakpoints
exports.MQ_MAX_MOBILE = 599;
exports.MQ_MAX_WIDTH_LANDSCAPE = 1000;
exports.MQ_MAX_HEIGHT_LANDSCAPE = 500;
// tablets
exports.MQ_MIN_TABLET = exports.MQ_MAX_MOBILE + 1; // lower bound (excludes phones)
exports.MQ_MAX_TABLET = 1180; // ipad air
// desktop/laptop (NOTE: not used for form factor detection)
exports.MQ_MIN_WIDTH_DESKTOP = 1440;
// sidebar
exports.MQ_RIGHT_SIDEBAR_MIN_WIDTH = 1229;
// -----------------------------------------------------------------------------
// user agent detections
exports.isDarwin = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
exports.isWindows = /^Win/.test(navigator.platform);
exports.isAndroid = /\b(android)\b/i.test(navigator.userAgent);
exports.isFirefox = typeof window !== "undefined" &&
    "netscape" in window &&
    navigator.userAgent.indexOf("rv:") > 1 &&
    navigator.userAgent.indexOf("Gecko") > 1;
exports.isChrome = navigator.userAgent.indexOf("Chrome") !== -1;
exports.isSafari = !exports.isChrome && navigator.userAgent.indexOf("Safari") !== -1;
exports.isIOS = /iPad|iPhone/i.test(navigator.platform) ||
    // iPadOS 13+
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);
// keeping function so it can be mocked in test
const isBrave = () => navigator.brave?.isBrave?.name === "isBrave";
exports.isBrave = isBrave;
// export const isMobile =
//   isIOS ||
//   /android|webos|ipod|blackberry|iemobile|opera mini/i.test(
//     navigator.userAgent,
//   ) ||
//   /android|ios|ipod|blackberry|windows phone/i.test(navigator.platform);
// utilities
const isMobileBreakpoint = (width, height) => {
    return (width <= exports.MQ_MAX_MOBILE ||
        (height < exports.MQ_MAX_HEIGHT_LANDSCAPE && width < exports.MQ_MAX_WIDTH_LANDSCAPE));
};
exports.isMobileBreakpoint = isMobileBreakpoint;
const isTabletBreakpoint = (editorWidth, editorHeight) => {
    const minSide = Math.min(editorWidth, editorHeight);
    const maxSide = Math.max(editorWidth, editorHeight);
    return minSide >= exports.MQ_MIN_TABLET && maxSide <= exports.MQ_MAX_TABLET;
};
exports.isTabletBreakpoint = isTabletBreakpoint;
const isMobileOrTablet = () => {
    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const uaData = navigator.userAgentData;
    // --- 1) chromium: prefer ua client hints -------------------------------
    if (uaData) {
        const plat = (uaData.platform || "").toLowerCase();
        const isDesktopOS = plat === "windows" ||
            plat === "macos" ||
            plat === "linux" ||
            plat === "chrome os";
        if (uaData.mobile === true) {
            return true;
        }
        if (uaData.mobile === false && plat === "android") {
            const looksTouchTablet = matchMedia?.("(hover: none)").matches &&
                matchMedia?.("(pointer: coarse)").matches;
            return looksTouchTablet;
        }
        if (isDesktopOS) {
            return false;
        }
    }
    // --- 2) ios (includes ipad) --------------------------------------------
    if (exports.isIOS) {
        return true;
    }
    // --- 3) android legacy ua fallback -------------------------------------
    if (exports.isAndroid) {
        const isAndroidPhone = /Mobile/i.test(ua);
        const isAndroidTablet = !isAndroidPhone;
        if (isAndroidPhone || isAndroidTablet) {
            const looksTouchTablet = matchMedia?.("(hover: none)").matches &&
                matchMedia?.("(pointer: coarse)").matches;
            return looksTouchTablet;
        }
    }
    // --- 4) last resort desktop exclusion ----------------------------------
    const looksDesktopPlatform = /Win|Linux|CrOS|Mac/.test(platform) ||
        /Windows NT|X11|CrOS|Macintosh/.test(ua);
    if (looksDesktopPlatform) {
        return false;
    }
    return false;
};
const getFormFactor = (editorWidth, editorHeight) => {
    if ((0, exports.isMobileBreakpoint)(editorWidth, editorHeight)) {
        return "phone";
    }
    if ((0, exports.isTabletBreakpoint)(editorWidth, editorHeight)) {
        return "tablet";
    }
    return "desktop";
};
exports.getFormFactor = getFormFactor;
const deriveStylesPanelMode = (editorInterface) => {
    if (editorInterface.formFactor === "phone") {
        return "mobile";
    }
    if (editorInterface.formFactor === "tablet") {
        return "compact";
    }
    return editorInterface.desktopUIMode;
};
exports.deriveStylesPanelMode = deriveStylesPanelMode;
const createUserAgentDescriptor = (userAgentString) => {
    const normalizedUA = userAgentString ?? "";
    let platform = "unknown";
    if (exports.isIOS) {
        platform = "ios";
    }
    else if (exports.isAndroid) {
        platform = "android";
    }
    else if (normalizedUA) {
        platform = "other";
    }
    return {
        isMobileDevice: isMobileOrTablet(),
        platform,
    };
};
exports.createUserAgentDescriptor = createUserAgentDescriptor;
const loadDesktopUIModePreference = () => {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const stored = window.localStorage.getItem(DESKTOP_UI_MODE_STORAGE_KEY);
        if (stored === "compact" || stored === "full") {
            return stored;
        }
    }
    catch (error) {
        // ignore storage access issues (e.g., Safari private mode)
    }
    return null;
};
exports.loadDesktopUIModePreference = loadDesktopUIModePreference;
const persistDesktopUIMode = (mode) => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        window.localStorage.setItem(DESKTOP_UI_MODE_STORAGE_KEY, mode);
    }
    catch (error) {
        // ignore storage access issues (e.g., Safari private mode)
    }
};
const setDesktopUIMode = (mode) => {
    if (mode !== "compact" && mode !== "full") {
        return;
    }
    persistDesktopUIMode(mode);
    return mode;
};
exports.setDesktopUIMode = setDesktopUIMode;
