import { IPositionRelativeViewport } from '../browser/IPosition';
import { IInteractionGroupsAbsolute, IInteractionStepAbsolute } from '../interact/IInteractions';
import IInteractionsHelper from '../interact/IInteractionsHelper';

export default interface IInteractHooks {
  playInteractions?(
    interactions: IInteractionGroupsAbsolute,
    runFn: (interaction: IInteractionStepAbsolute) => Promise<void>,
    helper?: IInteractionsHelper,
  ): Promise<void>;

  adjustStartingMousePoint?(point: IPositionRelativeViewport, helper?: IInteractionsHelper): Promise<void> | void;
}
