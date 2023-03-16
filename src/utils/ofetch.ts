import { FetchContext } from 'ofetch';

export function addAuthHeader(context: FetchContext, value: string) {
  const key = 'Authorization';
  const { options } = context;

  if (options.headers == null) {
    options.headers = { [key]: value };
  } else if (Array.isArray(options.headers)) {
    options.headers.push([key, value]);
  } else if (options.headers instanceof Headers) {
    options.headers.set(key, value);
  } else {
    options.headers[key] = value;
  }
}
