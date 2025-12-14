import { CwsApi } from './chrome-api';
import type { Store } from '../utils/store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';

export const ChromeWebStoreOptions = z.object({
  zip: z.string().min(1),
  extensionId: z.string().min(1).trim(),
  publisherId: z.string().min(1).trim(),
  clientId: z.string().min(1).trim(),
  clientSecret: z.string().min(1).trim(),
  refreshToken: z.string().min(1).trim(),
  deployPercentage: z.int().min(1).max(100).optional(),
  skipSubmitReview: z.boolean().default(false),
  cancelPending: z.boolean().default(false),
  skipReview: z.boolean().default(false),
  publishType: z
    .enum(['DEFAULT_PUBLISH', 'STAGED_PUBLISH'])
    .default('DEFAULT_PUBLISH'),
});
export type ChromeWebStoreOptions = z.infer<typeof ChromeWebStoreOptions>;

export class ChromeWebStore implements Store {
  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {}

  async submit(dryRun?: boolean): Promise<void> {
    const api = new CwsApi(this.options);

    this.setStatus('Getting an access token');
    const token = await api.getToken();

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    // Cancel pending submission if requested
    if (this.options.cancelPending) {
      this.setStatus('Cancelling pending submission');
      await api.cancelSubmission({
        extensionId: this.options.extensionId,
        token,
      });
    }

    this.setStatus('Uploading new ZIP file');
    const uploadResult = await api.uploadZip({
      extensionId: this.options.extensionId,
      zipFile: this.options.zip,
      token,
    });

    // Check if upload is still processing
    if (uploadResult.uploadState === 'IN_PROGRESS') {
      this.setStatus('Upload in progress, waiting for processing...');
      // TODO: Could poll fetchStatus here if needed
    }

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting for review');
    await api.publish({
      extensionId: this.options.extensionId,
      token,
      deployPercentage: this.options.deployPercentage,
      publishType: this.options.publishType,
      skipReview: this.options.skipReview || undefined,
    });
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
