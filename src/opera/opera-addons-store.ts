import { z } from 'zod/v4';
import type { Store } from '../utils/store';
import { ensureZipExists } from '../utils/fs';
import { OperaAddonsApi } from './opera-api';

export const OperaAddonsStoreOptions = z.object({
  zip: z.string().min(1),
  packageId: z.number().min(1),

  sessionId: z.string().min(1).trim(),
  ingressCookieApi: z.string().min(1).trim(),
  csrftoken: z.string().min(1),
});

export type OperaAddonsStoreOptions = z.infer<typeof OperaAddonsStoreOptions>;

export class OperaAddonsStore implements Store {
  private api: OperaAddonsApi;

  constructor(
    readonly options: OperaAddonsStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.api = new OperaAddonsApi(options);
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting addon details');

    const addon = await this.api.details({
      packageId: this.options.packageId,
      sessionId: this.options.sessionId,
      ingressCookie: this.options.ingressCookieApi,
      csrftoken: this.options.csrftoken,
    });

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Submitting new version');

    // TODO
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
