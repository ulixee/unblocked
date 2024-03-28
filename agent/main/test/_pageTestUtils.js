"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForVisible = exports.navigateFrame = exports.detachFrame = exports.setContent = exports.attachFrame = void 0;
const index_1 = require("../index");
const ConsoleMessage_1 = require("../lib/ConsoleMessage");
async function attachFrame(pageOrFrame, frameId, url) {
    const frameCreatedPromise = pageOrFrame instanceof index_1.Page
        ? pageOrFrame.waitOn('frame-created')
        : pageOrFrame.page.waitOn('frame-created');
    await pageOrFrame.evaluate(`
        (async () => {
          const frame = document.createElement('iframe');
          frame.src = '${url}';
          frame.id = '${frameId}';
          document.body.appendChild(frame);
          await new Promise(x => (frame.onload = x));
        })()`);
    const { frame } = await frameCreatedPromise;
    if (pageOrFrame instanceof index_1.Page)
        return pageOrFrame.frames.find(x => x.id === frame.id);
    return pageOrFrame.childFrames.find(x => x.id === frame.id);
}
exports.attachFrame = attachFrame;
async function setContent(page, content) {
    await page.devtoolsSession.send('Page.setDocumentContent', {
        html: content,
        frameId: page.mainFrame.id,
    });
}
exports.setContent = setContent;
async function detachFrame(pageOrFrame, frameId) {
    await pageOrFrame.evaluate(`document.getElementById('${frameId}').remove()`);
}
exports.detachFrame = detachFrame;
async function navigateFrame(pageOrFrame, frameId, url) {
    const result = await pageOrFrame.devtoolsSession.send('Runtime.evaluate', {
        expression: `(() => {
      const frame = document.getElementById('${frameId}')
      frame.src = '${url}';
      return new Promise(x => {
        return (frame.onload = x);
      });
    })()`,
        awaitPromise: true,
    });
    if (result.exceptionDetails) {
        throw ConsoleMessage_1.default.exceptionToError(result.exceptionDetails);
    }
}
exports.navigateFrame = navigateFrame;
async function waitForVisible(frame, selector, timeoutMs = 10e3) {
    let visibility;
    await wait(async () => {
        visibility = await frame.jsPath.getNodeVisibility(['document', ['querySelector', selector]]);
        if (visibility.isVisible) {
            return true;
        }
    }, { loopDelayMs: 100, timeoutMs });
    return visibility;
}
exports.waitForVisible = waitForVisible;
function wait(callbackFn, options = {}) {
    options.timeoutMs ??= 30e3;
    const end = Date.now() + options.timeoutMs;
    return new Promise(async (resolve, reject) => {
        while (Date.now() <= end) {
            const isComplete = await callbackFn().catch(reject);
            if (isComplete) {
                resolve(true);
                return;
            }
            if (options.loopDelayMs) {
                await delay(options.loopDelayMs);
            }
        }
        resolve(false);
    });
}
function delay(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}
//# sourceMappingURL=_pageTestUtils.js.map