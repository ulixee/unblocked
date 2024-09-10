import Protocol from 'devtools-protocol';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import IRegisteredEventListener from '@ulixee/commons/interfaces/IRegisteredEventListener';
import { IFrame, IFrameManagerEvents } from '@ulixee/unblocked-specification/agent/browser/IFrame';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IResourceMeta from '@ulixee/unblocked-specification/agent/net/IResourceMeta';
import { IPageEvents } from '@ulixee/unblocked-specification/agent/browser/IPage';
import { IDomPaintEvent } from '@ulixee/unblocked-specification/agent/browser/Location';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import DevtoolsSession from './DevtoolsSession';
import Frame from './Frame';
import NetworkManager from './NetworkManager';
import DomStorageTracker from './DomStorageTracker';
import InjectedScripts from './InjectedScripts';
import Page from './Page';
import Resources from './Resources';
import FrameNavigatedEvent = Protocol.Page.FrameNavigatedEvent;
import FrameTree = Protocol.Page.FrameTree;
import FrameDetachedEvent = Protocol.Page.FrameDetachedEvent;
import FrameAttachedEvent = Protocol.Page.FrameAttachedEvent;
import ExecutionContextDestroyedEvent = Protocol.Runtime.ExecutionContextDestroyedEvent;
import ExecutionContextCreatedEvent = Protocol.Runtime.ExecutionContextCreatedEvent;
import NavigatedWithinDocumentEvent = Protocol.Page.NavigatedWithinDocumentEvent;
import FrameStoppedLoadingEvent = Protocol.Page.FrameStoppedLoadingEvent;
import LifecycleEventEvent = Protocol.Page.LifecycleEventEvent;
import FrameRequestedNavigationEvent = Protocol.Page.FrameRequestedNavigationEvent;
import TargetInfo = Protocol.Target.TargetInfo;

export const DEFAULT_PAGE = 'about:blank';
export const ISOLATED_WORLD = '__agent_world__';

export default class FramesManager extends TypedEventEmitter<IFrameManagerEvents> {
  public readonly framesById = new Map<string, Frame>();
  public readonly framesByFrameId = new Map<number, Frame>();
  public readonly page: Page;
  public readonly pendingNewDocumentScripts: { script: string; isolated: boolean }[] = [];

  public mainFrameId: string;

  public get main(): Frame {
    return this.framesById.get(this.mainFrameId);
  }

  public get activeFrames(): Frame[] {
    return Array.from(this.attachedFrameIds).map(x => this.framesById.get(x));
  }

  public devtoolsSession: DevtoolsSession;
  public websocketIdToFrameId = new Map<string, string>();

  protected readonly logger: IBoundLog;

  private onFrameCreatedResourceEventsByFrameId: {
    [frameId: string]: {
      type: keyof IPageEvents;
      event: IPageEvents[keyof IPageEvents];
    }[];
  } = {};

  private get resources(): Resources {
    return this.page.browserContext.resources;
  }

  private attachedFrameIds = new Set<string>();
  private activeContextIdsBySessionId = new Map<string, Set<number>>();
  private readonly events = new EventSubscriber();
  private readonly networkManager: NetworkManager;
  private readonly domStorageTracker: DomStorageTracker;

  private isReady: Promise<void>;

  // Key = ${frameId}__${type}
  private frameToContextId = new Map<string, Resolvable<number>>();

  constructor(page: Page, devtoolsSession: DevtoolsSession) {
    super();
    this.page = page;
    this.networkManager = page.networkManager;
    this.domStorageTracker = page.domStorageTracker;
    this.logger = page.logger.createChild(module);
    this.devtoolsSession = devtoolsSession;

    bindFunctions(this);

    this.events.on(page, 'resource-will-be-requested', this.onResourceWillBeRequested);
    this.events.on(page, 'resource-was-requested', this.onResourceWasRequested);
    this.events.on(page, 'resource-loaded', this.onResourceLoaded);
    this.events.on(page, 'resource-failed', this.onResourceFailed);
    this.events.on(page, 'navigation-response', this.onNavigationResourceResponse);
  }

  public initialize(devtoolsSession: DevtoolsSession): Promise<void> {
    this.events.group(
      devtoolsSession.id,
      this.events.on(
        devtoolsSession,
        'Page.frameNavigated',
        this.onFrameNavigated.bind(this, devtoolsSession),
      ),
      this.events.on(
        devtoolsSession,
        'Page.navigatedWithinDocument',
        this.onFrameNavigatedWithinDocument,
      ),
      this.events.on(
        devtoolsSession,
        'Page.frameRequestedNavigation',
        this.onFrameRequestedNavigation,
      ),
      this.events.on(
        devtoolsSession,
        'Page.frameDetached',
        this.onFrameDetached.bind(this, devtoolsSession),
      ),
      this.events.on(
        devtoolsSession,
        'Page.frameAttached',
        this.onFrameAttached.bind(this, devtoolsSession),
      ),
      this.events.on(devtoolsSession, 'Page.frameStoppedLoading', this.onFrameStoppedLoading),
      this.events.on(
        devtoolsSession,
        'Page.lifecycleEvent',
        this.onLifecycleEvent.bind(this, devtoolsSession),
      ),
      // this.events.on(
      //   devtoolsSession,
      //   'Runtime.executionContextsCleared',
      //   this.onExecutionContextsCleared.bind(this, devtoolsSession),
      // ),
      // this.events.on(
      //   devtoolsSession,
      //   'Runtime.executionContextDestroyed',
      //   this.onExecutionContextDestroyed.bind(this, devtoolsSession),
      // ),
      this.events.on(
        devtoolsSession,
        'Runtime.executionContextCreated',
        this.onExecutionContextCreated.bind(this, devtoolsSession),
      ),
      this.events.on(
        devtoolsSession,
        'Runtime.executionContextCreated',
        this.onExecutionContextCreatedNew.bind(this, devtoolsSession),
      ),
    );
    const id = devtoolsSession.id;
    this.events.once(devtoolsSession, 'disconnected', () => this.events.endGroup(id));

    this.isReady = new Promise<void>(async (resolve, reject) => {
      try {
        const [framesResponse, , readyStateResult] = await Promise.all([
          devtoolsSession.send('Page.getFrameTree'),
          devtoolsSession.send('Page.enable'),
          devtoolsSession
            .send('Runtime.evaluate', {
              expression: 'document.readyState',
            })
            .catch(() => {
              return {
                result: {
                  value: null,
                },
              };
            }),
          devtoolsSession.send('Page.setLifecycleEventsEnabled', { enabled: true }),
          // devtoolsSession.send('Runtime.enable'),
          InjectedScripts.install(this, devtoolsSession, this.onDomPaintEvent),
          // devtoolsSession.send('Runtime.disable'),
        ]);
        this.recurseFrameTree(devtoolsSession, framesResponse.frameTree);
        resolve();

        if (this.main.securityOrigin && !this.main.activeLoader?.lifecycle?.load) {
          // sometimes we get a new anchor link that already has an initiated frame. If that's the case, newDocumentScripts won't trigger.
          // NOTE: we DON'T want this to trigger for internal pages (':', 'about:blank')
          await this.main.runPendingNewDocumentScripts();
          const readyState = readyStateResult.result?.value;
          const loaderId = this.main.activeLoaderId;
          let loadName: string;
          if (readyState === 'interactive') loadName = 'DOMContentLoaded';
          else if (readyState === 'complete') loadName = 'load';
          if (loadName) setImmediate(() => this.main.onLifecycleEvent(loadName, null, loaderId));
        }
      } catch (error) {
        if (error instanceof CanceledPromiseError) {
          resolve();
          return;
        }
        reject(error);
      }
    });
    return this.isReady;
  }

  public reset(): void {
    for (const frame of this.framesById.values()) {
      if (frame.parentId) {
        this.framesByFrameId.delete(frame.frameId);
        this.framesById.delete(frame.id);
        frame.close();
      }
    }
    this.pendingNewDocumentScripts.length = 0;
    this.onFrameCreatedResourceEventsByFrameId = {};
  }

  public close(error?: Error): void {
    this.events.close();
    this.cancelPendingEvents('FramesManager closed');
    for (const frame of this.framesById.values()) {
      frame.close(error);
    }
    this.framesById.clear();
    this.framesByFrameId.clear();
  }

  public async addPageCallback(
    name: string,
    onCallback: (payload: string, frame: IFrame) => any,
    isolateFromWebPageEnvironment?: boolean,
    devtoolsSession?: DevtoolsSession,
  ): Promise<any> {
    return this.page.browserContext.websocketSession.on('message-received', async event => {
      if (event.name === name) {
        await this.isReady;
        const frame = this.framesById.get(event.id);
        if (frame) onCallback(event.payload, frame);
      }
    });
    // const params: Protocol.Runtime.AddBindingRequest = {
    //   name,
    // };
    // if (isolateFromWebPageEnvironment) {
    //   params.executionContextName = ISOLATED_WORLD;
    // }
    // devtoolsSession ??= this.devtoolsSession;
    // // add binding to every new context automatically
    // await devtoolsSession.send('Runtime.addBinding', params);
    // return this.events.on(devtoolsSession, 'Runtime.bindingCalled', async event => {
    //   if (event.name === name) {
    //     await this.isReady;
    //     const frame = this.getFrameForExecutionContext(event.executionContextId);
    //     if (frame) onCallback(event.payload, frame);
    //   }
    // });
  }

  public async addNewDocumentScript(
    script: string,
    installInIsolatedScope = true,
    devtoolsSession?: DevtoolsSession,
  ): Promise<{ identifier: string }> {
    devtoolsSession ??= this.devtoolsSession;
    script = this.page.browserContext.websocketSession.injectWebsocketCallbackIntoScript(script);
    const installedScript = await devtoolsSession.send('Page.addScriptToEvaluateOnNewDocument', {
      source: script,
      worldName: installInIsolatedScope ? ISOLATED_WORLD : undefined,
    });
    this.pendingNewDocumentScripts.push({ script, isolated: installInIsolatedScope });
    // sometimes we get a new anchor link that already has an initiated frame. If that's the case, newDocumentScripts won't trigger.
    // NOTE: we DON'T want this to trigger for internal pages (':', 'about:blank')
    if (this.main?.url?.startsWith('http')) {
      await this.main.runPendingNewDocumentScripts();
    }
    return installedScript;
  }

  public checkForResolvedNavigation(
    browserRequestId: string,
    resource: IResourceMeta,
    error?: Error,
  ): boolean {
    if (resource.type !== 'Document' || resource.isRedirect) return;

    for (const frame of this.framesById.values()) {
      const matchingResource = frame.navigations.pendingResourceId(
        browserRequestId,
        resource.request?.url,
        resource.response?.url,
      );
      if (matchingResource) {
        frame.navigations.onResourceLoaded(
          matchingResource,
          resource.id,
          resource.response?.statusCode,
          error,
        );
        return true;
      }
    }
    return false;
  }

  public frameWithPendingNavigation(
    browserRequestId: string,
    requestedUrl: string,
    finalUrl: string,
  ): Frame | null {
    for (const frame of this.framesById.values()) {
      const isMatch = frame.navigations.pendingResourceId(browserRequestId, requestedUrl, finalUrl);
      if (isMatch) return frame;
    }
  }

  public clearChildFrames(): void {
    for (const [id, childFrame] of this.framesById) {
      if (id !== this.mainFrameId && !this.attachedFrameIds.has(id)) {
        this.framesById.delete(id);
        this.framesByFrameId.delete(childFrame.frameId);
        try {
          childFrame.close();
        } catch (error) {
          if (!(error instanceof CanceledPromiseError)) {
            this.logger.warn('Error closing frame after navigation', {
              error,
              id,
              url: childFrame.url,
            });
          }
        }
      }
    }
  }

  public async onFrameTargetAttached(
    devtoolsSession: DevtoolsSession,
    target: TargetInfo,
  ): Promise<void> {
    await this.isReady;

    const frame = this.framesById.get(target.targetId);
    if (frame) {
      if (!this.activeContextIdsBySessionId.has(devtoolsSession.id)) {
        this.activeContextIdsBySessionId.set(devtoolsSession.id, new Set());
      }
      await frame.updateDevtoolsSession(
        devtoolsSession,
        this.activeContextIdsBySessionId.get(devtoolsSession.id),
      );
    }
  }

  /////// EXECUTION CONTEXT ////////////////////////////////////////////////////

  public getSecurityOrigins(): { origin: string; frameId: string }[] {
    const origins: { origin: string; frameId: string }[] = [];
    for (const frame of this.framesById.values()) {
      if (this.attachedFrameIds.has(frame.id)) {
        const origin = frame.securityOrigin;
        if (origin && !origins.some(x => x.origin === origin)) {
          origins.push({ origin, frameId: frame.id });
        }
      }
    }
    return origins;
  }

  public async waitForFrame(
    frameDetails: { frameId: string; loaderId?: string },
    url: string,
    isInitiatingNavigation = false,
  ): Promise<void> {
    await this.isReady;
    const { frameId, loaderId } = frameDetails;
    const frame = this.framesById.get(frameId);
    if (isInitiatingNavigation) {
      frame.initiateNavigation(url, loaderId);
    }
    await frame.waitForNavigationLoader(loaderId);
  }

  public getFrameForExecutionContext(executionContextId: number): Frame | undefined {
    for (const frame of this.framesById.values()) {
      if (frame.hasContextId(executionContextId)) return frame;
    }
  }

  private async onExecutionContextDestroyed(
    devtoolsSession: DevtoolsSession,
    event: ExecutionContextDestroyedEvent,
  ): Promise<void> {
    await this.isReady;
    this.activeContextIdsBySessionId.get(devtoolsSession.id)?.delete(event.executionContextId);
    for (const frame of this.framesById.values()) {
      if (frame.devtoolsSession === devtoolsSession)
        frame.removeContextId(event.executionContextId);
    }
  }

  private async onExecutionContextsCleared(devtoolsSession: DevtoolsSession): Promise<void> {
    await this.isReady;
    this.activeContextIdsBySessionId.get(devtoolsSession.id)?.clear();
    for (const frame of this.framesById.values()) {
      if (frame.devtoolsSession === devtoolsSession) frame.clearContextIds();
    }
  }

  private async onExecutionContextCreated(
    devtoolsSession: DevtoolsSession,
    event: ExecutionContextCreatedEvent,
  ): Promise<void> {
    await this.isReady;
    const { context } = event;
    const frameId = context.auxData.frameId as string;
    const type = context.auxData.type as string;

    if (!this.activeContextIdsBySessionId.has(devtoolsSession.id)) {
      this.activeContextIdsBySessionId.set(devtoolsSession.id, new Set());
    }
    this.activeContextIdsBySessionId.get(devtoolsSession.id).add(context.id);

    const frame = this.framesById.get(frameId);
    if (!frame) {
      this.logger.warn('No frame for active context!', {
        frameId,
        executionContextId: context.id,
      });
      return;
    }

    const isDefault =
      context.name === '' && context.auxData.isDefault === true && type === 'default';
    const isIsolatedWorld = context.name === ISOLATED_WORLD && type === 'isolated';
    if (isDefault || isIsolatedWorld) {
      frame?.addContextId(context.id, isDefault, context.origin);
    }
  }

  private async onExecutionContextCreatedNew(
    devtoolsSession: DevtoolsSession,
    event: ExecutionContextCreatedEvent,
  ): Promise<void> {
    await this.isReady;
    const { context } = event;
    const frameId = context.auxData.frameId as string;
    const type = context.auxData.type as string;

    const isDefault =
      context.name === '' && context.auxData.isDefault === true && type === 'default';
    const isIsolatedWorld = context.name === ISOLATED_WORLD && type === 'isolated';

    // Not interested for now in others
    if (!isDefault && !isIsolatedWorld) return;

    const key = `${frameId}__${isDefault ? 'default' : 'isolated'}`;
    const storedId = this.frameToContextId.get(key);
    if (storedId && !storedId.isResolved) {
      storedId.resolve(context.id);
    } else {
      const resolvable = new Resolvable<number>();
      resolvable.resolve(context.id);
      this.frameToContextId.set(key, resolvable);
    }
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public async getExecutionContextId(opts: {
    frameId: string;
    type: 'default' | 'isolated';
    refresh?: boolean;
  }): Promise<number | undefined> {
    const refresh = async (): Promise<void> => {
      await Promise.all([
        this.devtoolsSession.send('Runtime.enable'),
        this.devtoolsSession.send('Runtime.disable'),
      ]).catch(() => undefined);
    };

    if (opts.refresh) {
      this.frameToContextId.clear();
      void refresh();
    }

    const key = `${opts.frameId}__${opts.type}`;
    const stored = this.frameToContextId.get(key);
    if (stored) {
      return stored.promise;
    }

    const resolvable = new Resolvable<number>(3e3);
    this.frameToContextId.set(key, resolvable);
    if (!opts.refresh) void refresh();
    const id = await resolvable.promise;
    return id;
  }

  /////// FRAMES ///////////////////////////////////////////////////////////////

  private async onFrameNavigated(
    devtoolsSession: DevtoolsSession,
    navigatedEvent: FrameNavigatedEvent,
  ): Promise<void> {
    await this.isReady;
    const startUrl = this.main?.url;
    const frame = this.recordFrame(devtoolsSession, navigatedEvent.frame);
    // if main frame, clear out other frames
    if (!frame.parentId) {
      if (startUrl !== navigatedEvent.frame.url) {
        this.attachedFrameIds.clear();
        this.attachedFrameIds.add(frame.id);
      }
      this.clearChildFrames();
    }
    frame.onNavigated(navigatedEvent.frame, navigatedEvent);
    this.emit('frame-navigated', { frame, loaderId: navigatedEvent.frame.loaderId });
    if (!frame.isDefaultUrl && !frame.parentId && devtoolsSession === this.devtoolsSession) {
      this.pendingNewDocumentScripts.length = 0;
    }
    this.domStorageTracker.track(frame.securityOrigin);
  }

  private async onFrameStoppedLoading(event: FrameStoppedLoadingEvent): Promise<void> {
    await this.isReady;
    const { frameId } = event;

    this.framesById.get(frameId).onStoppedLoading();
  }

  private async onFrameRequestedNavigation(
    navigatedEvent: FrameRequestedNavigationEvent,
  ): Promise<void> {
    await this.isReady;
    const { frameId, url, reason, disposition } = navigatedEvent;
    this.framesById.get(frameId).requestedNavigation(url, reason, disposition);
  }

  private async onFrameNavigatedWithinDocument(
    navigatedEvent: NavigatedWithinDocumentEvent,
  ): Promise<void> {
    await this.isReady;
    const { frameId, url } = navigatedEvent;
    this.framesById.get(frameId).onNavigatedWithinDocument(url);
  }

  private async onFrameDetached(
    devtoolsSession: DevtoolsSession,
    frameDetachedEvent: FrameDetachedEvent,
  ): Promise<void> {
    await this.isReady;
    const { frameId, reason } = frameDetachedEvent;
    const parentId = this.framesById.get(frameId)?.parentId;
    if (
      reason === 'remove' &&
      // This is a local -> remote frame transtion, where
      // Page.frameDetached arrives after Target.attachedToTarget.
      // We've already handled the new target and frame reattach - nothing to do here.
      (devtoolsSession === this.devtoolsSession ||
        devtoolsSession === this.framesById.get(parentId)?.devtoolsSession)
    ) {
      this.attachedFrameIds.delete(frameId);
    } else if (reason === 'swap') {
      this.framesById.get(frameId).didSwapOutOfProcess = true;
      this.framesById.get(frameId).activeLoader.setNavigationResult();
    }
  }

  private async onFrameAttached(
    devtoolsSession: DevtoolsSession,
    frameAttachedEvent: FrameAttachedEvent,
  ): Promise<void> {
    await this.isReady;
    const { frameId, parentFrameId } = frameAttachedEvent;
    const frame = this.framesById.get(frameId);
    if (frame) {
      if (devtoolsSession && frame.isOopif()) {
        // If an OOP iframes becomes a normal iframe again
        // it is first attached to the parent page before
        // the target is removed.
        await frame.updateDevtoolsSession(
          devtoolsSession,
          this.activeContextIdsBySessionId.get(devtoolsSession.id),
        );
      }
      return;
    }
    this.recordFrame(devtoolsSession, { id: frameId, parentId: parentFrameId } as any);
    this.attachedFrameIds.add(frameId);
  }

  private async onLifecycleEvent(
    devtoolsSession: DevtoolsSession,
    event: LifecycleEventEvent,
  ): Promise<void> {
    await this.isReady;
    const { frameId, name, loaderId, timestamp } = event;
    const eventTime = this.networkManager.monotonicTimeToUnix(timestamp);
    const frame = this.recordFrame(devtoolsSession, { id: frameId, loaderId } as any);
    frame.onLifecycleEvent(name, eventTime, loaderId);
    this.domStorageTracker.track(frame.securityOrigin);
  }

  private onDomPaintEvent(
    frameId: number,
    paintEvent: { event: IDomPaintEvent; timestamp: number; url: string },
  ): void {
    const { event, timestamp, url } = paintEvent;
    void this.isReady.then(() => {
      const frame = this.framesByFrameId.get(frameId);
      frame.navigations.onDomPaintEvent(event, url, timestamp);
      return null;
    });
  }

  private recurseFrameTree(devtoolsSession: DevtoolsSession, frameTree: FrameTree): void {
    const { frame, childFrames } = frameTree;
    if (devtoolsSession === this.devtoolsSession) {
      this.mainFrameId = frame.id;
      this.recordFrame(devtoolsSession, frame, true);
    } else if (!this.framesById.has(frame.id)) {
      this.recordFrame(devtoolsSession, frame, true);
    }

    this.attachedFrameIds.add(frame.id);

    if (!childFrames) return;
    for (const childFrame of childFrames) {
      this.recurseFrameTree(devtoolsSession, childFrame);
    }
  }

  private recordFrame(
    devtoolsSession: DevtoolsSession,
    newFrame: Protocol.Page.Frame,
    isFrameTreeRecurse = false,
  ): Frame {
    const { id, parentId } = newFrame;
    if (this.framesById.has(id)) {
      const frame = this.framesById.get(id);
      if (isFrameTreeRecurse || (frame.isOopif() && newFrame.url)) frame.onAttached(newFrame);
      this.domStorageTracker.track(frame.securityOrigin);
      return frame;
    }
    if (!this.activeContextIdsBySessionId.has(devtoolsSession.id)) {
      this.activeContextIdsBySessionId.set(devtoolsSession.id, new Set());
    }

    const parentFrame = parentId ? this.framesById.get(parentId) : null;
    const frame = new Frame(
      this,
      newFrame,
      this.activeContextIdsBySessionId.get(devtoolsSession.id),
      devtoolsSession,
      this.logger,
      () => this.attachedFrameIds.has(id),
      parentFrame,
    );
    this.framesById.set(id, frame);
    this.framesByFrameId.set(frame.frameId, frame);

    this.emit('frame-created', { frame, loaderId: newFrame.loaderId });

    this.replayMissedResourceEventsAfterFrameAttached(frame);

    this.domStorageTracker.track(frame.securityOrigin);

    return frame;
  }

  // MERGE FROM Tab.ts. Needs to be sorted out

  private replayMissedResourceEventsAfterFrameAttached(frame: Frame): void {
    const resourceEvents = this.onFrameCreatedResourceEventsByFrameId[frame.id];
    if (resourceEvents) {
      for (const { event: resourceEvent, type } of resourceEvents) {
        if (type === 'resource-will-be-requested')
          this.onResourceWillBeRequested(resourceEvent as any);
        if (type === 'resource-was-requested') this.onResourceWasRequested(resourceEvent as any);
        else if (type === 'navigation-response')
          this.onNavigationResourceResponse(resourceEvent as any);
        else if (type === 'resource-loaded') this.onResourceLoaded(resourceEvent as any);
      }
    }
    delete this.onFrameCreatedResourceEventsByFrameId[frame.id];
  }

  private getFrameForEventOrQueueForReady(
    type: keyof IPageEvents,
    event: IPageEvents[keyof IPageEvents] & { frameId: string },
  ): Frame {
    const frame = this.framesById.get(event.frameId);
    if (event.frameId && !frame) {
      this.onFrameCreatedResourceEventsByFrameId[event.frameId] ??= [];
      const events = this.onFrameCreatedResourceEventsByFrameId[event.frameId];
      if (!events.some(x => x.event === event)) {
        events.push({ event, type });
      }
    }
    return frame;
  }

  private onResourceWillBeRequested(event: IPageEvents['resource-will-be-requested']): void {
    const lastCommandId = this.page.browserContext.commandMarker.lastId;
    const { resource, isDocumentNavigation, frameId, redirectedFromUrl } = event;
    const url = resource.url.href;

    const frame = frameId
      ? this.getFrameForEventOrQueueForReady('resource-will-be-requested', event)
      : this.main;

    if (!frame) return;

    // Websocket urls
    const { websocketSession } = this.page.browserContext;
    if (url.includes(`localhost:${websocketSession.port}`)) {
      websocketSession.registerWebsocketFrameId(url, frameId);
    }

    const navigations = frame.navigations;

    if (isDocumentNavigation && !navigations.top) {
      navigations.onNavigationRequested(
        'newFrame',
        url,
        lastCommandId,
        resource.browserRequestId,
        event.loaderId,
      );
    }
    resource.hasUserGesture ||= navigations.didGotoUrl(url);

    this.resources.onBrowserWillRequest(this.page.tabId, frame.frameId, resource);

    if (isDocumentNavigation && !event.resource.browserCanceled) {
      navigations.onHttpRequested(
        url,
        lastCommandId,
        redirectedFromUrl,
        resource.browserRequestId,
        event.loaderId,
      );
    }
  }

  private onResourceWasRequested(event: IPageEvents['resource-was-requested']): void {
    const frame = event.frameId
      ? this.getFrameForEventOrQueueForReady('resource-was-requested', event as any)
      : this.main;

    // if we didn't get a frame, don't keep going
    if (!frame) return;

    this.resources.onBrowserDidRequest(this.page.tabId, frame.frameId, event.resource);
  }

  private onResourceLoaded(event: IPageEvents['resource-loaded']): void {
    const { resource, frameId, loaderId } = event;

    const frame = frameId
      ? this.getFrameForEventOrQueueForReady('resource-loaded', event as any)
      : this.main;
    this.resources.onBrowserDidRequest(this.page.tabId, frame?.frameId, resource);

    // if we didn't get a frame, don't keep going
    if (!frame) return;

    const pendingResourceId = frame.navigations.pendingResourceId(
      resource.browserRequestId,
      resource.url?.href,
      resource.responseUrl,
      event.loaderId,
    );
    if (pendingResourceId) {
      if (resource.browserServedFromCache) {
        frame.navigations.onHttpResponded(
          resource.browserRequestId,
          resource.responseUrl ?? resource.url?.href,
          loaderId,
          resource.browserLoadedTime,
        );
      }
      const existingResource = this.resources.getBrowserRequestLatestResource(
        resource.browserRequestId,
      );
      if (existingResource) {
        frame.navigations.onResourceLoaded(pendingResourceId, existingResource.id, resource.status);
      }
    }

    const isKnownResource = this.resources.onBrowserResourceLoaded(this.page.tabId, resource);

    if (
      !isKnownResource &&
      (resource.browserServedFromCache ||
        resource.url?.protocol === 'blob:' ||
        !this.resources.hasRegisteredMitm)
    ) {
      this.resources
        .createNewResourceIfUnseen(this.page.tabId, frame.frameId, resource, event.body)
        .then(meta => meta && this.checkForResolvedNavigation(resource.browserRequestId, meta))
        .catch(() => null);
    }
  }

  private onResourceFailed(event: IPageEvents['resource-failed']): void {
    const { resource } = event;
    const loadError = Resources.translateResourceError(resource);
    const frame = this.framesById.get(resource.frameId);

    const resourceMeta = this.resources.onBrowserRequestFailed(
      this.page.tabId,
      frame?.frameId,
      resource,
      loadError,
    );

    if (resourceMeta) {
      const browserRequestId = resource.browserRequestId;
      this.checkForResolvedNavigation(browserRequestId, resourceMeta, loadError);
    }
  }

  private onNavigationResourceResponse(event: IPageEvents['navigation-response']): void {
    const frame = event.frameId
      ? this.getFrameForEventOrQueueForReady('navigation-response', event)
      : this.main;

    if (!frame) {
      return;
    }

    frame.navigations.onHttpResponded(
      event.browserRequestId,
      event.url,
      event.loaderId,
      event.timestamp,
    );
  }
}
