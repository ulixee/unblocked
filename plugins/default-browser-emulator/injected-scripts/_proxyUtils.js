let nativeToStringFunctionString = `${Function.toString}`;
const overriddenFns = new Map();
const proxyToTarget = new WeakMap();
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
const proxyThisTracker = new Map([['External', undefined]]);
function getPrototypeSafe(obj) {
    try {
        return ObjectCached.getPrototypeOf(obj);
    }
    catch {
        return undefined;
    }
}
function runAndInjectProxyInStack(target, thisArg, argArray, proxy) {
    const name = overriddenFns.has(proxy) || overriddenFns.has(getPrototypeSafe(proxy))
        ? `Internal-${Math.random()}`
        : 'External';
    if (name.includes('Internal')) {
        if (typeof proxy === 'object' || typeof proxy === 'symbol') {
            proxyThisTracker.set(name, new WeakRef(proxy));
        }
        else {
            proxyThisTracker.set(name, proxy);
        }
    }
    const wrapper = {
        [name]() {
            return ReflectCached.apply(target, thisArg, argArray);
        },
    };
    return wrapper[name]();
}
(function trackProxyInstances() {
    if (typeof self === 'undefined')
        return;
    const descriptor = ObjectCached.getOwnPropertyDescriptor(self, 'Proxy');
    const toString = descriptor.value.toString();
    descriptor.value = new Proxy(descriptor.value, {
        construct(target, argArray, newTarget) {
            const result = ReflectCached.construct(target, argArray, newTarget);
            if (argArray?.length)
                proxyToTarget.set(result, argArray[0]);
            return result;
        },
    });
    overriddenFns.set(descriptor.value, toString);
    ObjectCached.defineProperty(self, 'Proxy', descriptor);
})();
const fnToStringDescriptor = ObjectCached.getOwnPropertyDescriptor(Function.prototype, 'toString');
const fnToStringProxy = internalCreateFnProxy({
    target: Function.prototype.toString,
    descriptor: fnToStringDescriptor,
    inner: {
        apply: (target, thisArg, args) => {
            const storedToString = overriddenFns.get(thisArg);
            if (storedToString) {
                return storedToString;
            }
            if (thisArg !== null && thisArg !== undefined) {
                const hasSameProto = ObjectCached.getPrototypeOf(Function.prototype.toString).isPrototypeOf(thisArg.toString);
                if (hasSameProto === false) {
                    return thisArg.toString(...(args ?? []));
                }
            }
            return runAndInjectProxyInStack(target, thisArg, args, thisArg);
        },
    },
});
ObjectCached.defineProperty(Function.prototype, 'toString', {
    ...fnToStringDescriptor,
    value: fnToStringProxy,
});
var ProxyOverride;
(function (ProxyOverride) {
    ProxyOverride["callOriginal"] = "_____invoke_original_____";
})(ProxyOverride || (ProxyOverride = {}));
function proxyConstructor(owner, key, overrideFn) {
    const descriptor = ObjectCached.getOwnPropertyDescriptor(owner, key);
    const toString = descriptor.value.toString();
    descriptor.value = new Proxy(descriptor.value, {
        construct() {
            const result = overrideFn(...arguments);
            if (result !== ProxyOverride.callOriginal) {
                return result;
            }
            return ReflectCached.construct(...arguments);
        },
    });
    overriddenFns.set(descriptor.value, toString);
    ObjectCached.defineProperty(owner, key, descriptor);
}
const setProtoTracker = new WeakSet();
function internalCreateFnProxy(opts) {
    function apply(target, thisArg, argArray) {
        if (opts.inner?.apply) {
            return opts.inner.apply(target, thisArg, argArray);
        }
        return ReflectCached.apply(target, thisArg, argArray);
    }
    function setPrototypeOf(target, newPrototype) {
        let protoTarget = newPrototype;
        let newPrototypeProto;
        try {
            newPrototypeProto = Object.getPrototypeOf(newPrototype);
        }
        catch { }
        if (newPrototype === proxy || newPrototypeProto === proxy) {
            protoTarget = target;
        }
        const temp = { stack: 'stack' };
        ErrorCached.captureStackTrace(temp);
        const stack = temp.stack.split('\n');
        const isFromReflect = stack.at(1).includes('Reflect.setPrototypeOf');
        try {
            const caller = isFromReflect ? ReflectCached : ObjectCached;
            return caller.setPrototypeOf(target, protoTarget);
        }
        catch (error) {
            setProtoTracker.add(error);
            throw error;
        }
    }
    function get(target, p, receiver) {
        if (p === Symbol.hasInstance && receiver === proxy) {
            return target[Symbol.hasInstance].bind(target);
        }
        if (opts.inner?.get) {
            return opts.inner.get(target, p, receiver);
        }
        const value = opts.inner?.get
            ? opts.inner.get(target, p, receiver)
            : ReflectCached.get(target, p, receiver);
        if (typeof value === 'function' && !opts.inner.disableGetProxyOnFunction) {
            return internalCreateFnProxy({
                target: value,
                inner: {
                    apply: (fnTarget, fnThisArg, fnArgArray) => {
                        return runAndInjectProxyInStack(fnTarget, fnThisArg, fnArgArray, proxy);
                    },
                },
            });
        }
        return value;
    }
    function set(target, p, value, receiver) {
        if (p === '__proto__') {
            let protoTarget = value;
            if (protoTarget === proxy || protoTarget?.__proto__ === proxy) {
                protoTarget = target;
            }
            return (target.__proto__ = protoTarget);
        }
        const result = opts.inner?.set
            ? opts.inner.set(target, p, value, receiver)
            : ReflectCached.set(...arguments);
        return result;
    }
    const proxy = new Proxy(opts.target, {
        apply: opts.custom?.apply ?? apply,
        setPrototypeOf: opts.custom?.setPrototypeOf ?? setPrototypeOf,
        get: opts.custom?.get ?? get,
        set: opts.custom?.set ?? set,
    });
    if (proxy instanceof Function) {
        const toString = overriddenFns.get(opts.target) ?? opts.target.toString();
        overriddenFns.set(proxy, toString);
    }
    return proxy;
}
function proxyFunction(thisObject, functionName, overrideFn, overrideOnlyForInstance = false) {
    const descriptorInHierarchy = getDescriptorInHierarchy(thisObject, functionName);
    if (!descriptorInHierarchy) {
        throw new Error(`Could not find descriptor for function: ${String(functionName)}`);
    }
    const { descriptorOwner, descriptor } = descriptorInHierarchy;
    descriptorOwner[functionName] = internalCreateFnProxy({
        target: descriptorOwner[functionName],
        descriptor,
        inner: {
            apply: (target, thisArg, argArray) => {
                const shouldOverride = overrideOnlyForInstance === false || thisArg === thisObject;
                const overrideFnToUse = shouldOverride ? overrideFn : null;
                return defaultProxyApply([target, thisArg, argArray], overrideFnToUse);
            },
        },
    });
    return thisObject[functionName];
}
function proxyGetter(thisObject, propertyName, overrideFn, overrideOnlyForInstance = false) {
    const descriptorInHierarchy = getDescriptorInHierarchy(thisObject, propertyName);
    if (!descriptorInHierarchy) {
        throw new Error(`Could not find descriptor for getter: ${String(propertyName)}`);
    }
    const { descriptorOwner, descriptor } = descriptorInHierarchy;
    descriptor.get = internalCreateFnProxy({
        target: descriptor.get,
        descriptor,
        inner: {
            apply: (target, thisArg, argArray) => {
                const shouldOverride = overrideOnlyForInstance === false || thisArg === thisObject;
                const overrideFnToUse = shouldOverride ? overrideFn : null;
                return defaultProxyApply([target, thisArg, argArray], overrideFnToUse);
            },
        },
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
    descriptor.set = internalCreateFnProxy({
        target: descriptor.set,
        descriptor,
        inner: {
            apply: (target, thisArg, argArray) => {
                if (!overrideOnlyForInstance || thisArg === thisObject) {
                    const result = overrideFn(target, thisArg, ...argArray);
                    if (result !== ProxyOverride.callOriginal)
                        return result;
                }
                return ReflectCached.apply(target, thisArg, argArray);
            },
        },
    });
    ObjectCached.defineProperty(descriptorOwner, propertyName, descriptor);
    return descriptor.set;
}
function defaultProxyApply(args, overrideFn) {
    let result = ProxyOverride.callOriginal;
    if (overrideFn) {
        result = overrideFn(...args);
    }
    if (result === ProxyOverride.callOriginal) {
        result = ReflectCached.apply(...args);
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
['call', 'apply'].forEach(key => {
    proxyFunction(Function.prototype, key, (target, thisArg, argArray) => {
        const originalThis = argArray.at(0);
        return runAndInjectProxyInStack(target, thisArg, argArray, originalThis);
    });
});
proxyFunction(Function.prototype, 'bind', (target, thisArg, argArray) => {
    const result = ReflectCached.apply(target, thisArg, argArray);
    const proxy = internalCreateFnProxy({
        target: result,
        inner: {
            apply(innerTarget, innerThisArg, innerArgArray) {
                const originalThis = argArray.at(0);
                return runAndInjectProxyInStack(innerTarget, innerThisArg, innerArgArray, originalThis);
            },
        },
    });
    return proxy;
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
