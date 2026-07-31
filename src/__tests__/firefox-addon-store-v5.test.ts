import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FirefoxAddonStoreV5 } from '../stores/firefox-addon-store-v5';

const originalFetch = globalThis.fetch;

describe('FirefoxAddonStoreV5', () => {
  let directory: string;
  let zip: string;
  let metadataFile: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'publish-browser-extension-'));
    zip = join(directory, 'extension.zip');
    metadataFile = join(directory, 'amo-metadata.json');
    await writeFile(zip, 'zip');
    await writeFile(
      metadataFile,
      JSON.stringify({
        summary: { 'en-US': 'Updated summary' },
        version: {
          license: 'MPL-2.0',
          release_notes: { 'en-US': 'Fixed a bug' },
        },
      }),
    );
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await rm(directory, { recursive: true, force: true });
  });

  it('submits AMO listing and version metadata', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = mock(
      async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = String(input);
        requests.push({ url, init });

        if (
          init.method === 'GET' &&
          url.endsWith('/api/v5/addons/addon/test-extension')
        ) {
          return jsonResponse({ id: 'test-addon' });
        }
        if (init.method === 'POST' && url.endsWith('/api/v5/addons/upload/')) {
          return jsonResponse({
            uuid: 'upload-uuid',
            channel: 'listed',
            processed: false,
            submitted: false,
            url: '',
            valid: true,
            validation: { errors: 0, warnings: 0, notices: 0 },
            version: '1.0.0',
          });
        }
        if (
          init.method === 'GET' &&
          url.endsWith('/api/v5/addons/upload/upload-uuid')
        ) {
          return jsonResponse({
            uuid: 'upload-uuid',
            channel: 'listed',
            processed: true,
            submitted: false,
            url: '',
            valid: true,
            validation: { errors: 0, warnings: 0, notices: 0 },
            version: '1.0.0',
          });
        }
        if (
          init.method === 'PATCH' &&
          url.endsWith('/api/v5/addons/addon/test-extension')
        ) {
          return jsonResponse({ id: 'test-addon' });
        }
        if (
          init.method === 'POST' &&
          url.endsWith('/api/v5/addons/addon/test-extension/versions/')
        ) {
          return jsonResponse({ id: 7, file: { id: 11 } });
        }
        throw Error(`Unexpected request: ${init.method} ${url}`);
      },
    ) as unknown as typeof fetch;

    const store = new FirefoxAddonStoreV5(
      {
        zip,
        amoMetadataFile: metadataFile,
        extensionId: 'test-extension',
        jwtIssuer: 'issuer',
        jwtSecret: 'secret',
        channel: 'listed',
        skipSubmitReview: false,
      },
      () => {},
    );

    await store.submit();

    const addonPatch = requests.find(
      request =>
        request.init.method === 'PATCH' &&
        request.url.endsWith('/api/v5/addons/addon/test-extension'),
    );
    expect(JSON.parse(String(addonPatch?.init.body))).toEqual({
      summary: { 'en-US': 'Updated summary' },
    });

    const versionPost = requests.find(
      request =>
        request.init.method === 'POST' &&
        request.url.endsWith('/api/v5/addons/addon/test-extension/versions/'),
    );
    expect(JSON.parse(String(versionPost?.init.body))).toEqual({
      upload: 'upload-uuid',
      license: 'MPL-2.0',
      release_notes: { 'en-US': 'Fixed a bug' },
    });
  }, 10_000);
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
