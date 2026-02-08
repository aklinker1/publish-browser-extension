import { z } from 'zod/v4';
import type { Store } from '../utils/store';
import { ensureZipExists } from '../utils/fs';
import { OperaAddonsApi } from './opera-api';

export const OperaAddonsStoreOptions = z.object({
  zip: z.string().min(1),
  packageId: z.number().min(1),
  sessionId: z.string().min(1).trim(),
});

export type OperaAddonsStoreOptions = z.infer<typeof OperaAddonsStoreOptions>;

export class OperaAddonsStore implements Store {
  private api: OperaAddonsApi;

  constructor(
    readonly options: OperaAddonsStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.api = new OperaAddonsApi({
      sessionId: this.options.sessionId,
    });
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting addon details');

    const addon = await this.api.getAddonDetails({
      packageId: this.options.packageId,
    });

    if ('detail' in addon) {
      throw new Error(addon.detail);
    }

    this.setStatus(`Found ${addon.name} at ${addon.details_url}`);

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

    const creationData = await this.api.uploadFile({
      packageId: this.options.packageId,
      file: this.options.zip,
    });

    this.setStatus('Waiting for validation results');
    await this.api.validateFileUpload({
      packageId: this.options.packageId,
      lastVersion: latestVersion,
      ...creationData,
    });

    // TODO: Submit changes
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
