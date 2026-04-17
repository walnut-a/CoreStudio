"use strict";
/**
 * DON'T depend on anything from the outside like `promiseTry`, as this module is part of a separate lazy-loaded chunk.
 *
 * Including anything from the main chunk would include the whole chunk by default.
 * Even it it would be tree-shaken during build, it won't be tree-shaken in dev.
 *
 * In the future consider separating common utils into a separate shared chunk.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerUrl = void 0;
const subset_shared_chunk_1 = require("./subset-shared.chunk");
/**
 * Due to this export (and related dynamic import), this worker code will be included in the bundle automatically (as a separate chunk),
 * without the need for esbuild / vite /rollup plugins and special browser / server treatment.
 *
 * `import.meta.url` is undefined in nodejs
 */
exports.WorkerUrl = import.meta.url
    ? new URL(import.meta.url)
    : undefined;
// run only in the worker context
if (typeof window === "undefined" && typeof self !== "undefined") {
    self.onmessage = async (e) => {
        switch (e.data.command) {
            case subset_shared_chunk_1.Commands.Subset:
                const buffer = await (0, subset_shared_chunk_1.subsetToBinary)(e.data.arrayBuffer, e.data.codePoints);
                self.postMessage(buffer, { transfer: [buffer] });
                break;
        }
    };
}
