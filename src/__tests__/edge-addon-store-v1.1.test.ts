import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EdgeAddonStoreV1_1 } from '../stores/edge-addon-store-v1.1';
import type { EdgeAddonStoreV1_1Options } from '../config';

const originalFetch = globalThis.fetch;

describe('EdgeAddonStoreV1_1', () => {
  let directory: string;
  let zip: string;
  let requests: Array<{ url: string; init: RequestInit }>;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'publish-browser-extension-'));
    zip = join(directory, 'extension.zip');
    await writeFile(zip, 'zip');

    requests = [];
    globalThis.fetch = mock(
      async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = String(input);
        requests.push({ url, init });

        if (
          init.method === 'POST' &&
          url.endsWith('/v1/products/test-product/submissions/draft/package')
        ) {
          return new Response(null, {
            status: 202,
            headers: { Location: 'operation-id' },
          });
        }
        if (
          init.method === 'GET' &&
          url.endsWith(
            '/v1/products/test-product/submissions/draft/package/operations/operation-id',
          )
        ) {
          return jsonResponse({ status: 'Succeeded' });
        }
        if (
          init.method === 'POST' &&
          url.endsWith('/v1/products/test-product/submissions')
        ) {
          return new Response(null, { status: 202 });
        }
        throw Error(`Unexpected request: ${init.method} ${url}`);
      },
    ) as unknown as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  });

  function createStore(options: Partial<EdgeAddonStoreV1_1Options> = {}) {
    return new EdgeAddonStoreV1_1(
      {
        zip,
        productId: 'test-product',
        clientId: 'client-id',
        apiKey: 'api-key',
        skipSubmitReview: false,
        ...options,
      },
      () => {},
    );
  }

  function publishBody() {
    const publish = requests.find(
      request =>
        request.init.method === 'POST' &&
        request.url.endsWith('/v1/products/test-product/submissions'),
    );
    return JSON.parse(String(publish?.init.body));
  }

  it('submits notes for certification', async () => {
    await createStore({ notes: 'Test account: user / pass' }).submit();

    expect(publishBody()).toEqual({ notes: 'Test account: user / pass' });
  }, 10_000);

  it('submits an empty body without notes', async () => {
    await createStore().submit();

    expect(publishBody()).toEqual({});
  }, 10_000);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
