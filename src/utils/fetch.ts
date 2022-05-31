import { Response } from 'node-fetch';
import { getErrorMessage } from './errors';

/**
 * Ensure the status code is less than 400, or throw an error
 */
export async function checkStatusCode(res: Response) {
  if (res.status >= 400) {
    const body = await res
      .text()
      .catch(
        e => `failed to parse message body as text: ${getErrorMessage(e)}`,
      );
    throw Error(
      `Request failed with status ${res.status} ${res.statusText} and body: ${body}`,
    );
  }
  return res;
}

/**
 * A simple utility that make typing fetch `res.json()` easier
 *
 * @example
 * fetch(...)
 *   .then(responseBody<string>())
 *   .then(body => body.substring(...));
 */
export function responseBody<T>() {
  return (res: Response): Promise<T> => res.json() as any;
}
