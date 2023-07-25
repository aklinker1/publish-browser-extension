import { config } from 'dotenv';
import { flags } from './flags';

/**
 * Loads `.env` file environment variables into `process.env` and the `args` object.
 */
export function loadEnv(args: any): void {
  const path = args.envFile ?? '.env.submit';
  config({ path });

  Object.entries(flags).forEach(([key, value]) => {
    if (args[key] == null) args[key] = process.env[value.env];
  });
}
