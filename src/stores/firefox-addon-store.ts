import { Log } from '../utils/log';
import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import { AddonsApi } from '../apis/addons-api';
import { mkdtemp } from 'node:fs/promises';
import extract from 'extract-zip';

// Signing fails with this message when signing listed extension - even though it fails, it's fine and it will be approved
const LISTED_SIGNING_SUCCESS_ERROR_MESSAGE =
  'Your add-on has been submitted for review. It passed validation but could not be automatically signed because this is a listed add-on.';

export interface FirefoxAddonStoreOptions {
  zip: string;
  sourcesZip?: string;
  extensionId: string;
  jwtIssuer: string;
  jwtSecret: string;
  channel?: 'listed' | 'unlisted';
}

export class FirefoxAddonStore {
  readonly name = 'Firefox Addon Store';
  private api: AddonsApi;

  constructor(
    readonly options: FirefoxAddonStoreOptions,
    readonly deps: { log: Log },
  ) {
    this.api = new AddonsApi(options);
  }

  async publish(dryRun?: boolean): Promise<void> {
    await this.api.checkAuth({ extensionId: this.wrappedExtensionId });
    if (dryRun) {
      this.deps.log.warn('DRY RUN: Skipping upload and publish...');
      return;
    }

    await this.validateUploadSign();
    if (this.options.sourcesZip)
      await this.uploadSource(this.options.sourcesZip);
  }

  async validateUploadSign() {
    console.log('Validating, signing, and uploading new ZIP file...');
    const srcDir = await this.unzipExtensionToTempDir();
    await new Promise<void>((res, rej) => {
      exec(
        './node_modules/.bin/web-ext --no-config-discovery sign',
        { env: this.getWebExtEnv(srcDir) },
        (err, stdout, stderr) => {
          if (err == null) return res();
          if (
            stdout.includes(LISTED_SIGNING_SUCCESS_ERROR_MESSAGE) ||
            stderr.includes(LISTED_SIGNING_SUCCESS_ERROR_MESSAGE)
          )
            res();

          process.stdout.write(stdout);
          process.stderr.write(stderr);
          rej(err);
        },
      );
    });
  }

  async uploadSource(sourceZip: string) {
    console.log('Uploading sources ZIP file...');
    const [latestVersion] = await this.api.listVersions({
      extensionId: this.wrappedExtensionId,
      filter: 'all_with_unlisted',
    });
    await this.api.uploadSource({
      extensionId: this.wrappedExtensionId,
      versionId: latestVersion.id,
      sourceFile: sourceZip,
    });
  }

  private getWebExtEnv(srcDir: string) {
    return {
      ...process.env,
      WEB_EXT_ARTIFACTS_DIR: path.dirname(this.options.zip),
      WEB_EXT_API_KEY: this.options.jwtIssuer,
      WEB_EXT_API_SECRET: this.options.jwtSecret,
      WEB_EXT_ID: this.wrappedExtensionId,
      WEB_EXT_CHANNEL: this.options.channel,
      WEB_EXT_SOURCE_DIR: srcDir,
    };
  }

  private async unzipExtensionToTempDir(): Promise<string> {
    const srcDir = await mkdtemp(
      path.join(os.tmpdir(), 'publish-browser-extension-firefox-'),
    );
    await extract(this.options.zip, { dir: srcDir });
    return srcDir;
  }

  /**
   * Ensure the extension id is wrapped in curly braces, that's what the addon store API is expecting
   * @example
   * "test" -> "{test}"
   */
  private get wrappedExtensionId(): string {
    let id = this.options.extensionId;
    if (!id.startsWith('{')) id = '{' + id;
    if (!id.endsWith('}')) id += '}';
    return id;
  }
}
