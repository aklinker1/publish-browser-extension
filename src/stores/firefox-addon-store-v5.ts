import { plural } from '../utils/plural';
import type { Store } from './store';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import * as FirefoxApiV5 from '../apis/firefox-api-v5';
import { createFirefoxJwt } from '../utils/firefox-auth';
import { pollUntil } from '../utils/polling';
import type { FirefoxAddonStoreV5Options } from '../config';
import { readFile } from 'node:fs/promises';
import { openAsBlob } from 'node:fs';

export class FirefoxAddonStoreV5 implements Store {
  private client: HttpClient<FirefoxApiV5.Endpoints>;

  constructor(
    readonly options: FirefoxAddonStoreV5Options,
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
    const metadata = this.options.amoMetadataFile
      ? await this.readMetadata(this.options.amoMetadataFile)
      : undefined;

    this.setStatus('Getting addon details');
    const addon = await this.client.get(
      '/api/v5/addons/addon/{idOrSlugOrGuid}',
      { params: { idOrSlugOrGuid: this.extensionId } },
    );

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new ZIP file');
    const uploadBody = new FormData();
    uploadBody.set('channel', this.options.channel);
    uploadBody.set('upload', await openAsBlob(this.options.zip));
    const { uuid: uploadUuid } = await this.client.post(
      '/api/v5/addons/upload/',
      {
        body: uploadBody,
      },
    );

    this.setStatus('Waiting for validation results');
    const upload = await pollUntil<FirefoxApiV5.UploadDetails>(async () => {
      const polledUpload = await this.client.get(
        '/api/v5/addons/upload/{uuid}',
        { params: { uuid: uploadUuid } },
      );
      if (!polledUpload.processed) return;

      this.setStatus(
        `Validation results: ${this.buildValidationSummary(polledUpload)}`,
      );
      return polledUpload;
    });

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting new version');
    let version: FirefoxApiV5.AddonVersion;
    if (metadata) {
      const { version: versionMetadata = {}, ...addonMetadata } = metadata;
      if (Object.keys(addonMetadata).length > 0) {
        await this.client.fetch(
          'PATCH',
          '/api/v5/addons/addon/{idOrSlugOrGuid}',
          {
            params: { idOrSlugOrGuid: this.extensionId },
            body: addonMetadata,
          },
        );
      }

      version = await this.client.post(
        '/api/v5/addons/addon/{idOrSlugOrGuid}/versions/',
        {
          params: { idOrSlugOrGuid: this.extensionId },
          body: {
            upload: upload.uuid,
            ...versionMetadata,
          },
        },
      );

      if (this.options.sourcesZip) {
        const sourceBody = new FormData();
        sourceBody.set('source', await openAsBlob(this.options.sourcesZip));
        await this.client.fetch(
          'PATCH',
          '/api/v5/addons/addon/{idOrSlugOrGuid}/versions/{versionId}/',
          {
            params: {
              idOrSlugOrGuid: this.extensionId,
              versionId: version.id,
            },
            body: sourceBody,
          },
        );
      }
    } else {
      const versionBody = new FormData();
      versionBody.set('upload', upload.uuid);
      versionBody.set(
        'source',
        this.options.sourcesZip
          ? await openAsBlob(this.options.sourcesZip)
          : '',
      );
      version = await this.client.post(
        '/api/v5/addons/addon/{idOrSlugOrGuid}/versions/',
        {
          params: { idOrSlugOrGuid: this.extensionId },
          body: versionBody,
        },
      );
    }

    const validationUrl = `https://addons.mozilla.org/en-US/developers/addon/${addon.id}/file/${version.file.id}/validation`;
    if (!upload.valid) {
      throw Error(
        `Extension is invalid (${this.buildValidationSummary(upload)}): ${validationUrl}`,
      );
    }

    console.log('Firefox validation results: ' + validationUrl);

    if (this.options.compatibility?.length) {
      this.setStatus('Updating version compatibility');
      await this.client.fetch(
        'PATCH',
        `/api/v5/addons/addon/{idOrSlugOrGuid}/versions/{versionId}/`,
        {
          params: { idOrSlugOrGuid: this.extensionId, versionId: version.id },
          body: {
            compatibility: this.options.compatibility,
          },
        },
      );
    }
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

  private buildValidationSummary(upload: FirefoxApiV5.UploadDetails): string {
    return [
      plural(upload.validation.errors, 'error'),
      plural(upload.validation.warnings, 'warning'),
      plural(upload.validation.notices, 'notice'),
    ].join(', ');
  }

  private async readMetadata(
    path: string,
  ): Promise<Record<string, unknown> & { version?: Record<string, unknown> }> {
    const metadata = JSON.parse(await readFile(path, 'utf8'));
    if (
      metadata == null ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata)
    ) {
      throw Error('Firefox AMO metadata must be a JSON object');
    }
    if (
      metadata.version != null &&
      (typeof metadata.version !== 'object' || Array.isArray(metadata.version))
    ) {
      throw Error('Firefox AMO version metadata must be a JSON object');
    }
    return metadata;
  }
}
