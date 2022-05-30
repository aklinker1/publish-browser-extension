import { Log } from '../utils/log';
import { PublishResult } from './types';

export interface FirefoxAddonStoreOptions {
  zip: string;
  extensionId: string;
  issuer: string;
  secret: string;
}

export class FirefoxAddonStore {
  readonly name = 'Firefox Addon Store';

  constructor(
    readonly options: FirefoxAddonStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(): Promise<void> {
    throw Error(
      'Publishing to the Firefox Addons Store is not implemented yet',
    );
  }
}
