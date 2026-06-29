import type { BodyInit } from 'bun';
import { ReadStream } from 'node:fs';

export type Endpoints = {
  [method: string]: {
    [path: `/${string}`]: {
      params?: Record<string, string | number>;
      query?: Record<string, string | number | boolean>;
      body?: FormData | unknown;
      response?: unknown;
    };
  };
};

export type HttpClientInputs<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = Omit<TEndpoints[TMethod][TPath], 'response'> & {
  headers?: Record<string, string>;
  mapResponse?: (
    res: Response,
  ) =>
    | HttpClientResponseValue<TEndpoints, TMethod, TPath>
    | Promise<HttpClientResponseValue<TEndpoints, TMethod, TPath>>;
};

export type HttpClientResponseType<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = TEndpoints[TMethod][TPath] extends { response: { type: string } }
  ? TEndpoints[TMethod][TPath]['response']['type']
  : never;

export type HttpClientResponseValue<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = TEndpoints[TMethod][TPath] extends { response: { value: unknown } }
  ? TEndpoints[TMethod][TPath]['response']['value']
  : never;

export interface HttpClient<TEndpoints extends Endpoints> {
  fetch<
    TMethod extends keyof TEndpoints,
    TPath extends keyof TEndpoints[TMethod],
  >(
    method: TMethod,
    path: TPath,
    inputs: HttpClientInputs<TEndpoints, TMethod, TPath>,
  ): Promise<HttpClientResponseValue<TEndpoints, TMethod, TPath>>;

  get<TPath extends keyof TEndpoints['GET']>(
    path: TPath,
    inputs: HttpClientInputs<TEndpoints, 'GET', TPath>,
  ): Promise<HttpClientResponseValue<TEndpoints, 'GET', TPath>>;

  post<TPath extends keyof TEndpoints['POST']>(
    path: TPath,
    inputs: HttpClientInputs<TEndpoints, 'POST', TPath>,
  ): Promise<HttpClientResponseValue<TEndpoints, 'POST', TPath>>;

  put<TPath extends keyof TEndpoints['PUT']>(
    path: TPath,
    inputs: HttpClientInputs<TEndpoints, 'PUT', TPath>,
  ): Promise<HttpClientResponseValue<TEndpoints, 'PUT', TPath>>;

  delete<TPath extends keyof TEndpoints['DELETE']>(
    path: TPath,
    inputs: HttpClientInputs<TEndpoints, 'DELETE', TPath>,
  ): Promise<HttpClientResponseValue<TEndpoints, 'DELETE', TPath>>;
}

export function createHttpClient<TEndpoints extends Endpoints>(options: {
  baseUrl: string;
  defaultHeaders?:
    | Record<string, string>
    | (() => Promise<Record<string, string>> | Record<string, string>);
}): HttpClient<TEndpoints> {
  const fetch: HttpClient<TEndpoints>['fetch'] = async (
    method,
    path,
    inputs,
  ) => {
    let p = String(path);
    if ('params' in inputs && inputs.params) {
      p = Object.entries(
        inputs.params as Record<string, string | number>,
      ).reduce(
        (url, [key, value]) =>
          url
            .replaceAll(`{${key}}`, String(value))
            .replaceAll(`{+${key}}`, String(value)),
        p,
      );
    }

    const url = new URL(p, options.baseUrl);
    if ('query' in inputs && inputs.query) {
      Object.entries(inputs.query).forEach(([key, value]) => {
        if (value != null) url.searchParams.set(key, String(value));
      });
    }

    let body: { type?: string; value: BodyInit } | undefined;
    if ('body' in inputs && inputs.body) {
      if (inputs.body instanceof FormData) {
        body = { value: inputs.body };
      } else if (inputs.body instanceof ReadStream) {
        body = { value: inputs.body };
      } else {
        body = { type: 'application/json', value: JSON.stringify(inputs.body) };
      }
    }

    const init: RequestInit = {
      method: String(method),
      headers: {
        ...(typeof options.defaultHeaders === 'function'
          ? await options.defaultHeaders()
          : options.defaultHeaders),
        ...(body?.type ? { 'Content-Type': body.type } : {}),
        ...inputs.headers,
      },
      body: body?.value,
    };
    console.log({ url: url.href, ...init }, '\n\n'); // Uncomment to debug

    const res = await globalThis.fetch(url, init);
    if (!res.ok)
      throw new Error(
        `Fetch request failed with code ${res.status} ${res.statusText}: ${await res.text()}`,
      );

    if (inputs.mapResponse) {
      return await inputs.mapResponse(res);
    }

    const contentType = res.headers.get('Content-Type');
    if (contentType == null)
      return undefined as HttpClientResponseValue<
        TEndpoints,
        typeof method,
        typeof path
      >;

    if (contentType?.includes('application/json')) {
      const data = await res.json();
      return data as HttpClientResponseValue<
        TEndpoints,
        typeof method,
        typeof path
      >;
    }

    throw Error(`Unknown response content type: ${contentType}`);
  };

  return {
    fetch,
    get: (...args) => fetch('GET', ...args),
    post: (...args) => fetch('POST', ...args),
    put: (...args) => fetch('PUT', ...args),
    delete: (...args) => fetch('DELETE', ...args),
  };
}
