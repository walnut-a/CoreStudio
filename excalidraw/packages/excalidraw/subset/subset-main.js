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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.subsetWoff2GlyphsByCodepoints = void 0;
const common_1 = require("@excalidraw/common");
const errors_1 = require("../errors");
const workers_1 = require("../workers");
let shouldUseWorkers = typeof Worker !== "undefined";
/**
 * Tries to subset glyphs in a font based on the used codepoints, returning the font as dataurl.
 * Under the hood utilizes worker threads (Web Workers, if available), otherwise fallbacks to the main thread.
 *
 * Check the following diagram for details: link.excalidraw.com/readonly/MbbnWPSWXgadXdtmzgeO
 *
 * @param arrayBuffer font data buffer in the woff2 format
 * @param codePoints codepoints used to subset the glyphs
 *
 * @returns font with subsetted glyphs (all glyphs in case of errors) converted into a dataurl
 */
const subsetWoff2GlyphsByCodepoints = async (arrayBuffer, codePoints) => {
    const { Commands, subsetToBase64, toBase64 } = await lazyLoadSharedSubsetChunk();
    if (!shouldUseWorkers) {
        return subsetToBase64(arrayBuffer, codePoints);
    }
    return (0, common_1.promiseTry)(async () => {
        try {
            const workerPool = await getOrCreateWorkerPool();
            // copy the buffer to avoid working on top of the detached array buffer in the fallback
            // i.e. in case the worker throws, the array buffer does not get automatically detached, even if the worker is terminated
            const arrayBufferCopy = arrayBuffer.slice(0);
            const result = await workerPool.postMessage({
                command: Commands.Subset,
                arrayBuffer: arrayBufferCopy,
                codePoints,
            }, { transfer: [arrayBufferCopy] });
            // encode on the main thread to avoid copying large binary strings (as dataurl) between threads
            return toBase64(result);
        }
        catch (e) {
            // don't use workers if they are failing
            shouldUseWorkers = false;
            if (
            // don't log the expected errors server-side
            !((0, common_1.isServerEnv)() &&
                (e instanceof errors_1.WorkerUrlNotDefinedError ||
                    e instanceof errors_1.WorkerInTheMainChunkError))) {
                // eslint-disable-next-line no-console
                console.error("Failed to use workers for subsetting, falling back to the main thread.", e);
            }
            // fallback to the main thread
            return subsetToBase64(arrayBuffer, codePoints);
        }
    });
};
exports.subsetWoff2GlyphsByCodepoints = subsetWoff2GlyphsByCodepoints;
// lazy-loaded and cached chunks
let subsetWorker = null;
let subsetShared = null;
const lazyLoadWorkerSubsetChunk = async () => {
    if (!subsetWorker) {
        subsetWorker = Promise.resolve().then(() => __importStar(require("./subset-worker.chunk")));
    }
    return subsetWorker;
};
const lazyLoadSharedSubsetChunk = async () => {
    if (!subsetShared) {
        // load dynamically to force create a shared chunk reused between main thread and the worker thread
        subsetShared = Promise.resolve().then(() => __importStar(require("./subset-shared.chunk")));
    }
    return subsetShared;
};
let workerPool = null;
/**
 * Lazy initialize or get the worker pool singleton.
 *
 * @throws implicitly if anything goes wrong - worker pool creation, loading wasm, initializing worker, etc.
 */
const getOrCreateWorkerPool = () => {
    if (!workerPool) {
        // immediate concurrent-friendly return, to ensure we have only one pool instance
        workerPool = (0, common_1.promiseTry)(async () => {
            const { WorkerUrl } = await lazyLoadWorkerSubsetChunk();
            const pool = workers_1.WorkerPool.create(WorkerUrl);
            return pool;
        });
    }
    return workerPool;
};
