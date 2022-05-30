import snakeCase from 'lodash.snakecase';
import camelCase from 'lodash.camelcase';
import kebabCase from 'lodash.kebabcase';

export function parseRequiredStringFlag(flagName: string): string {
  const value = parseFlag(flagName, 'string');
  if (!value) throw Error(`--${flagName} is required, but not passed`);
  return value;
}

export function parseFlag(flagName: string, type: 'string'): string | undefined;
export function parseFlag(flagName: string, type: 'boolean'): boolean;
export function parseFlag(
  flagName: string,
  type: 'boolean' | 'string',
): string | boolean | undefined {
  const envVarName = snakeCase(flagName).toUpperCase();
  const envVar = process.env[envVarName];
  if (envVar) {
    return type === 'boolean'
      ? parseBooleanEnv(envVar)
      : parseStringEnv(envVar);
  }

  const flagNames = [
    kebabCase(flagName),
    snakeCase(flagName),
    envVarName,
    camelCase(flagName),
  ];

  const [_node, _cmd, ...args] = process.argv;

  return type === 'boolean'
    ? parseBooleanFlag(flagNames, args)
    : parseStringFlag(flagNames, args);
}

function parseBooleanFlag(flagNames: string[], args: string[]): boolean {
  for (const name of flagNames) {
    if (args.includes(`--${name}`)) return true;
  }
  return false;
}

function parseStringFlag(
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

function parseBooleanEnv(value: string): boolean {
  return !['false', 'FALSE', 'n', 'N', '0'].includes(value.trim());
}

function parseStringEnv(value: string): string {
  return value.trim();
}
