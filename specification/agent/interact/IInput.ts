import { IKeyboardKey } from './IKeyboardLayoutUS';
import { IMouseButton } from './IInteractions';
import IPoint from '../browser/IPoint';
import { IPositionRelativeViewport } from '../browser/IPosition';

export interface IKeyboard {
  up(key: IKeyboardKey): Promise<void>;
  down(key: IKeyboardKey): Promise<void>;
  press(key: IKeyboardKey, keyupDelay?: number): Promise<void>;
  command(command: string): Promise<void>;
  insertText(text: string): Promise<void>;
  sendCharacter(char: string): Promise<void>;
}

export interface IMouse {
  position: IPositionRelativeViewport;
  move(rx: number, ry: number): Promise<void>;
  up(options?: IMouseOptions): Promise<void>;
  down(options?: IMouseOptions): Promise<void>;
  wheel(options: { deltaX?: number; deltaY?: number }): Promise<void>;
}

export interface IMouseOptions {
  button?: IMouseButton;
  clickCount?: number;
}
