"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toValidURL = exports.isLocalLink = exports.normalizeLink = void 0;
const sanitize_url_1 = require("@braintree/sanitize-url");
const utils_1 = require("./utils");
const normalizeLink = (link) => {
    link = link.trim();
    if (!link) {
        return link;
    }
    return (0, sanitize_url_1.sanitizeUrl)((0, utils_1.escapeDoubleQuotes)(link));
};
exports.normalizeLink = normalizeLink;
const isLocalLink = (link) => {
    return !!(link?.includes(location.origin) || link?.startsWith("/"));
};
exports.isLocalLink = isLocalLink;
/**
 * Returns URL sanitized and safe for usage in places such as
 * iframe's src attribute or <a> href attributes.
 */
const toValidURL = (link) => {
    link = (0, exports.normalizeLink)(link);
    // make relative links into fully-qualified urls
    if (link.startsWith("/")) {
        return `${location.origin}${link}`;
    }
    try {
        new URL(link);
    }
    catch {
        // if link does not parse as URL, assume invalid and return blank page
        return "about:blank";
    }
    return link;
};
exports.toValidURL = toValidURL;
