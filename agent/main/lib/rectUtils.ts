import IRect from '@ulixee/unblocked-specification/agent/browser/IRect';
import { IPositionAbsolute } from '@ulixee/unblocked-specification/agent/browser/IPosition';
import { assert } from '@ulixee/commons/lib/utils';
import { IViewportSizeWithPosition } from '@ulixee/unblocked-specification/agent/interact/IInteractionsHelper';

/**
 * Create random integer in interval [min, max], both points contained
 */
export function randomInteger(min: number, max: number): number {
  const value = Math.floor(Math.floor(Math.random() * (max + 1 - min) + min));
  return value;
}

/**
 * Check if point is contained in interval, start and end included
 */
export function isWithinInterval(value: number, inverval: [number, number]): boolean {
  const [start, end] = inverval;
  return start <= value && value <= end;
}

type IRectCoordinates = IRect & {
  x2: number;
  y2: number;
};

export function rectangleWithCoordinates(rectangle: IRect): IRectCoordinates {
  return {
    ...rectangle,
    x2: rectangle.x + rectangle.width,
    y2: rectangle.y + rectangle.height,
  };
}

export function paddedRectangle(rect: IRect, paddingX: number, paddingY: number): IRect {
  return {
    x: rect.x + paddingX,
    width: rect.width - 2 * paddingX,
    y: rect.y + paddingY,
    height: rect.height - 2 * paddingY,
  };
}

/**
 * Cecks if a given point is within the rectangle, and if not clip it to the closest edge position
 */
export function clipPointToRectangle(
  point: IPositionAbsolute,
  rectangle: IRect,
): IPositionAbsolute {
  const rect = rectangleWithCoordinates(rectangle);
  let { x, y } = point;

  if (x < rect.x) x = rect.x;
  else if (rect.x2 < x) x = rect.x2;

  if (y < rect.y) y = rect.y;
  else if (rect.y2 < y) y = rect.y2;

  return { x, y };
}

export function isPointWithinRect(point: IPositionAbsolute, rectangle: IRect): boolean {
  const rect = rectangleWithCoordinates(rectangle);
  return (
    isWithinInterval(point.x, [rect.x, rect.x2]) && isWithinInterval(point.y, [rect.y, rect.y2])
  );
}

export function rectangleToCorners(rectangle: IRect): {
  topLeft: IPositionAbsolute;
  topRight: IPositionAbsolute;
  bottomLeft: IPositionAbsolute;
  bottomRight: IPositionAbsolute;
} {
  const rect = rectangleWithCoordinates(rectangle);
  return {
    topLeft: { x: rect.x, y: rect.y },
    topRight: { x: rect.x2, y: rect.y },
    bottomLeft: { x: rect.x, y: rect.y2 },
    bottomRight: { x: rect.x2, y: rect.y2 },
  };
}

// Use viewport: IViewportWithPosition
// Todo check all percentage usages and migrate to only 0-100%
/**
 * Check if a specific rectangle point is within the viewport. Point is calculated
 * using percent. To check if middle of rectangle is visible check use 50%.
 * @param percent should be in range [0, 100]
 */
export function isRectanglePointInViewport(
  rect: IRect,
  viewport: IViewportSizeWithPosition,
  percent: number,
): { all: boolean; horizontal: boolean; vertical: boolean } {
  assert(isWithinInterval(percent, [0, 100]), 'percentage should be in range [0, 100]');
  const multiplier = percent / 100;
  const point = {
    x: rect.x + rect.width * multiplier,
    y: rect.y + rect.height * multiplier,
  };
  const view = rectangleWithCoordinates(viewport);
  const horizontal = isWithinInterval(point.x, [view.x, view.x2]);
  const vertical = isWithinInterval(point.y, [view.y, view.y2]);

  return {
    all: horizontal && vertical,
    horizontal,
    vertical,
  };
}

/**
 * Create a scrollpoint for a given rectangle.
 */
export function createScrollPointForRect(
  targetRect: IRect,
  viewport: IViewportSizeWithPosition,
  randomness = 0,
): IPositionAbsolute {
  const scrollPoint = { x: viewport.x, y: viewport.y };
  const rect = rectangleWithCoordinates(targetRect);
  const view = rectangleWithCoordinates(viewport);
  const corners = rectangleToCorners(rect);

  // Is rectangle already in viewport
  if (isPointWithinRect(corners.topLeft, view) && isPointWithinRect(corners.bottomRight, view)) {
    return scrollPoint;
  }

  // Is rectangle vertically not in viewport -> scroll to reference point (15% below top of screen)
  if (
    !isWithinInterval(corners.topLeft.y, [view.y, view.y2]) ||
    !isWithinInterval(corners.bottomLeft.y, [view.y, view.y2])
  ) {
    const referecePoint = 0.15 * view.height + randomInteger(0, randomness);
    scrollPoint.y = rect.y - referecePoint;
  }

  // We only move horizontally when absolutely needed, this mimicks real humans.
  const leftSideInViewport = isWithinInterval(corners.topLeft.x, [view.x, view.x2]);
  if (!leftSideInViewport || !isWithinInterval(corners.topRight.x, [view.x, view.x2])) {
    const middleX = { x: (rect.x + rect.x2) / 2, y: scrollPoint.y };
    if (leftSideInViewport && middleX) {
      // Don't scroll if left corner and at least half of the content is within viewport
    } else {
      // Always scroll if left corner not inside viewport (left side always most import side)
      const referecePoint = 0.15 * view.width + randomInteger(0, randomness);
      scrollPoint.x = rect.x - referecePoint;
    }
  }
  return roundPoint(scrollPoint, 1);
}

/**
 * Creates a random point within a rectangle.
 * When using constrainToViewport make sure at least part of rectangle is within the viewport.
 */
export function createPointInRect(
  rectangle: IRect,
  options?: {
    paddingPercent?: { height: number; width: number };
    constrainToViewport?: IViewportSizeWithPosition;
  },
): IPositionAbsolute {
  const paddingPercent = options?.paddingPercent ?? { height: 33, width: 33 };
  assert(
    isWithinInterval(paddingPercent.height, [0, 100]),
    'padding height percentage should be in range [0, 100]',
  );
  assert(
    isWithinInterval(paddingPercent.width, [0, 100]),
    'padding width percentage should be in range [0, 100]',
  );
  const padding = {
    x: (rectangle.width * paddingPercent.width) / 100,
    y: (rectangle.height * paddingPercent.height) / 100,
  };
  const rect = rectangleWithCoordinates(paddedRectangle(rectangle, padding.x, padding.y));
  let point: IPositionAbsolute = {
    x: randomInteger(rect.x, rect.x2),
    y: randomInteger(rect.y, rect.y2),
  };

  if (options?.constrainToViewport) {
    point = clipPointToRectangle(point, options.constrainToViewport);
  }

  return roundPoint(point, 1);
}

function roundPoint(point: IPositionAbsolute, decimals: number): IPositionAbsolute {
  return { x: round(point.x, decimals), y: round(point.y, decimals) };
}

function round(num: number, decimals: number): number {
  const scale = 10 ^ decimals;
  return Math.round(num * scale) / scale;
}
