import { DraftOperation, EdgeApi, EdgeTokenDetails } from './edge-api';
import { sleep } from '../utils/sleep';
import { withTimeout } from '../utils/withTimeout';
import { Store } from '../utils/store';
import { z } from 'zod';
import { ensureZipExists } from '../utils/fs';

const EdgeAddonBaseOptions = z.object({
  zip: z.string().min(1),
  productId: z.string().min(1).trim(),
  clientId: z.string().min(1).trim(),
  skipSubmitReview: z.boolean().default(false),
});

export const EdgeAddonStoreOptions = EdgeAddonBaseOptions.extend({
  apiVersion: z.enum(['1.0', '1.1']).default('1.0'),
  apiKey: z.string().trim(),
  clientSecret: z.string().trim(),
  accessTokenUrl: z.string().trim(),
});

// FIXME: zod does not support calling .partial() on discriminated unions, so
// we can't export this as EdgeAddonStoreOptions
export const EdgeAddonStoreOptionsStrict = EdgeAddonBaseOptions.and(
  z.discriminatedUnion('apiVersion', [
    z.object({
      apiVersion: z.literal('1.0').default('1.0'),
      clientSecret: z.string().min(1).trim(),
      accessTokenUrl: z.string().min(1).trim(),
    }),
    z.object({
      apiVersion: z.literal('1.1'),
      apiKey: z.string().min(1).trim(),
      clientSecret: z.string().trim().default(''),
      accessTokenUrl: z.string().trim().default(''),
    }),
  ]),
);

export type EdgeAddonStoreOptions = z.infer<typeof EdgeAddonStoreOptionsStrict>;

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
