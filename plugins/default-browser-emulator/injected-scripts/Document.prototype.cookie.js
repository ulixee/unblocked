"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typedArgs = args;
const triggerName = typedArgs.callbackName;
if (!self[triggerName])
    throw new Error('No cookie trigger');
const cookieTrigger = self[triggerName].bind(self);
delete self[triggerName];
replaceSetter(Document.prototype, 'cookie', (target, thisArg, argArray) => {
    const cookie = argArray.at(0);
    if (cookie) {
        cookieTrigger(JSON.stringify({ cookie, origin: self.location.origin }));
    }
    return ReflectCached.apply(target, thisArg, argArray);
});
