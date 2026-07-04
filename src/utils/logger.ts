type Println = (...args: any[]) => void;

const PREFIXES = {
  log: '',
  info: '\x1b[1m\x1b[34mi\x1b[0m',
  warn: '\x1b[1m\x1b[33m‼\x1b[0m',
  error: '\x1b[1m\x1b[31m×\x1b[0m',
  fatal: '\x1b[1m\x1b[31m×\x1b[0m',
  start: '\x1b[2m☐\x1b[0m',
  success: '\x1b[1m\x1b[32m✓\x1b[0m',
};

function buildPrintln(fn: keyof typeof PREFIXES, consoleFn: Println): Println {
  if (PREFIXES[fn])
    return (...args: any[]) => void consoleFn(PREFIXES[fn], ...args);
  return consoleFn;
}

const fatal = buildPrintln('fatal', console.error);

export const logger = {
  log: buildPrintln('log', console.log),
  start: buildPrintln('start', console.log),
  success: buildPrintln('success', console.log),
  info: buildPrintln('info', console.log),
  warn: buildPrintln('warn', console.warn),
  error: buildPrintln('error', console.error),
  fatal: (...args: any[]): never => {
    fatal(...args);
    process.exit(1);
  },
};

export function highlight(text: string): string {
  return `\x1b[36m${text}\x1b[39m`;
}
