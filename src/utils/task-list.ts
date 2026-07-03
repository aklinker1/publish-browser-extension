import consola from 'consola';
import tasuku from 'tasuku';

export type Task = { setOutput: (text: string) => void };

export async function task<T>(
  id: any,
  name: string,
  fn: (task: Task) => Promise<T>,
): Promise<void> {
  // Use Tasuku for nice animations when possible
  if (process.stdout.isTTY && !process.env.CI) {
    return tasuku(name, fn).then(() => {});
  }

  // Otherwise, use consola. Tasuku doesn't log anything in these environments
  consola.start(name);
  const t: Task = {
    setOutput: text => consola.log(`\x1b[2m  → [${String(id)}] ${text}\x1b[0m`),
  };
  try {
    await fn(t);
    consola.success(name);
  } catch (err) {
    consola.error(name, err);
    throw err;
  }
}
