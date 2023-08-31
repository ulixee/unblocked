import {
  IPositionAbsolute,
  IPositionRelativeMouse,
  IPositionRelativeViewport,
} from '@ulixee/unblocked-specification/agent/browser/IPosition';

export function absoluteToRelativeViewportPosition(
  position: IPositionAbsolute,
  scrollPosition: IPositionAbsolute,
): IPositionRelativeViewport {
  const { x, y } = position;
  return { rx: x - scrollPosition.x, ry: y - scrollPosition.y };
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
  scrollPosition: IPositionAbsolute,
): IPositionAbsolute {
  const { rx, ry } = position;
  return { x: rx + scrollPosition.x, y: ry + scrollPosition.y };
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
  scrollPosition: IPositionAbsolute,
  mousePosition: IPositionAbsolute,
): IPositionRelativeMouse {
  const absolutePosition = relativeViewportPositionToAbsolute(position, scrollPosition);
  return absoluteToRelativeMousePosition(absolutePosition, mousePosition);
}

export function relativeMousePositionToRelativeViewport(
  position: IPositionRelativeMouse,
  mousePosition: IPositionAbsolute,
  scrollPosition: IPositionAbsolute,
): IPositionRelativeViewport {
  const absolutePosition = relativeMousePositionToAbsolute(position, mousePosition);
  return absoluteToRelativeViewportPosition(absolutePosition, scrollPosition);
}
