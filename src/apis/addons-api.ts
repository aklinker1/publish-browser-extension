import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import { ofetch } from 'ofetch';
import fs from 'fs';
import path from 'path';
import { addAuthHeader } from '../utils/ofetch';

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
  ofetch = ofetch.create({
    baseURL: 'https://addons.mozilla.org',
    retry: false,
    onRequest: context => {
      addAuthHeader(context, `JWT ${this.createJwt()}`);
    },
  });

  constructor(readonly options: AddonsApiOptions) {}

  private addonVersionCreateEndpoint(extensionId: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/versions/`,
    );
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#detail
   */
  details(params: { extensionId: string }): Promise<AddonDetails> {
    console.log(`Getting addon details...`);
    return this.ofetch(`/api/v5/addons/addon/${params.extensionId}`);
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-create
   */
  uploadCreate(params: {
    file: string;
    channel?: AddonChannel;
  }): Promise<UploadDetails> {
    console.log(`Uploading new ZIP file...`);
    const form = new FormData();
    form.append('channel', params.channel ?? 'unlisted');
    form.append(
      'upload',
      fs.createReadStream(params.file),
      path.basename(params.file),
    );

    return this.ofetch(`/api/v5/addons/upload`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-detail
   */
  uploadDetail(params: { uuid: string }): Promise<UploadDetails> {
    return this.ofetch(`/api/v5/addons/upload/${params.uuid}`);
  }

  async versionCreate(params: {
    extensionId: string;
    uploadUuid: string;
    sourceFile?: string;
  }): Promise<AddonVersion> {
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

    return await this.ofetch(
      `/api/v5/addons/addon/${params.extensionId}/versions`,
      {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      },
    );
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
}
