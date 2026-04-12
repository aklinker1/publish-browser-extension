import { createReadStream } from 'node:fs';
import { fetch } from '../utils/fetch';

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

interface CwsItemResponse {
  kind: string;
  id: string;
  uploadState: string;
  itemError?: Array<{
    error_code: string;
    error_detail: string;
  }>;
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

    const endpoint = this.uploadEndpoint(params.extensionId);
    const file = createReadStream(params.zipFile);
    const res: CwsItemResponse = await fetch(endpoint.href, {
      method: 'PUT',
      body: file,
      headers: {
        Authorization,
        'x-goog-api-version': '2',
      },
    });
    if (res.uploadState === 'FAILURE') {
      const errors = res.itemError
        ?.map(e => `${e.error_code}: ${e.error_detail}`)
        .join('\n');
      throw new Error(`Chrome Web Store upload failed:\n${errors}`);
    }
  }

  async submitForReview(params: {
    extensionId: string;
    publishTarget: 'default' | 'trustedTesters';
    token: CwsTokenDetails;
    deployPercentage?: number;
    reviewExemption?: boolean;
  }) {
    const Authorization = await this.getAuthHeader(params.token);

    const endpoint = this.publishEndpoint(params.extensionId);
    if (params.publishTarget)
      endpoint.searchParams.append('publishTarget', params.publishTarget);
    if (params.deployPercentage != null)
      endpoint.searchParams.set(
        'deployPercentage',
        String(params.deployPercentage),
      );
    if (params.reviewExemption != null)
      endpoint.searchParams.set(
        'reviewExemption',
        String(params.reviewExemption),
      );

    const res: CwsItemResponse = await fetch(endpoint.href, {
      method: 'POST',
      headers: {
        Authorization,
        'x-goog-api-version': '2',
        'Content-Length': '0',
      },
    });
    if (res.uploadState === 'FAILURE') {
      const errors = res.itemError
        ?.map(e => `${e.error_code}: ${e.error_detail}`)
        .join('\n');
      throw new Error(`Chrome Web Store publish failed:\n${errors}`);
    }
  }

  getToken(): Promise<CwsTokenDetails> {
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
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getAuthHeader(token: CwsTokenDetails) {
    return `${token.token_type} ${token.access_token}`;
  }
}
