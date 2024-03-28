"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.average = void 0;
function average(numbers) {
    if (!numbers.length)
        return 0;
    return Math.floor(numbers.reduce((t, c) => t + c, 0) / numbers.length);
}
exports.average = average;
//# sourceMappingURL=utils.js.map