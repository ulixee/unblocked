import {
  IInteractionGroupsAbsolute,
  IInteractionStepAbsolute,
  IJsPath,
  isIJsPath,
  IKeyboardCommand,
  IMousePositionAbsolute,
  InteractionCommand,
} from '@ulixee/unblocked-specification/agent/interact/IInteractions';
import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import IInteractionsHelper, {
  IRectLookup,
} from '@ulixee/unblocked-specification/agent/interact/IInteractionsHelper';
import IPoint from '@ulixee/unblocked-specification/agent/browser/IPoint';
import IMouseResult from '@ulixee/unblocked-specification/agent/interact/IMouseResult';
import logger from '@ulixee/commons/lib/Logger';
import IUnblockedPlugin, {
  UnblockedPluginClassDecorator,
} from '@ulixee/unblocked-specification/plugin/IUnblockedPlugin';
import IEmulationProfile from '@ulixee/unblocked-specification/plugin/IEmulationProfile';
import {
  IPositionAbsolute,
  isIPositionAbsolute,
} from '@ulixee/unblocked-specification/agent/browser/IPosition';
import generateVector from './generateVector';

const { log } = logger(module);

// ATTRIBUTION: heavily borrowed/inspired by https://github.com/Xetera/ghost-cursor

@UnblockedPluginClassDecorator
export default class DefaultHumanEmulator implements IUnblockedPlugin {
  public static overshootSpread = 2;
  public static overshootRadius = 5;
  public static overshootThreshold = 250;
  public static boxPaddingPercent = { width: 33, height: 33 };
  // NOTE: max steps are not total max if you overshoot. It's max per section
  public static minMoveVectorPoints = 5;
  public static maxMoveVectorPoints = 50;
  public static minScrollVectorPoints = 10;
  public static maxScrollVectorPoints = 25;
  public static maxScrollIncrement = 500;
  public static maxScrollDelayMillis = 15;
  public static maxDelayBetweenInteractions = 200;

  public static wordsPerMinuteRange = [80, 100];

  private millisPerCharacter: number;
  private readonly logger: IBoundLog;

  constructor(options?: IEmulationProfile) {
    this.logger = options?.logger ?? log.createChild(module);
  }

  public async getStartingMousePoint(helper: IInteractionsHelper): Promise<IPositionAbsolute> {
    const viewport = await helper.viewportSizeWithPosition;
    return helper.createPointInRect(viewport);
  }

  public async playInteractions(
    interactionGroups: IInteractionGroupsAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
  ): Promise<void> {
    for (let i = 0; i < interactionGroups.length; i += 1) {
      if (i > 0) {
        const millis = Math.random() * DefaultHumanEmulator.maxDelayBetweenInteractions;
        await delay(millis);
      }
      for (const step of interactionGroups[i]) {
        if (step.command === InteractionCommand.scroll) {
          await this.scroll(step, runFn, helper);
          continue;
        }

        if (step.command === InteractionCommand.move) {
          await this.scrollIfNeeded(step, runFn, helper);
          await this.moveMouse(step, runFn, helper);
          continue;
        }

        if (
          step.command === InteractionCommand.click ||
          step.command === InteractionCommand.clickUp ||
          step.command === InteractionCommand.clickDown ||
          step.command === InteractionCommand.doubleclick
        ) {
          await this.scrollIfNeeded(step, runFn, helper);
          await this.moveMouseAndClick(step, runFn, helper);
          continue;
        }

        if (step.command === InteractionCommand.type) {
          for (const keyboardCommand of step.keyboardCommands) {
            const millisPerCharacter = this.calculateMillisPerChar();

            if ('string' in keyboardCommand) {
              for (const char of keyboardCommand.string) {
                await runFn(this.getKeyboardCommandWithDelay({ string: char }, millisPerCharacter));
              }
            } else {
              await runFn(this.getKeyboardCommandWithDelay(keyboardCommand, millisPerCharacter));
            }
          }
          continue;
        }

        if (step.command === InteractionCommand.willDismissDialog) {
          const millis = Math.random() * DefaultHumanEmulator.maxDelayBetweenInteractions;
          await delay(millis);
          continue;
        }

        await runFn(step);
      }
    }
  }

  protected async scrollIfNeeded(
    interactionStep: IInteractionStepAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
  ): Promise<void> {
    const viewport = await helper.viewportSizeWithPosition;
    const interactRect = await helper.getInteractionRect(interactionStep);
    // TODO maybe add randomness here
    const scrollToPosition = await helper.createScrollPointForRect(interactRect, viewport, 0);
    if (helper.isSamePoint(viewport, scrollToPosition)) {
      return;
    }
    const scrollStep: IInteractionStepAbsolute = {
      command: InteractionCommand.scroll,
      mousePosition: scrollToPosition,
    };
    await this.scroll(scrollStep, runFn, helper);
    const millis = Math.random() * DefaultHumanEmulator.maxDelayBetweenInteractions;
    await delay(millis);
  }

  protected async scroll(
    interactionStep: IInteractionStepAbsolute,
    run: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
  ): Promise<void> {
    const scrollVector = await this.getScrollVector(interactionStep, helper);

    let counter = 0;
    for (const { x, y } of scrollVector) {
      await delay(Math.random() * DefaultHumanEmulator.maxScrollDelayMillis);

      const shouldAddMouseJitter = counter % Math.round(Math.random() * 6) === 0;
      if (shouldAddMouseJitter) {
        await this.jitterMouse(helper, run);
      }
      await run({
        mousePosition: { x, y },
        command: InteractionCommand.scroll,
      });
      counter += 1;
    }
  }

  protected async moveMouseAndClick(
    interactionStep: IInteractionStepAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
  ): Promise<void> {
    const { mousePosition, command } = interactionStep;
    interactionStep.delayMillis ??= Math.floor(Math.random() * 100);

    if (!mousePosition) {
      return runFn(interactionStep);
    }

    const retries = 3;

    for (let i = 0; i < retries; i += 1) {
      const targetRect = await helper.lookupBoundingRect(mousePosition, {
        includeNodeVisibility: true,
        useLastKnownPosition: interactionStep.verification === 'none',
      });

      if (targetRect.elementTag === 'option') {
        // options need a browser level call
        interactionStep.simulateOptionClickOnNodeId = targetRect.nodeId;
        interactionStep.verification = 'none';
      }

      if (targetRect.nodeVisibility?.isClickable === false) {
        interactionStep.mousePosition = await this.resolveMoveAndClickForInvisibleNode(
          interactionStep,
          runFn,
          helper,
          targetRect,
        );

        if (!interactionStep.simulateOptionClickOnNodeId) {
          continue;
        }
      }

      const targetPoint = helper.createPointInRect(targetRect, {
        paddingPercent: DefaultHumanEmulator.boxPaddingPercent,
      });
      await this.moveMouseToPoint(interactionStep, runFn, helper, targetPoint, targetRect.width);

      let mouseResultVerifier: () => Promise<IMouseResult>;
      if (
        targetRect.nodeId &&
        command !== InteractionCommand.clickUp &&
        interactionStep.verification !== 'none'
      ) {
        const listener = await helper.createMousedownTrigger(targetRect.nodeId);
        if (listener.nodeVisibility.isClickable === false) {
          targetRect.nodeVisibility = listener.nodeVisibility;
          interactionStep.mousePosition = await this.resolveMoveAndClickForInvisibleNode(
            interactionStep,
            runFn,
            helper,
            targetRect,
          );
          continue;
        }
        mouseResultVerifier = listener.didTrigger;
      }

      await runFn({
        ...interactionStep,
        mousePosition: targetPoint,
        mouseResultVerifier,
      });

      if (mouseResultVerifier) {
        const mouseUpResult = await mouseResultVerifier();

        if (!mouseUpResult.didClickLocation) {
          continue;
        }
      }

      return;
    }

    throw new Error(
      `"Interaction.${interactionStep.command}" element invisible after ${retries} attempts to move it into view.`,
    );
  }

  protected async moveMouse(
    interactionStep: IInteractionStepAbsolute,
    run: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
  ): Promise<IPositionAbsolute> {
    const rect = await helper.lookupBoundingRect(interactionStep.mousePosition, {
      useLastKnownPosition: interactionStep.verification === 'none',
    });
    const targetPoint = helper.createPointInRect(rect, {
      paddingPercent: DefaultHumanEmulator.boxPaddingPercent,
    });

    await this.moveMouseToPoint(interactionStep, run, helper, targetPoint, rect.width);
    return targetPoint;
  }

  protected async moveMouseToPoint(
    interactionStep: IInteractionStepAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
    targetPoint: IPositionAbsolute,
    targetWidth: number,
  ): Promise<boolean> {
    const mousePosition = await helper.mousePosition;

    const vector = generateVector(
      mousePosition,
      targetPoint,
      targetWidth,
      DefaultHumanEmulator.minMoveVectorPoints,
      DefaultHumanEmulator.maxMoveVectorPoints,
      {
        threshold: DefaultHumanEmulator.overshootThreshold,
        radius: DefaultHumanEmulator.overshootRadius,
        spread: DefaultHumanEmulator.overshootSpread,
      },
    );

    if (!vector.length) return false;
    for (const { x, y } of vector) {
      await runFn({
        mousePosition: { x, y },
        command: InteractionCommand.move,
      });
    }
    return true;
  }

  protected async jitterMouse(
    helper: IInteractionsHelper,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
  ): Promise<void> {
    const mousePosition = await helper.mousePosition;
    const jitter = {
      x: mousePosition.x + Math.round(getRandomPositiveOrNegativeNumber()),
      y: mousePosition.y + Math.round(getRandomPositiveOrNegativeNumber()),
    };

    if (jitter.x !== mousePosition.x || jitter.y !== mousePosition.y) {
      // jitter mouse
      await runFn({
        mousePosition: jitter,
        command: InteractionCommand.move,
      });
    }
  }

  /////// KEYBOARD /////////////////////////////////////////////////////////////////////////////////////////////////////

  protected getKeyboardCommandWithDelay(
    keyboardCommand: IKeyboardCommand,
    millisPerChar: number,
  ): IInteractionStepAbsolute {
    const randomFactor = getRandomPositiveOrNegativeNumber() * (millisPerChar / 2);
    const delayMillis = Math.floor(randomFactor + millisPerChar);
    const keyboardKeyupDelay = Math.max(Math.ceil(Math.random() * 60), 10);
    return {
      command: InteractionCommand.type,
      keyboardCommands: [keyboardCommand],
      keyboardDelayBetween: delayMillis - keyboardKeyupDelay,
      keyboardKeyupDelay,
    };
  }

  protected calculateMillisPerChar(): number {
    if (!this.millisPerCharacter) {
      const wpmRange =
        DefaultHumanEmulator.wordsPerMinuteRange[1] - DefaultHumanEmulator.wordsPerMinuteRange[0];
      const wpm =
        Math.floor(Math.random() * wpmRange) + DefaultHumanEmulator.wordsPerMinuteRange[0];

      const averageWordLength = 5;
      const charsPerSecond = (wpm * averageWordLength) / 60;
      this.millisPerCharacter = Math.round(1000 / charsPerSecond);
    }
    return this.millisPerCharacter;
  }

  private async getScrollVector(
    interactionStep: IInteractionStepAbsolute,
    helper: IInteractionsHelper,
  ): Promise<IPositionAbsolute[]> {
    const { mousePosition, verification } = interactionStep;
    const currentScroll = await helper.scrollOffset;
    let scrollToPoint: IPositionAbsolute;

    if (isIJsPath(mousePosition)) {
      const targetRect = await helper.lookupBoundingRect(mousePosition, {
        useLastKnownPosition: verification === 'none',
      });
      const viewportSizeWithPosition = await helper.viewportSizeWithPosition;
      scrollToPoint = helper.createScrollPointForRect(targetRect, viewportSizeWithPosition);
    } else if (isIPositionAbsolute(mousePosition)) {
      scrollToPoint = mousePosition;
    } else {
      throw new Error('Unsupported mousePosition');
    }

    if (helper.isSamePoint(currentScroll, scrollToPoint)) {
      return [];
    }

    const maxVectorPoints = helper.doesBrowserAnimateScrolling
      ? 2
      : DefaultHumanEmulator.maxScrollVectorPoints;

    const scrollVector = generateVector(
      currentScroll,
      scrollToPoint,
      200,
      DefaultHumanEmulator.minScrollVectorPoints,
      maxVectorPoints,
      {
        threshold: DefaultHumanEmulator.overshootThreshold,
        radius: DefaultHumanEmulator.overshootRadius,
        spread: DefaultHumanEmulator.overshootSpread,
      },
    );

    const points: IPoint[] = [];
    let lastPoint = { ...currentScroll };
    for (const point of scrollVector) {
      scrollToPoint = { x: Math.round(point.x), y: Math.round(point.y) };

      if (scrollToPoint.y === lastPoint.y && scrollToPoint.x === lastPoint.x) {
        continue;
      }

      const scrollYPixels = Math.abs(point.y - lastPoint.y);
      // if too big a jump, backfill smaller jumps
      if (scrollYPixels > DefaultHumanEmulator.maxScrollIncrement) {
        const isNegative = scrollToPoint.y < lastPoint.y;
        const chunks = splitIntoMaxLengthSegments(
          scrollYPixels,
          DefaultHumanEmulator.maxScrollIncrement,
        );
        for (const chunk of chunks) {
          const deltaY = isNegative ? -chunk : chunk;
          const scrollYChunk = Math.max(lastPoint.y + deltaY, 0);
          if (scrollYChunk === lastPoint.y) continue;

          const newPoint = {
            x: scrollToPoint.x,
            y: scrollYChunk,
          };
          points.push(newPoint);
          lastPoint = newPoint;
        }
      }

      const lastEntry = points[points.length - 1];
      // if same point added, yank it now
      if (!lastEntry || lastEntry.x !== point.x || lastEntry.y !== point.y) {
        points.push(point);
        lastPoint = point;
      }
    }
    if (lastPoint.y !== scrollToPoint.y || lastPoint.x !== scrollToPoint.x) {
      points.push(scrollToPoint);
    }
    return points;
  }

  private async resolveMoveAndClickForInvisibleNode(
    interactionStep: IInteractionStepAbsolute,
    runFn: (interactionStep: IInteractionStepAbsolute) => Promise<void>,
    helper: IInteractionsHelper,
    targetRect: IRectLookup,
  ): Promise<IMousePositionAbsolute> {
    const { nodeVisibility } = targetRect;
    const viewport = helper.viewportSize;

    const interactionName = `"Interaction.${interactionStep.command}"`;
    const { hasDimensions, isConnected, nodeExists } = nodeVisibility;
    helper.logger.warn(`${interactionName} element not visible.`, {
      interactionStep,
      target: targetRect,
      viewport,
    });

    if (!nodeExists) throw new Error(`${interactionName} element does not exist.`);

    // if node is not connected, we need to pick our strategy
    if (!isConnected) {
      const { verification } = interactionStep;
      if (verification === 'elementAtPath') {
        const nodePointer = await helper.reloadJsPath(interactionStep.mousePosition as IJsPath);
        helper.logger.warn(`${interactionName} - checking for new element matching query.`, {
          interactionStep,
          nodePointer,
          didFindUpdatedPath: nodePointer.id !== targetRect.nodeId,
        });
        if (nodePointer.id !== targetRect.nodeId) {
          return [nodePointer.id];
        }
      }

      throw new Error(`${interactionName} element isn't connected to the DOM.`);
    }

    const isOffscreen = !nodeVisibility.isOnscreenVertical || !nodeVisibility.isOnscreenHorizontal;
    if (hasDimensions && isOffscreen) {
      await this.scroll(interactionStep, runFn, helper);
      return interactionStep.mousePosition;
    }

    if (hasDimensions && !!nodeVisibility.obstructedByElementRect) {
      const { obstructedByElementRect } = nodeVisibility;
      if (obstructedByElementRect.tag === 'html' && targetRect.elementTag === 'option') {
        return interactionStep.mousePosition;
      }

      if (obstructedByElementRect.height >= viewport.height * 0.9)
        throw new Error(`${interactionName} element is obstructed by a full screen element`);

      const maxHeight = Math.min(targetRect.height + 2, viewport.height / 2);
      let y: number;
      if (obstructedByElementRect.y - maxHeight > 0) {
        y = obstructedByElementRect.y - maxHeight;
      } else if (obstructedByElementRect.y - (targetRect.height + 2) > 0) {
        y = obstructedByElementRect.y - targetRect.height - 2;
      } else {
        // move beyond the bottom of the obstruction
        y = obstructedByElementRect.y - obstructedByElementRect.height + 2;
      }
      const scrollBeyondObstruction = {
        ...interactionStep,
        mousePosition: [targetRect.x, y],
      };
      helper.logger.info('Scrolling to avoid obstruction', {
        obstructedByElementRect,
        scrollBeyondObstruction,
      });
      await this.scroll(scrollBeyondObstruction, runFn, helper);
      return interactionStep.mousePosition;
    }

    throw new Error(`${interactionName} element isn't a ${interactionStep.command}-able target.`);
  }
}

async function delay(millis: number): Promise<void> {
  if (!millis) return;
  await new Promise<void>(resolve => setTimeout(resolve, Math.floor(millis)).unref());
}

function splitIntoMaxLengthSegments(total: number, maxValue: number): number[] {
  const values: number[] = [];
  let currentSum = 0;
  while (currentSum < total) {
    let nextValue = Math.round(Math.random() * maxValue * 10) / 10;
    if (currentSum + nextValue > total) {
      nextValue = total - currentSum;
    }
    currentSum += nextValue;
    values.push(nextValue);
  }
  return values;
}

function getRandomPositiveOrNegativeNumber(): number {
  const negativeMultiplier = Math.random() < 0.5 ? -1 : 1;

  return Math.random() * negativeMultiplier;
}
