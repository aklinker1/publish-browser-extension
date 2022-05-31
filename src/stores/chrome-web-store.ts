import { Log } from '../utils/log';
import { CwsApi } from '../apis/cws-api';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  publishTarget?: 'default' | 'trustedTesters';
}

export class ChromeWebStore {
  readonly name = 'Chrome Web Store';

  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(): Promise<void> {
    const api = new CwsApi(this.options);
    await api.uploadZip({
      extensionId: this.options.extensionId,
      zipFile: this.options.zip,
    });
    api.submitForReview({
      extensionId: this.options.extensionId,
      publishTarget: this.options.publishTarget,
    });
  }
}
