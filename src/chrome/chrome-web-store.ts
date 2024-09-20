import { CwsApi } from './chrome-api';
import { Store } from '../utils/store';
import { z } from 'zod';
import consola from 'consola';
import { ensureZipExists } from '../utils/fs';

export const ChromeWebStoreOptions = z.object({
  zip: z.string().min(1),
  extensionId: z.string().min(1).trim(),
  clientId: z.string().min(1).trim(),
  clientSecret: z.string().min(1).trim(),
  refreshToken: z.string().min(1).trim(),
  publishTarget: z.enum(['default', 'trustedTesters']).default('default'),
  deployPercentage: z.number().int().min(1).max(100).optional(),
  reviewExemption: z.boolean().default(false),
  skipSubmitReview: z.boolean().default(false),
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

    this.setStatus('Uploading new ZIP file');
    await api.uploadZip({
      extensionId: this.options.extensionId,
      zipFile: this.options.zip,
      token,
    });

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting for review');
    await api.submitForReview({
      extensionId: this.options.extensionId,
      publishTarget: this.options.publishTarget,
      token,
    });
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
