export function setDotenvValue(
  dotenv: string,
  key: string,
  value: string,
): string {
  const needsQuotes = value.includes('"') || value.includes('\n');
  const wrappedValue = needsQuotes ? `"${value}"` : value;

  const keyIndex = findKey(dotenv, key);
  return keyIndex == null
    ? appendKey(dotenv, key, wrappedValue)
    : replaceKey(dotenv, key, wrappedValue, keyIndex);
}

function findKey(dotenv: string, key: string): number | undefined {
  const regex = new RegExp(`(^|\n)\\s*${RegExp.escape(key)}=`, 'm');
  const match = regex.exec(dotenv);
  if (match) return dotenv.indexOf(key, match.index);
  return undefined;
}

function appendKey(dotenv: string, key: string, value: string): string {
  const insert = `${key}=${value}`;
  if (dotenv[dotenv.length - 1] === '\n') return `${dotenv}${insert}\n`;
  if (dotenv.length === 0) return insert;
  return dotenv + `\n${insert}`;
}

function replaceKey(
  dotenv: string,
  key: string,
  wrappedValue: string,
  keyIndex: number,
): string {
  const start = keyIndex + key.length + 1; // +1 for the equals sign
  const hasQuotes = dotenv[start] === '"' || dotenv[start] === "'";

  let end: number;
  if (hasQuotes) {
    const quote = dotenv[start];
    end = start + 1;
    while (
      end < dotenv.length &&
      dotenv[end] !== quote &&
      dotenv[end - 1] !== '\\'
    ) {
      end++;
    }
    end++; // Stopped before the trailing quote, end should include it
  } else {
    end = dotenv.indexOf('\n', start);
    if (end == -1) end = dotenv.length;
  }

  return dotenv.substring(0, start) + wrappedValue + dotenv.substring(end);
}
