import type { Store } from '../utils/store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { CwsApiV1_1 } from './cws-api-v1.1.gen';
import { FetchError } from '../utils/errors';
import { createReadStream } from 'node:fs';

export const ChromeWebStoreV1_1Options = z.object({
  zip: z.string().min(1),
  extensionId: z.string().min(1).trim(),
  clientId: z.string().min(1).trim(),
  clientSecret: z.string().min(1).trim(),
  refreshToken: z.string().min(1).trim(),
  publishTarget: z.enum(['default', 'trustedTesters']).default('default'),
  deployPercentage: z.int().min(1).max(100).optional(),
  reviewExemption: z.boolean().default(false),
  skipSubmitReview: z.boolean().default(false),
});
export type ChromeWebStoreV1_1Options = z.infer<
  typeof ChromeWebStoreV1_1Options
>;

export interface CwsTokenDetails {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class ChromeWebStoreV1_1 implements Store {
  private client: HttpClient<CwsApiV1_1.Endpoints>;
  private tokenCache: Promise<CwsTokenDetails> | undefined;

  constructor(
    readonly options: ChromeWebStoreV1_1Options,
    readonly setStatus: (text: string) => void,
  ) {
    this.client = createHttpClient<CwsApiV1_1.Endpoints>({
      baseUrl: CwsApiV1_1.BASE_URL,
      defaultHeaders: () => ({
        Authorization: `Bearer ${options.clientSecret}`,
        'x-goog-api-version': '2',
      }),
    });
  }

  async submit(dryRun?: boolean): Promise<void> {
    this.setStatus('Getting an access token');
    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new ZIP file');
    const file = createReadStream(this.options.zip);
    await this.client.put('/chromewebstore/v1.1/items/{itemId}', {
      params: { itemId: this.options.extensionId },
      body: file,
    });

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting for review');
    await this.client.post('/chromewebstore/v1.1/items/{itemId}/publish', {
      params: {
        itemId: this.options.extensionId,
      },
      // TODO: Do I need both of these?
      query: {
        deployPercentage: this.options.deployPercentage,
        publishTarget: this.options.publishTarget,
        reviewExemption: this.options.reviewExemption,
      },
      body: {
        deployPercentage: this.options.deployPercentage,
        reviewExemption: this.options.reviewExemption,
        target: this.options.publishTarget,
      },
    });
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  async getToken(): Promise<string> {
    if (!this.tokenCache) this.tokenCache = this.fetchTokenDetails();

    // We can ignore the expiration time assuming the submit only takes a few seconds.
    const data = await this.tokenCache;
    return data.access_token;
  }

  private async fetchTokenDetails(): Promise<CwsTokenDetails> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
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
    if (!res.ok) throw FetchError.from(res);

    return (await res.json()) as CwsTokenDetails;
  }
}

export {
  /** @deprecated Use ChromeWebStoreV1_1 instead. */
  ChromeWebStoreV1_1 as ChromeWebStore,
  /** @deprecated Use ChromeWebStoreV1_1Options instead. */
  ChromeWebStoreV1_1Options as ChromeWebStoreOptions,
};
