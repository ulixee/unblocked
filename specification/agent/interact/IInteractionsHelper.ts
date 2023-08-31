import type { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import { IJsPath, INodePointer, INodeVisibility } from '@ulixee/js-path';
import IMouseResult from './IMouseResult';
import IPoint from '../browser/IPoint';
import { IMousePositionAbsolute } from './IInteractions';
import IRect from '../browser/IRect';
import { IPositionAbsolute } from '../browser/IPosition';

export default interface IInteractionsHelper {
  mousePosition: Promise<IPositionAbsolute>;
  scrollOffset: Promise<IPositionAbsolute>;
  viewportSize: IViewportSize;
  get viewportSizeWithPosition(): Promise<IViewportSizeWithPosition>;
  logger: IBoundLog;
  doesBrowserAnimateScrolling: boolean;

  createMousedownTrigger(nodeId: number): Promise<{
    nodeVisibility: INodeVisibility;
    didTrigger: () => Promise<IMouseResult>;
  }>;

  reloadJsPath(jsPath: IJsPath): Promise<INodePointer>;
  lookupBoundingRect(
    mousePosition: IMousePositionAbsolute,
    options?: {
      includeNodeVisibility?: boolean;
      useLastKnownPosition?: boolean;
    },
  ): Promise<IRectLookup>;

  // rect utils
  createPointInRect(
    rect: IRect,
    options?: {
      paddingPercent?: { height: number; width: number };
      constrainToViewport?: IViewportSizeWithPosition;
    },
  ): IPoint;
  createScrollPointForRect(rect: IRect, viewport: IViewportSizeWithPosition): IPoint;
  isPointWithinRect(point: IPoint, rect: IRect): boolean;
  isRectanglePointInViewport(
    rect: IRect,
    viewport: IViewportSizeWithPosition,
    percent: number,
  ): { all: boolean; horizontal: boolean; vertical: boolean };
}

export type IRectLookup = IRect & {
  elementTag?: string;
  nodeId?: number;
  nodeVisibility?: INodeVisibility;
};

export interface IViewportSize {
  width: number;
  height: number;
}

export interface IViewportSizeWithPosition extends IViewportSize {
  x: number;
  y: number
}