export function plural(
  count: number,
  word: string,
  pluralForm?: string,
): string {
  if (count === 1) return `${count} ${word}`;
  return `${count} ${pluralForm ?? `${word}s`}`;
}
