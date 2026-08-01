import * as EdgeApiV1_1 from '../apis/edge-api-v1.1';
import type { Store } from './store';
import { ensureZipExists } from '../utils/fs';
import { createHttpClient, type HttpClient } from '../utils/http-client';
import { pollUntil } from '../utils/polling';
import { createReadStream } from 'node:fs';
import type { EdgeAddonStoreV1_1Options } from '../config';

export class EdgeAddonStoreV1_1 implements Store {
  private client: HttpClient<EdgeApiV1_1.Endpoints>;

  constructor(
    private readonly options: EdgeAddonStoreV1_1Options,
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

  async ensureFilesExist(): Promise<void> {
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
    await pollUntil(async () => {
      const operation = await this.client.get(
        `/v1/products/{productId}/submissions/draft/package/operations/{operationId}`,
        { params: { operationId, productId: this.options.productId } },
      );
      if (operation.status === 'Succeeded') return operation;
      if (operation.status === 'Failed')
        throw Error(`Validation failed: ${JSON.stringify(operation, null, 2)}`);
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
