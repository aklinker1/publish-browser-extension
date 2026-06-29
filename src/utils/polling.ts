export function pollUntil(options: {
  interval?: number;
  timeout?: number;
  condition: () => Promise<boolean>;
}): Promise<void> {
  const {
    interval = 5e3, // 5 seconds
    timeout = 10 * 60e3, // 10 minutes
    condition,
  } = options;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      const duration = Date.now() - start;
      if (duration > timeout) {
        clearInterval(intervalId);
        reject(new Error('Timeout'));
        return;
      }
      if (await condition()) {
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
}
