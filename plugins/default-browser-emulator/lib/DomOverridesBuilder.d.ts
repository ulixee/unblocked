import { IFrame } from '@ulixee/unblocked-specification/agent/browser/IFrame';
import INewDocumentInjectedScript from '../interfaces/INewDocumentInjectedScript';
declare const injectedSourceUrl = "<anonymuos>";
export { injectedSourceUrl };
export default class DomOverridesBuilder {
    private readonly scriptsByName;
    private readonly alwaysPageScripts;
    private readonly alwaysWorkerScripts;
    private workerOverrides;
    getWorkerOverrides(): string[];
    build(type?: 'worker' | 'page', scriptNames?: string[]): {
        script: string;
        callbacks: INewDocumentInjectedScript['callback'][];
    };
    registerWorkerOverrides(...names: string[]): void;
    add(name: string, args?: any): void;
    addPageScript(script: string, args: Record<string, any> & {
        callbackName?: string;
    }, callbackFn?: (data: string, frame: IFrame) => any): void;
    cleanup(): void;
    addWorkerScript(script: string, args?: any): void;
    private wrapScript;
}
export declare function getOverrideScript(name: string, args?: any): {
    script: string;
    callbacks: INewDocumentInjectedScript['callback'][];
};
