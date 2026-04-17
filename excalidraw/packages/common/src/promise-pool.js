"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromisePool = void 0;
const es6_promise_pool_1 = __importDefault(require("es6-promise-pool"));
class PromisePool {
    pool;
    entries = {};
    constructor(source, concurrency) {
        this.pool = new es6_promise_pool_1.default(source, concurrency);
    }
    all() {
        const listener = (event) => {
            if (event.data.result) {
                // by default pool does not return the results, so we are gathering them manually
                // with the correct call order (represented by the index in the tuple)
                const [index, value] = event.data.result;
                this.entries[index] = value;
            }
        };
        this.pool.addEventListener("fulfilled", listener);
        return this.pool.start().then(() => {
            setTimeout(() => {
                this.pool.removeEventListener("fulfilled", listener);
            });
            return Object.values(this.entries);
        });
    }
}
exports.PromisePool = PromisePool;
