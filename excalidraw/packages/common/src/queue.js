"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const _1 = require(".");
class Queue {
    jobs = [];
    running = false;
    tick() {
        if (this.running) {
            return;
        }
        const job = this.jobs.shift();
        if (job) {
            this.running = true;
            job.promise.resolve((0, _1.promiseTry)(job.jobFactory, ...job.args).finally(() => {
                this.running = false;
                this.tick();
            }));
        }
        else {
            this.running = false;
        }
    }
    push(jobFactory, ...args) {
        const promise = (0, _1.resolvablePromise)();
        this.jobs.push({ jobFactory, promise, args });
        this.tick();
        return promise;
    }
}
exports.Queue = Queue;
