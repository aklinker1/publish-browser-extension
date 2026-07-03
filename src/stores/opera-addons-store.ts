import type { Store } from './store';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { OperaApi } from '../apis/opera-api';
import { pollUntil } from '../utils/polling';
import { FormData } from 'formdata-node';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'node:stream';
import { Blob } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import type { OperaAddonsStoreOptions } from '../config';

export class OperaAddonsStore implements Store {
  private client: HttpClient<OperaApi.Endpoints>;

  // Opera uses the standard Django CSRF token, which is a 32-character-long
  // random string. In the context of this API, we can just use a fixed string
  // since it doesn't need to be valid.
  // See : https://docs.djangoproject.com/en/4.2/ref/csrf/#ajax for more details
  // about how Django CSRF tokens work.
  private readonly csrfToken = '12345678901234567890123456789012';

  constructor(
    readonly options: OperaAddonsStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.client = createHttpClient<OperaApi.Endpoints>({
      baseUrl: OperaApi.BASE_URL,
      defaultHeaders: () => ({
        accept: 'application/json; version=1.0',
        'x-csrftoken': this.csrfToken,
        cookie: `INGRESSCOOKIE_API; sessionid=${this.options.sessionId}; csrftoken=${this.csrfToken};`,
      }),
    });
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting addon details');

    const addon = await this.client.get(
      '/api/developer/packages/{packageId}/',
      { params: { packageId: this.options.packageId } },
    );

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
    // "short summary" field. So we need to copy that part ourselves by
    // reusing the previous version's details
    const previousVersionDetails = await this.client.get(
      '/api/developer/package-versions/{packageId}-{version}/',
      {
        params: {
          packageId: this.options.packageId,
          version: previousVersion,
        },
      },
    );

    if ('detail' in previousVersionDetails) {
      throw new Error(previousVersionDetails.detail);
    }

    if (!previousVersionDetails.translations.en?.short_description) {
      throw new Error(
        'The previous version is missing the English short description, ' +
          'which is required to be copied to the new version. ' +
          'Please add it in Opera Developer Dashboard and try again.',
      );
    }

    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new version from zip');

    const creationData = await this.uploadZip();

    this.setStatus(
      `File uploaded (fileId: ${creationData.fileId}), waiting for validation results...`,
    );

    const validationResult = await this.validateFileUpload({
      lastVersion: previousVersion,
      ...creationData,
    });

    if ('detail' in validationResult) {
      throw new Error(validationResult.detail);
    }

    this.setStatus('Updating new addon version details');

    // As said above, we need to copy the previous version short summary/description
    // details to the new version
    const updatedDetails = await this.client.fetch(
      'PATCH',
      '/api/developer/package-versions/{packageId}-{version}/',
      {
        params: {
          packageId: this.options.packageId,
          version: validationResult.version,
        },
        headers: {
          Referer: `https://addons.opera.com/developer/package/${this.options.packageId}/version/${validationResult.version}`,
        },
        body: {
          translations: {
            en: {
              short_description:
                previousVersionDetails.translations.en!.short_description,
            },
          },
        },
      },
    );

    if ('detail' in updatedDetails) {
      throw new Error(updatedDetails.detail);
    }

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus(
      'Submitting new version for review, this may take a while... (~2 minutes)',
    );

    // For some reasons (again), this request takes about 2 min
    // to be processed by Opera's API
    const res = await this.client.post(
      '/api/developer/package-versions/{packageId}-{version}/submit_for_moderation/',
      {
        params: {
          packageId: this.options.packageId,
          version: validationResult.version,
        },
        headers: {
          Referer: `https://addons.opera.com/developer/package/${this.options.packageId}/version/${validationResult.version}?language=en`,
        },
      },
    );

    if ('detail' in res) {
      throw new Error(res.detail);
    }
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  /**
   * Upload the extension zip to Opera in chunks, returning the identifier used
   * to bind the uploaded file to the addon package.
   */
  private async uploadZip(): Promise<OperaApi.FileUploadResponse> {
    const fileInfo = await this.fileInfo(this.options.zip);

    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(fileInfo.size / chunkSize);

    const identifier = this.generateFileIdentifier(
      fileInfo.size,
      fileInfo.name,
    );

    const stream = fs.createReadStream(this.options.zip, {
      highWaterMark: chunkSize,
    });

    let chunkNumber = 1;

    for await (const chunk of stream) {
      const form = new FormData();

      form.append('file', new Blob([chunk]), fileInfo.name);

      form.append('flowChunkNumber', String(chunkNumber));
      form.append('flowChunkSize', String(chunkSize));
      form.append('flowCurrentChunkSize', String(chunk.length));
      form.append('flowTotalSize', String(fileInfo.size));
      form.append('flowIdentifier', identifier);
      form.append('flowFilename', fileInfo.name);
      form.append('flowRelativePath', fileInfo.name);
      form.append('flowTotalChunks', String(totalChunks));

      const encoder = new FormDataEncoder(form);

      await this.client.post('/api/file-upload/', {
        headers: {
          ...encoder.headers,
          Referer: `https://addons.opera.com/developer/package/${this.options.packageId}/`,
        },
        body: Readable.from(encoder),
        // The chunk upload responses aren't JSON, so skip parsing the body -
        // the http client still throws on non-2xx responses.
        mapResponse: async () => {},
      });

      chunkNumber++;
    }

    return {
      fileId: identifier,
      fileName: fileInfo.name,
    };
  }

  /**
   * Bind an uploaded file to an addon package and wait for validation.
   */
  private async validateFileUpload(params: {
    fileId: `${number}-${string}`;
    fileName: string;
    lastVersion: string;
  }) {
    let lastError: unknown;

    // There might be some delay between the upload file request finishing and
    // the file being actually available for validation, so the request might
    // fail. To work around this, we retry a few times with some delay.
    return await pollUntil(
      async () => {
        try {
          return await this.client.post('/api/developer/package-versions/', {
            query: { package_id: this.options.packageId },
            headers: {
              Referer: `https://addons.opera.com/developer/package/${this.options.packageId}/`,
            },
            body: {
              file_id: params.fileId,
              file_name: params.fileName,
              metadata_from: params.lastVersion,
            },
          });
        } catch (err) {
          lastError = err;
          return undefined;
        }
      },
      { interval: 5_000, timeout: 60_000 },
    ).catch(() => {
      throw lastError ?? new Error('Failed to validate the uploaded file');
    });
  }

  private generateFileIdentifier = (
    size: number,
    name: string,
  ): `${number}-${string}` => `${size}-${name.replace(/[^0-9a-zA-Z_-]/g, '')}`;

  private async fileInfo(filepath: string) {
    const stat = await fs.promises.stat(filepath);
    return {
      path: filepath,
      name: path.basename(filepath),
      size: stat.size,
    };
  }
}
