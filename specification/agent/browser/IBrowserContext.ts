import { URL } from 'url';
import type ITypedEventEmitter from '@ulixee/commons/interfaces/ITypedEventEmitter';
import { IPage } from './IPage';
import { IWorker } from './IWorker';
import IBrowser from './IBrowser';
import { IBrowserContextHooks } from '../hooks/IBrowserHooks';
import { ICookie } from '../net/ICookie';
import IInteractHooks from '../hooks/IInteractHooks';

export default interface IBrowserContext extends ITypedEventEmitter<IBrowserContextEvents> {
  id: string;
  browserId: string;
  browser: IBrowser;
  isIncognito: boolean;
  pagesById: Map<string, IPage>;
  workersById: Map<string, IWorker>;
  defaultPageInitializationFn: (page: IPage) => Promise<any>;
  hooks: IBrowserContextHooks & IInteractHooks;
  downloadsPath: string;

  newPage(): Promise<IPage>;
  close(): Promise<void>;
  enableDownloads(downloadsPath?: string): Promise<void>;
  getCookies(url?: URL): Promise<ICookie[]>;
  addCookies(
    cookies: (Omit<ICookie, 'expires'> & { expires?: string | Date | number })[],
    origins?: string[],
  ): Promise<void>;
}

export interface IBrowserContextEvents {
  page: { page: IPage };
  worker: { worker: IWorker };
  close: void;
  'all-pages-closed': void;
}
