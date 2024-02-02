"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function setWorkerDomOverrides(domOverrides, data, worker) {
    const scriptNames = domOverrides.getWorkerOverrides();
    const script = domOverrides.build('worker', scriptNames);
    if (script.callbacks.length) {
        throw new Error("Workers can't create callbacks");
    }
    return worker.evaluate(script.script, true);
}
exports.default = setWorkerDomOverrides;
//# sourceMappingURL=setWorkerDomOverrides.js.map