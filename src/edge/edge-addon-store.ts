import { DraftOperation, EdgeApi, EdgeTokenDetails } from './edge-api';
import { sleep } from '../utils/sleep';
import { withTimeout } from '../utils/withTimeout';
import { Store } from '../utils/store';
import { z } from 'zod/v4';
import { ensureZipExists } from '../utils/fs';

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
  private api: EdgeApi;

  constructor(
    private readonly options: EdgeAddonStoreOptions,
    readonly setStatus: (text: string) => void,
  ) {
    this.api = new EdgeApi(options);
  }

  async ensureZipsExist(): Promise<void> {
    await ensureZipExists(this.options.zip);
  }

  async submit(dryRun?: boolean | undefined): Promise<void> {
    this.setStatus('Getting authorization token');
    const token = await this.api.getToken();

    if (dryRun) {
      // TODO: Validate v1.1 API key before returning. v1.0 token is validated inside `this.api.getToken()` above.
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    const pollInterval = 5e3; // 5 seconds
    const timeout = 10 * 60e3; // 10 minutes
    const uploadPromise = this.uploadAndPollValidation(token, pollInterval);
    await withTimeout(uploadPromise, timeout);

    if (this.options.skipSubmitReview) {
      this.setStatus('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.setStatus('Submitting new version');
    await this.api.publish({
      token,
      productId: this.options.productId,
    });
  }

  private async uploadAndPollValidation(
    token: EdgeTokenDetails,
    pollIntervalMs: number,
  ): Promise<void> {
    this.setStatus('Uploading new ZIP file');
    const { operationId } = await this.api.uploadDraft({
      token,
      productId: this.options.productId,
      zipFile: this.options.zip,
    });

    this.setStatus('Waiting for validation results');
    let operation: DraftOperation;
    do {
      await sleep(pollIntervalMs);
      operation = await this.api.uploadDraftOperation({
        token,
        operationId,
        productId: this.options.productId,
      });
    } while (operation.status === 'InProgress');

    if (operation.status === 'Failed') {
      throw Error(`Validation failed: ${JSON.stringify(operation, null, 2)}`);
    } else {
      this.setStatus('Extension is valid');
    }
  }
}
