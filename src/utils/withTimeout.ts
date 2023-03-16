export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((res, rej) => {
    const timeout = setTimeout(() => rej(`Timed out after ${ms}ms`), ms);
    promise.then(res, rej).finally(() => clearTimeout(timeout));
  });
}
