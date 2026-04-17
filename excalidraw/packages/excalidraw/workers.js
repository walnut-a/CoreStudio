"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const common_1 = require("@excalidraw/common");
const errors_1 = require("./errors");
class IdleWorker {
    instance;
    constructor(workerUrl) {
        this.instance = new Worker(workerUrl, { type: "module" });
    }
    /**
     * Use to prolong the worker's life by `workerTTL` or terminate it with a flush immediately.
     */
    debounceTerminate;
}
/**
 * Pool of idle short-lived workers.
 *
 * IMPORTANT: for simplicity it does not limit the number of newly created workers, leaving it up to the caller to manage the pool size.
 */
class WorkerPool {
    idleWorkers = new Set();
    workerUrl;
    workerTTL;
    constructor(workerUrl, options) {
        this.workerUrl = workerUrl;
        // by default, active & idle workers will be terminated after 1s of inactivity
        this.workerTTL = options.ttl || 1000;
    }
    /**
     * Create a new worker pool.
     *
     * @param workerUrl - The URL of the worker file.
     * @param options - The options for the worker pool.
     * @throws If the worker is bundled into the main chunk.
     * @returns A new worker pool instance.
     */
    static create(workerUrl, options = {}) {
        if (!workerUrl) {
            throw new errors_1.WorkerUrlNotDefinedError();
        }
        if (!import.meta.url || workerUrl.toString() === import.meta.url) {
            // in case the worker code is bundled into the main chunk
            throw new errors_1.WorkerInTheMainChunkError();
        }
        return new WorkerPool(workerUrl, options);
    }
    /**
     * Take idle worker from the pool or create a new one and post a message to it.
     */
    async postMessage(data, options) {
        let worker;
        const idleWorker = Array.from(this.idleWorkers).shift();
        if (idleWorker) {
            this.idleWorkers.delete(idleWorker);
            worker = idleWorker;
        }
        else {
            worker = await this.createWorker();
        }
        return new Promise((resolve, reject) => {
            worker.instance.onmessage = this.onMessageHandler(worker, resolve);
            worker.instance.onerror = this.onErrorHandler(worker, reject);
            worker.instance.postMessage(data, options);
            worker.debounceTerminate(() => reject(new Error(`Active worker did not respond for ${this.workerTTL}ms!`)));
        });
    }
    /**
     * Terminate the idle workers in the pool.
     */
    async clear() {
        for (const worker of this.idleWorkers) {
            worker.debounceTerminate.cancel();
            worker.instance.terminate();
        }
        this.idleWorkers.clear();
    }
    /**
     * Used to get a worker from the pool or create a new one if there is no idle available.
     */
    async createWorker() {
        const worker = new IdleWorker(this.workerUrl);
        worker.debounceTerminate = (0, common_1.debounce)((reject) => {
            worker.instance.terminate();
            if (this.idleWorkers.has(worker)) {
                this.idleWorkers.delete(worker);
                // eslint-disable-next-line no-console
                console.debug("Job finished! Idle worker has been released from the pool.");
            }
            else if (reject) {
                reject();
            }
            else {
                console.error("Worker has been terminated!");
            }
        }, this.workerTTL);
        return worker;
    }
    onMessageHandler(worker, resolve) {
        return (e) => {
            worker.debounceTerminate();
            this.idleWorkers.add(worker);
            resolve(e.data);
        };
    }
    onErrorHandler(worker, reject) {
        return (e) => {
            // terminate the worker immediately before rejection
            worker.debounceTerminate(() => reject(e));
            worker.debounceTerminate.flush();
            // clear the worker pool in case there are some idle workers left
            this.clear();
        };
    }
}
exports.WorkerPool = WorkerPool;
