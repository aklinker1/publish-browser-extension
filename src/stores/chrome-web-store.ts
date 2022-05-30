import { PublishResult } from './types';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class ChromeWebStore {
  constructor(readonly options: ChromeWebStoreOptions) {}

  async publish(): Promise<PublishResult> {
    throw Error('Publishing to the Chrome Web Store is not implemented yet');
  }
}
