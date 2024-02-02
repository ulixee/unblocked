"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InjectedScripts_1 = require("./InjectedScripts");
class MouseListener {
    constructor(frame, nodeId) {
        this.frame = frame;
        this.nodeId = nodeId;
    }
    async register() {
        const containerOffset = await this.frame.getContainerOffset();
        return this.frame.evaluate(`${InjectedScripts_1.default.MouseEvents}.listenFor(${this.nodeId}, ${JSON.stringify(containerOffset)})`, this.frame.page.installJsPathIntoIsolatedContext);
    }
    async didTriggerMouseEvent() {
        return await this.frame.evaluate(`${InjectedScripts_1.default.MouseEvents}.didTrigger(${this.nodeId})`, this.frame.page.installJsPathIntoIsolatedContext);
    }
    static async waitForScrollStop(frame, timeoutMs) {
        return await frame.evaluate(`${InjectedScripts_1.default.MouseEvents}.waitForScrollStop(${timeoutMs ?? 2e3})`, frame.page.installJsPathIntoIsolatedContext);
    }
    static async getWindowOffset(frame) {
        return await frame.evaluate(`${InjectedScripts_1.default.MouseEvents}.getWindowOffset()`, frame.page.installJsPathIntoIsolatedContext);
    }
}
exports.default = MouseListener;
//# sourceMappingURL=MouseListener.js.map