/// <reference types="node" />
import IBrowserEngine from '@ulixee/unblocked-specification/agent/browser/IBrowserEngine';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { PipeTransport } from './PipeTransport';
export default class BrowserProcess extends TypedEventEmitter<{
    close: void;
}> {
    private browserEngine;
    private processEnv?;
    readonly transport: PipeTransport;
    isProcessFunctionalPromise: Resolvable<boolean>;
    launchStderr: string[];
    private processKilled;
    private readonly launchedProcess;
    constructor(browserEngine: IBrowserEngine, processEnv?: NodeJS.ProcessEnv);
    close(): Promise<void>;
    private bindCloseHandlers;
    private launch;
    private bindProcessEvents;
    private gracefulCloseBrowser;
    private killChildProcess;
    private onChildProcessExit;
    private cleanDataDir;
}
