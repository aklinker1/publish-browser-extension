import { Log } from '../utils/log';
import { CwsApi } from '../apis/cws-api';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  publishTarget?: 'default' | 'trustedTesters';
  skipSubmitReview?: boolean;
}

export class ChromeWebStore {
  readonly name = 'Chrome Web Store';

  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(dryRun?: boolean): Promise<void> {
    const api = new CwsApi(this.options);
    const token = await api.getToken();

    if (dryRun) {
      this.deps.log.warn('DRY RUN: Skipping upload and publish...');
      return;
    }

    await api.uploadZip({
      extensionId: this.options.extensionId,
      zipFile: this.options.zip,
      token,
    });

    if (this.options.skipSubmitReview) {
      this.deps.log.warn('Skipping submission (skipSubmitReview=true)');
      return;
    }
    await api.submitForReview({
      extensionId: this.options.extensionId,
      publishTarget: this.options.publishTarget,
      token,
    });
  }
}
