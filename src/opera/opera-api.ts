import { fetch } from '../utils/fetch';
import { fileFromPath } from 'formdata-node/file-from-path';

// API guessed from : https://addons-static.operacdn.com/static/CACHE/js/catalog.6c1172c19572.js
// And by looking at the HTTP requests while using the website

export interface OperaAddonsApiOptions {}

export interface OperaAddonDetails {
  id: number;
  slug: string;
  name: string;
  type: 'extensions' | (string & {});
  versions: Array<{
    version: string;
    submitted_for_moderation: boolean;
    type: string;
    created: string;
    warnings: unknown[];
    retirejs_warnings: unknown[];
  }>;
  published_versions: Array<{
    name: 'Opera' | (string & {});
    version: unknown | null;
  }>;
  developer: string; // uuid v4
  is_editable: boolean;
  app_id: string;
  category: {
    slug: string;
    name: string;
  };
  warnings: string[];
  unlisted: boolean;
  details_url: `https://addons.opera.com/en/${string}/details/${string}/`;
  is_published: boolean;
  available_auto_moderation: boolean;
  dev_promotional_image: unknown | null;
  is_extension: boolean;
  retirejs_warnings: unknown[];
}

export interface OperaAddonVersionDetails {
  version: string;
  submitted_for_moderation: boolean;
  support: string;
  source_url: string;
  service_url: string | null;
  source_for_moderators_url: string;
  build_instructions: string;
  features: Array<{
    name: string;
  }>;
  file_size: number;
  icon: {
    id: number;
    width: 64;
    height: 64;
    url: string;
  };
  screenshots: Record<number, { id: number; url: string }> | null;
  video: Record<number, { id: number; url: string }> | null;
  license: { url: string; full_text: null } | { url: null; full_text: string };
  privacy_policy:
    | { url: string; full_text: null }
    | { url: null; full_text: string };
  translations: Record<
    string,
    {
      language: {
        code: string;
        name: string;
      };
      short_description: string;
      long_description: string;
      changelog: string | null;
    }
  >;
  type: string;
  created: string;
  warnings: string[];
  download_url: `https://addons.opera.com/en/package/download/revision/${string /* slug */}/${string /* version */}/?zip=1&dev-panel=1`;
  retirejs_warnings: unknown[];
}

export interface OperaCookiesParams {
  ingressCookie: string;
  sessionId: string;
  csrftoken: string;
}

export class OperaAddonsApi {
  constructor(readonly options: OperaAddonsApiOptions) {}

  private addonsUploadCreateEndpoint() {
    return new URL('https://addons.opera.com/api/file-upload/');
  }

  private addonsDetailsEndpoint(packageId: number) {
    return new URL(
      `https://addons.opera.com/api/developer/packages/${packageId}/`,
    );
  }

  private addonsVersionDetailsEndpoint(packageId: number, version: string) {
    return new URL(
      `https://addons.opera.com/api/developer/package-versions/${packageId}-${version}/`,
    );
  }

  /**
   * Get the detailed information about an Opera Addon
   */
  async details(
    params: OperaCookiesParams & {
      packageId: number;
    },
  ): Promise<OperaAddonDetails> {
    const endpoint = this.addonsDetailsEndpoint(params.packageId);

    return await fetch(endpoint.href, {
      method: 'GET',
      headers: {
        accept: 'application/json; version=1.0',
        ...this.getCookieHeaders(params),
      },
    });
  }

  /**
   * Get the detailed information about a package version for an Opera Addon
   */
  async addonVersionDetails(
    params: OperaCookiesParams & {
      packageId: number;
      version: string;
    },
  ): Promise<OperaAddonVersionDetails> {
    const endpoint = this.addonsVersionDetailsEndpoint(
      params.packageId,
      params.version,
    );

    return await fetch(endpoint.href, {
      method: 'GET',
      headers: {
        accept: 'application/json; version=1.0',
        ...this.getCookieHeaders(params),
      },
    });
  }

  private getCookieHeaders(params: OperaCookiesParams) {
    return {
      cookie: `INGRESSCOOKIE_API=${params.ingressCookie}; sessionid=${params.sessionId}; csrftoken=${params.csrftoken};`,
      'x-csrftoken': params.csrftoken,
    };
  }
}
