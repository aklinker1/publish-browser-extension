import type { Store } from './store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { CwsApiV2 } from '../apis/cws-api-v2.gen';
import { createGcpServiceAccountJwt } from '../utils/google-auth';
import { createReadStream } from 'node:fs';
import { ChromeWebStoreUploadStateError } from './chrome-web-store-v1.1';
import consola from 'consola';

type PublishType = NonNullable<CwsApiV2.PublishItemRequest['publishType']>;

export const ChromeWebStoreV2Options = z.object({
  apiVersion: z.literal('v2'),
  zip: z.string().min(1),
  extensionId: z.string().min(1).trim(),
  publisherId: z.string().min(1).trim(),
  serviceAccountClientEmail: z.string().min(1).trim(),
  serviceAccountPrivateKey: z.string().min(1),
  publishType: z
    .enum<
      PublishType[]
    >(['PUBLISH_TYPE_UNSPECIFIED', 'DEFAULT_PUBLISH', 'STAGED_PUBLISH'])
    .optional(),
  deployPercentage: z.int().min(1).max(100).optional(),
  skipReview: z.boolean().default(false),
  skipSubmitReview: z.boolean().default(false),
  cancelPending: z.boolean().default(false),
});
export type ChromeWebStoreV2Options = z.infer<typeof ChromeWebStoreV2Options>;

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
    console.log(1, '\n\n\n\n');
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
    console.log(2, '\n\n\n\n');
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
    console.log(3, '\n\n\n\n');
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

    console.log(4, '\n\n\n\n');
    if (publishRes.warningInfo?.warnings?.length) {
      console.log(5, '\n\n\n\n');
      this.setStatus?.(
        `Found ${publishRes.warningInfo.warnings.length} warning(s)`,
      );
      for (const warning of publishRes.warningInfo.warnings) {
        consola.warn(`${warning.reason}: ${warning.description}`);
      }
    }
    console.log(6, '\n\n\n\n');
  }

  async ensureZipsExist(): Promise<void> {
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
    if (item.uploadState === 'FAILED' || item.uploadState === 'NOT_FOUND')
      throw new ChromeWebStoreUploadStateError(item);
  }
}
