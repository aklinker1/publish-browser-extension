import type { Store } from './store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { CwsApiV2 } from '../apis/cws-api-v2.gen';
import { createGcpServiceAccountJwt } from '../utils/google-auth';

type PublishType = NonNullable<CwsApiV2.PublishItemRequest['publishType']>;

export const ChromeWebStoreV2Options = z.object({
  apiVersion: z.literal('v2'),
  zip: z.string().min(1),
  extensionId: z.string().min(1).trim(),
  publisherId: z.string().min(1).trim(),
  clientEmail: z.string().min(1).trim(),
  privateKey: z.string().min(1),
  publishType: z
    .enum<
      PublishType[]
    >(['PUBLISH_TYPE_UNSPECIFIED', 'DEFAULT_PUBLISH', 'STAGED_PUBLISH'])
    .optional(),
  deployPercentage: z.int().min(1).max(100).optional(),
  skipReview: z.boolean().default(false),
  skipSubmitReview: z.boolean().default(false),
});
export type ChromeWebStoreV2Options = z.infer<typeof ChromeWebStoreV2Options>;

export interface CwsTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class ChromeWebStoreV2 implements Store {
  private client: HttpClient<CwsApiV2.Endpoints>;
  private accessTokenCache: Promise<CwsTokenDetails> | undefined;

  constructor(
    readonly options: ChromeWebStoreV2Options,
    readonly setStatus: (text: string) => void,
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
    throw Error('TODO');
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.accessTokenCache)
      this.accessTokenCache = this.getAccessTokenNoCache();

    const data = await this.accessTokenCache;
    return data.access_token;
  }

  private async getAccessTokenNoCache(): Promise<CwsTokenDetails> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: createGcpServiceAccountJwt(
          this.options.clientEmail,
          this.options.privateKey,
          ['https://www.googleapis.com/auth/chromewebstore'],
        ),
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Failed to exchange service account credentials for access token: ${res.status} ${res.statusText}`,
      );
    }

    return (await res.json()) as CwsTokenDetails;
  }
}
