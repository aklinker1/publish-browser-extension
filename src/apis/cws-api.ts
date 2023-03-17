import { checkStatusCode, responseBody } from '../utils/fetch';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface CwsApiOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface CwsTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class CwsApi {
  constructor(readonly options: CwsApiOptions) {}

  private tokenEndpoint() {
    return new URL('https://oauth2.googleapis.com/token');
  }

  private uploadEndpoint(extensionId: string) {
    return new URL(
      `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    );
  }

  private publishEndpoint(extensionId: string) {
    return new URL(
      `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`,
    );
  }

  async uploadZip(params: {
    extensionId: string;
    zipFile: string;
    token: CwsTokenDetails;
  }) {
    const Authorization = await this.getAuthHeader(params.token);

    console.log('Uploading new ZIP file...');
    const endpoint = this.uploadEndpoint(params.extensionId);
    const form = new FormData();
    form.append(
      'image',
      fs.createReadStream(params.zipFile),
      path.basename(params.zipFile),
    );
    await fetch(endpoint.href, {
      method: 'PUT',
      body: form,
      headers: form.getHeaders({
        Authorization,
        'x-goog-api-version': 2,
      }),
    }).then(checkStatusCode);
  }

  async submitForReview(params: {
    extensionId: string;
    publishTarget?: 'default' | 'trustedTesters';
    token: CwsTokenDetails;
  }) {
    const Authorization = await this.getAuthHeader(params.token);

    console.log('Submitting for review...');
    const endpoint = this.publishEndpoint(params.extensionId);
    if (params.publishTarget)
      endpoint.searchParams.append('publishTarget', params.publishTarget);

    await fetch(endpoint.href, {
      method: 'POST',
      headers: {
        Authorization,
        'x-goog-api-version': '2',
        'Content-Length': '0',
      },
    }).then(checkStatusCode);
  }

  getToken(): Promise<CwsTokenDetails> {
    console.log('Getting an access token...');
    const endpoint = this.tokenEndpoint();

    return fetch(endpoint.href, {
      method: 'POST',
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      }),
    })
      .then(checkStatusCode)
      .then(responseBody<CwsTokenDetails>());
  }

  private async getAuthHeader(token: CwsTokenDetails) {
    return `${token.token_type} ${token.access_token}`;
  }
}
