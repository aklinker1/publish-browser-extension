export function pollUntil<T>(
  condition: () => Promise<T | undefined>,
  options?: {
    interval?: number;
    timeout?: number;
  },
): Promise<T> {
  const {
    interval = 5e3, // 5 seconds
    timeout = 10 * 60e3, // 10 minutes
  } = options ?? {};
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      const duration = Date.now() - start;
      if (duration > timeout) {
        clearInterval(intervalId);
        reject(new Error('Timeout'));
        return;
      }
      const res = await condition();
      if (res != null) {
        clearInterval(intervalId);
        resolve(res);
      }
    }, interval);
  });
}
