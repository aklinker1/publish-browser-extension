import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { checkStatusCode, responseBody } from '../utils/fetch';
import fs from 'fs';
import path from 'path';

export interface AddonsApiOptions {
  issuer: string;
  secret: string;
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

export class AddonsApi {
  constructor(readonly options: AddonsApiOptions) {}

  private addonVersionsEndpoint(extensionId: string) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/versions/`,
    );
  }

  private addonVersionEndpoint(extensionId: string, versionId: number) {
    return new URL(
      `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}/versions/${versionId}/`,
    );
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#versions-list
   */
  async listVersions(params: {
    extensionId: string;
    filter?: 'all_without_unlisted' | 'all_with_unlisted' | 'all_with_deleted';
    page?: number;
    pageSize?: number;
  }): Promise<AddonVersion[]> {
    console.log('Listing extension versions...');
    const endpoint = this.addonVersionsEndpoint(params.extensionId);
    if (params.filter) endpoint.searchParams.set('filter', params.filter);
    if (params.page != null)
      endpoint.searchParams.set('page', String(params.page));
    if (params.pageSize != null)
      endpoint.searchParams.set('page_size', String(params.pageSize));

    return fetch(endpoint.href, {
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-type': 'application/json',
      },
    })
      .then(checkStatusCode)
      .then(responseBody<AddonPagination<AddonVersion>>())
      .then(body => body.results);
  }

  /**
   * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#version-sources
   */
  async uploadSource(params: {
    extensionId: string;
    versionId: number;
    sourceFile: string;
  }): Promise<void> {
    console.log(`Uploading sources for versionId=${params.versionId}...`);
    const endpoint = this.addonVersionEndpoint(
      params.extensionId,
      params.versionId,
    );
    const form = new FormData();
    form.append(
      'source',
      fs.createReadStream(params.sourceFile),
      path.basename(params.sourceFile),
    );

    await fetch(endpoint.href, {
      method: 'PATCH',
      body: form,
      headers: form.getHeaders({
        Authorization: this.getAuthHeader(),
      }),
    }).then(checkStatusCode);
  }

  /**
   * See https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
   */
  private createJwt(timeoutInS = 30): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.options.issuer,
      jti: Math.random().toString(),
      iat: issuedAt,
      exp: issuedAt + timeoutInS,
    };
    const secret = this.options.secret ?? '';
    return jwt.sign(payload, secret, { algorithm: 'HS256' });
  }

  private getAuthHeader(): string {
    return `JWT ${this.createJwt()}`;
  }
}
