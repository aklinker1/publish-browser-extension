import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { checkStatusCode, responseBody } from '../utils/fetch';
import fs from 'fs';
import path from 'path';

export interface AddonsApiOptions {
  jwtIssuer: string;
  jwtSecret: string;
}

export interface AddonPagination<T> {
  page_size: number;
  page_count: number;
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface AddonVersion {
  id: number;
}

export interface AddonAuthor {
  user_id: number;
  name: string;
  email: string;
  role: string;
  listed: boolean;
  position: number;
}

export interface UploadDetails {
  uuid: string;
  channel: AddonChannel;
  processed: boolean;
  submitted: boolean;
  url: string;
  valid: boolean;
  validation: unknown;
  version: string;
}

export type AddonChannel = 'listed' | 'unlisted';

export class AddonsApi {
  constructor(readonly options: AddonsApiOptions) {}

  private addonsUploadCreateEndpoint() {
    return new URL(`https://addons.mozilla.org/api/v5/addons/upload/`);
  }

  private addonsUploadDetailsEndpoint(uploadUuid: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/upload/${uploadUuid}`,
    );
  }

  private addonVersionCreateEndpoint(extensionId: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/versions/`,
    );
  }

  private addonAuthorsEndpoint(extensionId: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/authors/`,
    );
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-create
   */
  async uploadCreate(params: {
    file: string;
    channel?: AddonChannel;
  }): Promise<UploadDetails> {
    console.log(`Uploading for validation: ${params.file}`);
    const endpoint = this.addonsUploadCreateEndpoint();
    const form = new FormData();
    form.append('channel', params.channel ?? 'unlisted');
    form.append(
      'upload',
      fs.createReadStream(params.file),
      path.basename(params.file),
    );

    const res = await fetch(endpoint.href, {
      method: 'POST',
      body: form,
      headers: form.getHeaders({
        Authorization: this.getAuthHeader(),
      }),
    });
    await checkStatusCode(res);
    return await res.json();
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-detail
   */
  async uploadDetail(params: { uuid: string }): Promise<UploadDetails> {
    console.log(`Getting upload details uuid=${params.uuid}...`);
    const endpoint = this.addonsUploadDetailsEndpoint(params.uuid);

    const res = await fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
    await checkStatusCode(res);
    return await res.json();
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/authors.html#author-list
   */
  async listAuthors(params: { extensionId: string }): Promise<AddonAuthor[]> {
    console.log('Listing extension authors...');
    const endpoint = this.addonAuthorsEndpoint(params.extensionId);

    return fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-type': 'application/json',
      },
    })
      .then(checkStatusCode)
      .then(responseBody<AddonAuthor[]>())
      .then(body => body);
  }

  async versionCreate(params: {
    extensionId: string;
    uploadUuid: string;
    sourceFile?: string;
  }): Promise<void> {
    const endpoint = this.addonVersionCreateEndpoint(params.extensionId);
    const form = new FormData();
    form.append('upload', params.uploadUuid);
    if (params.sourceFile) {
      form.append(
        'source',
        fs.createReadStream(params.sourceFile),
        path.basename(params.sourceFile),
      );
    } else {
      form.append('source', '');
    }

    const res = await fetch(endpoint.href, {
      method: 'POST',
      body: form,
      headers: form.getHeaders({
        Authorization: this.getAuthHeader(),
      }),
    });
    await checkStatusCode(res);
    return await res.json();
  }

  /**
   * See https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
   */
  private createJwt(timeoutInS = 30): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.options.jwtIssuer,
      jti: Math.random().toString(),
      iat: issuedAt,
      exp: issuedAt + timeoutInS,
    };
    const secret = this.options.jwtSecret ?? '';
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
  }

  private getAuthHeader(): string {
    return `JWT ${this.createJwt()}`;
  }
}
