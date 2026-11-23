import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const API_BASE = 'https://api.appstoreconnect.apple.com';
const DEFAULT_WHATS_NEW = 'Bug fixes and improvements.';

export type SafariPlatform = 'macos' | 'ios';

const ASC_PLATFORM: Record<SafariPlatform, string> = {
  macos: 'MAC_OS',
  ios: 'IOS',
};

const EDITABLE_VERSION_STATES = [
  'PREPARE_FOR_SUBMISSION',
  'READY_FOR_REVIEW',
  'REJECTED',
  'METADATA_REJECTED',
  'DEVELOPER_REJECTED',
  'INVALID_BINARY',
];

export interface AscCredentials {
  keyId: string;
  issuerId: string;
  privateKeyP8: string;
}

interface AscResource {
  id: string;
  attributes?: Record<string, unknown>;
}

/**
 * Signs an ES256 JWT for the App Store Connect API using Node's built-in
 * `node:crypto` with IEEE P1363 signature encoding (required by JWS ES256).
 */
export function signAscJwt(
  credentials: AscCredentials,
  nowSec?: number,
): string {
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: credentials.keyId, typ: 'JWT' };
  const payload = {
    iss: credentials.issuerId,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign('SHA256')
    .update(signingInput)
    .sign(
      { key: credentials.privateKeyP8, dsaEncoding: 'ieee-p1363' },
      'base64url',
    );
  return `${signingInput}.${signature}`;
}

export async function loadAscCredentials(opts: {
  keyId: string;
  issuerId: string;
  keyPath: string;
}): Promise<AscCredentials> {
  const privateKeyP8 = await readFile(opts.keyPath, 'utf8');
  return {
    keyId: opts.keyId,
    issuerId: opts.issuerId,
    privateKeyP8,
  };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRY_ATTEMPTS = 3;

export class SafariAppStoreConnectApi {
  constructor(
    private readonly credentials: AscCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly retryDelayMs: number = 500,
  ) {}

  private authHeader(): string {
    return `Bearer ${signAscJwt(this.credentials)}`;
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const res = await this.fetchImpl(`${API_BASE}${path}`, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            authorization: this.authHeader(),
            ...(init.body ? { 'content-type': 'application/json' } : {}),
            ...init.headers,
          },
        });
        if (
          (res.status === 429 || res.status >= 500) &&
          attempt < MAX_RETRY_ATTEMPTS
        ) {
          await new Promise(r => setTimeout(r, this.retryDelayMs * attempt));
          continue;
        }
        return res;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await new Promise(r => setTimeout(r, this.retryDelayMs * attempt));
          continue;
        }
        throw lastError;
      }
    }
    throw lastError;
  }

  async verifyCredentials(): Promise<void> {
    const res = await this.request('/v1/apps?limit=1');
    if (!res.ok) {
      throw new Error(
        `App Store Connect authentication failed (${res.status}): ${await res.text()}`,
      );
    }
  }

  async verifyAppExists(appId: string): Promise<void> {
    const res = await this.request(
      `/v1/apps/${encodeURIComponent(appId)}?fields[apps]=bundleId`,
    );
    if (!res.ok) {
      throw new Error(
        `App Store Connect app "${appId}" lookup failed (${res.status}): ${await res.text()}`,
      );
    }
  }

  async findAppIdByBundleId(bundleId: string): Promise<string> {
    const res = await this.request(
      `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=bundleId&limit=1`,
    );
    if (!res.ok) {
      throw new Error(
        `App Store Connect app lookup failed (${res.status}): ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { data?: AscResource[] };
    const id = body.data?.[0]?.id;
    if (!id) {
      throw new Error(
        `No App Store Connect app found for bundle identifier "${bundleId}". Create the app record in App Store Connect first, or pass --safari-app-id explicitly.`,
      );
    }
    return id;
  }

  async findProcessedBuild(
    appId: string,
    version: string,
    platform: SafariPlatform,
    buildNumber?: string,
  ): Promise<string | undefined> {
    const platformValue = ASC_PLATFORM[platform];
    const buildFilter = buildNumber
      ? `&filter[version]=${encodeURIComponent(buildNumber)}`
      : '';
    const res = await this.request(
      `/v1/builds?filter[app]=${encodeURIComponent(appId)}&filter[preReleaseVersion.version]=${encodeURIComponent(version)}&filter[preReleaseVersion.platform]=${platformValue}&filter[expired]=false${buildFilter}&sort=-uploadedDate&limit=1`,
    );
    if (!res.ok) {
      throw new Error(
        `App Store Connect build lookup failed (${res.status}): ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { data?: AscResource[] };
    const build = body.data?.[0];
    if (!build) return undefined;

    const processingState = build.attributes?.processingState;
    if (processingState === 'INVALID' || processingState === 'FAILED') {
      throw new Error(
        `App Store Connect build processing failed for ${platform} v${version}${buildNumber ? ` (${buildNumber})` : ''} (state: ${processingState})`,
      );
    }
    if (processingState === 'VALID') {
      return build.id;
    }
    return undefined;
  }

  /**
   * Idempotently adopts or creates the editable App Store version for
   * `(appId, platform)`, attaches `buildId`, fills empty "What's New" notes,
   * and submits it through the `reviewSubmissions` API.
   */
  async submitBuildForReview(
    appId: string,
    version: string,
    platform: SafariPlatform,
    buildId: string,
  ): Promise<void> {
    const platformValue = ASC_PLATFORM[platform];

    // 1. Adopt or create the appStoreVersion.
    const versionsRes = await this.request(
      `/v1/apps/${encodeURIComponent(appId)}/appStoreVersions?filter[platform]=${platformValue}&filter[appVersionState]=${EDITABLE_VERSION_STATES.join(',')}&fields[appStoreVersions]=versionString&limit=1`,
    );
    if (!versionsRes.ok) {
      throw new Error(
        `App Store Connect version lookup failed (${versionsRes.status}): ${await versionsRes.text()}`,
      );
    }
    let appStoreVersion = (
      (await versionsRes.json()) as { data?: AscResource[] }
    ).data?.[0];

    if (appStoreVersion) {
      const existing = appStoreVersion.attributes?.versionString;
      if (typeof existing === 'string' && existing !== version) {
        if (compareVersions(existing, version) > 0) {
          throw new Error(
            `App Store Connect already has an editable ${platform} version ${existing}, newer than v${version}`,
          );
        }
        const renameRes = await this.request(
          `/v1/appStoreVersions/${appStoreVersion.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              data: {
                type: 'appStoreVersions',
                id: appStoreVersion.id,
                attributes: { versionString: version },
              },
            }),
          },
        );
        if (!renameRes.ok) {
          throw new Error(
            `App Store Connect version rename failed (${renameRes.status}): ${await renameRes.text()}`,
          );
        }
      }
    } else {
      const createRes = await this.request('/v1/appStoreVersions', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'appStoreVersions',
            attributes: { platform: platformValue, versionString: version },
            relationships: {
              app: { data: { type: 'apps', id: appId } },
            },
          },
        }),
      });
      if (!createRes.ok) {
        throw new Error(
          `App Store Connect version create failed (${createRes.status}): ${await createRes.text()}`,
        );
      }
      appStoreVersion = ((await createRes.json()) as { data: AscResource })
        .data;
    }

    // 2. Attach build to version.
    const attachRes = await this.request(
      `/v1/appStoreVersions/${appStoreVersion.id}/relationships/build`,
      {
        method: 'PATCH',
        body: JSON.stringify({ data: { type: 'builds', id: buildId } }),
      },
    );
    if (!attachRes.ok) {
      throw new Error(
        `App Store Connect build attach failed (${attachRes.status}): ${await attachRes.text()}`,
      );
    }

    // 3. Populate empty "What's New" fields (required by Apple for review).
    const locsRes = await this.request(
      `/v1/appStoreVersions/${appStoreVersion.id}/appStoreVersionLocalizations?limit=50`,
    );
    if (!locsRes.ok) {
      throw new Error(
        `App Store Connect localizations lookup failed (${locsRes.status}): ${await locsRes.text()}`,
      );
    }
    const localizations =
      ((await locsRes.json()) as { data?: AscResource[] }).data ?? [];
    for (const localization of localizations) {
      const whatsNew = localization.attributes?.whatsNew;
      if (typeof whatsNew === 'string' && whatsNew.trim()) continue;
      const notesRes = await this.request(
        `/v1/appStoreVersionLocalizations/${localization.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              id: localization.id,
              attributes: { whatsNew: DEFAULT_WHATS_NEW },
            },
          }),
        },
      );
      if (!notesRes.ok) {
        throw new Error(
          `App Store Connect release notes update failed (${notesRes.status}): ${await notesRes.text()}`,
        );
      }
    }

    // 4. Reuse or create an open draft review submission.
    const openRes = await this.request(
      `/v1/apps/${encodeURIComponent(appId)}/reviewSubmissions?filter[platform]=${platformValue}&filter[state]=READY_FOR_REVIEW&limit=1`,
    );
    if (!openRes.ok) {
      throw new Error(
        `App Store Connect review submission lookup failed (${openRes.status}): ${await openRes.text()}`,
      );
    }
    let submission = ((await openRes.json()) as { data?: AscResource[] })
      .data?.[0];
    if (!submission) {
      const createSubRes = await this.request('/v1/reviewSubmissions', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'reviewSubmissions',
            attributes: { platform: platformValue },
            relationships: {
              app: { data: { type: 'apps', id: appId } },
            },
          },
        }),
      });
      if (!createSubRes.ok) {
        throw new Error(
          `App Store Connect review submission create failed (${createSubRes.status}): ${await createSubRes.text()}`,
        );
      }
      submission = ((await createSubRes.json()) as { data: AscResource }).data;
    }

    // 5. Add the version as a submission item (idempotent).
    const itemsRes = await this.request(
      `/v1/reviewSubmissions/${submission.id}/items?limit=50&include=appStoreVersion`,
    );
    if (!itemsRes.ok) {
      throw new Error(
        `App Store Connect submission items lookup failed (${itemsRes.status}): ${await itemsRes.text()}`,
      );
    }
    const items =
      (
        (await itemsRes.json()) as {
          data?: {
            relationships?: { appStoreVersion?: { data?: { id?: string } } };
          }[];
        }
      ).data ?? [];
    const alreadyAdded = items.some(
      item =>
        item.relationships?.appStoreVersion?.data?.id === appStoreVersion.id,
    );
    if (!alreadyAdded) {
      const addItemRes = await this.request('/v1/reviewSubmissionItems', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'reviewSubmissionItems',
            relationships: {
              reviewSubmission: {
                data: { type: 'reviewSubmissions', id: submission.id },
              },
              appStoreVersion: {
                data: { type: 'appStoreVersions', id: appStoreVersion.id },
              },
            },
          },
        }),
      });
      if (!addItemRes.ok) {
        const body = await addItemRes.text();
        if (!(addItemRes.status === 409 && body.includes('already added'))) {
          throw new Error(
            `App Store Connect submission item add failed (${addItemRes.status}): ${body}`,
          );
        }
      }
    }

    // 6. Submit for review.
    const submitRes = await this.request(
      `/v1/reviewSubmissions/${submission.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            type: 'reviewSubmissions',
            id: submission.id,
            attributes: { submitted: true },
          },
        }),
      },
    );
    if (!submitRes.ok) {
      throw new Error(
        `App Store Connect review submit failed (${submitRes.status}): ${await submitRes.text()}`,
      );
    }
  }
}
