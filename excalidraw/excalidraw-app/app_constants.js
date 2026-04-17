"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExcalidrawPlusSignedUser = exports.COOKIES = exports.STORAGE_KEYS = exports.ROOM_ID_BYTES = exports.FIREBASE_STORAGE_PREFIXES = exports.WS_SUBTYPES = exports.WS_EVENTS = exports.FILE_CACHE_MAX_AGE_SEC = exports.FILE_UPLOAD_MAX_BYTES = exports.DELETED_ELEMENT_TIMEOUT = exports.CURSOR_SYNC_TIMEOUT = exports.SYNC_BROWSER_TABS_TIMEOUT = exports.SYNC_FULL_SCENE_INTERVAL_MS = exports.LOAD_IMAGES_TIMEOUT = exports.FILE_UPLOAD_TIMEOUT = exports.INITIAL_SCENE_UPDATE_TIMEOUT = exports.SAVE_TO_LOCAL_STORAGE_TIMEOUT = void 0;
// time constants (ms)
exports.SAVE_TO_LOCAL_STORAGE_TIMEOUT = 300;
exports.INITIAL_SCENE_UPDATE_TIMEOUT = 5000;
exports.FILE_UPLOAD_TIMEOUT = 300;
exports.LOAD_IMAGES_TIMEOUT = 500;
exports.SYNC_FULL_SCENE_INTERVAL_MS = 20000;
exports.SYNC_BROWSER_TABS_TIMEOUT = 50;
exports.CURSOR_SYNC_TIMEOUT = 33; // ~30fps
exports.DELETED_ELEMENT_TIMEOUT = 24 * 60 * 60 * 1000; // 1 day
// should be aligned with MAX_ALLOWED_FILE_BYTES
exports.FILE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024; // 4 MiB
// 1 year (https://stackoverflow.com/a/25201898/927631)
exports.FILE_CACHE_MAX_AGE_SEC = 31536000;
exports.WS_EVENTS = {
    SERVER_VOLATILE: "server-volatile-broadcast",
    SERVER: "server-broadcast",
    USER_FOLLOW_CHANGE: "user-follow",
    USER_FOLLOW_ROOM_CHANGE: "user-follow-room-change",
};
var WS_SUBTYPES;
(function (WS_SUBTYPES) {
    WS_SUBTYPES["INVALID_RESPONSE"] = "INVALID_RESPONSE";
    WS_SUBTYPES["INIT"] = "SCENE_INIT";
    WS_SUBTYPES["UPDATE"] = "SCENE_UPDATE";
    WS_SUBTYPES["MOUSE_LOCATION"] = "MOUSE_LOCATION";
    WS_SUBTYPES["IDLE_STATUS"] = "IDLE_STATUS";
    WS_SUBTYPES["USER_VISIBLE_SCENE_BOUNDS"] = "USER_VISIBLE_SCENE_BOUNDS";
})(WS_SUBTYPES || (exports.WS_SUBTYPES = WS_SUBTYPES = {}));
exports.FIREBASE_STORAGE_PREFIXES = {
    shareLinkFiles: `/files/shareLinks`,
    collabFiles: `/files/rooms`,
};
exports.ROOM_ID_BYTES = 10;
exports.STORAGE_KEYS = {
    LOCAL_STORAGE_ELEMENTS: "excalidraw",
    LOCAL_STORAGE_APP_STATE: "excalidraw-state",
    LOCAL_STORAGE_COLLAB: "excalidraw-collab",
    LOCAL_STORAGE_THEME: "excalidraw-theme",
    LOCAL_STORAGE_DEBUG: "excalidraw-debug",
    VERSION_DATA_STATE: "version-dataState",
    VERSION_FILES: "version-files",
    IDB_LIBRARY: "excalidraw-library",
    IDB_TTD_CHATS: "excalidraw-ttd-chats",
    // do not use apart from migrations
    __LEGACY_LOCAL_STORAGE_LIBRARY: "excalidraw-library",
};
exports.COOKIES = {
    AUTH_STATE_COOKIE: "excplus-auth",
};
exports.isExcalidrawPlusSignedUser = document.cookie.includes(exports.COOKIES.AUTH_STATE_COOKIE);
