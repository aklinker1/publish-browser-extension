import { Readable } from 'node:stream';

export namespace FirefoxApiV5 {
  export const BASE_URL = 'https://addons.mozilla.org';

  export interface AddonDetails {
    id: string;
  }

  export interface UploadDetails {
    uuid: string;
    channel: AddonChannel;
    processed: boolean;
    submitted: boolean;
    url: string;
    valid: boolean;
    validation: {
      errors: number;
      warnings: number;
      notices: number;
    };
    version: string;
  }

  export interface AddonVersion {
    id: number;
    file: {
      id: number;
    };
  }

  export type AddonChannel = 'listed' | 'unlisted';

  export type Endpoints = {
    GET: {
      /**
       * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#detail
       */
      '/api/v5/addons/addon/{idOrSlugOrGuid}': {
        params: {
          idOrSlugOrGuid: string | number;
        };
        response: { type: 'json'; value: AddonDetails };
      };

      /**
       * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-detail
       */
      '/api/v5/addons/upload/{uuid}': {
        params: {
          uuid: string | number;
        };
        response: { type: 'json'; value: UploadDetails };
      };
    };
    POST: {
      /**
       * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#upload-create
       */
      '/api/v5/addons/upload/': {
        body: Readable;
        response: { type: 'json'; value: UploadDetails };
      };

      /**
       * Docs: https://addons-server.readthedocs.io/en/latest/topics/api/addons.html#version-create
       */
      '/api/v5/addons/addon/{idOrSlugOrGuid}/versions/': {
        params: {
          idOrSlugOrGuid: string | number;
        };
        body: Readable;
        response: { type: 'json'; value: AddonVersion };
      };
    };
  };
}
