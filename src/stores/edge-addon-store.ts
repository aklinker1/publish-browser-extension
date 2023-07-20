import { DraftOperation, EdgeApi, EdgeTokenDetails } from '../apis/edge-api';
import { Logger } from '../utils/logger';
import { sleep } from '../utils/sleep';
import { withTimeout } from '../utils/withTimeout';
import { IStore } from './types';
import pc from 'picocolors';

export interface EdgeAddonStoreOptions {
  zip: string;
  productId: string;
  clientId: string;
  clientSecret: string;
  accessTokenUrl: string;
  skipSubmitReview: boolean;
}

export class EdgeAddonStore implements IStore {
  readonly name = 'Edge Addons';
  private api: EdgeApi;

  constructor(
    private readonly options: EdgeAddonStoreOptions,
    readonly deps: { logger: Logger },
  ) {
    this.api = new EdgeApi(options);
  }

  private log(message: string): void {
    this.deps.logger.log(pc.dim(`    ${message}`));
  }

  async publish(dryRun?: boolean | undefined): Promise<void> {
    this.log('Getting an access token...');
    const token = await this.api.getToken();

    if (dryRun) {
      this.log('DRY RUN: Skipped upload and publishing');
      return;
    }

    const pollInterval = 5e3; // 5 seconds
    const timeout = 10 * 60e3; // 10 minutes
    const uploadPromise = this.uploadAndPollValidation(token, pollInterval);
    await withTimeout(uploadPromise, timeout);

    if (this.options.skipSubmitReview) {
      this.log('Skipping submission (skipSubmitReview=true)');
      return;
    }

    this.log('Submitting new version...');
    await this.api.publish({
      token,
      productId: this.options.productId,
    });
  }

  private async uploadAndPollValidation(
    token: EdgeTokenDetails,
    pollIntervalMs: number,
  ): Promise<void> {
    this.log('Uploading new ZIP file...');
    const { operationId } = await this.api.uploadDraft({
      token,
      productId: this.options.productId,
      zipFile: this.options.zip,
    });

    this.log('Waiting for validation results...');
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
      this.log('Extension is valid');
    }
  }
}
