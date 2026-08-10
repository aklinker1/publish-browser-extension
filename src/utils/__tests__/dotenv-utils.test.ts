import { describe, it, expect } from 'bun:test';
import { setDotenvValue } from '../dotenv-utils';

describe('Dotenv Utils', () => {
  describe('setDotenvValue', () => {
    it('should replace non-quoted values', () => {
      const env = 'TEST=123';
      const expected = 'TEST=456';

      const actual = setDotenvValue(env, 'TEST', '456');

      expect(actual).toBe(expected);
    });

    it('should replace quoted values', () => {
      const env = 'TEST="123"';
      const expected = 'TEST=456';

      const actual = setDotenvValue(env, 'TEST', '456');

      expect(actual).toBe(expected);
    });

    it('should add quotes when there is a quote in the string', () => {
      const env = 'TEST="123"';
      const expected = 'TEST="42\""';

      const actual = setDotenvValue(env, 'TEST', '42"');

      expect(actual).toBe(expected);
    });

    it('should replace everything after an unclosed quote', () => {
      const env = 'TEST_1="a\nTEST_2=b';
      const expected = 'TEST_1=c';

      const actual = setDotenvValue(env, 'TEST_1', 'c');

      expect(actual).toBe(expected);
    });

    it('should include real newlines in values', () => {
      const env = 'TEST=a';
      const expected = 'TEST="a\nb"';

      const actual = setDotenvValue(env, 'TEST', 'a\nb');

      expect(actual).toBe(expected);
    });

    it('should append new values to the end of the file', () => {
      const env = '';
      const expected = 'TEST=123';

      const actual = setDotenvValue(env, 'TEST', '123');

      expect(actual).toBe(expected);
    });

    it('should maintain the trailing new line when adding a key', () => {
      const env = 'TEST_1=123\n';
      const expected = 'TEST_1=123\nTEST_2=456\n';

      const actual = setDotenvValue(env, 'TEST_2', '456');

      expect(actual).toBe(expected);
    });

    it('should maintain no trailing newline when adding a key', () => {
      const env = 'TEST_1=123';
      const expected = 'TEST_1=123\nTEST_2=456';

      const actual = setDotenvValue(env, 'TEST_2', '456');

      expect(actual).toBe(expected);
    });

    it('should ignore comments', () => {
      const env = '# TEST=123\nTEST=456';
      const expected = '# TEST=123\nTEST=789';

      const actual = setDotenvValue(env, 'TEST', '789');

      expect(actual).toBe(expected);
    });
  });
});
