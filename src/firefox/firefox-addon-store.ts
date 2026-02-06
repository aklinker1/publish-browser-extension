import { AddonsApi, type UploadDetails } from './firefox-api';
import { sleep } from '../utils/sleep';
import { withTimeout } from '../utils/withTimeout';
import { plural } from '../utils/plural';
import type { Store } from '../utils/store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';

export const FirefoxAddonStoreOptions = z.object({
  zip: z.string().min(1),
  sourcesZip: z.string().min(1).optional(),
  extensionId: z.string().min(1).trim(),
  jwtIssuer: z.string().min(1).trim(),
  jwtSecret: z.string().min(1).trim(),
  channel: z.enum(['listed', 'unlisted']).default('listed'),
});
export type FirefoxAddonStoreOptions = z.infer<typeof FirefoxAddonStoreOptions>;

export class FirefoxAddonStore implements Store {
  private api: AddonsApi;

  constructor(
    readonly options: FirefoxAddonStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.api = new AddonsApi(options);
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
    if (this.options.sourcesZip) {
      await ensureZipExists(this.options.sourcesZip);
    }
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting addon details');
    const addon = await this.api.details({
      extensionId: this.extensionId,
    });
    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    // Firefox recommends 5-10s polling and a 10 minute timeout
    const pollInterval = 5e3; // 5 seconds
    const timeout = 10 * 60e3; // 10 minutes
    const uploadPromise = this.uploadAndPollValidation(pollInterval);
    const upload = await withTimeout(uploadPromise, timeout);

    this.setStatus('Submitting new version');
    const version = await this.api.versionCreate({
      extensionId: this.extensionId,
      sourceFile: this.options.sourcesZip,
      uploadUuid: upload.uuid,
    });

    const validationUrl = `https://addons.mozilla.org/en-US/developers/addon/${addon.id}/file/${version.file.id}/validation`;
    const { errors, notices, warnings } = upload.validation;
    this.setStatus(
      `Validation results: ${plural(errors, 'error')}, ${plural(
        warnings,
        'warning',
      )}, ${plural(notices, 'notice')}`,
    );
    if (!upload.valid) throw Error(`Extension is invalid: ${validationUrl}`);
    else console.log('Firefox validation results: ' + validationUrl);
  }

  private async uploadAndPollValidation(
    pollIntervalMs: number,
  ): Promise<UploadDetails> {
    this.setStatus('Uploading new ZIP file');
    let details = await this.api.uploadCreate({
      file: this.options.zip,
      channel: this.options.channel,
    });

    this.setStatus('Waiting for validation results');
    while (!details.processed) {
      await sleep(pollIntervalMs);
      details = await this.api.uploadDetail(details);
    }

    return details;
  }

  /**
   * Ensure the extension id is not wrapped in curly braces, since that's what
   * the addon store API is expecting.
   *
   * @example
   * "{test}" -> "test"
   * "test" -> "test"
   * "test@123" -> "test@123"
   */
  private get extensionId(): string {
    let id = this.options.extensionId;
    if (id.startsWith('{')) id = id.slice(1);
    if (id.endsWith('}')) id = id.slice(0, -1);
    return id;
  }
}
