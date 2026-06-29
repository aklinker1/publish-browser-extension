export function Todo(message: string): Error {
  return Error(`Todo: ${message}`);
}

export function NotImplemented(method: string): Error {
  return Error(`Not implemented: ${method}`);
}

export function getErrorMessage(err: any): string {
  if (err instanceof Error) return err.message;
  if (['string', 'number', 'boolean'].includes(typeof err)) return '' + err;
  return JSON.stringify(err);
}

export class FetchError extends Error {
  static async from(response: Response): Promise<Error> {
    const body = await response.text().catch(err => err.message);
    return new FetchError(response, body);
  }

  private constructor(
    public response: Response,
    public body: string,
    options?: ErrorOptions,
  ) {
    super(`Fetch error: ${response.status} ${response.text}: ${body}`, options);
  }
}
