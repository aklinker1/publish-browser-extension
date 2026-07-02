import { describe, expect, it } from 'bun:test';
import { v } from '../validation';

describe('Validation Utils', () => {
  describe('boolean', () => {
    it('should parse true correctly', () => {
      expect(v.parse(true, v.boolean())).toBe(true);
    });

    it('should parse false correctly', () => {
      expect(v.parse(false, v.boolean())).toBe(false);
    });

    it('should coerce "true" correctly', () => {
      expect(() => v.parse('true', v.boolean())).toThrow(
        'Expected a boolean, received string',
      );
      expect(v.parse('true', v.boolean({ coerce: true }))).toBe(true);
    });

    it('should coerce "false" correctly', () => {
      expect(() => v.parse('false', v.boolean())).toThrow(
        'Expected a boolean, received string',
      );
      expect(v.parse('false', v.boolean({ coerce: true }))).toBe(false);
    });

    it('should throw for non-boolean inputs', () => {
      expect(() => v.parse(123, v.boolean())).toThrow(
        'Expected a boolean, received number',
      );
    });
  });

  describe('string', () => {
    it('should parse a string correctly', () => {
      expect(v.parse('hello', v.string())).toBe('hello');
    });

    it('should trim a string if specified', () => {
      expect(v.parse('  hello  ', v.string({ trim: true }))).toBe('hello');
    });

    it('should throw for empty strings if specified', () => {
      expect(() => v.parse(' ', v.string({ nonEmpty: true }))).toThrow(
        'Expected a non-empty string, received empty string',
      );
    });

    it('should throw for non-string inputs', () => {
      expect(() => v.parse(123, v.string())).toThrow(
        'Expected a string, received number',
      );
    });
  });
});
