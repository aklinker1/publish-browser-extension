import { PublishResult } from './types';

export interface FirefoxAddonStoreOptions {
  zip: string;
  extensionId: string;
  issuer: string;
  secret: string;
}

export class FirefoxAddonStore {
  constructor(readonly options: FirefoxAddonStoreOptions) {}

  async publish(): Promise<PublishResult> {
    throw Error(
      'Publishing to the Firefox Addons Store is not implemented yet',
    );
  }
}
