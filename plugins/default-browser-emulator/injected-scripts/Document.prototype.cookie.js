const triggerName = args.callbackName;
if (!self[triggerName])
    throw new Error('No cookie trigger');
const cookieTrigger = self[triggerName].bind(self);
delete self[triggerName];
proxySetter(Document.prototype, 'cookie', (target, thisArg, cookie) => {
    cookieTrigger(JSON.stringify({ cookie, origin: self.location.origin }));
    return ProxyOverride.callOriginal;
});
