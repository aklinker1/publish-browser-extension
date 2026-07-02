export namespace v {
  export type ValidationIssue = { message: string; path?: string };

  export type ValidateSuccess<T> = { valid: true; value: T };
  export type ValidateFailure = { valid: false; issues: ValidationIssue[] };
  export type ValidateResult<T> = ValidateSuccess<T> | ValidateFailure;

  export interface BaseSchema<T> {
    '~standard': {
      'validate'(value: unknown): ValidateResult<T>;
    };
  }

  export function safeParse<T>(
    value: unknown,
    schema: BaseSchema<T>,
  ): ValidateResult<T> {
    return schema['~standard'].validate(value);
  }

  export function parse<T>(value: unknown, schema: BaseSchema<T>): T {
    const res = safeParse(value, schema);
    if (res.valid) return res.value;
    throw new v.ValidationError(res.issues);
  }

  function failure(message: string): ValidateFailure {
    return { valid: false, issues: [{ message }] };
  }

  export class ValidationError extends Error {
    constructor(public issues: ValidationIssue[]) {
      super(
        `Validation failed: ${issues.length === 1 ? issues[0]?.message : issues.length + ' issues'}`,
      );
      this.name = 'ValidationError';
    }
  }

  export interface FallbackSchema<T> extends BaseSchema<T> {
    type: 'fallback';
    fallbackValue: T;
  }
  export const fallback = <T>(
    schema: BaseSchema<T>,
    fallbackValue: T,
  ): FallbackSchema<T> => ({
    type: 'fallback',
    fallbackValue,
    '~standard': {
      validate: (value: unknown) => {
        if (value == null) return { valid: true, value: fallbackValue };
        return safeParse(value, schema);
      },
    },
  });

  export interface NullishSchema<T> extends BaseSchema<T> {
    type: 'nullish';
  }
  export const nullish = <T>(schema: BaseSchema<T>): NullishSchema<T> => ({
    type: 'nullish',
    '~standard': {
      validate: (value: unknown) => {
        if (value == null) return { valid: true, value: null as T };
        return safeParse(value, schema);
      },
    },
  });

  export interface BooleanSchema extends BaseSchema<boolean> {
    type: 'boolean';
  }
  export const boolean = (options?: { coerce?: boolean }): BooleanSchema => ({
    type: 'boolean',
    '~standard': {
      validate: (value: unknown) => {
        if (options?.coerce) {
          if (value === 'true') return { valid: true, value: true };
          if (value === 'false') return { valid: true, value: false };
        }

        if (typeof value !== 'boolean')
          return failure('Expected a boolean, received ' + typeof value);

        return { valid: true, value };
      },
    },
  });

  export interface StringSchema extends BaseSchema<string> {
    type: 'string';
    trim: boolean | undefined;
    nonEmpty: boolean | undefined;
  }
  export const string = (options?: {
    trim?: boolean;
    nonEmpty?: boolean;
  }): StringSchema => ({
    type: 'string',
    trim: options?.trim,
    nonEmpty: options?.nonEmpty,
    '~standard': {
      validate: (value: unknown) => {
        if (typeof value !== 'string')
          return failure('Expected a string, received ' + typeof value);

        if (options?.trim && value.trim().length === 0)
          return failure('Expected a non-empty string');

        return { valid: true, value: options?.trim ? value.trim() : value };
      },
    },
  });

  export interface NumberSchema extends BaseSchema<number> {
    type: 'number';
    min: number | undefined;
    max: number | undefined;
  }
  export const number = (options?: {
    min?: number;
    max?: number;
  }): NumberSchema => ({
    type: 'number',
    min: options?.min,
    max: options?.max,
    '~standard': {
      validate: (value: unknown) => {
        if (typeof value !== 'number')
          return failure('Expected a number, received ' + typeof value);

        if (isNaN(value)) return failure('Expected a number, received NaN');

        if (options?.min != null && value < options.min)
          return failure(
            'Expected a number greater than or equal to ' + options.min,
          );

        if (options?.max != null && value > options.max)
          return failure(
            'Expected a number less than or equal to ' + options.max,
          );

        return { valid: true, value };
      },
    },
  });

  export interface OneOfSchema<T> extends BaseSchema<T> {
    type: 'one-of';
    values: T[];
  }
  export const oneOf = <T>(values: T[]): OneOfSchema<T> => ({
    type: 'one-of',
    values,
    '~standard': {
      validate: (value: unknown) => {
        if (!values.includes(value as T))
          return failure('Expected one of ' + values.join(', '));

        return { valid: true, value: value as T };
      },
    },
  });

  export interface ObjectSchema<
    T extends Record<string, unknown>,
  > extends BaseSchema<T> {
    type: 'object';
    shape: { [key in keyof T]: BaseSchema<T[key]> };
    strict?: boolean;
  }
  export const object = <T extends Record<string, unknown>>(
    shape: { [key in keyof T]: BaseSchema<T[key]> },
    options?: { strict?: boolean },
  ): ObjectSchema<T> => ({
    type: 'object',
    shape,
    strict: options?.strict,
    '~standard': {
      validate: (value: unknown) => {
        if (value == null) return failure('Expected an object, received null');

        if (Array.isArray(value))
          return failure('Expected an object, received null');

        if (typeof value !== 'object')
          return failure('Expected an object, received ' + typeof value);

        const entriesValidation = Object.entries(value)
          .map<undefined | [key: keyof T, res: ValidateResult<any>]>(
            ([k, v]) =>
              shape[k]
                ? [k, safeParse(v, shape[k])]
                : options?.strict
                  ? undefined
                  : [k, { valid: true, value: v }],
          )
          .filter(entry => entry != null);

        const errorEntries = entriesValidation.filter(
          (entry): entry is [key: string, error: ValidateFailure] =>
            !entry[1].valid,
        );
        if (errorEntries.length > 0)
          return {
            valid: false,
            issues: errorEntries
              .flatMap(([k, error]) =>
                error.issues.map(i => ({
                  ...i,
                  path: i.path ? i.path + '.' + k : k,
                })),
              )
              .flat(),
          };

        return {
          valid: true,
          value: Object.fromEntries(
            entriesValidation.map(([k, res]) => [
              k,
              (res as ValidateSuccess<any>).value,
            ]),
          ) as T,
        };
      },
    },
  });

  export interface DiscriminatedUnionSchema<
    TKey extends string,
    TSchemaUnion extends ObjectSchema<{ [key in TKey]: any }>,
  > extends BaseSchema<TSchemaUnion> {
    type: 'discriminated-union';
    key: TKey;
    schemas: TSchemaUnion[];
  }
  export const discriminatedUnion = <
    TKey extends string,
    TSchemaUnion extends ObjectSchema<{ [key in TKey]: any }>,
  >(
    key: TKey,
    schemas: TSchemaUnion[],
  ): DiscriminatedUnionSchema<TKey, TSchemaUnion> => ({
    type: 'discriminated-union',
    key,
    schemas,
    '~standard': {
      validate: (value: unknown) => {
        if (value == null) return failure('Expected an object, received null');
        if (Array.isArray(value))
          return failure('Expected an object, received an array');

        if (typeof value !== 'object')
          return failure('Expected an object, received ' + typeof value);

        const discriminator = (value as Record<string, unknown>)[key];
        const schema = schemas.find(
          s => s.shape[key] && safeParse(discriminator, s.shape[key]).valid,
        );
        if (schema)
          return safeParse(value, schema) as ValidateResult<TSchemaUnion>;

        const issues = schemas
          .flatMap<ValidationIssue>(s =>
            s.shape[key]
              ? (safeParse(discriminator, s.shape[key]) as ValidateFailure)
                  .issues
              : {
                  message: 'No schema found for discriminator ' + discriminator,
                },
          )
          .map(i => ({ ...i, path: i.path ? i.path + '.' + key : key }));

        return {
          valid: false,
          issues,
        };
      },
    },
  });
}
