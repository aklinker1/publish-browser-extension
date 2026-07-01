import type { Store } from './store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { CwsApiV2 } from '../apis/cws-api';
import { FetchError } from '../utils/errors';
import { createReadStream } from 'node:fs';

export const ChromeWebStoreV2Options = z.object({
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
  private tokenCache: Promise<CwsTokenDetails> | undefined;

  constructor(
    readonly options: ChromeWebStoreV2Options,
    readonly setStatus: (text: string) => void,
  ) {
    this.client = createHttpClient<CwsApiV2.Endpoints>({
      baseUrl: CwsApiV2.BASE_URL,
      defaultHeaders: async () => ({
        Authorization: `Bearer ${await this.getToken()}`,
        'x-goog-api-version': '2',
      }),
    });
  }

  async submit(dryRun?: boolean): Promise<void> {}

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }
}

export class ChromeWebStoreUploadStateError extends Error {
  constructor(item: CwsApiV2.Item) {
    super(`CWS item upload state is ${item.uploadState}`, {
      cause: item,
    });
    this.name = 'ChromeWebStoreUploadStateError';
  }
}

export {
  /** @deprecated Use ChromeWebStoreV2 instead. */
  ChromeWebStoreV2 as ChromeWebStore,
  /** @deprecated Use ChromeWebStoreV2Options instead. */
  ChromeWebStoreV2Options as ChromeWebStoreOptions,
};
