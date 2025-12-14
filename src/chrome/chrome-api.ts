import { fetch } from '../utils/fetch';

export interface CwsApiOptions {
  publisherId: string;
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

// Response types from Chrome Web Store API v2
export type UploadState =
  | 'UPLOAD_STATE_UNSPECIFIED'
  | 'SUCCEEDED'
  | 'IN_PROGRESS'
  | 'FAILED'
  | 'NOT_FOUND';

export type ItemState =
  | 'ITEM_STATE_UNSPECIFIED'
  | 'PENDING_REVIEW'
  | 'STAGED'
  | 'PUBLISHED'
  | 'PUBLISHED_TO_TESTERS'
  | 'REJECTED'
  | 'CANCELLED';

export interface UploadItemPackageResponse {
  name: string;
  itemId: string;
  crxVersion?: string;
  uploadState: UploadState;
}

export interface PublishItemResponse {
  name: string;
  itemId: string;
  state: ItemState;
}

export interface DistributionChannel {
  deployPercentage: number;
  crxVersion: string;
}

export interface ItemRevisionStatus {
  state: ItemState;
  distributionChannels: DistributionChannel[];
}

export interface FetchItemStatusResponse {
  name: string;
  itemId: string;
  publicKey: string;
  publishedItemRevisionStatus?: ItemRevisionStatus;
  submittedItemRevisionStatus?: ItemRevisionStatus;
  lastAsyncUploadState?: UploadState;
  takenDown: boolean;
  warned: boolean;
}

export class CwsApi {
  private readonly baseUrl = 'https://chromewebstore.googleapis.com';

  constructor(readonly options: CwsApiOptions) {}

  private tokenEndpoint() {
    return 'https://oauth2.googleapis.com/token';
  }

  private uploadEndpoint(extensionId: string) {
    return `${this.baseUrl}/upload/v2/publishers/${this.options.publisherId}/items/${extensionId}:upload`;
  }

  private publishEndpoint(extensionId: string) {
    return `${this.baseUrl}/v2/publishers/${this.options.publisherId}/items/${extensionId}:publish`;
  }

  private fetchStatusEndpoint(extensionId: string) {
    return `${this.baseUrl}/v2/publishers/${this.options.publisherId}/items/${extensionId}:fetchStatus`;
  }

  private cancelSubmissionEndpoint(extensionId: string) {
    return `${this.baseUrl}/v2/publishers/${this.options.publisherId}/items/${extensionId}:cancelSubmission`;
  }

  private setDeployPercentageEndpoint(extensionId: string) {
    return `${this.baseUrl}/v2/publishers/${this.options.publisherId}/items/${extensionId}:setPublishedDeployPercentage`;
  }

  async uploadZip(params: {
    extensionId: string;
    zipFile: string;
    token: CwsTokenDetails;
  }): Promise<UploadItemPackageResponse> {
    const Authorization = this.getAuthHeader(params.token);

    return fetch<UploadItemPackageResponse>(
      this.uploadEndpoint(params.extensionId),
      {
        method: 'POST',
        body: Bun.file(params.zipFile),
        headers: {
          Authorization,
          'X-Goog-Upload-Protocol': 'raw',
        },
      },
    );
  }

  async publish(params: {
    extensionId: string;
    token: CwsTokenDetails;
    publishType?: 'DEFAULT_PUBLISH' | 'STAGED_PUBLISH';
    deployPercentage?: number;
    skipReview?: boolean;
  }): Promise<PublishItemResponse> {
    const Authorization = this.getAuthHeader(params.token);

    // v2 API uses JSON request body instead of query params
    const body: {
      publishType?: string;
      deployInfos?: { deployPercentage: number }[];
      skipReview?: boolean;
    } = {};

    if (params.publishType) {
      body.publishType = params.publishType;
    }
    if (params.deployPercentage != null) {
      body.deployInfos = [{ deployPercentage: params.deployPercentage }];
    }
    if (params.skipReview != null) {
      body.skipReview = params.skipReview;
    }

    return fetch<PublishItemResponse>(
      this.publishEndpoint(params.extensionId),
      {
        method: 'POST',
        headers: {
          Authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
  }

  async fetchStatus(params: {
    extensionId: string;
    token: CwsTokenDetails;
  }): Promise<FetchItemStatusResponse> {
    const Authorization = this.getAuthHeader(params.token);
    return fetch<FetchItemStatusResponse>(
      this.fetchStatusEndpoint(params.extensionId),
      {
        method: 'GET',
        headers: { Authorization },
      },
    );
  }

  async cancelSubmission(params: {
    extensionId: string;
    token: CwsTokenDetails;
  }): Promise<void> {
    const Authorization = this.getAuthHeader(params.token);
    await fetch(this.cancelSubmissionEndpoint(params.extensionId), {
      method: 'POST',
      headers: { Authorization },
    });
  }

  async setPublishedDeployPercentage(params: {
    extensionId: string;
    token: CwsTokenDetails;
    deployPercentage: number;
  }): Promise<void> {
    const Authorization = this.getAuthHeader(params.token);
    await fetch(this.setDeployPercentageEndpoint(params.extensionId), {
      method: 'POST',
      headers: {
        Authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deployPercentage: params.deployPercentage }),
    });
  }

  getToken(): Promise<CwsTokenDetails> {
    return fetch<CwsTokenDetails>(this.tokenEndpoint(), {
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

  private getAuthHeader(token: CwsTokenDetails) {
    return `${token.token_type} ${token.access_token}`;
  }
}
