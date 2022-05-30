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
