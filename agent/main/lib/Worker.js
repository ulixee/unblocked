"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const IPendingWaitEvent_1 = require("@ulixee/commons/interfaces/IPendingWaitEvent");
const EventSubscriber_1 = require("@ulixee/commons/lib/EventSubscriber");
const eventUtils_1 = require("@ulixee/commons/lib/eventUtils");
const utils_1 = require("@ulixee/commons/lib/utils");
const ConsoleMessage_1 = require("./ConsoleMessage");
const NetworkManager_1 = require("./NetworkManager");
class Worker extends eventUtils_1.TypedEventEmitter {
    get isInitializationSent() {
        return this.initializationSent.promise;
    }
    get id() {
        return this.targetInfo.targetId;
    }
    get url() {
        return this.targetInfo.url;
    }
    get type() {
        return this.targetInfo.type;
    }
    constructor(browserContext, parentNetworkManager, devtoolsSession, logger, targetInfo) {
        super();
        this.hasLoadedResponse = false;
        this.initializationSent = (0, utils_1.createPromise)();
        this.events = new EventSubscriber_1.default();
        this.executionContextId = (0, utils_1.createPromise)();
        this.targetInfo = targetInfo;
        this.devtoolsSession = devtoolsSession;
        this.browserContext = browserContext;
        this.logger = logger.createChild(module, {
            workerTargetId: this.id,
            workerType: this.type,
        });
        this.networkManager = new NetworkManager_1.default(devtoolsSession, this.logger, browserContext.proxy);
        const session = this.devtoolsSession;
        this.events.on(session, 'Runtime.consoleAPICalled', this.onRuntimeConsole.bind(this));
        this.events.on(session, 'Runtime.exceptionThrown', this.onRuntimeException.bind(this));
        this.events.on(session, 'Runtime.executionContextCreated', this.onContextCreated.bind(this));
        this.events.on(session, 'Inspector.targetReloadedAfterCrash', () => {
            return this.initialize(parentNetworkManager);
        });
        this.events.once(session, 'disconnected', this.emit.bind(this, 'close'));
        this.isReady = this.initialize(parentNetworkManager).catch(err => err);
    }
    initialize(pageNetworkManager) {
        const { hooks } = this.browserContext;
        const result = Promise.all([
            this.networkManager.initializeFromParent(pageNetworkManager).catch(err => {
                // web workers can use parent network
                if (err.message.includes(`'Fetch.enable' wasn't found`))
                    return;
                throw err;
            }),
            this.devtoolsSession.send('Runtime.enable'),
            this.type === 'shared_worker'
                ? this.devtoolsSession.send('Network.setCacheDisabled', { cacheDisabled: true })
                : null,
            this.initializeEmulation(hooks),
            // service worker will lock up without this!
            this.type === 'service_worker'
                ? this.devtoolsSession.send('Runtime.runIfWaitingForDebugger')
                : null,
        ]);
        setImmediate(() => this.initializationSent.resolve());
        return result.then(() => null);
    }
    async evaluate(expression, isInitializationScript = false) {
        const result = await this.devtoolsSession.send('Runtime.evaluate', {
            expression,
            awaitPromise: !isInitializationScript,
            // contextId,
            returnByValue: true,
        });
        if (result.exceptionDetails) {
            throw ConsoleMessage_1.default.exceptionToError(result.exceptionDetails);
        }
        const remote = result.result;
        if (remote.objectId)
            this.devtoolsSession.disposeRemoteObject(remote);
        return remote.value;
    }
    close() {
        this.networkManager.close();
        this.cancelPendingEvents('Worker closing', ['close']);
        this.events.close();
    }
    toJSON() {
        return {
            id: this.id,
            url: this.url,
            type: this.type,
        };
    }
    initializeEmulation(hooks) {
        if (!hooks.onNewWorker) {
            return this.devtoolsSession.send('Runtime.runIfWaitingForDebugger');
        }
        return Promise.all([
            hooks.onNewWorker(this),
            this.devtoolsSession.send('Debugger.enable'),
            this.devtoolsSession.send('Debugger.setBreakpointByUrl', {
                lineNumber: 0,
                url: this.targetInfo.url,
            }),
        ])
            .then(this.resumeAfterEmulation.bind(this))
            .catch(async (error) => {
            if (error instanceof IPendingWaitEvent_1.CanceledPromiseError)
                return;
            // eslint-disable-next-line promise/no-nesting
            await this.resumeAfterEmulation().catch(() => null);
            this.logger.warn('Emulator.onNewWorkerError', {
                error,
            });
            throw error;
        });
    }
    resumeAfterEmulation() {
        return Promise.all([
            this.devtoolsSession.send('Runtime.runIfWaitingForDebugger'),
            this.devtoolsSession.send('Debugger.disable'),
        ]);
    }
    onContextCreated(event) {
        this.executionContextId.resolve(event.context.id);
    }
    onRuntimeException(msg) {
        const error = ConsoleMessage_1.default.exceptionToError(msg.exceptionDetails);
        this.emit('page-error', {
            error,
        });
    }
    onRuntimeConsole(event) {
        const message = ConsoleMessage_1.default.create(this.devtoolsSession, event);
        const frameId = `${this.type}:${this.url}`; // TBD
        this.emit('console', {
            frameId,
            ...message,
        });
    }
}
exports.Worker = Worker;
//# sourceMappingURL=Worker.js.map