import { IPositionAbsolute } from '@ulixee/unblocked-specification/agent/browser/IPosition';
import IRect from '@ulixee/unblocked-specification/agent/browser/IRect';
import {
  randomInteger,
  isWithinInterval,
  rectangleWithCoordinates,
  paddedRectangle,
  clipPointToRectangle,
  isSamePoint,
  isPointWithinRect,
  rectangleToCorners,
  isRectanglePointInViewport,
  createScrollPointForRect,
  createPointInRect,
} from '../lib/rectUtils';

const rectangle: IRect = {
  x: 50,
  width: 300,
  y: 40,
  height: 500,
};

test('should generate random integers', () => {
  expect(randomInteger(5, 5)).toBe(5);
  const [start, stop] = [0, 5];
  const randomNumbers = [...Array(100).keys()].map(() => randomInteger(start, stop));

  for (let i = start; i <= stop; i++) {
    expect(randomNumbers).toContain(i);
  }
});

test('number should be in interval', () => {
  expect(isWithinInterval(1, [2, 7])).toBe(false);
  expect(isWithinInterval(2, [2, 7])).toBe(true);
  expect(isWithinInterval(5, [2, 7])).toBe(true);
  expect(isWithinInterval(7, [2, 7])).toBe(true);
  expect(isWithinInterval(8, [2, 7])).toBe(false);
  expect(() => isWithinInterval(5, [7, 2])).toThrow();
});

test('convert rectangle to rectangle with coordinates', () => {
  const expectedResult: ReturnType<typeof rectangleWithCoordinates> = {
    ...rectangle,
    x2: 350,
    y2: 540,
  };
  expect(rectangleWithCoordinates(rectangle)).toEqual(expectedResult);
});

test('add padding to rectangle', () => {
  const padding = { x: 5, y: 8 };
  const expectedResult: IRect = {
    x: rectangle.x + padding.x,
    width: rectangle.width - 2 * padding.x,
    y: rectangle.y + padding.y,
    height: rectangle.height - 2 * padding.y,
  };
  expect(paddedRectangle(rectangle, padding.x, padding.y)).toEqual(expectedResult);
  expect(paddedRectangle(rectangle, 0, 0)).toEqual(rectangle);
  expect(() => paddedRectangle(rectangle, -1, 0)).toThrow();
  expect(() => paddedRectangle(rectangle, -1, -1)).toThrow();
  expect(() => paddedRectangle(rectangle, 0, -1)).toThrow();
  expect(() => paddedRectangle(rectangle, 500, 0)).toThrow();
});

test('clip point to rectangle if needed', () => {
  // Edges
  expect(clipPointToRectangle({ x: 50, y: 40 }, rectangle)).toEqual({ x: 50, y: 40 });
  expect(clipPointToRectangle({ x: 350, y: 540 }, rectangle)).toEqual({ x: 350, y: 540 });
  // Inside
  expect(clipPointToRectangle({ x: 51, y: 41 }, rectangle)).toEqual({ x: 51, y: 41 });
  // Outside
  expect(clipPointToRectangle({ x: 30, y: 41 }, rectangle)).toEqual({ x: 50, y: 41 });
  expect(clipPointToRectangle({ x: 51, y: 21 }, rectangle)).toEqual({ x: 51, y: 40 });
  expect(clipPointToRectangle({ x: 0, y: 0 }, rectangle)).toEqual({ x: 50, y: 40 });
  expect(clipPointToRectangle({ x: 990, y: 780 }, rectangle)).toEqual({ x: 350, y: 540 });
});

test('is point in rectangle', () => {
  for (let i = 0; i <= 100; i++) {
    const point = { x: randomInteger(0, 700), y: randomInteger(0, 700) };
    const clipped = clipPointToRectangle(point, rectangle);
    // point is within rectangle if clipping is not needed
    expect(isPointWithinRect(point, rectangle)).toBe(isSamePoint(point, clipped));
  }
  expect(isPointWithinRect({ x: 51, y: 41 }, rectangle)).toBe(true);
  expect(isPointWithinRect({ x: 21, y: 41 }, rectangle)).toBe(false);
});

test('convert rectangle to corners', () => {
  expect(rectangleToCorners(rectangle)).toEqual({
    topLeft: { x: rectangle.x, y: rectangle.y },
    topRight: { x: rectangle.x + rectangle.width, y: rectangle.y },
    bottomLeft: { x: rectangle.x, y: rectangle.y + rectangle.height },
    bottomRight: { x: rectangle.x + rectangle.width, y: rectangle.y + rectangle.height },
  });
});

test('check if a rectangle point is within viewport', () => {
  expect(
    isRectanglePointInViewport(rectangle, { x: 0, y: 0, width: 500, height: 500 }, 50),
  ).toEqual({
    horizontal: true,
    vertical: true,
    all: true,
  });
  expect(
    isRectanglePointInViewport(rectangle, { x: 0, y: 500, width: 500, height: 500 }, 50),
  ).toEqual({
    horizontal: true,
    vertical: false,
    all: false,
  });
  expect(
    isRectanglePointInViewport(rectangle, { x: 500, y: 0, width: 500, height: 500 }, 50),
  ).toEqual({
    horizontal: false,
    vertical: true,
    all: false,
  });
  expect(
    isRectanglePointInViewport(rectangle, { x: 500, y: 500, width: 500, height: 500 }, 50),
  ).toEqual({
    horizontal: false,
    vertical: false,
    all: false,
  });

  expect(() =>
    isRectanglePointInViewport(rectangle, { x: 500, y: 500, width: 500, height: 500 }, -1),
  ).toThrow();
  expect(() =>
    isRectanglePointInViewport(rectangle, { x: 500, y: 500, width: 500, height: 500 }, 101),
  ).toThrow();
});

describe('create scrollPoint for rectangle', () => {
  test('Should not move if already completely in view', () => {
    const viewport = { x: 0, y: 500, width: 800, height: 1600 };
    const currentScroll = { x: viewport.x, y: viewport.y };
    const testCases: Array<[IRect, IPositionAbsolute]> = [
      [{ x: 10, y: 500, width: 50, height: 50 }, currentScroll],
      [{ x: 10, y: 550, width: 50, height: 50 }, currentScroll],
      [{ x: 10, y: 800, width: 50, height: 800 }, currentScroll],
    ];

    for (const [test, result] of testCases) {
      expect(createScrollPointForRect(test, viewport)).toEqual(result);
    }
  });

  test('vertical scrolling behaviour', () => {
    const viewport = { x: 0, y: 500, width: 800, height: 1600 };
    const reference = 0.15 * viewport.height;
    const testCases: Array<[IRect, IPositionAbsolute]> = [
      // Scroll down if top above viewport
      [
        { x: 10, y: 499, width: 50, height: 50 },
        { x: 0, y: 499 - reference },
      ],
      // Scroll to reference point if top below viewport
      [
        { x: 10, y: 1601, width: 50, height: 5000 },
        { x: 0, y: 1601 - reference },
      ],
      // Scroll to reference point if not completely in viewport
      [
        { x: 10, y: 501, width: 50, height: 5000 },
        { x: 0, y: 501 - reference },
      ],
      [
        { x: 10, y: 470, width: 50, height: 5000 },
        { x: 0, y: 470 - reference },
      ],
    ];

    for (const [test, result] of testCases) {
      expect(createScrollPointForRect(test, viewport)).toEqual(result);
    }
  });

  test('horizontal scrolling behaviour', () => {
    // X2 = 900
    const viewport = { x: 100, y: 500, width: 800, height: 1600 };
    const currentScroll = { x: viewport.x, y: viewport.y };
    const reference = 0.15 * viewport.width;
    const testCases: Array<[IRect, IPositionAbsolute]> = [
      // left side + 50 in viewport -> no scroll
      [{ x: 800, y: 600, width: 200, height: 50 }, currentScroll],
      // left side in viewport, but only 49% -> scroll
      [
        { x: 800, y: 600, width: 201, height: 50 },
        { y: currentScroll.y, x: 800 - reference },
      ],
      // left side not in viewport, left of screen -> scroll
      [
        { x: 50, y: 600, width: 201, height: 50 },
        { y: currentScroll.y, x: 50 - reference },
      ],
      // left side not in viewport, right of screen -> scroll
      [
        { x: 1000, y: 600, width: 201, height: 50 },
        { y: currentScroll.y, x: 1000 - reference },
      ],
    ];

    for (const [test, result] of testCases) {
      expect(createScrollPointForRect(test, viewport)).toEqual(result);
    }
  });
});

test('should create a point in a rectangle', () => {
  const rect = { x: 0, y: 0, width: 200, height: 200 };
  for (let i = 0; i <= 100; i++) {
    const point = createPointInRect(rectangle);
    expect(isPointWithinRect(point, rectangle)).toBe(true);
  }
  // Padding 100% leaves only center point over
  expect(createPointInRect(rect, { paddingPercent: { height: 100, width: 100 } })).toEqual({
    x: 100,
    y: 100,
  });
  expect(createPointInRect(rect, { paddingPercent: { height: 100, width: 0 } }).y).toBe(100);
  expect(createPointInRect(rect, { paddingPercent: { height: 0, width: 100 } }).x).toBe(100);
  // Contrain to viewport
  const outside = { x: -200, y: -200, width: 400, height: 400 };
  const viewport = { x: 0, y: 0, width: 600, height: 1000 };
  for (let i = 0; i <= 100; i++) {
    const point = createPointInRect(outside, { constrainToViewport: viewport });
    expect(point.x).toBeGreaterThanOrEqual(0);
    expect(point.y).toBeGreaterThanOrEqual(0);
    expect(point.x).toBeLessThanOrEqual(200);
    expect(point.y).toBeLessThanOrEqual(200);
  }

  // Viewport should overlap with rectangle to create a point inside rectangle, but
  // also inside viewport.
  expect(() =>
    createPointInRect(
      { x: 0, y: 0, width: 10, height: 10 },
      { constrainToViewport: { x: 20, y: 20, width: 10, height: 10 } },
    ),
  ).toThrow();
});
