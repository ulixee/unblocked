"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOriginType = void 0;
const originTypes = ['none', 'same-origin', 'same-site', 'cross-site'];
function isOriginType(type) {
    return originTypes.includes(type);
}
exports.isOriginType = isOriginType;
//# sourceMappingURL=OriginType.js.map