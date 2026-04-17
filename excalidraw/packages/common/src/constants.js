"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_PASTE_MIME_TYPES = exports.MIME_TYPES = exports.STRING_MIME_TYPES = exports.IMAGE_MIME_TYPES = exports.DEFAULT_GRID_STEP = exports.DEFAULT_GRID_SIZE = exports.CANVAS_ONLY_ACTIONS = exports.COLOR_VOICE_CALL = exports.COLOR_CHARCOAL_BLACK = exports.COLOR_WHITE = exports.DEFAULT_COLLISION_THRESHOLD = exports.EPSILON = exports.SIDE_RESIZING_THRESHOLD = exports.DEFAULT_TRANSFORM_HANDLE_SPACING = exports.DEFAULT_VERSION = exports.DEFAULT_VERTICAL_ALIGN = exports.DEFAULT_TEXT_ALIGN = exports.DEFAULT_FONT_FAMILY = exports.DEFAULT_FONT_SIZE = exports.MIN_FONT_SIZE = exports.FRAME_STYLE = exports.DARK_THEME_FILTER = exports.THEME = exports.getFontFamilyFallbacks = exports.FONT_FAMILY_FALLBACKS = exports.FONT_FAMILY_GENERIC_FALLBACKS = exports.MONOSPACE_GENERIC_FONT = exports.SANS_SERIF_GENERIC_FONT = exports.FONT_FAMILY = exports.WINDOWS_EMOJI_FALLBACK_FONT = exports.CJK_HAND_DRAWN_FALLBACK_FONT = exports.FONT_SIZES = exports.CLASSES = exports.ENV = exports.YOUTUBE_STATES = exports.EVENT = exports.POINTER_EVENTS = exports.POINTER_BUTTON = exports.CURSOR_TYPE = exports.DEFAULT_LASER_COLOR = exports.SHIFT_LOCKING_ANGLE = exports.TEXT_TO_CENTER_SNAP_THRESHOLD = exports.ELEMENT_TRANSLATE_AMOUNT = exports.ELEMENT_SHIFT_TRANSLATE_AMOUNT = exports.LINE_CONFIRM_THRESHOLD = exports.MINIMUM_ARROW_SIZE = exports.DRAGGING_THRESHOLD = exports.TEXT_AUTOWRAP_THRESHOLD = exports.APP_NAME = exports.supportsResizeObserver = void 0;
exports.DEFAULT_REDUCED_GLOBAL_ALPHA = exports.ARROW_TYPE = exports.MIN_WIDTH_OR_HEIGHT = exports.STATS_PANELS = exports.DEFAULT_FILENAME = exports.EDITOR_LS_KEYS = exports.TOOL_TYPE = exports.LIBRARY_DISABLED_TYPES = exports.DEFAULT_SIDEBAR = exports.CANVAS_SEARCH_TAB = exports.LIBRARY_SIDEBAR_TAB = exports.DEFAULT_ELEMENT_PROPS = exports.STROKE_WIDTH = exports.ROUGHNESS = exports.ROUNDNESS = exports.DEFAULT_ADAPTIVE_RADIUS = exports.DEFAULT_PROPORTIONAL_RADIUS = exports.ELEMENT_READY_TO_ERASE_OPACITY = exports.TEXT_ALIGN = exports.VERTICAL_ALIGN = exports.ARROW_LABEL_FONT_SIZE_TO_MIN_WIDTH_RATIO = exports.ARROW_LABEL_WIDTH_FRACTION = exports.BOUND_TEXT_PADDING = exports.VERSIONS = exports.ENCRYPTION_KEY_BITS = exports.SVG_DOCUMENT_PREAMBLE = exports.SVG_NS = exports.MAX_ALLOWED_FILE_BYTES = exports.DEFAULT_MAX_IMAGE_WIDTH_OR_HEIGHT = exports.DEFAULT_EXPORT_PADDING = exports.EXPORT_SCALES = exports.MAX_DECIMALS_FOR_SVG_EXPORT = exports.DEFAULT_UI_OPTIONS = exports.URL_HASH_KEYS = exports.URL_QUERY_KEYS = exports.ACTIVE_THRESHOLD = exports.IDLE_THRESHOLD = exports.HYPERLINK_TOOLTIP_DELAY = exports.MAX_ZOOM = exports.MIN_ZOOM = exports.ZOOM_STEP = exports.SCROLL_TIMEOUT = exports.VERSION_TIMEOUT = exports.TITLE_TIMEOUT = exports.TOUCH_CTX_MENU_TIMEOUT = exports.TAP_TWICE_TIMEOUT = exports.IMAGE_RENDER_TIMEOUT = exports.getExportSource = exports.EXPORT_DATA_TYPES = exports.EXPORT_IMAGE_TYPES = void 0;
exports.MOBILE_ACTION_BUTTON_BG = exports.BIND_MODE_TIMEOUT = exports.DOUBLE_TAP_POSITION_THRESHOLD = exports.LINE_POLYGON_POINT_MERGE_DISTANCE = exports.UserIdleState = exports.ORIG_ID = exports.ELEMENT_LINK_KEY = void 0;
exports.getGenericFontFamilyFallback = getGenericFontFamilyFallback;
const colors_1 = require("./colors");
exports.supportsResizeObserver = typeof window !== "undefined" && "ResizeObserver" in window;
exports.APP_NAME = "Excalidraw";
// distance when creating text before it's considered `autoResize: false`
// we're using higher threshold so that clicks that end up being drags
// don't unintentionally create text elements that are wrapped to a few chars
// (happens a lot with fast clicks with the text tool)
exports.TEXT_AUTOWRAP_THRESHOLD = 36; // px
exports.DRAGGING_THRESHOLD = 10; // px
exports.MINIMUM_ARROW_SIZE = 20; // px
exports.LINE_CONFIRM_THRESHOLD = 8; // px
exports.ELEMENT_SHIFT_TRANSLATE_AMOUNT = 5;
exports.ELEMENT_TRANSLATE_AMOUNT = 1;
exports.TEXT_TO_CENTER_SNAP_THRESHOLD = 30;
exports.SHIFT_LOCKING_ANGLE = Math.PI / 12;
exports.DEFAULT_LASER_COLOR = "red";
exports.CURSOR_TYPE = {
    TEXT: "text",
    CROSSHAIR: "crosshair",
    GRABBING: "grabbing",
    GRAB: "grab",
    POINTER: "pointer",
    MOVE: "move",
    AUTO: "",
};
exports.POINTER_BUTTON = {
    MAIN: 0,
    WHEEL: 1,
    SECONDARY: 2,
    TOUCH: -1,
    ERASER: 5,
};
exports.POINTER_EVENTS = {
    enabled: "all",
    disabled: "none",
    // asserted as any so it can be freely assigned to React Element
    // "pointerEnvets" CSS prop
    inheritFromUI: "var(--ui-pointerEvents)",
};
var EVENT;
(function (EVENT) {
    EVENT["COPY"] = "copy";
    EVENT["PASTE"] = "paste";
    EVENT["CUT"] = "cut";
    EVENT["KEYDOWN"] = "keydown";
    EVENT["KEYUP"] = "keyup";
    EVENT["MOUSE_MOVE"] = "mousemove";
    EVENT["RESIZE"] = "resize";
    EVENT["UNLOAD"] = "unload";
    EVENT["FOCUS"] = "focus";
    EVENT["BLUR"] = "blur";
    EVENT["DRAG_OVER"] = "dragover";
    EVENT["DROP"] = "drop";
    EVENT["GESTURE_END"] = "gestureend";
    EVENT["BEFORE_UNLOAD"] = "beforeunload";
    EVENT["GESTURE_START"] = "gesturestart";
    EVENT["GESTURE_CHANGE"] = "gesturechange";
    EVENT["POINTER_MOVE"] = "pointermove";
    EVENT["POINTER_DOWN"] = "pointerdown";
    EVENT["POINTER_UP"] = "pointerup";
    EVENT["STATE_CHANGE"] = "statechange";
    EVENT["WHEEL"] = "wheel";
    EVENT["TOUCH_START"] = "touchstart";
    EVENT["TOUCH_END"] = "touchend";
    EVENT["HASHCHANGE"] = "hashchange";
    EVENT["VISIBILITY_CHANGE"] = "visibilitychange";
    EVENT["SCROLL"] = "scroll";
    // custom events
    EVENT["EXCALIDRAW_LINK"] = "excalidraw-link";
    EVENT["MENU_ITEM_SELECT"] = "menu.itemSelect";
    EVENT["MESSAGE"] = "message";
    EVENT["FULLSCREENCHANGE"] = "fullscreenchange";
})(EVENT || (exports.EVENT = EVENT = {}));
exports.YOUTUBE_STATES = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
};
exports.ENV = {
    TEST: "test",
    DEVELOPMENT: "development",
    PRODUCTION: "production",
};
exports.CLASSES = {
    SIDEBAR: "sidebar",
    SHAPE_ACTIONS_MENU: "App-menu__left",
    ZOOM_ACTIONS: "zoom-actions",
    SEARCH_MENU_INPUT_WRAPPER: "layer-ui__search-inputWrapper",
    CONVERT_ELEMENT_TYPE_POPUP: "ConvertElementTypePopup",
    SHAPE_ACTIONS_THEME_SCOPE: "shape-actions-theme-scope",
    FRAME_NAME: "frame-name",
    DROPDOWN_MENU_EVENT_WRAPPER: "dropdown-menu-event-wrapper",
};
exports.FONT_SIZES = {
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36,
};
exports.CJK_HAND_DRAWN_FALLBACK_FONT = "Xiaolai";
exports.WINDOWS_EMOJI_FALLBACK_FONT = "Segoe UI Emoji";
/**
 * // TODO: shouldn't be really `const`, likely neither have integers as values, due to value for the custom fonts, which should likely be some hash.
 *
 * Let's think this through and consider:
 * - https://developer.mozilla.org/en-US/docs/Web/CSS/generic-family
 * - https://drafts.csswg.org/css-fonts-4/#font-family-prop
 * - https://learn.microsoft.com/en-us/typography/opentype/spec/ibmfc
 */
exports.FONT_FAMILY = {
    Virgil: 1,
    Helvetica: 2,
    Cascadia: 3,
    // leave 4 unused as it was historically used for Assistant (which we don't use anymore) or custom font (Obsidian)
    Excalifont: 5,
    Nunito: 6,
    "Lilita One": 7,
    "Comic Shanns": 8,
    "Liberation Sans": 9,
    Assistant: 10,
};
// Segoe UI Emoji fails to properly fallback for some glyphs: ∞, ∫, ≠
// so we need to have generic font fallback before it
exports.SANS_SERIF_GENERIC_FONT = "sans-serif";
exports.MONOSPACE_GENERIC_FONT = "monospace";
exports.FONT_FAMILY_GENERIC_FALLBACKS = {
    [exports.SANS_SERIF_GENERIC_FONT]: 998,
    [exports.MONOSPACE_GENERIC_FONT]: 999,
};
exports.FONT_FAMILY_FALLBACKS = {
    [exports.CJK_HAND_DRAWN_FALLBACK_FONT]: 100,
    ...exports.FONT_FAMILY_GENERIC_FALLBACKS,
    [exports.WINDOWS_EMOJI_FALLBACK_FONT]: 1000,
};
function getGenericFontFamilyFallback(fontFamily) {
    switch (fontFamily) {
        case exports.FONT_FAMILY.Cascadia:
        case exports.FONT_FAMILY["Comic Shanns"]:
            return exports.MONOSPACE_GENERIC_FONT;
        default:
            return exports.SANS_SERIF_GENERIC_FONT;
    }
}
const getFontFamilyFallbacks = (fontFamily) => {
    const genericFallbackFont = getGenericFontFamilyFallback(fontFamily);
    switch (fontFamily) {
        case exports.FONT_FAMILY.Excalifont:
            return [
                exports.CJK_HAND_DRAWN_FALLBACK_FONT,
                genericFallbackFont,
                exports.WINDOWS_EMOJI_FALLBACK_FONT,
            ];
        default:
            return [genericFallbackFont, exports.WINDOWS_EMOJI_FALLBACK_FONT];
    }
};
exports.getFontFamilyFallbacks = getFontFamilyFallbacks;
exports.THEME = {
    LIGHT: "light",
    DARK: "dark",
};
exports.DARK_THEME_FILTER = "invert(93%) hue-rotate(180deg)";
exports.FRAME_STYLE = {
    strokeColor: "#bbb",
    strokeWidth: 2,
    strokeStyle: "solid",
    fillStyle: "solid",
    roughness: 0,
    roundness: null,
    backgroundColor: "transparent",
    radius: 8,
    nameOffsetY: 3,
    nameColorLightTheme: "#999999",
    nameColorDarkTheme: "#7a7a7a",
    nameFontSize: 14,
    nameLineHeight: 1.25,
};
exports.MIN_FONT_SIZE = 1;
exports.DEFAULT_FONT_SIZE = 20;
exports.DEFAULT_FONT_FAMILY = exports.FONT_FAMILY.Excalifont;
exports.DEFAULT_TEXT_ALIGN = "left";
exports.DEFAULT_VERTICAL_ALIGN = "top";
exports.DEFAULT_VERSION = "{version}";
exports.DEFAULT_TRANSFORM_HANDLE_SPACING = 2;
exports.SIDE_RESIZING_THRESHOLD = 2 * exports.DEFAULT_TRANSFORM_HANDLE_SPACING;
// a small epsilon to make side resizing always take precedence
// (avoids an increase in renders and changes to tests)
exports.EPSILON = 0.00001;
exports.DEFAULT_COLLISION_THRESHOLD = 2 * exports.SIDE_RESIZING_THRESHOLD - exports.EPSILON;
exports.COLOR_WHITE = "#ffffff";
exports.COLOR_CHARCOAL_BLACK = "#1e1e1e";
// keep this in sync with CSS
exports.COLOR_VOICE_CALL = "#a2f1a6";
exports.CANVAS_ONLY_ACTIONS = ["selectAll"];
exports.DEFAULT_GRID_SIZE = 20;
exports.DEFAULT_GRID_STEP = 5;
exports.IMAGE_MIME_TYPES = {
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    ico: "image/x-icon",
    avif: "image/avif",
    jfif: "image/jfif",
};
exports.STRING_MIME_TYPES = {
    text: "text/plain",
    html: "text/html",
    json: "application/json",
    // excalidraw data
    excalidraw: "application/vnd.excalidraw+json",
    excalidrawClipboard: "application/vnd.excalidraw.clipboard+json",
    // LEGACY: fully-qualified library JSON data
    excalidrawlib: "application/vnd.excalidrawlib+json",
    // list of excalidraw library item ids
    excalidrawlibIds: "application/vnd.excalidrawlib.ids+json",
};
exports.MIME_TYPES = {
    ...exports.STRING_MIME_TYPES,
    // image-encoded excalidraw data
    "excalidraw.svg": "image/svg+xml",
    "excalidraw.png": "image/png",
    // binary
    binary: "application/octet-stream",
    // image
    ...exports.IMAGE_MIME_TYPES,
};
exports.ALLOWED_PASTE_MIME_TYPES = [
    exports.MIME_TYPES.text,
    exports.MIME_TYPES.html,
    ...Object.values(exports.IMAGE_MIME_TYPES),
];
exports.EXPORT_IMAGE_TYPES = {
    png: "png",
    svg: "svg",
    clipboard: "clipboard",
};
exports.EXPORT_DATA_TYPES = {
    excalidraw: "excalidraw",
    excalidrawClipboard: "excalidraw/clipboard",
    excalidrawLibrary: "excalidrawlib",
    excalidrawClipboardWithAPI: "excalidraw-api/clipboard",
};
const getExportSource = () => window.EXCALIDRAW_EXPORT_SOURCE || window.location.origin;
exports.getExportSource = getExportSource;
// time in milliseconds
exports.IMAGE_RENDER_TIMEOUT = 500;
exports.TAP_TWICE_TIMEOUT = 300;
exports.TOUCH_CTX_MENU_TIMEOUT = 500;
exports.TITLE_TIMEOUT = 10000;
exports.VERSION_TIMEOUT = 30000;
exports.SCROLL_TIMEOUT = 100;
exports.ZOOM_STEP = 0.1;
exports.MIN_ZOOM = 0.1;
exports.MAX_ZOOM = 30;
exports.HYPERLINK_TOOLTIP_DELAY = 300;
// Report a user inactive after IDLE_THRESHOLD milliseconds
exports.IDLE_THRESHOLD = 60_000;
// Report a user active each ACTIVE_THRESHOLD milliseconds
exports.ACTIVE_THRESHOLD = 3_000;
exports.URL_QUERY_KEYS = {
    addLibrary: "addLibrary",
};
exports.URL_HASH_KEYS = {
    addLibrary: "addLibrary",
};
exports.DEFAULT_UI_OPTIONS = {
    canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: { saveFileToDisk: true },
        loadScene: true,
        saveToActiveFile: true,
        toggleTheme: null,
        saveAsImage: true,
    },
    tools: {
        image: true,
    },
};
exports.MAX_DECIMALS_FOR_SVG_EXPORT = 2;
exports.EXPORT_SCALES = [1, 2, 3];
exports.DEFAULT_EXPORT_PADDING = 10; // px
exports.DEFAULT_MAX_IMAGE_WIDTH_OR_HEIGHT = 1440;
exports.MAX_ALLOWED_FILE_BYTES = 4 * 1024 * 1024;
exports.SVG_NS = "http://www.w3.org/2000/svg";
exports.SVG_DOCUMENT_PREAMBLE = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
`;
exports.ENCRYPTION_KEY_BITS = 128;
exports.VERSIONS = {
    excalidraw: 2,
    excalidrawLibrary: 2,
};
exports.BOUND_TEXT_PADDING = 5;
exports.ARROW_LABEL_WIDTH_FRACTION = 0.7;
exports.ARROW_LABEL_FONT_SIZE_TO_MIN_WIDTH_RATIO = 11;
exports.VERTICAL_ALIGN = {
    TOP: "top",
    MIDDLE: "middle",
    BOTTOM: "bottom",
};
exports.TEXT_ALIGN = {
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
};
exports.ELEMENT_READY_TO_ERASE_OPACITY = 20;
// Radius represented as 25% of element's largest side (width/height).
// Used for LEGACY and PROPORTIONAL_RADIUS algorithms, or when the element is
// below the cutoff size.
exports.DEFAULT_PROPORTIONAL_RADIUS = 0.25;
// Fixed radius for the ADAPTIVE_RADIUS algorithm. In pixels.
exports.DEFAULT_ADAPTIVE_RADIUS = 32;
// roundness type (algorithm)
exports.ROUNDNESS = {
    // Used for legacy rounding (rectangles), which currently works the same
    // as PROPORTIONAL_RADIUS, but we need to differentiate for UI purposes and
    // forwards-compat.
    LEGACY: 1,
    // Used for linear elements & diamonds
    PROPORTIONAL_RADIUS: 2,
    // Current default algorithm for rectangles, using fixed pixel radius.
    // It's working similarly to a regular border-radius, but attemps to make
    // radius visually similar across differnt element sizes, especially
    // very large and very small elements.
    //
    // NOTE right now we don't allow configuration and use a constant radius
    // (see DEFAULT_ADAPTIVE_RADIUS constant)
    ADAPTIVE_RADIUS: 3,
};
exports.ROUGHNESS = {
    architect: 0,
    artist: 1,
    cartoonist: 2,
};
exports.STROKE_WIDTH = {
    thin: 1,
    bold: 2,
    extraBold: 4,
};
exports.DEFAULT_ELEMENT_PROPS = {
    strokeColor: colors_1.COLOR_PALETTE.black,
    backgroundColor: colors_1.COLOR_PALETTE.transparent,
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: exports.ROUGHNESS.artist,
    opacity: 100,
    locked: false,
};
exports.LIBRARY_SIDEBAR_TAB = "library";
exports.CANVAS_SEARCH_TAB = "search";
exports.DEFAULT_SIDEBAR = {
    name: "default",
    defaultTab: exports.LIBRARY_SIDEBAR_TAB,
};
exports.LIBRARY_DISABLED_TYPES = new Set([
    "iframe",
    "embeddable",
    "image",
]);
// use these constants to easily identify reference sites
exports.TOOL_TYPE = {
    selection: "selection",
    lasso: "lasso",
    rectangle: "rectangle",
    diamond: "diamond",
    ellipse: "ellipse",
    arrow: "arrow",
    line: "line",
    freedraw: "freedraw",
    text: "text",
    image: "image",
    eraser: "eraser",
    hand: "hand",
    frame: "frame",
    magicframe: "magicframe",
    embeddable: "embeddable",
    laser: "laser",
};
exports.EDITOR_LS_KEYS = {
    OAI_API_KEY: "excalidraw-oai-api-key",
    // legacy naming (non)scheme
    MERMAID_TO_EXCALIDRAW: "mermaid-to-excalidraw",
    PUBLISH_LIBRARY: "publish-library-data",
};
/**
 * not translated as this is used only in public, stateless API as default value
 * where filename is optional and we can't retrieve name from app state
 */
exports.DEFAULT_FILENAME = "Untitled";
exports.STATS_PANELS = { generalStats: 1, elementProperties: 2 };
exports.MIN_WIDTH_OR_HEIGHT = 1;
exports.ARROW_TYPE = {
    sharp: "sharp",
    round: "round",
    elbow: "elbow",
};
exports.DEFAULT_REDUCED_GLOBAL_ALPHA = 0.3;
exports.ELEMENT_LINK_KEY = "element";
/** used in tests */
exports.ORIG_ID = Symbol.for("__test__originalId__");
var UserIdleState;
(function (UserIdleState) {
    UserIdleState["ACTIVE"] = "active";
    UserIdleState["AWAY"] = "away";
    UserIdleState["IDLE"] = "idle";
})(UserIdleState || (exports.UserIdleState = UserIdleState = {}));
/**
 * distance at which we merge points instead of adding a new merge-point
 * when converting a line to a polygon (merge currently means overlaping
 * the start and end points)
 */
exports.LINE_POLYGON_POINT_MERGE_DISTANCE = 20;
exports.DOUBLE_TAP_POSITION_THRESHOLD = 35;
exports.BIND_MODE_TIMEOUT = 700; // ms
// glass background for mobile action buttons
exports.MOBILE_ACTION_BUTTON_BG = {
    background: "var(--mobile-action-button-bg)",
};
