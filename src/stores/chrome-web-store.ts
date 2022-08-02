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
    readonly dryRun: boolean | undefined,
    readonly options: ChromeWebStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(dryRun?: boolean): Promise<void> {
    const api = new CwsApi(this.options);
    const token = await api.getToken();

    if (!dryRun) {
      await api.uploadZip({
        extensionId: this.options.extensionId,
        zipFile: this.options.zip,
        token,
      });
      await api.submitForReview({
        extensionId: this.options.extensionId,
        publishTarget: this.options.publishTarget,
        token,
      });
    }
  }
}
