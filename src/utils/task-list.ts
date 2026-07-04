import tasuku from 'tasuku';
import { logger } from './logger';

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

  // Otherwise, use logger. Tasuku doesn't log anything in these environments
  logger.start(name);
  const t: Task = {
    setOutput: text => logger.log(`\x1b[2m  → [${String(id)}] ${text}\x1b[0m`),
  };
  try {
    await fn(t);
    logger.success(name);
  } catch (err) {
    logger.error(name, err);
    throw err;
  }
}
