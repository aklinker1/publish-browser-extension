import consola from 'consola';
import { config } from 'dotenv';
import { snakeToCamel } from './flags';

/**
 * Loads `.env` file environment variables into `process.env` and the `args` object.
 */
export function loadEnv(args: any): void {
  const path = args.envFile ?? '.env.submit';
  const env = config({ path });
  if (env.error) {
    consola.debug(env.error);
  }

  Object.entries(env.parsed ?? {}).forEach(([key, value]) => {
    const camelKey = snakeToCamel(key);
    if (args[camelKey] == null && value) args[camelKey] = value;
  });
}
