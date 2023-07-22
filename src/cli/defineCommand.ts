import { Flags } from './flags';
import { loadEnv } from './loadEnv';

export function defineCommand(cb: (flags: Flags) => Promise<void> | void) {
  return async (args: any) => {
    loadEnv(args);
    await cb(args);
  };
}
