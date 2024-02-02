"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function setPageDomOverrides(domOverrides, data, pageOrFrame, devtoolsSession) {
    const script = domOverrides.build('page');
    const promises = [];
    for (const { name, fn } of script.callbacks) {
        promises.push(pageOrFrame.addPageCallback(name, fn, false, devtoolsSession));
    }
    // overrides happen in main frame
    promises.push(pageOrFrame.addNewDocumentScript(script.script, false, devtoolsSession));
    await Promise.all(promises);
}
exports.default = setPageDomOverrides;
//# sourceMappingURL=setPageDomOverrides.js.map