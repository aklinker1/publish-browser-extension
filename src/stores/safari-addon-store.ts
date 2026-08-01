import type { Store } from './store';
import { ensureFileExists } from '../utils/fs';
import type { SafariAddonStoreOptions } from '../config';
import { spawnSync } from 'node:child_process';

export class SafariAddonStore implements Store {
  constructor(
    readonly options: SafariAddonStoreOptions,
    readonly setStatus: (text: string) => void = () => {},
  ) {}

  async ensureFilesExist(): Promise<void> {
    await ensureFileExists(this.options.bundlePath);
    await ensureFileExists(this.options.apiPrivateKeyPath);
  }

  async submit(dryRun?: boolean): Promise<void> {
    if (dryRun) {
      this.setStatus('DRY RUN: Skipped upload and publishing');
      return;
    }

    this.setStatus('Checking xcrun is available');
    this.assertXcrunAvailable();

    this.setStatus('Uploading bundle to App Store Connect');
    this.runAltool([
      '--upload-app',
      '-f',
      this.options.bundlePath,
      '-t',
      this.options.bundleType,
      '--apiKey',
      this.options.apiKeyId,
      '--apiIssuer',
      this.options.apiIssuerId,
    ]);

    this.setStatus('Upload complete');
  }

  /**
   * Run xcrun altool with the given arguments. The private key is passed via
   * the `APPSTORE_CONNECT_API_KEY_PATH` environment variable, which altool
   * looks up automatically when provided with `--apiKey` and `--apiIssuer`.
   *
   * altool searches for the key file in:
   *   - The path in `APPSTORE_CONNECT_API_KEY_PATH`
   *   - `~/.private_keys/AuthKey_<keyId>.p8`
   *   - `~/private_keys/AuthKey_<keyId>.p8`
   *   - `./private_keys/AuthKey_<keyId>.p8`
   */
  private runAltool(args: string[]): void {
    const result = spawnSync(
      'xcrun',
      ['altool', ...args, '--output-format', 'json'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          APPSTORE_CONNECT_API_KEY_PATH: this.options.apiPrivateKeyPath,
        },
      },
    );

    if (result.error) {
      throw new Error(
        `xcrun altool failed to start: ${result.error.message}. Make sure Xcode is installed.`,
      );
    }

    if (result.status !== 0) {
      const output = result.stderr || result.stdout || '';
      let detail: string;
      try {
        const json = JSON.parse(output);
        detail =
          json['product-errors']?.map((e: any) => e.message).join(', ') ??
          output;
      } catch {
        detail = output;
      }
      throw new Error(
        `xcrun altool exited with code ${result.status}: ${detail}`,
      );
    }
  }

  private assertXcrunAvailable(): void {
    const result = spawnSync('xcrun', ['--version'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      throw new Error(
        'xcrun is not available. The Safari store requires macOS with Xcode installed.\n' +
          'Install Xcode from the Mac App Store or via: xcode-select --install',
      );
    }
  }
}
