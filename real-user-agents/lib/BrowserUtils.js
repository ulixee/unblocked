"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBrowserIdFromUserAgentString = exports.createBrowserId = void 0;
const extractUserAgentMeta_1 = require("./extractUserAgentMeta");
function createBrowserId(browser) {
    const name = browser.name.toLowerCase().replace(/\s/g, '-');
    const minorVersion = name === 'edge' ? '0' : browser.version.minor;
    return `${name}-${browser.version.major}-${minorVersion}`;
}
exports.createBrowserId = createBrowserId;
function createBrowserIdFromUserAgentString(userAgentString) {
    const { name, version } = (0, extractUserAgentMeta_1.default)(userAgentString);
    return createBrowserId({ name, version });
}
exports.createBrowserIdFromUserAgentString = createBrowserIdFromUserAgentString;
//# sourceMappingURL=BrowserUtils.js.map