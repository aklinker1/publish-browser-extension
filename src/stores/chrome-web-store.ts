import { CwsApi } from '../apis/cws-api';
import { Logger } from '../utils/logger';
import { IStore } from './types';
import pc from 'picocolors';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  publishTarget: 'default' | 'trustedTesters';
  skipSubmitReview: boolean;
}

export class ChromeWebStore implements IStore {
  readonly name = 'Chrome Web Store';

  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly deps: { logger: Logger },
  ) {}

  private log(message: string): void {
    this.deps.logger.log(pc.dim(`    ${message}`));
  }

  async publish(dryRun?: boolean): Promise<void> {
    const api = new CwsApi(this.options);

    this.log('Getting an access token...');
    const token = await api.getToken();

    if (dryRun) {
      this.log('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.log('Uploading new ZIP file...');
    await api.uploadZip({
      extensionId: this.options.extensionId,
      zipFile: this.options.zip,
      token,
    });

    if (this.options.skipSubmitReview) {
      this.log('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.log('Submitting for review...');
    await api.submitForReview({
      extensionId: this.options.extensionId,
      publishTarget: this.options.publishTarget,
      token,
    });
  }
}
