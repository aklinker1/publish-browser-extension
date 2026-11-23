import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { SafariAppStoreConnectApi, signAscJwt } from '../apis/safari-api';
import {
  archiveArgs,
  builtInfoPlistPath,
  detectPlatformFromBuildSettings,
  detectPlatforms,
  exportOptionsPlist,
  extractBundleIdentifier,
  extractDevelopmentTeam,
  formatExecOutput,
  resolveKeyPath,
  resolveXcodeprojPath,
  SafariAddonStore,
  type ExecFn,
} from '../stores/safari-addon-store';
import { resolveConfig, validateConfig } from '../config';
import { pollUntil } from '../utils/polling';

describe('SafariAddonStore helpers', () => {
  it('detects macOS + iOS schemes', () => {
    expect(
      detectPlatforms(['My Ext (macOS)', 'My Ext (iOS)'], 'My Ext'),
    ).toEqual({
      macos: 'My Ext (macOS)',
      ios: 'My Ext (iOS)',
    });
  });

  it('detects single-platform scheme matching project name', () => {
    expect(detectPlatforms(['My Ext'], 'My Ext')).toEqual({
      macos: 'My Ext',
    });
    expect(detectPlatforms(['My Ext'], 'My Ext', 'ios')).toEqual({
      ios: 'My Ext',
    });
  });

  it('detects iOS vs macOS from xcodebuild -showBuildSettings -json', () => {
    expect(
      detectPlatformFromBuildSettings(
        JSON.stringify([{ buildSettings: { SDKROOT: 'iphoneos' } }]),
      ),
    ).toBe('ios');
    expect(
      detectPlatformFromBuildSettings(
        JSON.stringify([{ buildSettings: { SDKROOT: 'macosx' } }]),
      ),
    ).toBe('macos');
    expect(
      detectPlatformFromBuildSettings(
        JSON.stringify([
          {
            buildSettings: { SUPPORTED_PLATFORMS: 'iphoneos iphonesimulator' },
          },
        ]),
      ),
    ).toBe('ios');
    expect(
      detectPlatformFromBuildSettings(
        JSON.stringify([{ buildSettings: { SUPPORTED_PLATFORMS: 'macosx' } }]),
      ),
    ).toBe('macos');
  });

  it('extracts bundle identifier preferring application PRODUCT_TYPE over extension targets', () => {
    const json = JSON.stringify([
      {
        buildSettings: {
          PRODUCT_TYPE: 'com.apple.product-type.app-extension',
          PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app.safari-ext',
        },
      },
      {
        buildSettings: {
          PRODUCT_TYPE: 'com.apple.product-type.application',
          PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app',
        },
      },
    ]);
    expect(extractBundleIdentifier(json)).toBe('com.example.app');

    const fallbackJson = JSON.stringify([
      {
        buildSettings: {
          PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app.Extension',
        },
      },
      { buildSettings: { PRODUCT_BUNDLE_IDENTIFIER: 'com.example.app' } },
    ]);
    expect(extractBundleIdentifier(fallbackJson)).toBe('com.example.app');
  });

  it('expands leading ~/ in explicit keyPath', () => {
    const expected = '/home/user/.keys/AuthKey_K1.p8';
    const found = resolveKeyPath(
      { keyId: 'K1', keyPath: '~/.keys/AuthKey_K1.p8' },
      '/home/user',
      '/work',
      p => p === expected,
    );
    expect(found).toBe(expected);
  });

  it('formats both stderr and stdout in formatExecOutput', () => {
    const out = formatExecOutput({
      status: 1,
      stderr: 'warning: something',
      stdout: 'error: real failure',
    });
    expect(out).toContain('warning: something');
    expect(out).toContain('error: real failure');
  });

  it('throws when no matching scheme exists', () => {
    expect(() => detectPlatforms(['Other'], 'My Ext')).toThrow(
      /No macOS or iOS scheme found/,
    );
  });

  it('extracts DEVELOPMENT_TEAM from xcodebuild -showBuildSettings -json', () => {
    const json = JSON.stringify([
      { buildSettings: { PRODUCT_NAME: 'App' } },
      { buildSettings: { DEVELOPMENT_TEAM: 'ABCDE12345' } },
    ]);
    expect(extractDevelopmentTeam(json)).toBe('ABCDE12345');
  });

  it('throws when DEVELOPMENT_TEAM is missing', () => {
    expect(() =>
      extractDevelopmentTeam(JSON.stringify([{ buildSettings: {} }])),
    ).toThrow(/DEVELOPMENT_TEAM/);
  });

  it('resolves key path from Apple standard directories', () => {
    const expected = '/home/user/.appstoreconnect/private_keys/AuthKey_K1.p8';
    const found = resolveKeyPath(
      { keyId: 'K1' },
      '/home/user',
      '/work',
      p => p === expected,
    );
    expect(found).toBe(expected);
  });

  it('builds archiveArgs for macOS and iOS', () => {
    const auth = [
      '-authenticationKeyID',
      'K1',
      '-authenticationKeyIssuerID',
      'I1',
      '-authenticationKeyPath',
      '/k.p8',
    ];
    const macArgs = archiveArgs(
      {
        xcodeprojPath: '/p/App.xcodeproj',
        scheme: 'App (macOS)',
        archivePath: '/tmp/macos.xcarchive',
        teamId: 'TEAM1',
        macosDeploymentTarget: '12.0',
      },
      'macos',
      auth,
    );
    expect(macArgs).toContain('MACOSX_DEPLOYMENT_TARGET=12.0');
    expect(macArgs).toContain('CODE_SIGN_STYLE=Automatic');
    expect(macArgs).toContain('-allowProvisioningUpdates');

    const iosArgs = archiveArgs(
      {
        xcodeprojPath: '/p/App.xcodeproj',
        scheme: 'App (iOS)',
        archivePath: '/tmp/ios.xcarchive',
        teamId: 'TEAM1',
        macosDeploymentTarget: '12.0',
      },
      'ios',
      auth,
    );
    expect(iosArgs).toContain('-sdk');
    expect(iosArgs).toContain('iphoneos');
  });

  it('builds exportOptionsPlist with destination upload', () => {
    const plist = exportOptionsPlist('TEAM1');
    expect(plist).toContain('<string>app-store-connect</string>');
    expect(plist).toContain('<string>TEAM1</string>');
    expect(plist).toContain('<string>upload</string>');
  });

  it('resolves Info.plist paths for macOS and iOS archives', () => {
    expect(builtInfoPlistPath('/a.xcarchive', 'My App', 'macos')).toBe(
      '/a.xcarchive/Products/Applications/My App.app/Contents/Info.plist',
    );
    expect(builtInfoPlistPath('/a.xcarchive', 'My App', 'ios')).toBe(
      '/a.xcarchive/Products/Applications/My App.app/Info.plist',
    );
  });

  it('signs an ES256 JWT with kid header and IEEE P1363 64-byte signature', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const token = signAscJwt(
      { keyId: 'KEY123', issuerId: 'ISS456', privateKeyP8: pem },
      1700000000,
    );
    const [h, p, s] = token.split('.');
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toEqual({
      alg: 'ES256',
      kid: 'KEY123',
      typ: 'JWT',
    });
    expect(JSON.parse(Buffer.from(p!, 'base64url').toString())).toEqual({
      iss: 'ISS456',
      iat: 1700000000,
      exp: 1700000600,
      aud: 'appstoreconnect-v1',
    });
    // Raw R||S signature for P-256 is always 64 bytes
    expect(Buffer.from(s!, 'base64url').length).toBe(64);
  });
});

describe('Safari config validation', () => {
  it('allows omitting appId (auto-resolved from bundle identifier)', () => {
    const config = validateConfig(
      resolveConfig({
        safari: {
          projectPath: './.output/My Ext',
          issuerId: 'iss-1',
          keyId: 'key-1',
        },
      }),
    );
    expect(config.safari?.skipSubmitReview).toBe(false);
    expect(config.safari?.appId).toBeUndefined();
    expect(config.safari?.macosDeploymentTarget).toBe('12.0');
  });

  it('coerces numeric appId, keyId, and macosDeploymentTarget (from CLI arg parsers like cac) to string', () => {
    const config = validateConfig(
      resolveConfig({
        safari: {
          projectPath: './.output/My Ext',
          issuerId: 'iss-1',
          keyId: 12345 as any,
          appId: 6775834119 as any,
          macosDeploymentTarget: 13 as any,
        },
      }),
    );
    expect(config.safari?.appId).toBe('6775834119');
    expect(config.safari?.keyId).toBe('12345');
    expect(config.safari?.macosDeploymentTarget).toBe('13');
  });
});

describe('pollUntil', () => {
  it('clears interval and rejects cleanly when condition throws', async () => {
    let calls = 0;
    await expect(
      pollUntil(
        async () => {
          calls++;
          throw new Error('fatal processing error');
        },
        { interval: 10, timeout: 1000 },
      ),
    ).rejects.toThrow('fatal processing error');
    expect(calls).toBe(1);
  });
});

describe('SafariAppStoreConnectApi', () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const creds = {
    keyId: 'KEY1',
    issuerId: 'ISS1',
    privateKeyP8: privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString(),
  };

  it('findAppIdByBundleId returns app id or throws when not found', async () => {
    const fetchFound = mock(
      async () =>
        new Response(JSON.stringify({ data: [{ id: '999' }] }), {
          status: 200,
        }),
    );
    const apiFound = new SafariAppStoreConnectApi(
      creds,
      fetchFound as unknown as typeof fetch,
      0,
    );
    expect(await apiFound.findAppIdByBundleId('com.example.app')).toBe('999');

    const fetchEmpty = mock(
      async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    const apiEmpty = new SafariAppStoreConnectApi(
      creds,
      fetchEmpty as unknown as typeof fetch,
      0,
    );
    await expect(
      apiEmpty.findAppIdByBundleId('com.example.missing'),
    ).rejects.toThrow(/No App Store Connect app found/);
  });

  it('findProcessedBuild returns id for VALID, undefined for PROCESSING, and throws fast for INVALID/FAILED', async () => {
    const urls: string[] = [];
    const responses = [
      { data: [{ id: 'b1', attributes: { processingState: 'PROCESSING' } }] },
      { data: [{ id: 'b1', attributes: { processingState: 'VALID' } }] },
      { data: [{ id: 'b2', attributes: { processingState: 'INVALID' } }] },
      { data: [{ id: 'b3', attributes: { processingState: 'FAILED' } }] },
    ];
    let idx = 0;
    const fetchMock = mock(async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response(JSON.stringify(responses[idx++]), { status: 200 });
    });
    const api = new SafariAppStoreConnectApi(
      creds,
      fetchMock as unknown as typeof fetch,
      0,
    );

    expect(
      await api.findProcessedBuild('app1', '1.2.3', 'macos', '42'),
    ).toBeUndefined();
    expect(urls[0]).toContain('filter[version]=42');
    expect(urls[0]).toContain('sort=-uploadedDate');

    expect(await api.findProcessedBuild('app1', '1.2.3', 'macos', '42')).toBe(
      'b1',
    );
    await expect(
      api.findProcessedBuild('app1', '1.2.3', 'macos', '42'),
    ).rejects.toThrow(/state: INVALID/);
    await expect(
      api.findProcessedBuild('app1', '1.2.3', 'macos', '42'),
    ).rejects.toThrow(/state: FAILED/);
  });

  it('retries transient 5xx responses and succeeds', async () => {
    let attempts = 0;
    const fetchMock = mock(async () => {
      attempts++;
      if (attempts < 3) {
        return new Response('server error', { status: 503 });
      }
      return new Response('{}', { status: 200 });
    });
    const api = new SafariAppStoreConnectApi(
      creds,
      fetchMock as unknown as typeof fetch,
      0,
    );
    await api.verifyCredentials();
    expect(attempts).toBe(3);
  });

  it('submitBuildForReview runs all 6 App Store Connect steps', async () => {
    const calls: Array<{ method: string; url: string; body?: any }> = [];
    const fetchMock = mock(
      async (url: string | URL | Request, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        const urlStr = String(url);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ method, url: urlStr, body });

        // 1. Lookup editable versions -> existing older version to rename
        if (method === 'GET' && urlStr.includes('/appStoreVersions?')) {
          return new Response(
            JSON.stringify({
              data: [{ id: 'ver-1', attributes: { versionString: '1.0.0' } }],
            }),
            { status: 200 },
          );
        }
        // 1b. Rename version
        if (
          method === 'PATCH' &&
          urlStr.endsWith('/v1/appStoreVersions/ver-1')
        ) {
          return new Response('{}', { status: 200 });
        }
        // 2. Attach build
        if (
          method === 'PATCH' &&
          urlStr.endsWith('/v1/appStoreVersions/ver-1/relationships/build')
        ) {
          return new Response('', { status: 204 });
        }
        // 3. Localizations lookup
        if (
          method === 'GET' &&
          urlStr.includes(
            '/appStoreVersions/ver-1/appStoreVersionLocalizations',
          )
        ) {
          return new Response(
            JSON.stringify({
              data: [
                { id: 'loc-empty', attributes: { whatsNew: '' } },
                { id: 'loc-filled', attributes: { whatsNew: 'Already set' } },
              ],
            }),
            { status: 200 },
          );
        }
        // 3b. Update empty whatsNew
        if (
          method === 'PATCH' &&
          urlStr.endsWith('/v1/appStoreVersionLocalizations/loc-empty')
        ) {
          return new Response('{}', { status: 200 });
        }
        // 4. Lookup open reviewSubmissions -> none
        if (method === 'GET' && urlStr.includes('/reviewSubmissions?')) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        // 4b. Create reviewSubmission
        if (method === 'POST' && urlStr.endsWith('/v1/reviewSubmissions')) {
          return new Response(JSON.stringify({ data: { id: 'sub-1' } }), {
            status: 201,
          });
        }
        // 5. Lookup items -> empty
        if (
          method === 'GET' &&
          urlStr.includes('/v1/reviewSubmissions/sub-1/items')
        ) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        // 5b. Add item
        if (method === 'POST' && urlStr.endsWith('/v1/reviewSubmissionItems')) {
          return new Response(JSON.stringify({ data: { id: 'item-1' } }), {
            status: 201,
          });
        }
        // 6. Submit reviewSubmission
        if (
          method === 'PATCH' &&
          urlStr.endsWith('/v1/reviewSubmissions/sub-1')
        ) {
          return new Response('{}', { status: 200 });
        }
        throw new Error(`Unexpected request: ${method} ${urlStr}`);
      },
    );

    const api = new SafariAppStoreConnectApi(
      creds,
      fetchMock as unknown as typeof fetch,
      0,
    );
    await api.submitBuildForReview('app-1', '1.2.0', 'macos', 'build-1');

    expect(calls.map(c => `${c.method} ${new URL(c.url).pathname}`)).toEqual([
      'GET /v1/apps/app-1/appStoreVersions',
      'PATCH /v1/appStoreVersions/ver-1',
      'PATCH /v1/appStoreVersions/ver-1/relationships/build',
      'GET /v1/appStoreVersions/ver-1/appStoreVersionLocalizations',
      'PATCH /v1/appStoreVersionLocalizations/loc-empty',
      'GET /v1/apps/app-1/reviewSubmissions',
      'POST /v1/reviewSubmissions',
      'GET /v1/reviewSubmissions/sub-1/items',
      'POST /v1/reviewSubmissionItems',
      'PATCH /v1/reviewSubmissions/sub-1',
    ]);
    expect(calls.at(-1)?.body.data.attributes.submitted).toBe(true);
  });
});

describe('SafariAddonStore', () => {
  let root: string;
  let keyPath: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'pbe-safari-test-'));
    await mkdir(join(root, 'My Ext.xcodeproj'), { recursive: true });
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    keyPath = join(root, 'AuthKey_K1.p8');
    await writeFile(
      keyPath,
      privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('resolves xcodeproj from parent dir or directly', async () => {
    expect((await resolveXcodeprojPath(root)).projectName).toBe('My Ext');
    expect(
      (await resolveXcodeprojPath(join(root, 'My Ext.xcodeproj'))).projectName,
    ).toBe('My Ext');
  });

  it('dryRun verifies credentials without archiving or uploading', async () => {
    const commands: string[][] = [];
    const exec: ExecFn = async (cmd, args) => {
      commands.push([cmd, ...args]);
      if (args.includes('-list')) {
        return {
          status: 0,
          stdout: JSON.stringify({ project: { schemes: ['My Ext (macOS)'] } }),
          stderr: '',
        };
      }
      if (args.includes('-showBuildSettings')) {
        return {
          status: 0,
          stdout: JSON.stringify([
            { buildSettings: { DEVELOPMENT_TEAM: 'TEAM1' } },
          ]),
          stderr: '',
        };
      }
      throw new Error(`Unexpected command: ${cmd} ${args.join(' ')}`);
    };
    const fetchMock = mock(async () => new Response('{}', { status: 200 }));
    const statuses: string[] = [];

    const store = new SafariAddonStore(
      {
        projectPath: root,
        issuerId: 'iss-1',
        keyId: 'K1',
        keyPath,
        macosDeploymentTarget: '12.0',
        skipSubmitReview: true,
      },
      s => statuses.push(s),
      {
        exec,
        platform: 'darwin',
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    await store.ensureZipsExist();
    await store.submit(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(commands.some(c => c.includes('archive'))).toBe(false);
    expect(statuses.at(-1)).toContain('Dry run OK');
  });

  it('archives and uploads with skipSubmitReview without calling ASC REST API', async () => {
    const commands: string[][] = [];
    const exec: ExecFn = async (cmd, args) => {
      commands.push([cmd, ...args]);
      if (args.includes('-list')) {
        return {
          status: 0,
          stdout: JSON.stringify({
            project: { schemes: ['My Ext (macOS)', 'My Ext (iOS)'] },
          }),
          stderr: '',
        };
      }
      if (args.includes('-showBuildSettings')) {
        return {
          status: 0,
          stdout: JSON.stringify([
            { buildSettings: { DEVELOPMENT_TEAM: 'TEAM1' } },
          ]),
          stderr: '',
        };
      }
      if (cmd === '/usr/libexec/PlistBuddy') {
        return { status: 0, stdout: '1.2.3\n', stderr: '' };
      }
      return { status: 0, stdout: '', stderr: '' };
    };
    const fetchMock = mock(async () => new Response('{}', { status: 200 }));

    const store = new SafariAddonStore(
      {
        projectPath: root,
        issuerId: 'iss-1',
        keyId: 'K1',
        keyPath,
        macosDeploymentTarget: '12.0',
        skipSubmitReview: true,
      },
      () => {},
      {
        exec,
        platform: 'darwin',
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    await store.submit(false);

    expect(commands.filter(c => c.includes('archive'))).toHaveLength(2);
    expect(commands.filter(c => c.includes('-exportArchive'))).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects non-macOS host in both ensureZipsExist and submit', async () => {
    const store = new SafariAddonStore(
      {
        projectPath: root,
        issuerId: 'iss-1',
        keyId: 'K1',
        keyPath,
        macosDeploymentTarget: '12.0',
        skipSubmitReview: true,
      },
      () => {},
      { platform: 'linux' },
    );
    await expect(store.ensureZipsExist()).rejects.toThrow(/requires macOS/);
    await expect(store.submit(true)).rejects.toThrow(/requires macOS/);
  });

  it('ensureZipsExist fails on missing projectPath, missing .xcodeproj, or missing keyPath', async () => {
    const base = {
      issuerId: 'iss-1',
      keyId: 'K1',
      keyPath,
      macosDeploymentTarget: '12.0',
      skipSubmitReview: true,
    };

    const missingProject = new SafariAddonStore(
      { ...base, projectPath: join(root, 'does-not-exist') },
      () => {},
      { platform: 'darwin' },
    );
    await expect(missingProject.ensureZipsExist()).rejects.toThrow(
      /does not exist/,
    );

    const emptyDir = await mkdtemp(join(tmpdir(), 'pbe-empty-'));
    try {
      const noXcodeproj = new SafariAddonStore(
        { ...base, projectPath: emptyDir },
        () => {},
        { platform: 'darwin' },
      );
      await expect(noXcodeproj.ensureZipsExist()).rejects.toThrow(
        /No \.xcodeproj found/,
      );
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }

    const missingKey = new SafariAddonStore(
      { ...base, projectPath: root, keyPath: join(root, 'missing.p8') },
      () => {},
      { platform: 'darwin' },
    );
    await expect(missingKey.ensureZipsExist()).rejects.toThrow(
      /key file does not exist/,
    );
  });

  it('dryRun verifies app existence when appId is provided', async () => {
    const exec: ExecFn = async (_cmd, args) => {
      if (args.includes('-list')) {
        return {
          status: 0,
          stdout: JSON.stringify({ project: { schemes: ['My Ext'] } }),
          stderr: '',
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify([
          {
            buildSettings: {
              DEVELOPMENT_TEAM: 'TEAM1',
              SDKROOT: 'iphoneos',
            },
          },
        ]),
        stderr: '',
      };
    };
    const urls: string[] = [];
    const fetchMock = mock(async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response('{}', { status: 200 });
    });
    const statuses: string[] = [];

    const store = new SafariAddonStore(
      {
        projectPath: root,
        issuerId: 'iss-1',
        keyId: 'K1',
        keyPath,
        appId: '6775834119',
        macosDeploymentTarget: '12.0',
        skipSubmitReview: false,
      },
      s => statuses.push(s),
      {
        exec,
        platform: 'darwin',
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );

    await store.submit(true);
    expect(urls).toHaveLength(2);
    expect(urls[1]).toContain('/v1/apps/6775834119');
    expect(statuses.at(-1)).toContain('Dry run OK (ios, team TEAM1)');
  });

  it('runs full Stage 4 flow (poll build + submitBuildForReview) when skipSubmitReview is false', async () => {
    const exec: ExecFn = async (cmd, args) => {
      if (args.includes('-list')) {
        return {
          status: 0,
          stdout: JSON.stringify({ project: { schemes: ['My Ext (macOS)'] } }),
          stderr: '',
        };
      }
      if (args.includes('-showBuildSettings')) {
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              buildSettings: {
                DEVELOPMENT_TEAM: 'TEAM1',
                PRODUCT_TYPE: 'com.apple.product-type.application',
                PRODUCT_BUNDLE_IDENTIFIER: 'com.example.myext',
              },
            },
          ]),
          stderr: '',
        };
      }
      if (cmd === '/usr/libexec/PlistBuddy') {
        if (args.includes('Print CFBundleShortVersionString')) {
          return { status: 0, stdout: '2.0.0\n', stderr: '' };
        }
        if (args.includes('Print CFBundleVersion')) {
          return { status: 0, stdout: '15\n', stderr: '' };
        }
      }
      return { status: 0, stdout: '', stderr: '' };
    };

    const requests: string[] = [];
    const fetchMock = mock(
      async (url: string | URL | Request, init?: RequestInit) => {
        const method = init?.method ?? 'GET';
        const urlStr = String(url);
        requests.push(
          `${method} ${new URL(urlStr).pathname}${new URL(urlStr).search}`,
        );

        if (method === 'GET' && urlStr.includes('filter[bundleId]=')) {
          return new Response(JSON.stringify({ data: [{ id: 'app-42' }] }), {
            status: 200,
          });
        }
        if (method === 'GET' && urlStr.includes('/v1/builds?')) {
          return new Response(
            JSON.stringify({
              data: [
                { id: 'build-99', attributes: { processingState: 'VALID' } },
              ],
            }),
            { status: 200 },
          );
        }
        if (method === 'GET' && urlStr.includes('/appStoreVersions?')) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (method === 'POST' && urlStr.endsWith('/v1/appStoreVersions')) {
          return new Response(JSON.stringify({ data: { id: 'ver-99' } }), {
            status: 201,
          });
        }
        if (method === 'PATCH' && urlStr.includes('/relationships/build')) {
          return new Response('', { status: 204 });
        }
        if (
          method === 'GET' &&
          urlStr.includes('/appStoreVersionLocalizations')
        ) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (method === 'GET' && urlStr.includes('/reviewSubmissions?')) {
          return new Response(JSON.stringify({ data: [{ id: 'sub-99' }] }), {
            status: 200,
          });
        }
        if (method === 'GET' && urlStr.includes('/items?')) {
          return new Response(JSON.stringify({ data: [] }), { status: 200 });
        }
        if (method === 'POST' && urlStr.endsWith('/v1/reviewSubmissionItems')) {
          return new Response(JSON.stringify({ data: { id: 'item-99' } }), {
            status: 201,
          });
        }
        if (
          method === 'PATCH' &&
          urlStr.endsWith('/v1/reviewSubmissions/sub-99')
        ) {
          return new Response('{}', { status: 200 });
        }
        throw new Error(`Unexpected request: ${method} ${urlStr}`);
      },
    );

    const statuses: string[] = [];
    const store = new SafariAddonStore(
      {
        projectPath: root,
        issuerId: 'iss-1',
        keyId: 'K1',
        keyPath,
        macosDeploymentTarget: '12.0',
        skipSubmitReview: false,
      },
      s => statuses.push(s),
      {
        exec,
        platform: 'darwin',
        fetchImpl: fetchMock as unknown as typeof fetch,
        pollIntervalMs: 5,
        pollTimeoutMs: 1000,
      },
    );

    await store.submit(false);

    expect(requests.some(r => r.includes('filter[version]=15'))).toBe(true);
    expect(
      requests.some(r => r.startsWith('PATCH /v1/reviewSubmissions/sub-99')),
    ).toBe(true);
    expect(statuses.at(-1)).toBe('Submitted macos v2.0.0 for review');
  });
});
