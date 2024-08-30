"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../index");
function selectBrowserEngineOption(browserEngineId, browserEngineOptions) {
    const browserEngineOption = browserEngineOptions.find(x => x.id === browserEngineId);
    return browserEngineOption ?? browserEngineOptions.find(x => x.id === index_1.defaultBrowserEngine.id);
}
exports.default = selectBrowserEngineOption;
//# sourceMappingURL=selectBrowserEngineOption.js.map