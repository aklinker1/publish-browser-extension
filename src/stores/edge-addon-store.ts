import { DraftOperation, EdgeApi, EdgeTokenDetails } from '../apis/edge-api';
import { Log } from '../utils/log';
import { sleep } from '../utils/sleep';
import { withTimeout } from '../utils/withTimeout';
import { IStore } from './types';

export interface EdgeAddonStoreOptions {
  zip: string;
  productId: string;
  clientId: string;
  clientSecret: string;
  accessTokenUrl: string;
  skipSubmitReview?: boolean;
}

export class EdgeAddonStore implements IStore {
  readonly name = 'Edge Addon Store';
  private api: EdgeApi;

  constructor(
    private readonly options: EdgeAddonStoreOptions,
    readonly deps: { log: Log },
  ) {
    this.api = new EdgeApi(options);
  }

  async publish(dryRun?: boolean | undefined): Promise<void> {
    const token = await this.api.getToken();

    if (dryRun) {
      this.deps.log.warn('DRY RUN: Skipping upload and publish...');
      return;
    }

    const pollInterval = 5e3; // 5 seconds
    const timeout = 10 * 60e3; // 10 minutes
    const uploadPromise = this.uploadAndPollValidation(token, pollInterval);
    await withTimeout(uploadPromise, timeout);

    if (this.options.skipSubmitReview) {
      this.deps.log.warn('Skipping submission (skipSubmitReview=true)');
      return;
    }

    console.log('Submitting new version...');
    await this.api.publish({
      token,
      productId: this.options.productId,
    });
  }

  private async uploadAndPollValidation(
    token: EdgeTokenDetails,
    pollIntervalMs: number,
  ): Promise<void> {
    const { operationId } = await this.api.uploadDraft({
      token,
      productId: this.options.productId,
      zipFile: this.options.zip,
    });

    console.log('Waiting for validation results...');
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
      this.deps.log.error(`Validation Failed: ${operation.message}`);
    } else {
      console.log('Extension is valid', operation.message);
    }
  }
}
