"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Debug = void 0;
const lessPrecise = (num, precision = 5) => parseFloat(num.toPrecision(precision));
const getAvgFrameTime = (times) => lessPrecise(times.reduce((a, b) => a + b) / times.length);
class Debug {
    static DEBUG_LOG_TIMES = true;
    static TIMES_AGGR = {};
    static TIMES_AVG = {};
    static LAST_DEBUG_LOG_CALL = 0;
    static DEBUG_LOG_INTERVAL_ID = null;
    static LAST_FRAME_TIMESTAMP = 0;
    static FRAME_COUNT = 0;
    static ANIMATION_FRAME_ID = null;
    static scheduleAnimationFrame = () => {
        if (Debug.DEBUG_LOG_INTERVAL_ID !== null) {
            Debug.ANIMATION_FRAME_ID = requestAnimationFrame((timestamp) => {
                if (Debug.LAST_FRAME_TIMESTAMP !== timestamp) {
                    Debug.LAST_FRAME_TIMESTAMP = timestamp;
                    Debug.FRAME_COUNT++;
                }
                if (Debug.DEBUG_LOG_INTERVAL_ID !== null) {
                    Debug.scheduleAnimationFrame();
                }
            });
        }
    };
    static setupInterval = () => {
        if (Debug.DEBUG_LOG_INTERVAL_ID === null) {
            console.info("%c(starting perf recording)", "color: lime");
            Debug.DEBUG_LOG_INTERVAL_ID = window.setInterval(Debug.debugLogger, 1000);
            Debug.scheduleAnimationFrame();
        }
        Debug.LAST_DEBUG_LOG_CALL = Date.now();
    };
    static debugLogger = () => {
        if (Debug.DEBUG_LOG_TIMES) {
            for (const [name, { t, times }] of Object.entries(Debug.TIMES_AGGR)) {
                if (times.length) {
                    console.info(name, lessPrecise(times.reduce((a, b) => a + b)), times.sort((a, b) => a - b).map((x) => lessPrecise(x)));
                    Debug.TIMES_AGGR[name] = { t, times: [] };
                }
            }
            for (const [name, { t, times, avg }] of Object.entries(Debug.TIMES_AVG)) {
                if (times.length) {
                    // const avgFrameTime = getAvgFrameTime(times);
                    const totalTime = times.reduce((a, b) => a + b);
                    const avgFrameTime = lessPrecise(totalTime / Debug.FRAME_COUNT);
                    console.info(name, `- ${times.length} calls - ${avgFrameTime}ms/frame across ${Debug.FRAME_COUNT} frames (${lessPrecise((avgFrameTime / 16.67) * 100, 1)}% of frame budget)`);
                    Debug.TIMES_AVG[name] = {
                        t,
                        times: [],
                        avg: avg != null ? getAvgFrameTime([avg, avgFrameTime]) : avgFrameTime,
                    };
                }
            }
        }
        Debug.FRAME_COUNT = 0;
        // Check for stop condition after logging
        if (Date.now() - Debug.LAST_DEBUG_LOG_CALL > 600 &&
            Debug.DEBUG_LOG_INTERVAL_ID !== null) {
            console.info("%c(stopping perf recording)", "color: red");
            window.clearInterval(Debug.DEBUG_LOG_INTERVAL_ID);
            window.cancelAnimationFrame(Debug.ANIMATION_FRAME_ID);
            Debug.ANIMATION_FRAME_ID = null;
            Debug.FRAME_COUNT = 0;
            Debug.LAST_FRAME_TIMESTAMP = 0;
            Debug.DEBUG_LOG_INTERVAL_ID = null;
            Debug.TIMES_AGGR = {};
            Debug.TIMES_AVG = {};
        }
    };
    static logTime = (time, name = "default") => {
        Debug.setupInterval();
        const now = performance.now();
        const { t, times } = (Debug.TIMES_AGGR[name] = Debug.TIMES_AGGR[name] || {
            t: 0,
            times: [],
        });
        if (t) {
            times.push(time != null ? time : now - t);
        }
        Debug.TIMES_AGGR[name].t = now;
    };
    static logTimeAverage = (time, name = "default") => {
        Debug.setupInterval();
        const now = performance.now();
        const { t, times } = (Debug.TIMES_AVG[name] = Debug.TIMES_AVG[name] || {
            t: 0,
            times: [],
        });
        if (t) {
            times.push(time != null ? time : now - t);
        }
        Debug.TIMES_AVG[name].t = now;
    };
    static logWrapper = (type) => (fn, name = "default") => {
        return (...args) => {
            const t0 = performance.now();
            const ret = fn(...args);
            Debug[type](performance.now() - t0, name);
            return ret;
        };
    };
    static logTimeWrap = Debug.logWrapper("logTime");
    static logTimeAverageWrap = Debug.logWrapper("logTimeAverage");
    static perfWrap = (fn, name = "default") => {
        return (...args) => {
            // eslint-disable-next-line no-console
            console.time(name);
            const ret = fn(...args);
            // eslint-disable-next-line no-console
            console.timeEnd(name);
            return ret;
        };
    };
    static CHANGED_CACHE = {};
    static logChanged(name, obj) {
        const prev = Debug.CHANGED_CACHE[name];
        Debug.CHANGED_CACHE[name] = obj;
        if (!prev) {
            return;
        }
        const allKeys = new Set([...Object.keys(prev), ...Object.keys(obj)]);
        const changed = {};
        for (const key of allKeys) {
            const prevVal = prev[key];
            const nextVal = obj[key];
            if (!deepEqual(prevVal, nextVal)) {
                changed[key] = { prev: prevVal, next: nextVal };
            }
        }
        if (Object.keys(changed).length > 0) {
            console.info(`[${name}] changed:`, changed);
        }
    }
}
exports.Debug = Debug;
function deepEqual(a, b) {
    if (Object.is(a, b)) {
        return true;
    }
    if (a === null ||
        b === null ||
        typeof a !== "object" ||
        typeof b !== "object") {
        return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (!deepEqual(a[key], b[key])) {
            return false;
        }
    }
    return true;
}
