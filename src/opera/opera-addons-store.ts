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

    const credentials = {
      sessionId: this.options.sessionId,
      ingressCookie: this.options.ingressCookieApi,
      csrftoken: this.options.csrftoken,
    };

    const addon = await this.api.details({
      packageId: this.options.packageId,
      ...credentials,
    });

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Getting last addon version');

    const latestVersion = addon.versions[0]?.version;
    if (!latestVersion) {
      throw new Error(
        'You need at least one previous version to be uploaded before uploading a new one!',
      );
    }

    this.setStatus('Uploading new version from zip');

    const creationData = await this.api.uploadCreate({
      packageId: this.options.packageId,
      file: this.options.zip,
      ...credentials,
    });

    this.setStatus('Waiting for validation results');
    await this.api.uploadValidate({
      packageId: this.options.packageId,
      lastVersion: latestVersion,
      ...creationData,
      ...credentials,
    });

    // TODO: Submit changes
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
