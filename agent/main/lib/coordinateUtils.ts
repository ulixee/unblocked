import {
  IPositionAbsolute,
  IPositionRelativeMouse,
  IPositionRelativeViewport,
} from '@ulixee/unblocked-specification/agent/browser/IPosition';

export function absoluteToRelativeViewportPosition(
  position: IPositionAbsolute,
  scrollOffset: IPositionAbsolute,
): IPositionRelativeViewport {
  const { x, y } = position;
  return { rx: x - scrollOffset.x, ry: y - scrollOffset.y };
}

export function absoluteToRelativeMousePosition(
  position: IPositionAbsolute,
  mousePosition: IPositionAbsolute,
): IPositionRelativeMouse {
  const { x, y } = position;
  return { mx: x - mousePosition.x, my: y - mousePosition.y };
}

export function relativeViewportPositionToAbsolute(
  position: IPositionRelativeViewport,
  scrollOffset: IPositionAbsolute,
): IPositionAbsolute {
  const { rx, ry } = position;
  return { x: rx + scrollOffset.x, y: ry + scrollOffset.y };
}

export function relativeMousePositionToAbsolute(
  position: IPositionRelativeMouse,
  mousePosition: IPositionAbsolute,
): IPositionAbsolute {
  const { mx, my } = position;
  return { x: mx + mousePosition.x, y: my + mousePosition.y };
}

export function relativeViewportPositionToRelativeMouse(
  position: IPositionRelativeViewport,
  scrollOffset: IPositionAbsolute,
  mousePosition: IPositionAbsolute,
): IPositionRelativeMouse {
  const absolutePosition = relativeViewportPositionToAbsolute(position, scrollOffset);
  return absoluteToRelativeMousePosition(absolutePosition, mousePosition);
}

export function relativeMousePositionToRelativeViewport(
  position: IPositionRelativeMouse,
  mousePosition: IPositionAbsolute,
  scrollOffset: IPositionAbsolute,
): IPositionRelativeViewport {
  const absolutePosition = relativeMousePositionToAbsolute(position, mousePosition);
  return absoluteToRelativeViewportPosition(absolutePosition, scrollOffset);
}
