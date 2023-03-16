import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { checkStatusCode } from '../utils/fetch';
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

export interface AddonDetails {
  id: string;
}

export interface AddonVersion {
  id: number;
}

export interface UploadDetails {
  uuid: string;
  channel: AddonChannel;
  processed: boolean;
  submitted: boolean;
  url: string;
  valid: boolean;
  validation: {
    errors: number;
    warnings: number;
    notices: number;
  };
  version: string;
}

export interface AddonVersion {
  id: number;
  file: {
    id: number;
  };
}

export type AddonChannel = 'listed' | 'unlisted';

export class AddonsApi {
  constructor(readonly options: AddonsApiOptions) {}

  private addonDetailEndpoint(extensionId: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}`,
    );
  }

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

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#detail
   */
  async details(params: { extensionId: string }): Promise<AddonDetails> {
    console.log(`Getting addon details...`);
    const endpoint = this.addonDetailEndpoint(params.extensionId);
    const res = await fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
    await checkStatusCode(res);
    return await res.json();
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-create
   */
  async uploadCreate(params: {
    file: string;
    channel?: AddonChannel;
  }): Promise<UploadDetails> {
    console.log(`Uploading new ZIP file...`);
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
    const endpoint = this.addonsUploadDetailsEndpoint(params.uuid);
    const res = await fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
    await checkStatusCode(res);
    return await res.json();
  }

  async versionCreate(params: {
    extensionId: string;
    uploadUuid: string;
    sourceFile?: string;
  }): Promise<AddonVersion> {
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
