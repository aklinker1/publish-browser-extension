export namespace EdgeApiV1_1 {
  export const BASE_URL = 'https://api.addons.microsoftedge.microsoft.com';

  export interface EdgeTokenDetails {
    access_token: string;
    expires_in: number;
    token_type: string;
  }

  export interface DraftResponse {
    operationId: string;
  }

  /**
   * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/addons-api-reference#response-1
   */
  export interface DraftOperation {
    id: string;
    createdTime: string;
    lastUpdatedTime: string;
    status: 'InProgress' | 'Succeeded' | 'Failed';
    message: string | null;
    errorCode: string | null;
    errors: string[] | null;
  }

  export type Endpoints = {
    GET: {
      /**
       * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#checking-the-status-of-a-package-upload
       */
      '/v1/products/{productId}/submissions/draft/package/operations/{operationId}': {
        params: {
          productId: string;
          operationId: string;
        };
        response: { type: 'json'; value: DraftOperation };
      };
    };
    POST: {
      /**
       * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#uploading-a-package-to-update-an-existing-submission
       */
      '/v1/products/{productId}/submissions/draft/package': {
        params: {
          productId: string;
        };
        body: Bun.BodyInit;
        response: { type: 'json'; value: DraftResponse };
      };
      /**
       * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/api/using-addons-api#publishing-the-submission
       */
      '/v1/products/{productId}/submissions': {
        params: {
          productId: string;
        };
        /** Yes, an empty object for some reason. */
        body: {};
      };
    };
  };
}
