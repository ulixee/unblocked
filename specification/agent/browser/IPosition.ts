// (0,0) Top left of webpage
export type IPositionAbsolute = { x: number; y: number };
// (0,0) Top left of screen
export type IPositionRelativeViewport = { rx: number; ry: number };
// (0,0) At mouse position
export type IPositionRelativeMouse = { mx: number; my: number };

export type Position = IPositionAbsolute | IPositionRelativeViewport | IPositionRelativeMouse;
export default Position

export function isPosition(input: unknown): input is Position {
    if (typeof input === 'object' && input !== null) {
        if ('x' in input && 'y' in input) {
            return true
        }
        if ('rx' in input && 'ry' in input) {
            return true
        }
        if ('mx' in input && 'my' in input) {
            return true
        }
    }
    return false
}

export function isIPositionAbsolute(
  position: IPositionAbsolute | IPositionRelativeViewport | IPositionRelativeMouse,
): position is IPositionAbsolute {
  if ('x' in position && 'y' in position) {
    return true;
  }
  return false;
}

export function isIPositionRelativeViewport(
  position: IPositionAbsolute | IPositionRelativeViewport | IPositionRelativeMouse,
): position is IPositionRelativeViewport {
  if ('rx' in position && 'ry' in position) {
    return true;
  }
  return false;
}

export function isIPositionRelativeMouse(
  position: IPositionAbsolute | IPositionRelativeViewport | IPositionRelativeMouse,
): position is IPositionRelativeMouse {
  if ('mx' in position && 'my' in position) {
    return true;
  }
  return false;
}

const bla = {x: 4, y:7}
if(isPosition(bla)){
    bla.x
}