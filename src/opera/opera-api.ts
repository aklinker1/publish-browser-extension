import { fetch } from '../utils/fetch';
import { FormData } from 'formdata-node';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { Blob } from 'node:buffer';
import type {
  OperaAddonApiError,
  OperaAddonDetails,
  OperaAddonFileValidationResponse,
  OperaAddonVersionDetails,
} from './opera-types';
import type { DeepPartial } from '../utils/types';

// API guessed from : https://addons-static.operacdn.com/static/CACHE/js/catalog.6c1172c19572.js
// And by looking at the HTTP requests while using the website

export interface OperaAddonsApiOptions {
  sessionId: string;
}

export class OperaAddonsApi {
  private readonly operaApiUrl = 'https://addons.opera.com/api';
  private readonly csrfToken: string;
  private readonly sessionId: string;

  constructor(options: OperaAddonsApiOptions) {
    this.sessionId = options.sessionId;
    this.csrfToken = this.generateCSRFToken();
  }

  private uploadFileEndpoint = () =>
    `${this.operaApiUrl}/file-upload/` as const;

  private uploadValidateEndpoint = (packageId: number) =>
    `${this.operaApiUrl}/developer/package-versions/?package_id=${packageId}` as const;

  private addonDetailsEndpoint = (packageId: number) =>
    `${this.operaApiUrl}/developer/packages/${packageId}/` as const;

  // Trailing slash is required - Opera's backend (Django) has APPEND_SLASH=True, so a request
  // without it gets 301-redirected, and fetch will follow the redirect as a GET, causing a 405.
  private submitVersionEndpoint = (packageId: number, version: string) =>
    `${this.operaApiUrl}/developer/package-versions/${packageId}-${version}/submit_for_moderation/` as const;

  private addonVersionDetailsEndpoint = (packageId: number, version: string) =>
    `${this.operaApiUrl}/developer/package-versions/${packageId}-${version}/` as const;

  /**
   * Get the detailed information about an Opera Addon
   */
  public async getAddonDetails(params: {
    packageId: number;
  }): Promise<OperaAddonDetails | OperaAddonApiError> {
    const endpoint = this.addonDetailsEndpoint(params.packageId);

    return await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json; version=1.0',
        cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId};`,
      },
    });
  }

  public async getAddonVersionDetails(params: {
    packageId: number;
    version: string;
  }): Promise<OperaAddonVersionDetails | OperaAddonApiError> {
    const endpoint = this.addonVersionDetailsEndpoint(
      params.packageId,
      params.version,
    );

    return await fetch(endpoint, {
      method: 'GET',
      headers: {
        accept: 'application/json; version=1.0',
        cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId};`,
      },
    });
  }

  public async updateAddonVersionDetails(params: {
    packageId: number;
    version: string;
    details: DeepPartial<OperaAddonVersionDetails>;
  }): Promise<OperaAddonVersionDetails | OperaAddonApiError> {
    const endpoint = this.addonVersionDetailsEndpoint(
      params.packageId,
      params.version,
    );

    return await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        accept: 'application/json; version=1.0',
        'x-csrftoken': this.csrfToken,
        cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId}; csrftoken=${this.csrfToken};`,
        Referer: `https://addons.opera.com/developer/package/${params.packageId}/version/${params.version}`,
      },
      body: params.details,
    });
  }

  /**
   * Upload a new package version for an Opera Addon
   */
  public async uploadFile(params: { packageId: number; file: string }) {
    const endpoint = this.uploadFileEndpoint();
    const fileInfo = await this.fileInfo(params.file);

    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(fileInfo.size / chunkSize);

    const identifier = this.generateFileIdentifier(
      fileInfo.size,
      fileInfo.name,
    );

    const stream = fs.createReadStream(params.file, {
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

      const res = await fetch.raw(endpoint, {
        method: 'POST',
        headers: {
          ...encoder.headers,
          'x-csrftoken': this.csrfToken,
          Referer: `https://addons.opera.com/developer/package/${params.packageId}/`,
          cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId}; csrftoken=${this.csrfToken};`,
        },
        body: Readable.from(encoder),
      });

      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Chunk ${chunkNumber} upload failed (${res.status})`);
      }

      chunkNumber++;
    }

    return {
      fileId: identifier,
      fileName: fileInfo.name,
    } as const;
  }

  /**
   * Bind an uploaded file to an addon package
   */
  public async validateFileUpload(params: {
    packageId: number;
    fileId: `${number}-${string}`;
    fileName: string;
    lastVersion: string;
  }): Promise<OperaAddonFileValidationResponse | OperaAddonApiError> {
    const endpoint = this.uploadValidateEndpoint(params.packageId);

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-csrftoken': this.csrfToken,
        Referer: `https://addons.opera.com/developer/package/${params.packageId}/`,
        accept: 'application/json; version=1.0',
        cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId}; csrftoken=${this.csrfToken};`,
      },
      body: {
        file_id: params.fileId,
        file_name: params.fileName,
        metadata_from: params.lastVersion,
      },
      // There might be some delay between the upload file request finishing and
      // the file being actually available for validation, so the request might
      // fail. To work around this, we retry a few times with some delay.
      retry: 10,
      retryDelay: 5_000,
      retryStatusCodes: [400, 500, 502, 503, 504],
      // empty method to avoid spamming the console with HTML error responses
      // from the server while retrying
      onResponseError: async () => {},
    });
  }

  /**
   * Submit given version for moderation review
   */
  public async submitVersion(params: {
    packageId: number;
    versionNumber: string;
  }): Promise<OperaAddonVersionDetails | OperaAddonApiError> {
    const endpoint = this.submitVersionEndpoint(
      params.packageId,
      params.versionNumber,
    );

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json; version=1.0',
        'x-csrftoken': this.csrfToken,
        Referer: `https://addons.opera.com/developer/package/${params.packageId}/version/${params.versionNumber}?language=en`,
        cookie: `INGRESSCOOKIE_API; sessionid=${this.sessionId}; csrftoken=${this.csrfToken};`,
      },
      body: undefined, // No body required
    });
  }

  // Opera uses the standard Django CSRF token, which is a 32-character-long random string.
  // In the context of this API, we can just use a fixed string since it doesn't need to be valid.
  // See : https://docs.djangoproject.com/en/4.2/ref/csrf/#ajax for more details about how Django CSRF tokens work.
  private generateCSRFToken = () => '12345678901234567890123456789012';

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
