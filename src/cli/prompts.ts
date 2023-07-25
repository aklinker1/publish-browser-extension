import prompts, { PromptObject, Answers } from 'prompts';

type CustomPrompt<T extends string> = PromptObject<T> & {
  /**
   * Custom message to display before the prompt.
   */
  tip?: string;
  isSkipped?: (results: Answers<any>) => boolean;
  onBefore?: (
    results: Answers<any>,
    item: CustomPrompt<string>,
  ) => void | Promise<void>;
  onAfter?: (
    results: Answers<any>,
    item: CustomPrompt<string>,
  ) => void | Promise<void>;
};

export async function createPrompts<T extends string = string>(
  items: CustomPrompt<T>[],
): Promise<Answers<T>> {
  const results: Answers<any> = {};
  for (const { isSkipped, onBefore, onAfter, ...item } of items) {
    if (isSkipped?.(results)) continue;

    await onBefore?.(results, item);

    if (item.tip) {
      console.log();
      console.log(`\x1b[2m${item.tip}\x1b[0m`);
    }

    const res = await prompts(item, {
      onCancel: () => process.exit(1),
    });
    Object.assign(results, res);

    await onAfter?.(results, item);
  }
  return results;
}
