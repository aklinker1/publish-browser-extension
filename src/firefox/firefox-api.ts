import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import jwt from 'jsonwebtoken';
import { fetch } from '../utils/fetch';
import { FormDataEncoder } from 'form-data-encoder';
import { Readable } from 'node:stream';

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
  details(params: { extensionId: string }): Promise<AddonDetails> {
    const endpoint = this.addonDetailEndpoint(params.extensionId);
    return fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-create
   */
  async uploadCreate(params: {
    file: string;
    channel: AddonChannel;
  }): Promise<UploadDetails> {
    const endpoint = this.addonsUploadCreateEndpoint();
    const form = new FormData();

    form.set('channel', params.channel);
    form.set('upload', await fileFromPath(params.file));
    const encoder = new FormDataEncoder(form);

    return await fetch(endpoint.href, {
      method: 'POST',
      body: Readable.from(encoder),
      headers: {
        ...encoder.headers,
        Authorization: this.getAuthHeader(),
      },
    });
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-detail
   */
  uploadDetail(params: { uuid: string }): Promise<UploadDetails> {
    const endpoint = this.addonsUploadDetailsEndpoint(params.uuid);
    return fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
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
      form.append('source', await fileFromPath(params.sourceFile));
    } else {
      form.append('source', '');
    }

    return await fetch(endpoint.href, {
      method: 'POST',
      body: form,
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });
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
