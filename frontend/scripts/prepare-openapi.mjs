import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head']);
const parameterOnlyMethods = new Set(['get', 'delete']);

export function prepareOpenApiDocument(document) {
  const prepared = structuredClone(document);
  const paths = {};

  normalizeNumericSchemas(prepared);

  for (const [path, pathItem] of Object.entries(prepared.paths ?? {})) {
    const pathNameMap = getPathNameMap(path);
    const normalizedPath = normalizePath(path, pathNameMap);
    const normalizedPathParams = new Set(Object.values(pathNameMap));
    const normalizedPathItem = { ...pathItem };

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!httpMethods.has(method) || !operation) {
        continue;
      }

      const requestSchema = getRequestSchema(prepared, operation);
      const properties = requestSchema?.properties ?? {};
      const required = new Set(requestSchema?.required ?? []);
      const existingParameters = operation.parameters ?? [];
      const generatedParameters = [];

      for (const normalizedName of normalizedPathParams) {
        const property = findProperty(properties, normalizedName);
        generatedParameters.push({
          name: normalizedName,
          in: 'path',
          required: true,
          schema: property?.schema ?? { type: 'string' },
        });
      }

      if (parameterOnlyMethods.has(method) && requestSchema) {
        for (const [propertyName, schema] of Object.entries(properties)) {
          const normalizedName = normalizeName(propertyName);
          if (normalizedPathParams.has(normalizedName)) {
            continue;
          }

          generatedParameters.push({
            name: normalizedName,
            in: 'query',
            required: required.has(propertyName),
            schema,
          });
        }

        delete operation.requestBody;
      } else if (requestSchema && normalizedPathParams.size > 0) {
        removePathPropertiesFromRequestSchema(requestSchema, normalizedPathParams);
        if (Object.keys(requestSchema.properties ?? {}).length === 0) {
          delete operation.requestBody;
        }
      }

      operation.parameters = mergeParameters(existingParameters, generatedParameters);
    }

    paths[normalizedPath] = normalizedPathItem;
  }

  prepared.paths = paths;
  return prepared;
}

function normalizeNumericSchemas(document) {
  for (const schema of Object.values(document.components?.schemas ?? {})) {
    normalizeNumericSchema(schema);
  }
}

function normalizeNumericSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (Array.isArray(schema.type) && schema.type.includes('number') && schema.type.includes('string')) {
    schema.type = schema.type.includes('null') ? ['null', 'number'] : 'number';
  }

  if (Array.isArray(schema.type) && schema.type.includes('integer') && schema.type.includes('string')) {
    schema.type = schema.type.includes('null') ? ['null', 'integer'] : 'integer';
  }

  for (const property of Object.values(schema.properties ?? {})) {
    normalizeNumericSchema(property);
  }

  if (schema.items) {
    normalizeNumericSchema(schema.items);
  }
}

function getPathNameMap(path) {
  return Object.fromEntries([...path.matchAll(/{([^}]+)}/g)].map((match) => [match[1], normalizeName(match[1])]));
}

function normalizePath(path, pathNameMap) {
  return path.replace(/{([^}]+)}/g, (_, name) => `{${pathNameMap[name]}}`);
}

function normalizeName(name) {
  return name.length === 0 ? name : `${name[0].toLowerCase()}${name.slice(1)}`;
}

function getRequestSchema(document, operation) {
  const schema = Object.values(operation.requestBody?.content ?? {})[0]?.schema;
  if (!schema) {
    return null;
  }

  if (schema.$ref) {
    return resolveSchemaRef(document, schema.$ref);
  }

  return schema;
}

function resolveSchemaRef(document, ref) {
  const schemaName = ref.replace('#/components/schemas/', '');
  return document.components?.schemas?.[schemaName] ?? null;
}

function findProperty(properties, normalizedName) {
  for (const [propertyName, schema] of Object.entries(properties)) {
    if (normalizeName(propertyName).toLowerCase() === normalizedName.toLowerCase()) {
      return { propertyName, schema };
    }
  }

  return null;
}

function removePathPropertiesFromRequestSchema(schema, normalizedPathParams) {
  for (const propertyName of Object.keys(schema.properties ?? {})) {
    if (normalizedPathParams.has(normalizeName(propertyName))) {
      delete schema.properties[propertyName];
    }
  }

  schema.required = (schema.required ?? []).filter((propertyName) => !normalizedPathParams.has(normalizeName(propertyName)));
  if (schema.required.length === 0) {
    delete schema.required;
  }
}

function mergeParameters(existingParameters, generatedParameters) {
  const merged = [...existingParameters];
  for (const parameter of generatedParameters) {
    const exists = merged.some((current) => current.name === parameter.name && current.in === parameter.in);
    if (!exists) {
      merged.push(parameter);
    }
  }

  return merged;
}

async function runCli() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/prepare-openapi.mjs <input-openapi.json> <output-openapi.json>');
    process.exitCode = 1;
    return;
  }

  const document = JSON.parse(await readFile(inputPath, 'utf8'));
  const prepared = prepareOpenApiDocument(document);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(prepared, null, 2)}\n`);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
if (isCli) {
  await runCli();
}
