import { Log } from '../utils/log';
import { PublishResult } from './types';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class ChromeWebStore {
  readonly name = 'Chrome Web Store';

  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(): Promise<void> {
    throw Error('Publishing to the Chrome Web Store is not implemented yet');
  }
}
