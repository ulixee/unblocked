declare let nativeToStringFunctionString: string;
declare const overriddenFns: Map<Function, string>;
declare const proxyToTarget: Map<any, any>;
declare const ReflectCached: {
    construct: any;
    get: any;
    set: any;
    apply: any;
    setPrototypeOf: any;
    ownKeys: any;
    getOwnPropertyDescriptor: any;
};
declare const ObjectCached: {
    setPrototypeOf: any;
    getPrototypeOf: any;
    defineProperty: any;
    create: any;
    entries: any;
    values: any;
    keys: any;
    getOwnPropertyDescriptors: any;
    getOwnPropertyDescriptor: any;
};
declare const fnToStringDescriptor: any;
declare const fnToStringProxy: any;
declare let isObjectSetPrototypeOf: boolean;
declare const nativeToStringObjectSetPrototypeOfString: string;
declare enum ProxyOverride {
    callOriginal = "_____invoke_original_____"
}
declare let sourceUrl: string;
declare function cleanErrorStack(error: Error, replaceLineFn?: (line: string, index: number) => string, startAfterSourceUrl?: boolean, stripStartingReflect?: boolean, stripFirstStackLine?: boolean): Error;
declare function proxyConstructor<T, K extends keyof T>(owner: T, key: K, overrideFn: (target?: T[K], argArray?: T[K] extends new (...args: infer P) => any ? P : never[], newTarget?: T[K]) => (T[K] extends new () => infer Z ? Z : never) | ProxyOverride): void;
declare function internalCreateFnProxy(targetFn: any, descriptor: PropertyDescriptor, onApply: (target: any, thisArg: any, argArray: any[]) => any): any;
declare function proxyFunction<T, K extends keyof T>(thisObject: T, functionName: K, overrideFn: (target?: T[K], thisArg?: T, argArray?: T[K] extends (...args: infer P) => any ? P : never[]) => (T[K] extends (...args: any[]) => infer Z ? Z : never) | ProxyOverride, overrideOnlyForInstance?: boolean): T[K];
declare function proxyGetter<T, K extends keyof T>(thisObject: T, propertyName: K, overrideFn: (target?: T[K], thisArg?: T) => T[K] | ProxyOverride, overrideOnlyForInstance?: boolean): any;
declare function proxySetter<T, K extends keyof T>(thisObject: T, propertyName: K, overrideFn: (target?: T[K], thisArg?: T, value?: T[K] extends (value: infer P) => any ? P : never) => void | ProxyOverride, overrideOnlyForInstance?: boolean): any;
declare function defaultProxyApply<T, K extends keyof T>(args: [target: any, thisArg: T, argArray: any[]], overrideFn?: (target?: T[K], thisArg?: T, argArray?: any[]) => T[K] | ProxyOverride): any;
declare function getDescriptorInHierarchy<T, K extends keyof T>(obj: T, prop: K): {
    descriptorOwner: T;
    descriptor: any;
};
declare function addDescriptorAfterProperty(path: string, prevProperty: string, propertyName: string, descriptor: PropertyDescriptor): void;
declare const reordersByObject: WeakMap<any, {
    propertyName: string;
    prevProperty: string;
    throughProperty: string;
}[]>;
declare function reorderNonConfigurableDescriptors(objectPath: any, propertyName: any, prevProperty: any, throughProperty: any): void;
declare function reorderDescriptor(path: any, propertyName: any, prevProperty: any, throughProperty: any): void;
declare function adjustKeyOrder(keys: any, propertyName: any, prevProperty: any, throughProperty: any): void;
