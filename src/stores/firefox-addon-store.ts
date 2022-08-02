import { Log } from '../utils/log';
import { exec } from 'child_process';
import path from 'path';
import { AddonsApi } from '../apis/addons-api';

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
    readonly dryRun: boolean | undefined,
    readonly options: FirefoxAddonStoreOptions,
    readonly deps: { log: Log },
  ) {
    this.api = new AddonsApi(options);
  }

  async publish(dryRun?: boolean): Promise<void> {
    await this.api.checkAuth({ extensionId: this.options.extensionId });
    if (!dryRun) {
      await this.validateUploadSign();
      if (this.options.sourcesZip)
        await this.uploadSource(this.options.sourcesZip);
    }
  }

  async validateUploadSign() {
    console.log('Validating, signing, and uploading new ZIP file...');
    await new Promise<void>((res, rej) => {
      exec(
        './node_modules/.bin/web-ext --no-config-discovery sign',
        { env: this.webExtEnv },
        (err, stdout, stderr) => {
          if (err == null) return res();

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

  private get webExtEnv() {
    const zipDir = path.dirname(this.options.zip);
    return {
      ...process.env,
      WEB_EXT_ARTIFACTS_DIR: zipDir,
      WEB_EXT_API_KEY: this.options.jwtIssuer,
      WEB_EXT_API_SECRET: this.options.jwtSecret,
      WEB_EXT_ID: this.wrappedExtensionId,
      WEB_EXT_CHANNEL: this.options.channel,
      WEB_EXT_SOURCE_DIR: zipDir,
    };
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
