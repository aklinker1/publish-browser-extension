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

export type RestClientInputs<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = Omit<TEndpoints[TMethod][TPath], 'response'> & {
  headers?: Record<string, string>;
};

export type RestClientResponseType<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = TEndpoints[TMethod][TPath] extends { response: { type: string } }
  ? TEndpoints[TMethod][TPath]['response']['type']
  : never;

export type RestClientResponseValue<
  TEndpoints extends Endpoints,
  TMethod extends keyof TEndpoints,
  TPath extends keyof TEndpoints[TMethod],
> = TEndpoints[TMethod][TPath] extends { response: { value: unknown } }
  ? TEndpoints[TMethod][TPath]['response']['value']
  : never;

export interface RestClient<TEndpoints extends Endpoints> {
  fetch<
    TMethod extends keyof TEndpoints,
    TPath extends keyof TEndpoints[TMethod],
  >(
    method: TMethod,
    path: TPath,
    inputs: RestClientInputs<TEndpoints, TMethod, TPath>,
  ): Promise<RestClientResponseValue<TEndpoints, TMethod, TPath>>;

  get<TPath extends keyof TEndpoints['GET']>(
    path: TPath,
    inputs: RestClientInputs<TEndpoints, 'GET', TPath>,
  ): Promise<RestClientResponseValue<TEndpoints, 'GET', TPath>>;

  post<TPath extends keyof TEndpoints['POST']>(
    path: TPath,
    inputs: RestClientInputs<TEndpoints, 'POST', TPath>,
  ): Promise<RestClientResponseValue<TEndpoints, 'POST', TPath>>;

  put<TPath extends keyof TEndpoints['PUT']>(
    path: TPath,
    inputs: RestClientInputs<TEndpoints, 'PUT', TPath>,
  ): Promise<RestClientResponseValue<TEndpoints, 'PUT', TPath>>;

  delete<TPath extends keyof TEndpoints['DELETE']>(
    path: TPath,
    inputs: RestClientInputs<TEndpoints, 'DELETE', TPath>,
  ): Promise<RestClientResponseValue<TEndpoints, 'DELETE', TPath>>;
}

export function createRestClient<TEndpoints extends Endpoints>(options: {
  baseUrl: string;
  defaultHeaders?:
    | Record<string, string>
    | (() => Promise<Record<string, string>> | Record<string, string>);
}): RestClient<TEndpoints> {
  const fetch: RestClient<TEndpoints>['fetch'] = async (
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

    const body =
      'body' in inputs
        ? inputs.body instanceof FormData
          ? { type: 'form', value: inputs.body }
          : { type: 'json', value: JSON.stringify(inputs.body) }
        : undefined;

    const res = await globalThis.fetch(url, {
      method: String(method),
      headers: {
        ...options.defaultHeaders,
        ...(body?.type === 'json'
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...inputs.headers,
      },
      body: body?.value,
    });
    if (!res.ok)
      throw new Error(
        `Fetch request failed with code ${res.status} ${res.statusText}: ${await res.text()}`,
      );

    const contentType = res.headers.get('Content-Type');
    if (contentType?.includes('application/json')) {
      const data = await res.json();
      return data as RestClientResponseValue<
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
