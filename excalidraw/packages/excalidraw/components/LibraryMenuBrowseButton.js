"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../i18n");
const LibraryMenuBrowseButton = ({ theme, id, libraryReturnUrl, }) => {
    const referrer = libraryReturnUrl || window.location.origin + window.location.pathname;
    return ((0, jsx_runtime_1.jsx)("a", { className: "library-menu-browse-button", href: `${import.meta.env.VITE_APP_LIBRARY_URL}?target=${window.name || "_blank"}&referrer=${referrer}&useHash=true&token=${id}&theme=${theme}&version=${common_1.VERSIONS.excalidrawLibrary}`, target: "_excalidraw_libraries", children: (0, i18n_1.t)("labels.libraries") }));
};
exports.default = LibraryMenuBrowseButton;
