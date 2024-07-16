import { IFrame } from '@ulixee/unblocked-specification/agent/browser/IFrame';
import INewDocumentInjectedScript from '../interfaces/INewDocumentInjectedScript';
import { InjectedScript } from '../interfaces/IBrowserEmulatorConfig';
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
    registerWorkerOverrides(...names: InjectedScript[]): void;
    add<T>(name: InjectedScript, args?: T): void;
    addPageScript(script: string, args: Record<string, any> & {
        callbackName?: string;
    }, callbackFn?: (data: string, frame: IFrame) => any): void;
    cleanup(): void;
    addWorkerScript(script: string, args?: any): void;
    private wrapScript;
}
export declare function getOverrideScript(name: InjectedScript, args?: any): {
    script: string;
    callbacks: INewDocumentInjectedScript['callback'][];
};
