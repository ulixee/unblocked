if (typeof scopedVars.frameWindowProxies === 'undefined') {
    scopedVars.frameWindowProxies = new WeakMap();
    scopedVars.hasRunNewDocumentScripts = new WeakSet();
    scopedVars.originalContentWindow = Object.getOwnPropertyDescriptor(self.HTMLIFrameElement.prototype, 'contentWindow').get;
    function getTrueContentWindow(frame) {
        return scopedVars.originalContentWindow.apply(frame);
    }
}
const frameWindowProxies = scopedVars.frameWindowProxies;
const hasRunNewDocumentScripts = scopedVars.hasRunNewDocumentScripts;
proxyGetter(self.HTMLIFrameElement.prototype, 'contentWindow', (target, iframe) => {
    if (frameWindowProxies.has(iframe) && iframe.isConnected) {
        return frameWindowProxies.get(iframe);
    }
    return ProxyOverride.callOriginal;
});
proxySetter(self.HTMLIFrameElement.prototype, 'srcdoc', function (_, iframe) {
    if (!frameWindowProxies.has(iframe)) {
        const proxy = new Proxy(self, {
            get(target, key) {
                if (key === 'self' || key === 'contentWindow') {
                    return iframe.contentWindow;
                }
                if (key === 'document') {
                    const contentWindow = getTrueContentWindow(iframe);
                    if (contentWindow) {
                        if (!hasRunNewDocumentScripts.has(contentWindow)) {
                            hasRunNewDocumentScripts.add(contentWindow);
                            newDocumentScript(contentWindow);
                            frameWindowProxies.delete(iframe);
                        }
                        return contentWindow.document;
                    }
                    return null;
                }
                if (key === 'frameElement') {
                    return iframe;
                }
                if (key === '0') {
                    return undefined;
                }
                return ReflectCached.get(target, key);
            },
        });
        frameWindowProxies.set(iframe, proxy);
    }
    return ProxyOverride.callOriginal;
});
