declare type IJsPath = IPathStep[];
export default IJsPath;

export declare type IPathStep = IPropertyName | IMethod | INodeId;
export declare type IPropertyName = string;
export declare type INodeId = number;
export declare type IMethod = [IMethodName, ...IMethodArgs];
export declare type IMethodName = string;
export declare type IMethodArgs = any[];

export function isIJsPath(input: unknown): input is IJsPath {
    if (Array.isArray(input) && input.length > 0) {
        return input.every((step) => isIPathStep(step))
    }

    return false
}

export function isIPathStep(input: unknown): input is IPathStep {
    if(typeof input === 'string' || typeof input === 'number') {
        return true
    }
    if(Array.isArray(input) && input.length > 0 && typeof input[0] === 'string') {
        return true
    }
    return false
}
