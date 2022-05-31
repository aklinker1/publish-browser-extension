import snakeCase from 'lodash.snakecase';
import camelCase from 'lodash.camelcase';
import kebabCase from 'lodash.kebabcase';

interface FlagMetadata<T> {
  name: string;
  desc: string;
  type: T extends string ? 'string' : 'boolean';
}
export interface OptionalFlag<T> extends FlagMetadata<T> {
  value?: T;
  required?: false;
}
export interface RequiredFlag<T> extends FlagMetadata<T> {
  required: true;
  value: T;
}
export type Flag<T> = OptionalFlag<T> | RequiredFlag<T>;

export function parseRequiredStringFlag(
  flagName: string,
  desc: string,
): RequiredFlag<string> {
  const flag = parseFlag(flagName, 'string', desc);
  const { value } = flag;
  if (value == null) throw Error(`--${flagName} is required, but not passed`);
  return {
    ...flag,
    required: true,
    value,
  };
}

export function parseFlag<T extends string = string>(
  flagName: string,
  type: 'string',
  desc: string,
): OptionalFlag<T>;
export function parseFlag(
  flagName: string,
  type: 'boolean',
  desc: string,
): OptionalFlag<boolean>;
export function parseFlag(
  flagName: string,
  type: 'boolean' | 'string',
  desc: string,
): OptionalFlag<string | boolean> {
  const partial = { name: flagName, desc, type };

  const envVarName = snakeCase(flagName).toUpperCase();
  const envVar = process.env[envVarName];
  if (envVar) {
    return type === 'boolean'
      ? {
          ...partial,
          value: parseBooleanEnvValue(envVar),
        }
      : {
          ...partial,
          value: parseStringEnvValue(envVar),
        };
  }

  const flagNames = [
    kebabCase(flagName),
    snakeCase(flagName),
    envVarName,
    camelCase(flagName),
  ];
  const [_node, _cmd, ...args] = process.argv;

  return type === 'boolean'
    ? {
        ...partial,
        value: parseBooleanFlagValue(flagNames, args),
      }
    : {
        ...partial,
        value: parseStringFlagValue(flagNames, args),
      };
}

function parseBooleanFlagValue(flagNames: string[], args: string[]): boolean {
  for (const name of flagNames) {
    if (args.includes(`--${name}`)) return true;
  }
  return false;
}

function parseStringFlagValue(
  flagNames: string[],
  args: string[],
): string | undefined {
  for (const name of flagNames) {
    const index = args.indexOf(`--${name}`);
    if (index >= 0) {
      const value = args[index + 1];
      if (!value) throw Error(`--${name} requires a value, but was not passed`);
      return value.trim();
    }
  }
  return undefined;
}

function parseBooleanEnvValue(value: string): boolean {
  return !['false', 'FALSE', 'n', 'N', '0'].includes(value.trim());
}

function parseStringEnvValue(value: string): string {
  return value.trim();
}
