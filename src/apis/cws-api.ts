import { ofetch } from 'ofetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { addAuthHeader } from '../utils/ofetch';

export interface CwsApiOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface CwsTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class CwsApi {
  token: CwsTokenDetails | undefined;
  cwsOfetch = ofetch.create({
    baseURL: 'https://www.googleapis.com',
    onRequest: async context => {
      this.token ??= await this.getToken();
      addAuthHeader(context, this.getAuthHeader(this.token));
    },
  });
  oauthOfetch = ofetch.create({
    baseURL: 'https://oauth2.googleapis.com',
  });

  constructor(readonly options: CwsApiOptions) {}

  uploadZip(params: {
    extensionId: string;
    zipFile: string;
    token: CwsTokenDetails;
  }): Promise<unknown> {
    console.log('Uploading new ZIP file...');
    const form = new FormData();
    form.append(
      'image',
      fs.createReadStream(params.zipFile),
      path.basename(params.zipFile),
    );

    return this.cwsOfetch(
      `/upload/chromewebstore/v1.1/items/${params.extensionId}`,
      {
        method: 'PUT',
        body: form,
        headers: {
          'x-goog-api-version': '2',
        },
      },
    );
  }

  submitForReview(params: {
    extensionId: string;
    publishTarget?: 'default' | 'trustedTesters';
    token: CwsTokenDetails;
  }): Promise<unknown> {
    console.log('Submitting for review...');
    return this.cwsOfetch(
      `/chromewebstore/v1.1/items/${params.extensionId}/publish`,
      {
        method: 'POST',
        query: {
          publishTarget: params.publishTarget,
        },
        headers: {
          'x-goog-api-version': '2',
          'Content-Length': '0',
        },
      },
    );
  }

  getToken(): Promise<CwsTokenDetails> {
    console.log('Getting an access token...');
    return this.oauthOfetch(`/token`, {
      method: 'POST',
      body: {
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: 'refresh_token',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
      },
    });
  }

  private getAuthHeader(token: CwsTokenDetails) {
    return `${token.token_type} ${token.access_token}`;
  }
}
