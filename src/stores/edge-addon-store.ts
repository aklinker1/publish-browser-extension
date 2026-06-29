import { EdgeApiV1_1 } from '../apis/edge-api-v1.1';
import type { Store } from './store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { pollUntil } from '../utils/polling';
import { createReadStream } from 'node:fs';

export const EdgeAddonStoreOptions = z.object({
  zip: z.string().min(1),
  productId: z.string().min(1).trim(),
  clientId: z.string().min(1).trim(),
  skipSubmitReview: z.boolean().default(false),
  apiKey: z.string().min(1).trim(),
  /** @deprecated: API v1.0 authorization field no longer in use. */
  clientSecret: z.string().optional(),
  /** @deprecated: API v1.0 authorization field no longer in use. */
  accessTokenUrl: z.string().optional(),
});

export type EdgeAddonStoreOptions = z.infer<typeof EdgeAddonStoreOptions>;

export class EdgeAddonStore implements Store {
  private client: HttpClient<EdgeApiV1_1.Endpoints>;

  constructor(
    private readonly options: EdgeAddonStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.client = createHttpClient({
      baseUrl: EdgeApiV1_1.BASE_URL,
      defaultHeaders: {
        'X-ClientID': options.clientId,
        Authorization: `ApiKey ${options.apiKey}`,
      },
    });
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  async submit(dryRun?: boolean | undefined): Promise<void> {
    // TODO: Figure out a way to validate the API key before exiting the dry run
    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Uploading new ZIP file');
    const { operationId } = await this.client.post(
      '/v1/products/{productId}/submissions/draft/package',
      {
        params: {
          productId: this.options.productId,
        },
        body: createReadStream(this.options.zip),
        headers: {
          'Content-Type': 'application/zip',
        },
        mapResponse: res => ({
          operationId: res.headers.get('Location') as string,
        }),
      },
    );

    this.setStatus('Waiting for validation results');
    await pollUntil({
      interval: 5e3,
      timeout: 10 * 60e3,
      condition: async () => {
        const operation = await this.client.get(
          `/v1/products/{productId}/submissions/draft/package/operations/{operationId}`,
          { params: { operationId, productId: this.options.productId } },
        );
        if (operation.status === 'Failed')
          throw Error(
            `Validation failed: ${JSON.stringify(operation, null, 2)}`,
          );

        return operation.status === 'Succeeded';
      },
    });
    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting new version');
    await this.client.post('/v1/products/{productId}/submissions', {
      params: { productId: this.options.productId },
      body: {},
    });
  }
}
