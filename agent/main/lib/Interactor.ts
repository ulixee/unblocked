import {
  IInteractionGroupAbsolute,
  IInteractionGroups,
  IInteractionGroupsAbsolute,
  IInteractionStepAbsolute,
  IMousePositionAbsolute,
  InteractionCommand,
  isMousePositionRxRy,
} from '@ulixee/unblocked-specification/agent/interact/IInteractions';
import { assert } from '@ulixee/commons/lib/utils';
import {
  getKeyboardKey,
  IKeyboardKey,
  KeyboardKey,
} from '@ulixee/unblocked-specification/agent/interact/IKeyboardLayoutUS';
import IInteractionsHelper, {
  IRectLookup,
  IViewportSize,
  IViewportSizeWithPosition,
} from '@ulixee/unblocked-specification/agent/interact/IInteractionsHelper';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { INodePointer, IJsPath, INodeVisibility, IElementRect } from '@ulixee/js-path';
import IMouseResult from '@ulixee/unblocked-specification/agent/interact/IMouseResult';
import IResolvablePromise from '@ulixee/commons/interfaces/IResolvablePromise';
import { IInteractHooks } from '@ulixee/unblocked-specification/agent/hooks/IHooks';
import IRect from '@ulixee/unblocked-specification/agent/browser/IRect';
import { IKeyboard, IMouse } from '@ulixee/unblocked-specification/agent/interact/IInput';
import IWindowOffset from '@ulixee/unblocked-specification/agent/browser/IWindowOffset';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import {
  IPositionAbsolute,
  isIPositionAbsolute,
  isIPositionRelativeMouse,
  isIPositionRelativeViewport,
  isPosition,
} from '@ulixee/unblocked-specification/agent/browser/IPosition';
import { isIJsPath } from '@ulixee/js-path/interfaces/IJsPath';
import Frame from './Frame';
import { JsPath } from './JsPath';
import MouseListener from './MouseListener';
import * as rectUtils from './rectUtils';
import BrowserContext from './BrowserContext';
import {
  absoluteToRelativeViewportPosition,
  relativeViewportPositionToAbsolute,
} from './coordinateUtils';
import { isSamePoint } from './rectUtils';

const commandsNeedingScroll = new Set([
  InteractionCommand.click,
  InteractionCommand.doubleclick,
  InteractionCommand.move,
]);

const mouseCommands = new Set(
  [
    InteractionCommand.move,
    InteractionCommand.click,
    InteractionCommand.doubleclick,
    InteractionCommand.click,
    InteractionCommand.clickUp,
    InteractionCommand.clickDown,
  ].map(String),
);
export default class Interactor implements IInteractionsHelper {
  public get mousePosition(): Promise<IPositionAbsolute> {
    return (async () => {
      return relativeViewportPositionToAbsolute(this.mouse.position, await this.scrollOffset);
    })();
  }

  public get scrollOffset(): Promise<IRect> {
    return (async () => {
      const offset = await this.getWindowOffset();
      return {
        x: offset.scrollX,
        y: offset.scrollY,
        width: offset.scrollWidth,
        height: offset.scrollHeight,
      };
    })();
  }

  public get viewportSizeWithPosition(): Promise<IViewportSizeWithPosition> {
    return (async () => {
      const scrollOffset = await this.scrollOffset;
      return {
        ...this.viewportSize,
        x: scrollOffset.x,
        y: scrollOffset.y,
      };
    })();
  }

  public get doesBrowserAnimateScrolling(): boolean {
    return this.browserContext.browser.engine.doesBrowserAnimateScrolling;
  }

  public beforeEachInteractionStep: (
    interactionStep: IInteractionStepAbsolute,
    isMouseCommand: boolean,
  ) => Promise<void>;

  public afterEachInteractionStep: (
    interactionStep: IInteractionStepAbsolute,
    startTime: number,
  ) => Promise<void>;

  public afterInteractionGroups: () => Promise<void>;

  public logger: IBoundLog;

  public viewportSize: IViewportSize;

  // Publish rect utils
  public isPointWithinRect = rectUtils.isPointWithinRect;
  public createPointInRect = rectUtils.createPointInRect;
  public createScrollPointForRect = rectUtils.createScrollPointForRect;
  public isRectanglePointInViewport = rectUtils.isRectanglePointInViewport;
  public isSamePoint = rectUtils.isSamePoint;

  private preInteractionPaintStableStatus: { isStable: boolean; timeUntilReadyMs?: number };

  private isReady: Promise<void>;

  private readonly frame: Frame;

  private get hooks(): IInteractHooks {
    return this.frame.hooks;
  }

  private get browserContext(): BrowserContext {
    return this.frame.page.browserContext;
  }

  private get jsPath(): JsPath {
    return this.frame.jsPath;
  }

  private get mouse(): IMouse {
    return this.frame.page.mouse;
  }

  private get keyboard(): IKeyboard {
    return this.frame.page.keyboard;
  }

  private playAllInteractions: IInteractHooks['playInteractions'] =
    Interactor.defaultPlayInteractions;

  constructor(frame: Frame) {
    this.frame = frame;
    this.logger = frame.logger.createChild(module);
    if (this.hooks.playInteractions) {
      this.playAllInteractions = this.hooks.playInteractions.bind(this.hooks);
    }
  }

  public async initialize(): Promise<void> {
    // TODO this should probably throw an error otherwise playInterations might fail
    // because viewportSize is undefined.
    // can't run javascript if active dialog!
    if (this.frame.page.activeDialog) return;
    this.isReady ??= this.initializeViewport(!this.frame.parentId);
    return await this.isReady;
  }

  public play(interactions: IInteractionGroups, resolvablePromise: IResolvablePromise<any>): void {
    this.browserContext.commandMarker.incrementMark?.('interact');
    this.preInteractionPaintStableStatus = this.frame.navigations.getPaintStableStatus();

    this.logger.info('Interactor.play', { interactions });

    this.initialize()
      .then(async () => {
        const absoluteInteractions = await this.convertToAbsolutePositionInteractions(interactions);
        const finalInteractions = await this.injectScrollToPositions(absoluteInteractions);
        try {
          return await this.playAllInteractions(
            finalInteractions,
            this.playInteraction.bind(this, resolvablePromise),
            this,
          );
        } finally {
          // eslint-disable-next-line promise/always-return
          await this.afterInteractionGroups?.();
        }
      })
      .then(resolvablePromise.resolve)
      .catch(resolvablePromise.reject);
  }

  public async reloadJsPath(jsPath: IJsPath): Promise<INodePointer> {
    const containerOffset = await this.frame.getContainerOffset();
    const result = await this.jsPath.reloadJsPath(jsPath, containerOffset);
    return result.nodePointer;
  }

  public async lookupBoundingRect(
    mousePosition: IMousePositionAbsolute,
    options?: {
      includeNodeVisibility?: boolean;
      useLastKnownPosition?: boolean;
    },
  ): Promise<IRectLookup> {
    if (mousePosition === null) {
      throw new Error('Null mouse position provided to frame.interact');
    }

    if (isPosition(mousePosition) && isIPositionAbsolute(mousePosition)) {
      return { ...mousePosition, width: 1, height: 1 };
    }
    if (
      options?.useLastKnownPosition &&
      isIJsPath(mousePosition) &&
      mousePosition.length === 1 &&
      typeof mousePosition[0] === 'number'
    ) {
      const nodeId = mousePosition[0] as number;
      const lastKnownPosition = this.jsPath.getLastClientRect(nodeId);
      if (lastKnownPosition) {
        return {
          ...this.jsPathRectToAbsoluteRect(lastKnownPosition),
          nodeId,
        };
      }
    }

    const jsPathRectResult = await this.jsPath.getClientRect(
      mousePosition,
      options?.includeNodeVisibility,
    );

    const rect = this.jsPathRectToAbsoluteRect(jsPathRectResult.value);
    const nodePointer = jsPathRectResult.nodePointer;
    if (!nodePointer) throw new Error('Element does not exist.');

    return {
      ...rect,
      nodeId: nodePointer?.id,
    };
  }

  public async createMousedownTrigger(nodeId: number): Promise<{
    nodeVisibility: INodeVisibility;
    didTrigger: () => Promise<IMouseResult>;
  }> {
    assert(nodeId, 'nodeId should not be null');
    const mouseListener = new MouseListener(this.frame, nodeId);
    const nodeVisibility = await mouseListener.register();

    let mouseResult: IMouseResult;

    return {
      nodeVisibility,
      didTrigger: async () => {
        if (mouseResult) return mouseResult;

        mouseResult = await mouseListener.didTriggerMouseEvent();
        mouseResult.didStartInteractWithPaintingStable =
          this.preInteractionPaintStableStatus?.isStable === true;
        return mouseResult;
      },
    };
  }

  public async getInteractionRect(
    interactionStep: IInteractionStepAbsolute,
  ): Promise<IRectLookup> {
    const mousePosition = interactionStep.mousePosition;
    return await this.lookupBoundingRect(mousePosition, {
      useLastKnownPosition: interactionStep.verification === 'none',
    });
  }

  private jsPathRectToAbsoluteRect(rectangle: IElementRect): IRectLookup {
    const rectanglePositionAbsolute = relativeViewportPositionToAbsolute(
      { rx: rectangle.x, ry: rectangle.y },
      { x: rectangle.scrollX, y: rectangle.scrollY },
    );
    return {
      ...rectanglePositionAbsolute,
      height: rectangle.height,
      width: rectangle.width,
      elementTag: rectangle.tag,
      nodeVisibility: rectangle.nodeVisibility,
    };
  }

  private async convertToAbsolutePositionInteractions(
    interactions: IInteractionGroups,
  ): Promise<IInteractionGroupsAbsolute> {
    const absoluteInteractions: IInteractionGroupsAbsolute = [];
    const scrollOffset: IPositionAbsolute = await this.scrollOffset;

    for (const group of interactions) {
      const groupCommands: IInteractionGroupAbsolute = [];
      absoluteInteractions.push(groupCommands);
      for (const originalStep of group) {
        const mousePosition = originalStep.mousePosition;
        let step: IInteractionStepAbsolute;
        if (isMousePositionRxRy(mousePosition)) {
          const [rx, ry] = mousePosition;
          step = {
            ...originalStep,
            mousePosition: relativeViewportPositionToAbsolute({ rx, ry }, scrollOffset),
          };
        } else if (isIJsPath(mousePosition)) {
          step = {
            ...originalStep,
            mousePosition,
          };
        } else if (isPosition(mousePosition)) {
          if (isIPositionAbsolute(mousePosition)) {
            step = {
              ...originalStep,
              mousePosition,
            };
          } else if (isIPositionRelativeViewport(mousePosition)) {
            step = {
              ...originalStep,
              mousePosition: relativeViewportPositionToAbsolute(mousePosition, scrollOffset),
            };
          } else if (isIPositionRelativeMouse(mousePosition)) {
            throw new Error('Not yet supported');
          } else {
            throw new Error('Unsupported position for mousePosition');
          }
        } else {
          throw new Error('Unsupported mousePosition');
        }
        groupCommands.push(step);
      }
    }
    return absoluteInteractions;
  }

  private async playInteraction(
    resolvable: IResolvablePromise<any>,
    interactionStep: IInteractionStepAbsolute,
  ): Promise<void> {
    if (resolvable.isResolved) {
      this.logger.warn('Canceling interaction due to external event');
      throw new CanceledPromiseError('Canceling interaction due to external event');
    }
    const startTime = Date.now();
    await this.beforeEachInteractionStep?.(
      interactionStep,
      mouseCommands.has(interactionStep.command),
    );

    const scrollOffset = await this.scrollOffset;
    const viewport = await this.viewportSizeWithPosition;
    switch (interactionStep.command) {
      case InteractionCommand.move: {
        const moveToPosition = await this.getMousePosition(interactionStep);
        const { rx, ry } = absoluteToRelativeViewportPosition(moveToPosition, viewport);
        await this.mouse.move(rx, ry);
        break;
      }
      case InteractionCommand.scroll: {
        const mousePosition = interactionStep.mousePosition;
        let scrollToPosition: IPositionAbsolute;
        // if this is a JsPath, see if we actually need to scroll
        if (isIJsPath(mousePosition)) {
          // Maybe move this to where we convert all positions to absolutes ones?
          const interactRect = await this.getInteractionRect(interactionStep);
          scrollToPosition = await this.createScrollPointForRect(interactRect, viewport);
          if (isSamePoint(viewport, scrollToPosition)) return;
        } else if (isIPositionAbsolute(mousePosition)) {
          scrollToPosition = { ...mousePosition };
        } else {
          throw new Error('Unsupported mousePosition');
        }

        const scrollDelta = {
          x: scrollToPosition.x - viewport.x,
          y: scrollToPosition.y - viewport.y,
        };

        const maxDeltaScroll = {
          left: -viewport.x,
          right: scrollOffset.width - this.viewportSize.width - viewport.x,
          top: -viewport.y,
          bottom: scrollOffset.height - this.viewportSize.height - scrollOffset.y,
        };

        const scrollDeltaWithMax = {
          x: Math.min(Math.max(maxDeltaScroll.left, scrollDelta.x), maxDeltaScroll.right),
          y: Math.min(Math.max(maxDeltaScroll.top, scrollDelta.y), maxDeltaScroll.bottom),
        };

        if (scrollDeltaWithMax.x !== 0 || scrollDeltaWithMax.y !== 0) {
          await this.mouse.wheel({ deltaX: scrollDeltaWithMax.x, deltaY: scrollDeltaWithMax.y });
          // need to check for offset since wheel event doesn't wait for scroll
          await this.frame.waitForScrollStop();
        }
        break;
      }

      case InteractionCommand.click:
      case InteractionCommand.clickUp:
      case InteractionCommand.clickDown:
      case InteractionCommand.doubleclick: {
        const { delayMillis, mouseButton, command, mouseResultVerifier } = interactionStep;
        let interactRect: IRectLookup;
        // if this is a jsPath, need to look it up
        if (isIJsPath(interactionStep.mousePosition)) {
          interactRect = await this.getInteractionRect(interactionStep);
          if (interactRect.elementTag === 'option') {
            // options need a browser level call
            interactionStep.simulateOptionClickOnNodeId = interactRect.nodeId;
            interactionStep.verification = 'none';
          }
        }

        if (command === InteractionCommand.click && interactionStep.simulateOptionClickOnNodeId) {
          await this.jsPath.simulateOptionClick([interactionStep.simulateOptionClickOnNodeId]);
          break;
        }

        const moveToPosition = await this.getMousePosition(interactionStep, true, interactRect);
        const { rx, ry } = absoluteToRelativeViewportPosition(moveToPosition, viewport);
        await this.mouse.move(rx, ry);

        const button = mouseButton || 'left';
        const clickCount = command === InteractionCommand.doubleclick ? 2 : 1;

        if (command !== InteractionCommand.clickUp) {
          await this.mouse.down({ button, clickCount });
        }
        if (delayMillis) {
          await waitFor(delayMillis, resolvable);
        }

        // don't click up if verification failed
        if (mouseResultVerifier) {
          const result = await mouseResultVerifier();
          if (!result.didClickLocation) break;
        }

        if (command !== InteractionCommand.clickDown) {
          await this.mouse.up({ button, clickCount });
        }

        break;
      }

      case InteractionCommand.type: {
        let counter = 0;
        for (const keyboardCommand of interactionStep.keyboardCommands) {
          const delay = interactionStep.keyboardDelayBetween;
          const keyupDelay = interactionStep.keyboardKeyupDelay;
          if (counter > 0 && delay) {
            await waitFor(delay, resolvable);
          }

          if ('keyCode' in keyboardCommand) {
            const key = getKeyboardKey(keyboardCommand.keyCode);
            await this.keyboard.press(key, keyupDelay);
          } else if ('up' in keyboardCommand) {
            const key = getKeyboardKey(keyboardCommand.up);
            await this.keyboard.up(key);
          } else if ('down' in keyboardCommand) {
            const key = getKeyboardKey(keyboardCommand.down);
            await this.keyboard.down(key);
          } else if ('shortcut' in keyboardCommand) {
            await this.keyboard.command(keyboardCommand.shortcut);
          } else if ('string' in keyboardCommand) {
            const text = keyboardCommand.string;
            for (const char of text) {
              if (char in KeyboardKey) {
                await this.keyboard.press(char as IKeyboardKey, keyupDelay);
              } else {
                await this.keyboard.sendCharacter(char);
              }
              if (delay) await waitFor(delay, resolvable);
            }
          }
          counter += 1;
        }
        break;
      }

      case InteractionCommand.waitForMillis: {
        await waitFor(interactionStep.delayMillis, resolvable);
        break;
      }
    }
    await this.afterEachInteractionStep?.(interactionStep, startTime);
  }

  private async getWindowOffset(): Promise<IWindowOffset> {
    const windowOffset = await this.frame.getWindowOffset();
    this.viewportSize = { width: windowOffset.innerWidth, height: windowOffset.innerHeight };
    return windowOffset;
  }

  private async initializeViewport(isMainFrame: boolean): Promise<void> {
    await this.getWindowOffset();
    if (isMainFrame) {
      await this.hooks?.adjustStartingMousePoint?.(this.mouse.position, this);
    }
  }

  private async getMousePosition(
    interactionStep: IInteractionStepAbsolute,
    constrainToViewport = true,
    rect?: IRectLookup,
  ): Promise<IPositionAbsolute> {
    if (!interactionStep.mousePosition) return { ...this.mousePosition };
    rect ??= await this.getInteractionRect(interactionStep);

    const point = await rectUtils.createPointInRect(rect, {
      paddingPercent: { height: 10, width: 10 },
      constrainToViewport: constrainToViewport ? await this.viewportSizeWithPosition : undefined,
    });
    return point;
  }

  private async injectScrollToPositions(
    interactions: IInteractionGroupsAbsolute,
  ): Promise<IInteractionGroupsAbsolute> {
    const finalInteractions: IInteractionGroupsAbsolute = [];
    const viewport = await this.viewportSizeWithPosition;
    for (const group of interactions) {
      const groupCommands: IInteractionGroupAbsolute = [];
      finalInteractions.push(groupCommands);
      for (const originalStep of group) {
        const step = { ...originalStep };
        if (commandsNeedingScroll.has(InteractionCommand[step.command]) && step.mousePosition) {
          const interactRect = await this.getInteractionRect(step);
          const scrollPoint = this.createScrollPointForRect(interactRect, viewport);
          if (!isSamePoint(viewport, scrollPoint)) {
            // Might not be completely accurate as emulator might manipulate scroll
            // but should be accurate enough to estimate viewport. Either way we
            // always check again if scrolling is needed when doing the actual interaction.
            groupCommands.push({
              command: InteractionCommand.scroll,
              mousePosition: scrollPoint,
              verification: step.verification,
            });
            viewport.x = scrollPoint.x;
            viewport.y = scrollPoint.y;
          }
        }
        groupCommands.push(step);
      }
    }
    return finalInteractions;
  }

  public static async defaultPlayInteractions(
    interactionGroups: IInteractionGroupsAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
  ): Promise<void> {
    for (const group of interactionGroups) {
      for (const step of group) {
        await runFn(step);
      }
    }
  }
}

async function waitFor(millis: number, resolvable: IResolvablePromise): Promise<void> {
  if (millis === undefined || millis === null) return;

  let timeout: NodeJS.Timeout;
  await Promise.race([
    resolvable.promise,
    new Promise(resolve => {
      timeout = setTimeout(resolve, millis).unref();
    }),
  ]).finally(() => clearTimeout(timeout));
}
