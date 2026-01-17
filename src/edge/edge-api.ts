import fs from 'fs';
import { fetch } from '../utils/fetch';

export type EdgeApiOptions = {
  productId: string;
  clientId: string;
  apiKey: string;
};

export interface EdgeTokenDetails {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface DraftResponse {
  operationId: string;
}

/**
 * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/addons-api-reference#response-1
 */
export interface DraftOperation {
  id: string;
  createdTime: string;
  lastUpdatedTime: string;
  status: 'InProgress' | 'Succeeded' | 'Failed';
  message: string | null;
  errorCode: string | null;
  errors: string[] | null;
}

export class EdgeApi {
  constructor(readonly options: EdgeApiOptions) {}

  /**
   * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#sample-request
   */
  getToken(): Promise<EdgeTokenDetails> {
    return Promise.resolve({
      access_token: this.options.apiKey,
      expires_in: 0,
      token_type: 'ApiKey',
    });
  }

  /**
   * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#uploading-a-package-to-update-an-existing-submission
   */
  async uploadDraft(params: {
    token: EdgeTokenDetails;
    productId: string;
    zipFile: string;
  }): Promise<DraftResponse> {
    const endpoint = `https://api.addons.microsoftedge.microsoft.com/v1/products/${params.productId}/submissions/draft/package`;
    const file = fs.createReadStream(params.zipFile);
    const res = await fetch.raw(endpoint, {
      method: 'POST',
      body: file,
      headers: {
        ...this.getAuthHeaders(params.token),
        'Content-Type': 'application/zip',
      },
    });
    const operationId = res.headers.get('Location');
    if (!operationId)
      throw Error(
        'Edge API did not return an operation ID in the Location header.',
      );
    return { operationId };
  }

  /**
   * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#checking-the-status-of-a-package-upload
   */
  uploadDraftOperation(params: {
    token: EdgeTokenDetails;
    productId: string;
    operationId: string;
  }): Promise<DraftOperation> {
    const endpoint = `https://api.addons.microsoftedge.microsoft.com/v1/products/${params.productId}/submissions/draft/package/operations/${params.operationId}`;
    return fetch(endpoint, {
      headers: this.getAuthHeaders(params.token),
    });
  }

  /**
   * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#publishing-the-submission
   */
  async publish(params: {
    productId: string;
    token: EdgeTokenDetails;
  }): Promise<void> {
    const endpoint = `https://api.addons.microsoftedge.microsoft.com/v1/products/${params.productId}/submissions`;
    const res = await fetch.raw(endpoint, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: this.getAuthHeaders(params.token),
    });
    if (!res.ok) {
      console.log(await res.text());
      throw Error(
        `Edge API returned ${res.status} ${res.statusText} for ${endpoint}.`,
      );
    }
  }

  private getAuthHeaders(token: EdgeTokenDetails): Record<string, string> {
    return {
      Authorization: `${token.token_type} ${token.access_token}`,
      ...(token.token_type === 'ApiKey'
        ? { 'X-ClientID': this.options.clientId }
        : {}),
    };
  }
}
