"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonDeletedElement = exports.getNonDeletedElements = exports.getVisibleElements = exports.hashString = exports.hashElementsVersion = exports.getSceneVersion = void 0;
const common_1 = require("@excalidraw/common");
const sizeHelpers_1 = require("./sizeHelpers");
/**
 * @deprecated unsafe, use hashElementsVersion instead
 */
const getSceneVersion = (elements) => elements.reduce((acc, el) => acc + el.version, 0);
exports.getSceneVersion = getSceneVersion;
/**
 * Hashes elements' versionNonce (using djb2 algo). Order of elements matters.
 */
const hashElementsVersion = (elements) => {
    let hash = 5381;
    for (const element of (0, common_1.toIterable)(elements)) {
        hash = (hash << 5) + hash + element.versionNonce;
    }
    return hash >>> 0; // Ensure unsigned 32-bit integer
};
exports.hashElementsVersion = hashElementsVersion;
// string hash function (using djb2). Not cryptographically secure, use only
// for versioning and such.
// note: hashes individual code units (not code points),
// but for hashing purposes this is fine as it iterates through every code unit
// (as such, no need to encode to byte string first)
const hashString = (s) => {
    let hash = 5381;
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = (hash << 5) + hash + char;
    }
    return hash >>> 0; // Ensure unsigned 32-bit integer
};
exports.hashString = hashString;
const getVisibleElements = (elements) => elements.filter((el) => !el.isDeleted && !(0, sizeHelpers_1.isInvisiblySmallElement)(el));
exports.getVisibleElements = getVisibleElements;
const getNonDeletedElements = (elements) => elements.filter((element) => !element.isDeleted);
exports.getNonDeletedElements = getNonDeletedElements;
const isNonDeletedElement = (element) => !element.isDeleted;
exports.isNonDeletedElement = isNonDeletedElement;
__exportStar(require("./align"), exports);
__exportStar(require("./binding"), exports);
__exportStar(require("./bounds"), exports);
__exportStar(require("./collision"), exports);
__exportStar(require("./comparisons"), exports);
__exportStar(require("./containerCache"), exports);
__exportStar(require("./cropElement"), exports);
__exportStar(require("./delta"), exports);
__exportStar(require("./distance"), exports);
__exportStar(require("./distribute"), exports);
__exportStar(require("./dragElements"), exports);
__exportStar(require("./duplicate"), exports);
__exportStar(require("./elbowArrow"), exports);
__exportStar(require("./elementLink"), exports);
__exportStar(require("./embeddable"), exports);
__exportStar(require("./flowchart"), exports);
__exportStar(require("./arrows/focus"), exports);
__exportStar(require("./fractionalIndex"), exports);
__exportStar(require("./frame"), exports);
__exportStar(require("./groups"), exports);
__exportStar(require("./heading"), exports);
__exportStar(require("./image"), exports);
__exportStar(require("./linearElementEditor"), exports);
__exportStar(require("./mutateElement"), exports);
__exportStar(require("./newElement"), exports);
__exportStar(require("./positionElementsOnGrid"), exports);
__exportStar(require("./renderElement"), exports);
__exportStar(require("./resizeElements"), exports);
__exportStar(require("./resizeTest"), exports);
__exportStar(require("./Scene"), exports);
__exportStar(require("./selection"), exports);
__exportStar(require("./shape"), exports);
__exportStar(require("./showSelectedShapeActions"), exports);
__exportStar(require("./sizeHelpers"), exports);
__exportStar(require("./sortElements"), exports);
__exportStar(require("./store"), exports);
__exportStar(require("./textElement"), exports);
__exportStar(require("./textMeasurements"), exports);
__exportStar(require("./textWrapping"), exports);
__exportStar(require("./transform"), exports);
__exportStar(require("./transformHandles"), exports);
__exportStar(require("./typeChecks"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./zindex"), exports);
__exportStar(require("./arrows/helpers"), exports);
__exportStar(require("./arrowheads"), exports);
