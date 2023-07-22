import consola from 'consola';
import pc from 'picocolors';

export type Logger = typeof consola;

export function printTable(
  log: (message: string) => void,
  rows: string[][],
  gap = 2,
): void {
  if (rows.length === 0) return;

  const columnWidths = rows.reduce(
    (widths, row) => {
      for (let i = 0; i < Math.max(widths.length, row.length); i++) {
        widths[i] = Math.max(row[i]?.length ?? 0, widths[i] ?? 0);
      }
      return widths;
    },
    rows[0].map(column => column.length),
  );

  let str = '';
  rows.forEach((row, i) => {
    row.forEach((col, j) => {
      str += col.padEnd(columnWidths[j], ' ');
      if (j !== row.length - 1) str += ''.padEnd(gap, ' ');
    });
    if (i !== rows.length - 1) str += '\n';
  });

  log(str);
}

export function printStoreOptions(logger: Logger, name: string, options: any) {
  logger.info(name);

  const secretKeys: string[] = [
    'clientId',
    'clientSecret',
    'refreshToken',
    'jwtIssuer',
    'jwtSecret',
  ];

  const maxWidth = 40;

  printTable(
    logger.log,
    Object.entries(options).map(([key, value], i, array) => {
      let v = String(value);
      const isSecret = secretKeys.includes(key);
      if (isSecret) v = v.replaceAll(/./g, '*');
      if (v.length > maxWidth && process.env.CI !== 'true')
        v = v.substring(0, maxWidth - 3) + '...';
      const prefix = i === array.length - 1 ? '└─' : '├─';
      return [pc.dim(`  ${prefix} ${key}:`.padEnd(22, ' ')), pc.blue(v)];
    }),
  );
}
