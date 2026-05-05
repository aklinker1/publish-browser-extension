import { z } from 'zod/v4';
import type { Store } from '../utils/store';
import { ensureZipExists } from '../utils/fs';
import { OperaAddonsApi } from './opera-api';
import { sleep } from '../utils/sleep';

export const OperaAddonsStoreOptions = z.object({
  zip: z.string().min(1),
  packageId: z.number().min(1),
  sessionId: z.string().min(1).trim(),
  skipSubmitReview: z.boolean().default(false),
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
    this.setStatus('Getting previous addon version details');

    const previousVersion = addon.versions[0]?.version;
    if (!previousVersion) {
      throw new Error(
        'You need at least one previous version to be uploaded before uploading a new one!',
      );
    }

    // For some reasons, when pushing a new version, Opera's API copies
    // almost all the details from the previous version, except for the
    // "short summary" field. So we need to copy that part ouserselves by
    // reusing the previous version's details
    const previousVersionDetails = await this.api.getAddonVersionDetails({
      packageId: this.options.packageId,
      version: previousVersion,
    });

    if ('detail' in previousVersionDetails) {
      throw new Error(previousVersionDetails.detail);
    }

    if (!previousVersionDetails.translations.en?.short_description) {
      throw new Error(
        'The previous version is missing the English short description, ' +
          'which is required to be copied to the new version.' +
          'Please add it in Opera Developer Dashboard and try again.',
      );
    }

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new version from zip');

    const creationData = await this.api.uploadFile({
      packageId: this.options.packageId,
      file: this.options.zip,
    });

    this.setStatus(
      `File uploaded (fileId: ${creationData.fileId}), waiting for validation results...`,
    );

    // Their might be some delay between the upload file request finishing and
    // the file being actually available for validation, so we need to wait a bit
    // before sending the validation request
    await sleep(5_000);

    await this.api.validateFileUpload({
      packageId: this.options.packageId,
      lastVersion: previousVersion,
      ...creationData,
    });

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Getting new addon version');

    const updatedAddon = await this.api.getAddonDetails({
      packageId: this.options.packageId,
    });

    if ('detail' in updatedAddon) {
      throw new Error(updatedAddon.detail);
    }

    const newestVersion = updatedAddon.versions[0]?.version;
    if (!newestVersion) {
      throw new Error(
        'Something went wrong while retrieving the newly uploaded version number!',
      );
    }

    // As said above, we need to copy the previous version short summary/description
    // details to the new version
    await this.api.updateAddonVersionDetails({
      packageId: this.options.packageId,
      version: newestVersion,
      details: {
        translations: {
          en: {
            short_description:
              previousVersionDetails.translations.en!.short_description,
          },
        },
      },
    });

    this.setStatus(
      'Submitting new version for review, this may take a while... (~2 minutes)',
    );

    // For some reasons (again), this request takes about 2 min
    // to be processed by Opera's API
    const res = await this.api.submitVersion({
      packageId: this.options.packageId,
      versionNumber: newestVersion,
    });

    if ('detail' in res) {
      throw new Error(res.detail);
    }
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}
