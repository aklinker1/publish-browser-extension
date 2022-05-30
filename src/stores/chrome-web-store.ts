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
    return {
      success: true,
    };
  }
}
