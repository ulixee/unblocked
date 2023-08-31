import { IJsPath } from '@ulixee/js-path';
import { isIJsPath } from '@ulixee/js-path/interfaces/IJsPath';
import IMouseResult from './IMouseResult';
import { IKeyboardShortcut } from './IKeyboardShortcuts';
import { IKeyboardKeyCode } from './IKeyboardLayoutUS';
import {
  IPositionAbsolute,
  IPositionRelativeMouse,
  IPositionRelativeViewport,
} from '../browser/IPosition';

export { IJsPath, isIJsPath };

export type IElementInteractVerification = 'elementAtPath' | 'exactElement' | 'none';

export type IInteractionGroups = IInteractionGroup[];
export type IInteractionGroup = IInteractionStep[];

// Interactions

export interface IInteractionStep {
  command: IInteractionCommand;
  mousePosition?: IMousePosition;
  mouseButton?: IMouseButton;
  mouseResultVerifier?: () => Promise<IMouseResult>;
  simulateOptionClickOnNodeId?: number;
  keyboardCommands?: IKeyboardCommand[];
  keyboardDelayBetween?: number;
  keyboardKeyupDelay?: number;
  delayNode?: IJsPath;
  delayElement?: IJsPath;
  delayMillis?: number;
  verification?: IElementInteractVerification;
}

// Internally, and all plugins/hooks should use absolute positions
export type IInteractionStepAbsolute = Omit<IInteractionStep, 'mousePosition'> & {
  mousePosition?: IMousePositionAbsolute;
};
export type IInteractionGroupsAbsolute = IInteractionGroupAbsolute[];
export type IInteractionGroupAbsolute = IInteractionStepAbsolute[];

export enum InteractionCommand {
  move = 'move',
  scroll = 'scroll',

  willDismissDialog = 'willDismissDialog',

  click = 'click',
  clickDown = 'clickDown',
  clickUp = 'clickUp',

  doubleclick = 'doubleclick',

  type = 'type',

  waitForMillis = 'waitForMillis',
}

export type IInteractionCommand = keyof typeof InteractionCommand;

// Mouse-specific Types

export enum MouseButton {
  left = 'left',
  middle = 'middle',
  right = 'right',
}
export type IMouseButton = keyof typeof MouseButton;

export type IMousePositionRxRy = [number, number];

export function isMousePositionRxRy(mousePosition: any): mousePosition is IMousePositionRxRy {
  return (
    Array.isArray(mousePosition) &&
    mousePosition.length === 2 &&
    typeof mousePosition[0] === 'number' &&
    typeof mousePosition[1] === 'number'
  );
}

// TODO remove deprecated
export function isMousePositionXY(mousePosition: any): mousePosition is IMousePositionRxRy {
  return isMousePositionRxRy(mousePosition);
}

export type IMousePositionAbsolute = IJsPath | IPositionAbsolute;

export type IMousePosition =
  | IMousePositionAbsolute
  | IMousePositionRxRy
  | IPositionRelativeViewport
  | IPositionRelativeMouse;

// Keyboard-specific Types

export type IKeyboardCommand = IKeyPress | IKeyboardObject;
export type IKeyboardObject = IKeyboardString | IKeyboardUp | IKeyboardDown | IKeyShortcutPress;
export interface IKeyboardString {
  string: string;
}
export interface IKeyPress {
  keyCode: IKeyboardKeyCode;
}
export interface IKeyShortcutPress {
  shortcut: IKeyboardShortcut;
}
export interface IKeyboardUp {
  up: IKeyboardKeyCode;
}
export interface IKeyboardDown {
  down: IKeyboardKeyCode;
}
