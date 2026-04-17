"use strict";
/**
 * Create and link between shapes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseElementLinkFromURL = exports.isElementLink = exports.canCreateLinkFromElements = exports.getLinkIdAndTypeFromSelection = exports.defaultGetElementLinkFromSelection = void 0;
const common_1 = require("@excalidraw/common");
const groups_1 = require("./groups");
const defaultGetElementLinkFromSelection = (id, type) => {
    const url = window.location.href;
    try {
        const link = new URL(url);
        link.searchParams.set(common_1.ELEMENT_LINK_KEY, id);
        return (0, common_1.normalizeLink)(link.toString());
    }
    catch (error) {
        console.error(error);
    }
    return (0, common_1.normalizeLink)(url);
};
exports.defaultGetElementLinkFromSelection = defaultGetElementLinkFromSelection;
const getLinkIdAndTypeFromSelection = (selectedElements, appState) => {
    if (selectedElements.length > 0 &&
        (0, exports.canCreateLinkFromElements)(selectedElements)) {
        if (selectedElements.length === 1) {
            return {
                id: selectedElements[0].id,
                type: "element",
            };
        }
        if (selectedElements.length > 1) {
            const selectedGroupId = Object.keys(appState.selectedGroupIds)[0];
            if (selectedGroupId) {
                return {
                    id: selectedGroupId,
                    type: "group",
                };
            }
            return {
                id: selectedElements[0].groupIds[0],
                type: "group",
            };
        }
    }
    return null;
};
exports.getLinkIdAndTypeFromSelection = getLinkIdAndTypeFromSelection;
const canCreateLinkFromElements = (selectedElements) => {
    if (selectedElements.length === 1) {
        return true;
    }
    if (selectedElements.length > 1 && (0, groups_1.elementsAreInSameGroup)(selectedElements)) {
        return true;
    }
    return false;
};
exports.canCreateLinkFromElements = canCreateLinkFromElements;
const isElementLink = (url) => {
    try {
        const _url = new URL(url);
        return (_url.searchParams.has(common_1.ELEMENT_LINK_KEY) &&
            _url.host === window.location.host);
    }
    catch (error) {
        return false;
    }
};
exports.isElementLink = isElementLink;
const parseElementLinkFromURL = (url) => {
    try {
        const { searchParams } = new URL(url);
        if (searchParams.has(common_1.ELEMENT_LINK_KEY)) {
            const id = searchParams.get(common_1.ELEMENT_LINK_KEY);
            return id;
        }
    }
    catch { }
    return null;
};
exports.parseElementLinkFromURL = parseElementLinkFromURL;
