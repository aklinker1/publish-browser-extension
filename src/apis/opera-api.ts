import type {
  OperaAddonApiError,
  OperaAddonDetails,
  OperaAddonFileValidationResponse,
  OperaAddonVersionDetails,
} from './opera-api-types';
import type { DeepPartial } from '../utils/types';

// API guessed from : https://addons-static.operacdn.com/static/CACHE/js/catalog.6c1172c19572.js
// And by looking at the HTTP requests while using the website

export namespace OperaApi {
  export const BASE_URL = 'https://addons.opera.com';

  export interface FileUploadResponse {
    fileId: `${number}-${string}`;
    fileName: string;
  }

  export interface FileValidationRequest {
    file_id: string;
    file_name: string;
    metadata_from: string;
  }

  export type Endpoints = {
    GET: {
      /**
       * Get the detailed information about an Opera Addon.
       */
      '/api/developer/packages/{packageId}/': {
        params: {
          packageId: number;
        };
        response: {
          type: 'json';
          value: OperaAddonDetails | OperaAddonApiError;
        };
      };

      /**
       * Get the detailed information about a specific Opera Addon version.
       */
      '/api/developer/package-versions/{packageId}-{version}/': {
        params: {
          packageId: number;
          version: string;
        };
        response: {
          type: 'json';
          value: OperaAddonVersionDetails | OperaAddonApiError;
        };
      };
    };
    POST: {
      /**
       * Upload a chunk of a new package version for an Opera Addon.
       */
      '/api/file-upload/': {
        body: Bun.BodyInit;
        response: { type: 'json'; value: void };
      };

      /**
       * Bind an uploaded file to an addon package and validate it.
       */
      '/api/developer/package-versions/': {
        query: {
          package_id: number;
        };
        body: FileValidationRequest;
        response: {
          type: 'json';
          value: OperaAddonFileValidationResponse | OperaAddonApiError;
        };
      };

      /**
       * Submit a given version for moderation review.
       *
       * Trailing slash is required - Opera's backend (Django) has
       * APPEND_SLASH=True, so a request without it gets 301-redirected, and
       * fetch will follow the redirect as a GET, causing a 405.
       */
      '/api/developer/package-versions/{packageId}-{version}/submit_for_moderation/': {
        params: {
          packageId: number;
          version: string;
        };
        response: {
          type: 'json';
          value: OperaAddonVersionDetails | OperaAddonApiError;
        };
      };
    };
    PATCH: {
      /**
       * Update the details of a specific Opera Addon version.
       */
      '/api/developer/package-versions/{packageId}-{version}/': {
        params: {
          packageId: number;
          version: string;
        };
        body: DeepPartial<OperaAddonVersionDetails>;
        response: {
          type: 'json';
          value: OperaAddonVersionDetails | OperaAddonApiError;
        };
      };
    };
  };
}
