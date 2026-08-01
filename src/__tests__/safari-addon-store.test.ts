import { describe, it, expect } from 'bun:test';
import { SafariAddonStore } from '../stores/safari-addon-store';
import type { SafariAddonStoreOptions } from '../utils/config-schema';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('SafariAddonStore', () => {
  const mockOptions: SafariAddonStoreOptions = {
    bundlePath: '/tmp/test-bundle.pkg',
    bundleType: 'macos',
    apiKeyId: 'TEST_KEY_ID',
    apiIssuerId: 'TEST_ISSUER_ID',
    apiPrivateKeyPath: '/tmp/AuthKey_TEST.p8',
  };

  describe('ensureFilesExist', () => {
    it('throws if bundlePath does not exist', () => {
      const store = new SafariAddonStore({
        ...mockOptions,
        bundlePath: '/non/existent/bundle.pkg',
      });
      expect(() => store.ensureFilesExist()).toThrow(
        /File does not exist: \/non\/existent\/bundle\.pkg/,
      );
    });

    it('throws if apiPrivateKeyPath does not exist', () => {
      const tmpDir = os.tmpdir();
      const dummyBundle = path.join(tmpDir, 'dummy-bundle.pkg');
      fs.writeFileSync(dummyBundle, 'dummy content');

      try {
        const store = new SafariAddonStore({
          ...mockOptions,
          bundlePath: dummyBundle,
          apiPrivateKeyPath: '/non/existent/key.p8',
        });
        expect(() => store.ensureFilesExist()).toThrow(
          /File does not exist: \/non\/existent\/key\.p8/,
        );
      } finally {
        if (fs.existsSync(dummyBundle)) fs.unlinkSync(dummyBundle);
      }
    });

    it('succeeds when both bundlePath and apiPrivateKeyPath exist', () => {
      const tmpDir = os.tmpdir();
      const dummyBundle = path.join(tmpDir, 'dummy-bundle.pkg');
      const dummyKey = path.join(tmpDir, 'dummy-key.p8');
      fs.writeFileSync(dummyBundle, 'dummy bundle content');
      fs.writeFileSync(dummyKey, 'dummy key content');

      try {
        const store = new SafariAddonStore({
          ...mockOptions,
          bundlePath: dummyBundle,
          apiPrivateKeyPath: dummyKey,
        });
        expect(() => store.ensureFilesExist()).not.toThrow();
      } finally {
        if (fs.existsSync(dummyBundle)) fs.unlinkSync(dummyBundle);
        if (fs.existsSync(dummyKey)) fs.unlinkSync(dummyKey);
      }
    });
  });

  describe('submit', () => {
    it('executes dryRun mode without throwing and updates status', async () => {
      const tmpDir = os.tmpdir();
      const dummyBundle = path.join(tmpDir, 'dryrun-bundle.pkg');
      const dummyKey = path.join(tmpDir, 'dryrun-key.p8');
      fs.writeFileSync(dummyBundle, 'bundle');
      fs.writeFileSync(dummyKey, 'key');

      const statusMessages: string[] = [];
      const setStatus = (msg: string) => statusMessages.push(msg);

      try {
        const store = new SafariAddonStore(
          {
            ...mockOptions,
            bundlePath: dummyBundle,
            apiPrivateKeyPath: dummyKey,
          },
          setStatus,
        );
        await expect(store.submit(true)).resolves.toBeUndefined();
        expect(statusMessages).toContain(
          'DRY RUN: Skipped upload and publishing',
        );
      } finally {
        if (fs.existsSync(dummyBundle)) fs.unlinkSync(dummyBundle);
        if (fs.existsSync(dummyKey)) fs.unlinkSync(dummyKey);
      }
    });

    it('asserts xcrun availability when not in dryRun mode', async () => {
      const tmpDir = os.tmpdir();
      const dummyBundle = path.join(tmpDir, 'real-bundle.pkg');
      const dummyKey = path.join(tmpDir, 'real-key.p8');
      fs.writeFileSync(dummyBundle, 'bundle');
      fs.writeFileSync(dummyKey, 'key');

      try {
        const store = new SafariAddonStore({
          ...mockOptions,
          bundlePath: dummyBundle,
          apiPrivateKeyPath: dummyKey,
        });
        if (os.platform() !== 'darwin') {
          await expect(store.submit(false)).rejects.toThrow(
            /xcrun is not available/,
          );
        }
      } finally {
        if (fs.existsSync(dummyBundle)) fs.unlinkSync(dummyBundle);
        if (fs.existsSync(dummyKey)) fs.unlinkSync(dummyKey);
      }
    });
  });
});
