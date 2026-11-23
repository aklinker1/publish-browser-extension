import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import type { SafariAddonStoreOptions } from '../utils/config-schema';
import {
  loadAscCredentials,
  SafariAppStoreConnectApi,
  type SafariPlatform,
} from '../apis/safari-api';
import { pollUntil } from '../utils/polling';
import type { Store } from './store';

const PLATFORMS: readonly SafariPlatform[] = ['macos', 'ios'];

export interface ExecResult {
  status: number;
  stdout: string;
  stderr: string;
}

export type ExecFn = (cmd: string, args: string[]) => Promise<ExecResult>;

export function defaultExec(cmd: string, args: string[]): Promise<ExecResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', code => {
      resolvePromise({ status: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * Resolves either a directory containing a `.xcodeproj` (e.g. `.output/My Ext`)
 * or a direct path to a `.xcodeproj` bundle.
 */
export async function resolveXcodeprojPath(
  projectPath: string,
): Promise<{ xcodeprojPath: string; projectName: string }> {
  const abs = resolve(projectPath);
  const info = await stat(abs).catch(() => undefined);
  if (!info || !info.isDirectory()) {
    throw new Error(`Safari Xcode project path does not exist: ${projectPath}`);
  }
  if (abs.endsWith('.xcodeproj')) {
    return {
      xcodeprojPath: abs,
      projectName: basename(abs, '.xcodeproj'),
    };
  }
  const entries = await readdir(abs);
  const xcodeprojName = entries.find(e => e.endsWith('.xcodeproj'));
  if (!xcodeprojName) {
    throw new Error(`No .xcodeproj found in ${projectPath}`);
  }
  return {
    xcodeprojPath: join(abs, xcodeprojName),
    projectName: xcodeprojName.slice(0, -'.xcodeproj'.length),
  };
}

export function formatExecOutput(res: ExecResult, maxChars = 4000): string {
  const parts: string[] = [];
  const stderr = res.stderr.trim();
  const stdout = res.stdout.trim();
  if (stderr) {
    parts.push(
      stderr.length > maxChars
        ? `stderr (tail):\n${stderr.slice(-maxChars)}`
        : `stderr:\n${stderr}`,
    );
  }
  if (stdout) {
    parts.push(
      stdout.length > maxChars
        ? `stdout (tail):\n${stdout.slice(-maxChars)}`
        : `stdout:\n${stdout}`,
    );
  }
  return parts.join('\n') || '(no output)';
}

/**
 * Determines whether a single-platform Xcode scheme targets iOS or macOS
 * by inspecting `SDKROOT` and `SUPPORTED_PLATFORMS` from
 * `xcodebuild -showBuildSettings -json`.
 */
export function detectPlatformFromBuildSettings(
  showBuildSettingsJson: string,
): SafariPlatform {
  const parsed = JSON.parse(showBuildSettingsJson) as Array<{
    buildSettings?: Record<string, string>;
  }>;
  for (const entry of parsed) {
    const sdk = entry.buildSettings?.SDKROOT?.toLowerCase() ?? '';
    if (sdk.includes('iphone') || sdk.includes('ios')) return 'ios';
    if (sdk.includes('macosx') || sdk.includes('macos')) return 'macos';
  }
  for (const entry of parsed) {
    const supported =
      entry.buildSettings?.SUPPORTED_PLATFORMS?.toLowerCase() ?? '';
    if (supported.includes('iphone') && !supported.includes('macosx')) {
      return 'ios';
    }
    if (supported.includes('macosx')) return 'macos';
  }
  return 'macos';
}

/**
 * Detects which Apple platforms the Xcode project ships by reading its scheme
 * list: `(macOS)` / `(iOS)` suffixed schemes, or a single scheme matching the
 * project name.
 */
export function detectPlatforms(
  schemes: string[],
  projectName: string,
  singlePlatform: SafariPlatform = 'macos',
): Partial<Record<SafariPlatform, string>> {
  const macos = schemes.includes(`${projectName} (macOS)`)
    ? `${projectName} (macOS)`
    : undefined;
  const ios = schemes.includes(`${projectName} (iOS)`)
    ? `${projectName} (iOS)`
    : undefined;
  if (macos || ios) return { macos, ios };
  if (schemes.includes(projectName)) {
    return singlePlatform === 'ios'
      ? { ios: projectName }
      : { macos: projectName };
  }
  throw new Error(
    `No macOS or iOS scheme found in the Xcode project — available schemes: ${schemes.join(', ') || '(none)'}`,
  );
}

/**
 * Resolves the App Store Connect `.p8` key file using Apple's own standard
 * search order when `keyPath` is not explicitly provided.
 */
export function resolveKeyPath(
  opts: { keyId: string; keyPath?: string },
  home: string = homedir(),
  cwd: string = process.cwd(),
  exists: (p: string) => boolean = existsSync,
): string {
  if (opts.keyPath) {
    const expanded = opts.keyPath.startsWith('~/')
      ? join(home, opts.keyPath.slice(2))
      : opts.keyPath;
    const abs = resolve(cwd, expanded);
    if (!exists(abs)) {
      throw new Error(
        `App Store Connect API key file does not exist: ${opts.keyPath}`,
      );
    }
    return abs;
  }
  const filename = `AuthKey_${opts.keyId}.p8`;
  const candidates = [
    join(cwd, 'private_keys', filename),
    join(home, 'private_keys', filename),
    join(home, '.private_keys', filename),
    join(home, '.appstoreconnect', 'private_keys', filename),
  ];
  const found = candidates.find(exists);
  if (!found) {
    throw new Error(
      `Could not find ${filename} in ./private_keys, ~/private_keys, ~/.private_keys, or ~/.appstoreconnect/private_keys — pass --safari-key-path or set SAFARI_KEY_PATH`,
    );
  }
  return found;
}

export function extractDevelopmentTeam(showBuildSettingsJson: string): string {
  const parsed = JSON.parse(showBuildSettingsJson) as Array<{
    buildSettings?: Record<string, string>;
  }>;
  for (const entry of parsed) {
    const team = entry.buildSettings?.DEVELOPMENT_TEAM?.trim();
    if (team) return team;
  }
  throw new Error(
    'Could not determine DEVELOPMENT_TEAM from the Xcode project. Configure a Development Team in your Xcode project build settings.',
  );
}

export function extractBundleIdentifier(
  showBuildSettingsJson: string,
): string | undefined {
  const parsed = JSON.parse(showBuildSettingsJson) as Array<{
    buildSettings?: Record<string, string>;
  }>;
  for (const entry of parsed) {
    const bs = entry.buildSettings;
    const id = bs?.PRODUCT_BUNDLE_IDENTIFIER?.trim();
    if (
      id &&
      (bs?.PRODUCT_TYPE === 'com.apple.product-type.application' ||
        bs?.WRAPPER_EXTENSION === 'app')
    ) {
      return id;
    }
  }
  for (const entry of parsed) {
    const id = entry.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER?.trim();
    if (id && !id.endsWith('.Extension')) return id;
  }
  return undefined;
}

export function authArgs(opts: {
  keyId: string;
  issuerId: string;
  keyPath: string;
}): string[] {
  return [
    '-authenticationKeyID',
    opts.keyId,
    '-authenticationKeyIssuerID',
    opts.issuerId,
    '-authenticationKeyPath',
    opts.keyPath,
  ];
}

export function archiveArgs(
  opts: {
    xcodeprojPath: string;
    scheme: string;
    archivePath: string;
    teamId: string;
    macosDeploymentTarget: string;
  },
  platform: SafariPlatform,
  auth: string[],
): string[] {
  const args = [
    '-project',
    opts.xcodeprojPath,
    '-scheme',
    opts.scheme,
    '-configuration',
    'Release',
    '-archivePath',
    opts.archivePath,
    'archive',
    '-allowProvisioningUpdates',
    ...auth,
    `DEVELOPMENT_TEAM=${opts.teamId}`,
    'CODE_SIGN_STYLE=Automatic',
  ];
  if (platform === 'macos') {
    args.push(
      `MACOSX_DEPLOYMENT_TARGET=${opts.macosDeploymentTarget}`,
      'ARCHS=x86_64 arm64',
      'ONLY_ACTIVE_ARCH=NO',
    );
  } else {
    args.push('-sdk', 'iphoneos');
  }
  return args;
}

export function exportOptionsPlist(teamId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>teamID</key>
	<string>${teamId}</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>destination</key>
	<string>upload</string>
</dict>
</plist>
`;
}

export function exportArgs(
  opts: { archivePath: string; exportOptionsPath: string; exportPath: string },
  auth: string[],
): string[] {
  return [
    '-exportArchive',
    '-archivePath',
    opts.archivePath,
    '-exportOptionsPlist',
    opts.exportOptionsPath,
    '-exportPath',
    opts.exportPath,
    '-allowProvisioningUpdates',
    ...auth,
  ];
}

export function builtInfoPlistPath(
  archivePath: string,
  projectName: string,
  platform: SafariPlatform,
): string {
  const appPath = join(
    archivePath,
    'Products',
    'Applications',
    `${projectName}.app`,
  );
  return platform === 'macos'
    ? join(appPath, 'Contents', 'Info.plist')
    : join(appPath, 'Info.plist');
}

export async function resolveBuiltInfoPlistPath(
  archivePath: string,
  projectName: string,
  platform: SafariPlatform,
): Promise<string> {
  const appsDir = join(archivePath, 'Products', 'Applications');
  const entries = await readdir(appsDir).catch(() => [] as string[]);
  const appEntry = entries.find(e => e.endsWith('.app'));
  const appName = appEntry ? appEntry.slice(0, -'.app'.length) : projectName;
  return builtInfoPlistPath(archivePath, appName, platform);
}

/**
 * Normalizes an App Store Connect `.p8` private key passed directly as a string
 * (raw PEM, PEM with literal `\n` escapes, or base64-encoded PEM).
 */
export function normalizePrivateKeyP8(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('-----BEGIN')) {
    const normalized = trimmed.replaceAll('\\n', '\n');
    return normalized.endsWith('\n') ? normalized : `${normalized}\n`;
  }
  const decoded = Buffer.from(trimmed.replace(/\s+/g, ''), 'base64')
    .toString('utf8')
    .trim();
  if (!decoded.includes('-----BEGIN')) {
    throw new Error(
      'Invalid safari.privateKey: expected a PEM .p8 private key or base64-encoded PEM',
    );
  }
  return decoded.endsWith('\n') ? decoded : `${decoded}\n`;
}

function parseKeychainList(stdout: string): string[] {
  return stdout
    .split('\n')
    .map(line => line.trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean);
}

/**
 * Imports a base64-encoded `.p12` distribution certificate into a temporary
 * macOS keychain so ephemeral CI runners reuse a single signing identity
 * instead of minting a new Apple certificate on every run.
 */
export async function setupTemporaryKeychain(
  exec: ExecFn,
  workDir: string,
  certificateBase64: string,
  certificatePassword: string = '',
): Promise<() => Promise<void>> {
  const keychainPath = join(workDir, 'app-signing.keychain-db');
  const keychainPassword = randomBytes(24).toString('base64');
  const certPath = join(workDir, 'certificate.p12');

  const existingListRes = await exec('security', [
    'list-keychains',
    '-d',
    'user',
  ]);
  const existingKeychains =
    existingListRes.status === 0
      ? parseKeychainList(existingListRes.stdout)
      : [];

  const existingDefaultRes = await exec('security', [
    'default-keychain',
    '-d',
    'user',
  ]);
  const existingDefault =
    existingDefaultRes.status === 0
      ? parseKeychainList(existingDefaultRes.stdout)[0]
      : undefined;

  const runSecurity = async (args: string[], label: string) => {
    const res = await exec('security', args);
    if (res.status !== 0) {
      throw new Error(
        `Failed to ${label} temporary signing keychain:\n${formatExecOutput(res)}`,
      );
    }
  };

  let created = false;
  try {
    await writeFile(
      certPath,
      Buffer.from(certificateBase64.replace(/\s+/g, ''), 'base64'),
      { mode: 0o600 },
    );
    await runSecurity(
      ['create-keychain', '-p', keychainPassword, keychainPath],
      'create',
    );
    created = true;
    await runSecurity(
      ['set-keychain-settings', '-lut', '21600', keychainPath],
      'configure',
    );
    await runSecurity(
      ['unlock-keychain', '-p', keychainPassword, keychainPath],
      'unlock',
    );
    await runSecurity(
      [
        'import',
        certPath,
        '-P',
        certificatePassword,
        '-A',
        '-t',
        'cert',
        '-f',
        'pkcs12',
        '-k',
        keychainPath,
      ],
      'import certificate into',
    );
    await runSecurity(
      [
        'list-keychains',
        '-d',
        'user',
        '-s',
        keychainPath,
        ...existingKeychains.filter(k => k !== keychainPath),
      ],
      'register',
    );
    await runSecurity(
      ['default-keychain', '-d', 'user', '-s', keychainPath],
      'select default',
    );
    await runSecurity(
      [
        'set-key-partition-list',
        '-S',
        'apple-tool:,apple:,codesign:',
        '-s',
        '-k',
        keychainPassword,
        keychainPath,
      ],
      'set key partition list on',
    );
  } catch (err) {
    if (created) {
      await exec('security', ['delete-keychain', keychainPath]).catch(() => {});
    }
    throw err;
  } finally {
    await rm(certPath, { force: true }).catch(() => {});
  }

  return async () => {
    if (existingKeychains.length > 0) {
      await exec('security', [
        'list-keychains',
        '-d',
        'user',
        '-s',
        ...existingKeychains,
      ]).catch(() => {});
    }
    if (existingDefault) {
      await exec('security', [
        'default-keychain',
        '-d',
        'user',
        '-s',
        existingDefault,
      ]).catch(() => {});
    }
    await exec('security', ['delete-keychain', keychainPath]).catch(() => {});
  };
}

export interface SafariAddonStoreDeps {
  exec?: ExecFn;
  platform?: NodeJS.Platform;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export class SafariAddonStore implements Store {
  private readonly exec: ExecFn;
  private readonly hostPlatform: NodeJS.Platform;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;

  constructor(
    readonly options: SafariAddonStoreOptions,
    readonly setStatus: (text: string) => void,
    deps: SafariAddonStoreDeps = {},
  ) {
    this.exec = deps.exec ?? defaultExec;
    this.hostPlatform = deps.platform ?? process.platform;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.pollIntervalMs = deps.pollIntervalMs ?? 15_000;
    this.pollTimeoutMs = deps.pollTimeoutMs ?? 15 * 60_000;
  }

  private assertMacOS(): void {
    if (this.hostPlatform !== 'darwin') {
      throw new Error(
        `Safari publishing requires macOS (xcodebuild is not available on ${this.hostPlatform})`,
      );
    }
  }

  async ensureZipsExist(): Promise<void> {
    this.assertMacOS();
    await resolveXcodeprojPath(this.options.projectPath);
    if (this.options.privateKey) {
      normalizePrivateKeyP8(this.options.privateKey);
    } else {
      resolveKeyPath({
        keyId: this.options.keyId,
        keyPath: this.options.keyPath,
      });
    }
  }

  async submit(dryRun: boolean): Promise<void> {
    this.assertMacOS();
    const { xcodeprojPath, projectName } = await resolveXcodeprojPath(
      this.options.projectPath,
    );
    const inlinePrivateKeyP8 = this.options.privateKey
      ? normalizePrivateKeyP8(this.options.privateKey)
      : undefined;
    const existingKeyPath = inlinePrivateKeyP8
      ? undefined
      : resolveKeyPath({
          keyId: this.options.keyId,
          keyPath: this.options.keyPath,
        });

    this.setStatus('Inspecting Xcode project schemes');
    const listRes = await this.exec('xcodebuild', [
      '-project',
      xcodeprojPath,
      '-list',
      '-json',
    ]);
    if (listRes.status !== 0) {
      throw new Error(
        `xcodebuild -list failed for ${xcodeprojPath}:\n${formatExecOutput(listRes)}`,
      );
    }
    const listJson = JSON.parse(listRes.stdout) as {
      project?: { schemes?: string[] };
    };
    const projectSchemes = listJson.project?.schemes ?? [];
    const hasSuffixedScheme =
      projectSchemes.includes(`${projectName} (macOS)`) ||
      projectSchemes.includes(`${projectName} (iOS)`);

    let schemes: Partial<Record<SafariPlatform, string>>;
    let settingsStdout: string;

    if (!hasSuffixedScheme && projectSchemes.includes(projectName)) {
      const settingsRes = await this.exec('xcodebuild', [
        '-project',
        xcodeprojPath,
        '-scheme',
        projectName,
        '-showBuildSettings',
        '-json',
      ]);
      if (settingsRes.status !== 0) {
        throw new Error(
          `xcodebuild -showBuildSettings failed:\n${formatExecOutput(settingsRes)}`,
        );
      }
      settingsStdout = settingsRes.stdout;
      const singlePlatform = detectPlatformFromBuildSettings(settingsStdout);
      schemes = detectPlatforms(projectSchemes, projectName, singlePlatform);
    } else {
      schemes = detectPlatforms(projectSchemes, projectName);
      const platforms = PLATFORMS.filter(p => schemes[p]);
      const firstPlatform = platforms[0];
      if (!firstPlatform) {
        throw new Error('No Safari platforms detected in Xcode project');
      }
      const firstScheme = schemes[firstPlatform]!;
      const settingsRes = await this.exec('xcodebuild', [
        '-project',
        xcodeprojPath,
        '-scheme',
        firstScheme,
        '-showBuildSettings',
        '-json',
      ]);
      if (settingsRes.status !== 0) {
        throw new Error(
          `xcodebuild -showBuildSettings failed:\n${formatExecOutput(settingsRes)}`,
        );
      }
      settingsStdout = settingsRes.stdout;
    }

    const platforms = PLATFORMS.filter(p => schemes[p]);
    const teamId = extractDevelopmentTeam(settingsStdout);
    const bundleIdentifier = extractBundleIdentifier(settingsStdout);

    const credentials = inlinePrivateKeyP8
      ? {
          keyId: this.options.keyId,
          issuerId: this.options.issuerId,
          privateKeyP8: inlinePrivateKeyP8,
        }
      : await loadAscCredentials({
          keyId: this.options.keyId,
          issuerId: this.options.issuerId,
          keyPath: existingKeyPath!,
        });
    const api = new SafariAppStoreConnectApi(credentials, this.fetchImpl);

    if (dryRun) {
      this.setStatus('Verifying App Store Connect credentials');
      await api.verifyCredentials();
      if (this.options.appId) {
        this.setStatus(
          `Verifying App Store Connect App ID ${this.options.appId}`,
        );
        await api.verifyAppExists(this.options.appId);
      } else if (!this.options.skipSubmitReview && bundleIdentifier) {
        this.setStatus(
          `Verifying App Store Connect app for ${bundleIdentifier}`,
        );
        await api.findAppIdByBundleId(bundleIdentifier);
      }
      this.setStatus(`Dry run OK (${platforms.join(', ')}, team ${teamId})`);
      return;
    }

    const workDir = await mkdtemp(join(tmpdir(), 'publish-ext-safari-'));
    const uploaded: Array<{
      platform: SafariPlatform;
      version: string;
      buildNumber?: string;
    }> = [];
    let cleanupKeychain: (() => Promise<void>) | undefined;

    try {
      let keyPath = existingKeyPath;
      if (inlinePrivateKeyP8) {
        keyPath = join(workDir, `AuthKey_${this.options.keyId}.p8`);
        await writeFile(keyPath, inlinePrivateKeyP8, { mode: 0o600 });
      }

      if (this.options.certificateBase64) {
        this.setStatus('Importing signing certificate into temporary keychain');
        cleanupKeychain = await setupTemporaryKeychain(
          this.exec,
          workDir,
          this.options.certificateBase64,
          this.options.certificatePassword,
        );
      }

      const auth = authArgs({
        keyId: this.options.keyId,
        issuerId: this.options.issuerId,
        keyPath: keyPath!,
      });

      for (const platform of platforms) {
        const scheme = schemes[platform]!;
        const archivePath = join(workDir, `${platform}.xcarchive`);

        this.setStatus(`Archiving ${platform} (${scheme})`);
        const archiveRes = await this.exec(
          'xcodebuild',
          archiveArgs(
            {
              xcodeprojPath,
              scheme,
              archivePath,
              teamId,
              macosDeploymentTarget: this.options.macosDeploymentTarget,
            },
            platform,
            auth,
          ),
        );
        if (archiveRes.status !== 0) {
          throw new Error(
            `xcodebuild archive failed for ${platform}:\n${formatExecOutput(archiveRes)}`,
          );
        }

        const plistPath = await resolveBuiltInfoPlistPath(
          archivePath,
          projectName,
          platform,
        );
        const versionRes = await this.exec('/usr/libexec/PlistBuddy', [
          '-c',
          'Print CFBundleShortVersionString',
          plistPath,
        ]);
        const builtVersion = versionRes.stdout.trim();
        if (versionRes.status !== 0 || !builtVersion) {
          throw new Error(
            `Failed to read CFBundleShortVersionString from ${plistPath}`,
          );
        }

        const buildNumRes = await this.exec('/usr/libexec/PlistBuddy', [
          '-c',
          'Print CFBundleVersion',
          plistPath,
        ]);
        const buildNumber =
          buildNumRes.status === 0
            ? buildNumRes.stdout.trim() || undefined
            : undefined;

        const exportOptionsPath = join(
          workDir,
          `${platform}-ExportOptions.plist`,
        );
        await writeFile(exportOptionsPath, exportOptionsPlist(teamId));

        this.setStatus(
          `Uploading ${platform} v${builtVersion} to App Store Connect`,
        );
        const exportRes = await this.exec(
          'xcodebuild',
          exportArgs(
            {
              archivePath,
              exportOptionsPath,
              exportPath: join(workDir, `${platform}-export`),
            },
            auth,
          ),
        );
        if (exportRes.status !== 0) {
          throw new Error(
            `xcodebuild -exportArchive failed for ${platform}:\n${formatExecOutput(exportRes)}`,
          );
        }

        uploaded.push({ platform, version: builtVersion, buildNumber });
      }
    } finally {
      if (cleanupKeychain) {
        await cleanupKeychain();
      }
      await rm(workDir, { recursive: true, force: true });
    }

    if (this.options.skipSubmitReview) {
      this.setStatus(
        `Uploaded ${uploaded.map(u => `${u.platform} v${u.version}`).join(', ')} (skipped review submission)`,
      );
      return;
    }

    let appId = this.options.appId;
    if (!appId) {
      if (!bundleIdentifier) {
        throw new Error(
          'Could not determine bundle identifier from the Xcode project — pass --safari-app-id explicitly.',
        );
      }
      this.setStatus(
        `Looking up App Store Connect App ID for ${bundleIdentifier}`,
      );
      appId = await api.findAppIdByBundleId(bundleIdentifier);
    }

    for (const { platform, version, buildNumber } of uploaded) {
      this.setStatus(
        `Waiting for App Store Connect to process ${platform} v${version}`,
      );
      const buildId = await pollUntil(
        () => api.findProcessedBuild(appId, version, platform, buildNumber),
        { interval: this.pollIntervalMs, timeout: this.pollTimeoutMs },
      );

      this.setStatus(`Submitting ${platform} v${version} for App Review`);
      await api.submitBuildForReview(appId, version, platform, buildId);
    }

    this.setStatus(
      `Submitted ${uploaded.map(u => `${u.platform} v${u.version}`).join(', ')} for review`,
    );
  }
}
