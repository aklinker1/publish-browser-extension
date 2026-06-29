import { plural } from '../utils/plural';
import type { Store } from './store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { FirefoxApiV5 } from '../apis/firefox-api-v5';
import { createFirefoxJwt } from '../utils/firefox-auth';
import { pollUntil } from '../utils/polling';
import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'node:stream';

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
  private client: HttpClient<FirefoxApiV5.Endpoints>;

  constructor(
    readonly options: FirefoxAddonStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.client = createHttpClient({
      baseUrl: FirefoxApiV5.BASE_URL,
      defaultHeaders: () => ({
        Authorization: `JWT ${createFirefoxJwt(options.jwtIssuer, options.jwtSecret)}`,
      }),
    });
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
    if (this.options.sourcesZip) {
      await ensureZipExists(this.options.sourcesZip);
    }
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting addon details');
    const addon = await this.client.get('/addons/addon/{idOrSlugOrGuid}', {
      params: { idOrSlugOrGuid: this.extensionId },
    });

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new ZIP file');
    const uploadBody = this.createForm({
      channel: this.options.channel,
      upload: await fileFromPath(this.options.zip),
    });
    const { uuid: uploadUuid } = await this.client.post('/addons/upload', {
      body: uploadBody.body,
      headers: uploadBody.encoder.headers,
    });

    this.setStatus('Waiting for validation results');
    const upload = await pollUntil<FirefoxApiV5.UploadDetails>(async () => {
      const polledUpload = await this.client.get('/addons/upload/{uuid}', {
        params: { uuid: uploadUuid },
      });
      if (!polledUpload.processed) return;

      this.setStatus(
        `Validation results: ${this.buildValidationSummary(polledUpload)}`,
      );
      return polledUpload;
    });

    this.setStatus('Submitting new version');
    const versionBody = this.createForm({
      upload: upload.uuid,
      source: this.options.sourcesZip
        ? await fileFromPath(this.options.sourcesZip)
        : '',
    });
    const version = await this.client.post(
      '/addons/addon/{idOrSlugOrGuid}/versions',
      {
        params: { idOrSlugOrGuid: this.extensionId },
        body: versionBody.body,
        headers: versionBody.encoder.headers,
      },
    );

    const validationUrl = `https://addons.mozilla.org/en-US/developers/addon/${addon.id}/file/${version.file.id}/validation`;
    if (!upload.valid) {
      throw Error(
        `Extension is invalid (${this.buildValidationSummary(upload)}): ${validationUrl}`,
      );
    }

    console.log('Firefox validation results: ' + validationUrl);
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

  private createForm(value: Record<string, unknown>): {
    body: Readable;
    encoder: FormDataEncoder;
  } {
    const form = new FormData();
    for (const [key, val] of Object.entries(value)) {
      if (val != null) form.set(key, val);
    }
    const encoder = new FormDataEncoder(form);
    return { body: Readable.from(encoder), encoder };
  }

  private buildValidationSummary(upload: FirefoxApiV5.UploadDetails): string {
    return [
      plural(upload.validation.errors, 'error'),
      plural(upload.validation.warnings, 'warning'),
      plural(upload.validation.notices, 'notice'),
    ].join(', ');
  }
}
