let nativeToStringFunctionString = `${Function.toString}`;
const overriddenFns = new Map();
const proxyToTarget = new Map();
const ReflectCached = {
    construct: Reflect.construct.bind(Reflect),
    get: Reflect.get.bind(Reflect),
    set: Reflect.set.bind(Reflect),
    apply: Reflect.apply.bind(Reflect),
    setPrototypeOf: Reflect.setPrototypeOf.bind(Reflect),
    ownKeys: Reflect.ownKeys.bind(Reflect),
    getOwnPropertyDescriptor: Reflect.getOwnPropertyDescriptor.bind(Reflect),
};
const ErrorCached = Error;
const ObjectCached = {
    setPrototypeOf: Object.setPrototypeOf.bind(Object),
    getPrototypeOf: Object.getPrototypeOf.bind(Object),
    defineProperty: Object.defineProperty.bind(Object),
    create: Object.create.bind(Object),
    entries: Object.entries.bind(Object),
    values: Object.values.bind(Object),
    keys: Object.keys.bind(Object),
    getOwnPropertyDescriptors: Object.getOwnPropertyDescriptors.bind(Object),
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor.bind(Object),
};
(function trackProxyInstances() {
    if (typeof self === 'undefined')
        return;
    const descriptor = ObjectCached.getOwnPropertyDescriptor(self, 'Proxy');
    const toString = descriptor.value.toString();
    descriptor.value = new Proxy(descriptor.value, {
        construct(target, argArray, newTarget) {
            try {
                const result = ReflectCached.construct(target, argArray, newTarget);
                if (argArray?.length)
                    proxyToTarget.set(result, argArray[0]);
                return result;
            }
            catch (err) {
                throw cleanErrorStack(err, { stripStartingReflect: true });
            }
        },
    });
    overriddenFns.set(descriptor.value, toString);
    ObjectCached.defineProperty(self, 'Proxy', descriptor);
})();
const fnToStringDescriptor = ObjectCached.getOwnPropertyDescriptor(Function.prototype, 'toString');
const fnToStringProxy = internalCreateFnProxy(Function.prototype.toString, fnToStringDescriptor, (target, thisArg, args) => {
    if (overriddenFns.has(thisArg)) {
        return overriddenFns.get(thisArg);
    }
    if (thisArg !== null && thisArg !== undefined) {
        const hasSameProto = ObjectCached.getPrototypeOf(Function.prototype.toString).isPrototypeOf(thisArg.toString);
        if (hasSameProto === false) {
            return thisArg.toString(...(args ?? []));
        }
    }
    try {
        return target.apply(thisArg, args);
    }
    catch (error) {
        cleanErrorStack(error, {
            replaceLineFn: (line, i) => {
                if (i === 1 && line.includes('at Object.toString')) {
                    const thisProto = ObjectCached.getPrototypeOf(thisArg);
                    if (proxyToTarget.has(thisProto) &&
                        (overriddenFns.has(thisProto) || overriddenFns.has(target))) {
                        return line.replace('at Object.toString', 'at Function.toString');
                    }
                }
                return line;
            },
        });
        throw error;
    }
});
ObjectCached.defineProperty(Function.prototype, 'toString', {
    ...fnToStringDescriptor,
    value: fnToStringProxy,
});
let isObjectSetPrototypeOf = 0;
const nativeToStringObjectSetPrototypeOfString = `${Object.setPrototypeOf}`;
Object.setPrototypeOf = new Proxy(Object.setPrototypeOf, {
    apply() {
        let isFunction = false;
        isObjectSetPrototypeOf += 1;
        try {
            isFunction = arguments[1] && typeof arguments[1] === 'function';
            return ReflectCached.apply(...arguments);
        }
        catch (error) {
            throw cleanErrorStack(error, {
                stripStartingReflect: true,
                replaceLineFn(line, i, prevLine) {
                    if (i === 1 || i === 2) {
                        if (prevLine.match(/at (?:Function|Object)\.setPrototypeOf/))
                            return undefined;
                        if (line.includes('at Proxy.setPrototypeOf')) {
                            const replacement = isFunction
                                ? 'at Function.setPrototypeOf'
                                : 'at Object.setPrototypeOf';
                            return line.replace('at Proxy.setPrototypeOf', replacement);
                        }
                        if (line.includes('at Function.setPrototypeOf') && !isFunction) {
                            return undefined;
                        }
                    }
                    return line;
                },
            });
        }
        finally {
            isObjectSetPrototypeOf -= 1;
        }
    },
});
overriddenFns.set(Object.setPrototypeOf, nativeToStringObjectSetPrototypeOfString);
var ProxyOverride;
(function (ProxyOverride) {
    ProxyOverride["callOriginal"] = "_____invoke_original_____";
})(ProxyOverride || (ProxyOverride = {}));
function cleanErrorStack(error, opts = {
    startAfterSourceUrl: false,
    stripStartingReflect: false,
}) {
    if (!error.stack)
        return error;
    const { replaceLineFn, startAfterSourceUrl, stripStartingReflect } = opts;
    const split = error.stack.includes('\r\n') ? '\r\n' : '\n';
    const stack = error.stack.split(/\r?\n/);
    const newStack = [];
    for (let i = 0; i < stack.length; i += 1) {
        let line = stack[i];
        if (i === 1 && stripStartingReflect && line.includes('at Reflect.'))
            continue;
        if (line.includes(sourceUrl)) {
            if (startAfterSourceUrl === true) {
                newStack.length = 1;
            }
            continue;
        }
        if (replaceLineFn) {
            line = replaceLineFn(line, i, newStack[newStack.length - 1]);
        }
        if (!line)
            continue;
        newStack.push(line);
    }
    error.stack = newStack.join(split);
    return error;
}
function proxyConstructor(owner, key, overrideFn) {
    const descriptor = ObjectCached.getOwnPropertyDescriptor(owner, key);
    const toString = descriptor.value.toString();
    descriptor.value = new Proxy(descriptor.value, {
        construct() {
            try {
                const result = overrideFn(...arguments);
                if (result !== ProxyOverride.callOriginal) {
                    return result;
                }
            }
            catch (err) {
                throw cleanErrorStack(err);
            }
            try {
                return ReflectCached.construct(...arguments);
            }
            catch (err) {
                throw cleanErrorStack(err, { stripStartingReflect: true });
            }
        },
    });
    overriddenFns.set(descriptor.value, toString);
    ObjectCached.defineProperty(owner, key, descriptor);
}
function internalCreateFnProxy(targetFn, descriptor, onApply) {
    const toString = targetFn.toString();
    const proxy = new Proxy(targetFn, {
        apply: onApply,
        setPrototypeOf(target, newPrototype) {
            let protoTarget = newPrototype;
            let newPrototypeProto;
            try {
                newPrototypeProto = newPrototype?.__proto__;
            }
            catch { }
            if (newPrototype === proxy || newPrototypeProto === proxy) {
                protoTarget = target;
            }
            let isFromObjectSetPrototypeOf = isObjectSetPrototypeOf > 0;
            if (!isFromObjectSetPrototypeOf) {
                const stack = new ErrorCached().stack.split(/\r?\n/);
                if (stack[1].includes('Object.setPrototypeOf') &&
                    stack[1].includes(sourceUrl) &&
                    !stack[2].includes('Reflect.setPrototypeOf')) {
                    isFromObjectSetPrototypeOf = true;
                }
            }
            try {
                const caller = isFromObjectSetPrototypeOf ? ObjectCached : ReflectCached;
                return caller.setPrototypeOf(target, protoTarget);
            }
            catch (error) {
                throw cleanErrorStack(error);
            }
        },
        get(target, p, receiver) {
            if (p === Symbol.hasInstance && receiver === proxy) {
                try {
                    return target[Symbol.hasInstance].bind(target);
                }
                catch (err) {
                    throw cleanErrorStack(err);
                }
            }
            try {
                return ReflectCached.get(target, p, receiver);
            }
            catch (err) {
                throw cleanErrorStack(err, { stripStartingReflect: true });
            }
        },
        set(target, p, value, receiver) {
            if (p === '__proto__') {
                let protoTarget = value;
                if (protoTarget === proxy || protoTarget?.__proto__ === proxy) {
                    protoTarget = target;
                }
                try {
                    return (target.__proto__ = protoTarget);
                }
                catch (error) {
                    throw cleanErrorStack(error);
                }
            }
            try {
                return ReflectCached.set(...arguments);
            }
            catch (err) {
                throw cleanErrorStack(err, { stripStartingReflect: true });
            }
        },
    });
    overriddenFns.set(proxy, toString);
    return proxy;
}
function proxyFunction(thisObject, functionName, overrideFn, overrideOnlyForInstance = false) {
    const descriptorInHierarchy = getDescriptorInHierarchy(thisObject, functionName);
    if (!descriptorInHierarchy) {
        throw new Error(`Could not find descriptor for function: ${String(functionName)}`);
    }
    const { descriptorOwner, descriptor } = descriptorInHierarchy;
    descriptorOwner[functionName] = internalCreateFnProxy(descriptorOwner[functionName], descriptor, (target, thisArg, argArray) => {
        const shouldOverride = overrideOnlyForInstance === false || thisArg === thisObject;
        const overrideFnToUse = shouldOverride ? overrideFn : null;
        return defaultProxyApply([target, thisArg, argArray], overrideFnToUse);
    });
    return thisObject[functionName];
}
function proxyGetter(thisObject, propertyName, overrideFn, overrideOnlyForInstance = false) {
    const descriptorInHierarchy = getDescriptorInHierarchy(thisObject, propertyName);
    if (!descriptorInHierarchy) {
        throw new Error(`Could not find descriptor for getter: ${String(propertyName)}`);
    }
    const { descriptorOwner, descriptor } = descriptorInHierarchy;
    descriptor.get = internalCreateFnProxy(descriptor.get, descriptor, (target, thisArg, argArray) => {
        const shouldOverride = overrideOnlyForInstance === false || thisArg === thisObject;
        const overrideFnToUse = shouldOverride ? overrideFn : null;
        return defaultProxyApply([target, thisArg, argArray], overrideFnToUse);
    });
    ObjectCached.defineProperty(descriptorOwner, propertyName, descriptor);
    return descriptor.get;
}
function proxySetter(thisObject, propertyName, overrideFn, overrideOnlyForInstance = false) {
    const descriptorInHierarchy = getDescriptorInHierarchy(thisObject, propertyName);
    if (!descriptorInHierarchy) {
        throw new Error(`Could not find descriptor for setter: ${String(propertyName)}`);
    }
    const { descriptorOwner, descriptor } = descriptorInHierarchy;
    descriptor.set = internalCreateFnProxy(descriptor.set, descriptor, (target, thisArg, argArray) => {
        if (!overrideOnlyForInstance || thisArg === thisObject) {
            try {
                const result = overrideFn(target, thisArg, ...argArray);
                if (result !== ProxyOverride.callOriginal)
                    return result;
            }
            catch (err) {
                throw cleanErrorStack(err);
            }
        }
        return ReflectCached.apply(target, thisArg, argArray);
    });
    ObjectCached.defineProperty(descriptorOwner, propertyName, descriptor);
    return descriptor.set;
}
function defaultProxyApply(args, overrideFn) {
    let result = ProxyOverride.callOriginal;
    if (overrideFn) {
        try {
            result = overrideFn(...args);
        }
        catch (err) {
            throw cleanErrorStack(err);
        }
    }
    if (result === ProxyOverride.callOriginal) {
        try {
            result = ReflectCached.apply(...args);
        }
        catch (err) {
            throw cleanErrorStack(err);
        }
    }
    try {
        if (result && result.then && typeof result.then === 'function') {
            return result.then(r => r, err => {
                throw cleanErrorStack(err);
            });
        }
    }
    catch {
    }
    return result;
}
function getDescriptorInHierarchy(obj, prop) {
    let proto = obj;
    do {
        if (!proto)
            return null;
        if (proto.hasOwnProperty(prop)) {
            return {
                descriptorOwner: proto,
                descriptor: ObjectCached.getOwnPropertyDescriptor(proto, prop),
            };
        }
        proto = ObjectCached.getPrototypeOf(proto);
    } while (proto);
    return null;
}
function addDescriptorAfterProperty(path, prevProperty, propertyName, descriptor) {
    const owner = getObjectAtPath(path);
    if (!owner) {
        console.log(`ERROR: Parent for property descriptor not found: ${path} -> ${propertyName}`);
        return;
    }
    const descriptors = ObjectCached.getOwnPropertyDescriptors(owner);
    if (descriptors[propertyName]) {
        return;
    }
    const inHierarchy = getDescriptorInHierarchy(owner, propertyName);
    if (inHierarchy && descriptor.value) {
        if (inHierarchy.descriptor.get) {
            proxyGetter(owner, propertyName, () => descriptor.value, true);
        }
        else {
            throw new Error("Can't override descriptor that doesnt have a getter");
        }
        return;
    }
    if (owner === self) {
        ObjectCached.defineProperty(owner, propertyName, descriptor);
        return reorderNonConfigurableDescriptors(path, propertyName, prevProperty, propertyName);
    }
    let hasPassedProperty = false;
    for (const [key, existingDescriptor] of ObjectCached.entries(descriptors)) {
        if (hasPassedProperty) {
            delete owner[key];
            ObjectCached.defineProperty(owner, key, existingDescriptor);
        }
        if (key === prevProperty) {
            ObjectCached.defineProperty(owner, propertyName, descriptor);
            hasPassedProperty = true;
        }
    }
}
const reordersByObject = new WeakMap();
proxyFunction(Object, 'getOwnPropertyDescriptors', (target, thisArg, argArray) => {
    const descriptors = ReflectCached.apply(target, thisArg, argArray);
    const reorders = reordersByObject.get(thisArg) ?? reordersByObject.get(argArray?.[0]);
    if (reorders) {
        const keys = Object.keys(descriptors);
        for (const { propertyName, prevProperty, throughProperty } of reorders) {
            adjustKeyOrder(keys, propertyName, prevProperty, throughProperty);
        }
        const finalDescriptors = {};
        for (const key of keys) {
            finalDescriptors[key] = descriptors[key];
        }
        return finalDescriptors;
    }
    return descriptors;
});
proxyFunction(Object, 'getOwnPropertyNames', (target, thisArg, argArray) => {
    const keys = ReflectCached.apply(target, thisArg, argArray);
    const reorders = reordersByObject.get(thisArg) ?? reordersByObject.get(argArray?.[0]);
    if (reorders) {
        for (const { propertyName, prevProperty, throughProperty } of reorders) {
            adjustKeyOrder(keys, propertyName, prevProperty, throughProperty);
        }
    }
    return keys;
});
proxyFunction(Object, 'keys', (target, thisArg, argArray) => {
    const keys = ReflectCached.apply(target, thisArg, argArray);
    const reorders = reordersByObject.get(thisArg) ?? reordersByObject.get(argArray?.[0]);
    if (reorders) {
        for (const { propertyName, prevProperty, throughProperty } of reorders) {
            adjustKeyOrder(keys, propertyName, prevProperty, throughProperty);
        }
    }
    return keys;
});
function reorderNonConfigurableDescriptors(objectPath, propertyName, prevProperty, throughProperty) {
    const objectAtPath = getObjectAtPath(objectPath);
    if (!reordersByObject.has(objectAtPath))
        reordersByObject.set(objectAtPath, []);
    const reorders = reordersByObject.get(objectAtPath);
    reorders.push({ prevProperty, propertyName, throughProperty });
}
function reorderDescriptor(path, propertyName, prevProperty, throughProperty) {
    const owner = getObjectAtPath(path);
    const descriptor = Object.getOwnPropertyDescriptor(owner, propertyName);
    if (!descriptor) {
        console.log(`Can't redefine a non-existent property descriptor: ${path} -> ${propertyName}`);
        return;
    }
    const prevDescriptor = Object.getOwnPropertyDescriptor(owner, prevProperty);
    if (!prevDescriptor) {
        console.log(`Can't redefine a non-existent prev property descriptor: ${path} -> ${propertyName}, prev =${prevProperty}`);
        return;
    }
    const descriptors = Object.getOwnPropertyDescriptors(owner);
    const keys = Object.keys(owner);
    adjustKeyOrder(keys, propertyName, prevProperty, throughProperty);
    for (const key of keys) {
        const keyDescriptor = descriptors[key];
        delete owner[key];
        Object.defineProperty(owner, key, keyDescriptor);
    }
}
function adjustKeyOrder(keys, propertyName, prevProperty, throughProperty) {
    const currentIndex = keys.indexOf(propertyName);
    const throughPropIndex = keys.indexOf(throughProperty) - currentIndex + 1;
    const props = keys.splice(currentIndex, throughPropIndex);
    keys.splice(keys.indexOf(prevProperty) + 1, 0, ...props);
}
if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = {
        proxyFunction,
    };
}
