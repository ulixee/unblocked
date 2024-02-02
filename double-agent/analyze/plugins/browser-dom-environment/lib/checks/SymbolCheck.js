"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseCheck_1 = require("@double-agent/analyze/lib/checks/BaseCheck");
class SymbolCheck extends BaseCheck_1.default {
    constructor(identity, meta, value) {
        super(identity, meta);
        this.prefix = 'SYMB';
        this.type = BaseCheck_1.CheckType.Individual;
        this.value = value;
    }
    get signature() {
        return `${this.id}:${this.value}`;
    }
    get args() {
        return [this.value];
    }
}
exports.default = SymbolCheck;
//# sourceMappingURL=SymbolCheck.js.map