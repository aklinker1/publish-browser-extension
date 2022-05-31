import { Log } from '../utils/log';
import fetch, { Response } from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { checkStatusCode, responseBody } from '../utils/fetch';

export interface ChromeWebStoreOptions {
  zip: string;
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  publishTarget: 'default' | 'trustedTesters';
}

interface GcpTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class ChromeWebStore {
  readonly name = 'Chrome Web Store';

  constructor(
    readonly options: ChromeWebStoreOptions,
    readonly deps: { log: Log },
  ) {}

  async publish(): Promise<void> {
    const token = await this.getToken();
    await this.uploadZip(token);
    await this.submitForReview(token);
  }

  getToken(): Promise<GcpTokenDetails> {
    console.log('Getting an access token...');
    return fetch(this.tokenEndpoint, {
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
      .then(responseBody<GcpTokenDetails>());
  }

  async uploadZip(token: GcpTokenDetails) {
    console.log('Uploading new ZIP file...');
    const form = new FormData();
    form.append(
      'image',
      fs.createReadStream(this.options.zip),
      path.basename(this.options.zip),
    );
    await fetch(this.uploadEndpoint, {
      method: 'PUT',
      body: form,
      headers: form.getHeaders({
        Authorization: this.getAuthorizationHeader(token),
        'x-goog-api-version': 2,
      }),
    }).then(checkStatusCode);
  }

  async submitForReview(token: GcpTokenDetails) {
    console.log('Submitting for review...');
    await fetch(this.publishEndpoint, {
      headers: {
        Authorization: this.getAuthorizationHeader(token),
        'x-goog-api-version': '2',
        'Content-Length': '0',
      },
    }).then(checkStatusCode);
  }

  private getAuthorizationHeader(token: GcpTokenDetails): string {
    return `${token.token_type} ${token.access_token}`;
  }

  private get tokenEndpoint(): string {
    return 'https://oauth2.googleapis.com/token';
  }
  private get uploadEndpoint(): string {
    return `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${this.options.extensionId}`;
  }
  private get publishEndpoint(): string {
    if (!['default', 'trustedTesters'].includes(this.options.publishTarget))
      throw Error(
        "Chrome's publish target can only be 'default' or 'trustedTesters'",
      );
    return `https://www.googleapis.com/chromewebstore/v1.1/items/${this.options.extensionId}/publish?publishTarget=${this.options.publishTarget}`;
  }
}
