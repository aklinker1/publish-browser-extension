import { format } from 'prettier';

const version = (process.argv[2] ?? 'v2') as 'v1.1' | 'v2';
const url = `https://chromewebstore.googleapis.com/$discovery/rest?version=${version}`;
console.log('Generating types for: ' + url);

const docRes = await fetch(url);
if (!docRes.ok) throw Error('Fetch request failed', { cause: docRes });

const doc = (await docRes.json()) as DiscoveryDoc.Document;

const mod = [
  "import type { BodyInit } from 'bun'",
  `export namespace CwsApiV${version.slice(1).replace('.', '_')} {`,
  `  export const BASE_URL = '${doc.baseUrl}';`,
  ...Object.entries(doc.schemas).map(([name, schema]) =>
    generateSchemaTypeDefinition(name, schema),
  ),
  generateEndpointTypes(),
  '}',
];

const outputFile = `src/chrome/cws-api-${version}.gen.ts`;
const formatted = await format(mod.join('\n\n'), { filepath: outputFile });
await Bun.write(outputFile, formatted);

namespace DiscoveryDoc {
  export type BooleanSchemaDef = {
    type: 'boolean';
    description?: string;
  };
  export type StringSchemaDef = {
    type: 'string';
    description?: string;
    enum?: string[];
    enumDescriptions?: string[];
  };
  export type IntegerSchemaDef = {
    type: 'integer';
    format: 'int32' | unknown;
    description?: string;
    enum?: string[];
    enumDescriptions?: string[];
  };
  export type ObjectSchemaDef = {
    type: 'object';
    description?: string;
    properties: Record<string, Schema>;
  };
  export type ArraySchemaDef = {
    type: 'array';
    description?: string;
    items: Schema;
  };
  export type SchemaRef = {
    $ref: string;
  };
  export type SchemaDef =
    | BooleanSchemaDef
    | StringSchemaDef
    | IntegerSchemaDef
    | ObjectSchemaDef
    | ArraySchemaDef;
  export type Schema = SchemaDef | SchemaRef;

  export type MethodDef = {
    id: string;
    description: string;
    path: string;
    flatPath: string;
    httpMethod: string;
    supportsMediaUpload?: boolean;
    mediaUpload?: {
      accept: `${string}/${string}`[];
      maxSize: number;
      protocols: unknown;
    };
    parameters: Record<
      string,
      Schema & { location: 'path' | 'query' | unknown; required?: boolean }
    >;
    request?: Schema;
    response?: Schema;
  };
  export type Methods = {
    [name: string]: MethodDef;
  };
  export type Resources = {
    [name: string]: { resources: Resources } | { methods: Methods };
  };

  export type Document = {
    baseUrl: string;
    schemas: Record<string, Schema & { id: string }>;
    resources: Resources;
  };
}

function jsdoc(text: string): string {
  return ['/**', ...text.split('\n').map(line => ` * ${line}`), ' */'].join(
    '\n',
  );
}

function generateSchemaTypeDefinition(
  name: string,
  schema: DiscoveryDoc.Schema,
): string {
  return `export type ${name} = ${generateSchemaType(schema)}`;
}

function resolveRef(schema: DiscoveryDoc.SchemaRef): string {
  const resolved = doc.schemas[schema.$ref];
  if (!resolved) throw Error('Unknown schema ref: ' + schema.$ref);
  return resolved.id;
}

function generateObjectType(
  properties: Record<string, DiscoveryDoc.Schema & { required?: boolean }>,
): string {
  const props = Object.entries(properties).flatMap(([name, type]) => {
    return [
      ...('description' in type && type.description
        ? [jsdoc(type.description)]
        : []),
      `  "${name}"${type.required ? '' : '?'}: ${generateSchemaType(type)};`,
    ];
  });
  return `{ ${props.join('\n')} }`;
}

export function generateSchemaType(schema: DiscoveryDoc.Schema): string {
  if ('$ref' in schema) return resolveRef(schema);

  if ('enum' in schema && schema.enum)
    return schema.enum
      .map(value => (typeof value === 'string' ? `"${value}"` : value))
      .join(' | ');

  if (schema.type === 'integer') return 'number';
  if (schema.type === 'string') return 'string';
  if (schema.type === 'boolean') return 'boolean';

  if (schema.type === 'object') return generateObjectType(schema.properties);

  if (schema.type === 'array')
    return `Array<${generateSchemaType(schema.items)}>`;

  throw Error(`Unsupported schema type: ${JSON.stringify(schema, null, 2)}`);
}

function getAllMethods(
  resources: DiscoveryDoc.Resources,
): DiscoveryDoc.MethodDef[] {
  return Object.values(resources).flatMap(resource => {
    if ('methods' in resource) return Object.values(resource.methods);
    if ('resources' in resource) return getAllMethods(resource.resources);
    return [];
  });
}

function generateEndpointTypes(): string {
  const methods = getAllMethods(doc.resources).reduce((map, method) => {
    const key = method.httpMethod ?? '""';
    map[key] ??= [];
    map[key].push(`"/${method.path}": ${generateMethodType(method)}`);
    return map;
  }, Object.create(null));

  return `
    export type Endpoints = {
      ${Object.entries(methods)
        .flatMap(([httpMethod, types]) => `${httpMethod}: { ${types} };`)
        .join('\n')}
    }
  `;
}

function generateMethodType(method: DiscoveryDoc.MethodDef): string {
  const params = generateMethodParamsType(method.parameters);
  const query = generateMethodQueryType(method.parameters);
  const body = generateMethodBodyType(method);
  const response = generateMethodResponseType(method.response);
  return `
    {
      ${params === 'never' ? '' : `params: ${params},`}
      ${query === 'never' ? '' : `query?: ${query},`}
      ${body === 'never' ? '' : `body: ${body},`}
      ${response === 'never' ? '' : `response: ${response},`}
    }
  `;
}

function generateMethodParamsType(
  parameters: DiscoveryDoc.MethodDef['parameters'],
): string {
  const entries = Object.entries(parameters).filter(
    ([_, p]) => p.location === 'path',
  );
  if (entries.length === 0) return 'never';

  return generateObjectType(Object.fromEntries(entries));
}

function generateMethodQueryType(
  parameters: DiscoveryDoc.MethodDef['parameters'],
): string {
  const entries = Object.entries(parameters).filter(
    ([_, p]) => p.location === 'query',
  );
  if (entries.length === 0) return 'never';

  return generateObjectType(Object.fromEntries(entries));
}

function generateMethodBodyType(method: DiscoveryDoc.MethodDef): string {
  if (method.mediaUpload) return `BodyInit`;

  if (method.request) return generateSchemaType(method.request);

  return 'never';
}

function generateMethodResponseType(
  response: DiscoveryDoc.MethodDef['response'],
): string {
  if (!response) return 'never';

  return `{ type: "json", value: ${generateSchemaType(response)} }`;
}
