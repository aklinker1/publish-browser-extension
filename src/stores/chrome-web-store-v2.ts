import type { Store } from './store';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import * as CwsApiV2 from '../apis/cws-api-v2.gen';
import { createGcpServiceAccountJwt } from '../utils/google-auth';
import { createReadStream } from 'node:fs';
import { ChromeWebStoreUploadStateError } from './chrome-web-store-v1.1';
import type { ChromeWebStoreV2Options } from '../utils/config-schema';
import { logger } from '../utils/logger';

export interface ServiceAccountTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class ChromeWebStoreV2 implements Store {
  private client: HttpClient<CwsApiV2.Endpoints>;
  private accessTokenCache: Promise<ServiceAccountTokenResponse> | undefined;

  constructor(
    readonly options: ChromeWebStoreV2Options,
    readonly setStatus?: (text: string) => void,
  ) {
    this.client = createHttpClient<CwsApiV2.Endpoints>({
      baseUrl: CwsApiV2.BASE_URL,
      defaultHeaders: async () => ({
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'x-goog-api-version': '2',
      }),
    });
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus?.('Validating credentials');
    const status = await this.client.get('/v2/{+name}:fetchStatus', {
      params: { name: this.nameParam },
    });
    if (dryRun) {
      this.setStatus?.('DRY RUN: Skipped upload and publishing');
      return;
    }

    if (
      this.options.cancelPending &&
      status.submittedItemRevisionStatus?.state === 'PENDING_REVIEW'
    ) {
      this.setStatus?.('Cancelling pending review');
      await this.client.post('/v2/{+name}:cancelSubmission', {
        params: { name: this.nameParam },
        body: {},
      });
    }

    this.setStatus?.('Uploading new ZIP file');
    const file = createReadStream(this.options.zip);
    const uploadRes = await this.client.post('/upload/v2/{+name}:upload', {
      params: { name: this.nameParam },
      body: file,
    });
    this.checkUploadState(uploadRes);

    if (this.options.skipSubmitReview) {
      this.setStatus?.('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus?.('Submitting for review');
    const publishRes = await this.client.post('/v2/{+name}:publish', {
      params: { name: this.nameParam },
      body: {
        blockOnWarnings: undefined,
        deployInfos: this.options.deployPercentage
          ? [{ deployPercentage: this.options.deployPercentage }]
          : undefined,
        publishType: this.options.publishType,
        skipReview: this.options.skipReview,
      },
    });

    if (publishRes.warningInfo?.warnings?.length) {
      this.setStatus?.(
        `Found ${publishRes.warningInfo.warnings.length} warning(s)`,
      );
      for (const warning of publishRes.warningInfo.warnings) {
        logger.warn(`${warning.reason}: ${warning.description}`);
      }
    }
  }

  async ensureFilesExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  /**
   * @param percentage A nonnegative number between 0 and 100.
   */
  async setDeploymentPercentage(percentage: number): Promise<void> {
    await this.client.post('/v2/{+name}:setPublishedDeployPercentage', {
      params: { name: this.nameParam },
      body: { deployPercentage: percentage },
    });
  }

  async getStatus(): Promise<CwsApiV2.FetchItemStatusResponse> {
    return await this.client.get('/v2/{+name}:fetchStatus', {
      params: { name: this.nameParam },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessTokenCache)
      this.accessTokenCache = this.getAccessTokenNoCache();

    const data = await this.accessTokenCache;
    return data.access_token;
  }

  private async getAccessTokenNoCache(): Promise<ServiceAccountTokenResponse> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createGcpServiceAccountJwt(
          this.options.serviceAccountClientEmail,
          this.options.serviceAccountPrivateKey,
          ['https://www.googleapis.com/auth/chromewebstore'],
        ),
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to exchange service account credentials for access token: ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as ServiceAccountTokenResponse;
  }

  private get nameParam(): string {
    return `publishers/${this.options.publisherId}/items/${this.options.extensionId}`;
  }

  private checkUploadState(
    item: CwsApiV2.UploadItemPackageResponse,
  ): void | never {
    // TODO: Unclear is v2 API needs polling or not, so throw if it's not a
    // success - the rest of the submission pipeline expects immediate success.
    if (item.uploadState !== 'SUCCEEDED')
      throw new ChromeWebStoreUploadStateError(item);
  }
}
