declare const nativeErrorRegex: RegExp;
declare const globalSymbols: {};
declare function createError(message: string, type?: {
    new (msg: string): any;
}): Error;
declare function newObjectConstructor(newProps: IDescriptor, path: string, invocation?: string | Function): () => any;
declare const prototypesByPath: {
    [path: string]: PropertyDescriptor;
};
declare function buildDescriptor(entry: IDescriptor, path: string): PropertyDescriptor;
declare function getParentAndProperty(path: string): {
    parent: any;
    property: string;
};
declare function breakdownPath(path: string, propsToLeave: any): {
    parent: any;
    remainder: string[];
};
declare function getObjectAtPath(path: any): any;
declare interface IDescriptor {
    _$flags: string;
    _$type: string;
    _$get?: any;
    _$set?: any;
    _$accessException?: string;
    _$constructorException?: string;
    _$value?: string;
    '_$$value()'?: () => string;
    _$function?: string;
    _$invocation?: string;
    _$protos?: string[];
    'new()'?: IDescriptor;
    prototype: IDescriptor;
}
