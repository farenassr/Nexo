import { describe, expect, it } from 'vitest';
import { prepareOpenApiDocument } from './prepare-openapi.mjs';

describe('prepareOpenApiDocument', () => {
  it('moves FastEndpoints route and query DTO fields into OpenAPI parameters', () => {
    const prepared = prepareOpenApiDocument({
      openapi: '3.1.1',
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/v1/items/{ItemId}': {
          get: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GetItemRequest' },
                },
              },
            },
            responses: {},
          },
          put: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UpdateItemRequest' },
                },
              },
            },
            responses: {},
          },
        },
      },
      components: {
        schemas: {
          GetItemRequest: {
            type: 'object',
            properties: {
              itemId: { type: 'string', format: 'uuid' },
              date: { type: 'string', format: 'date' },
            },
          },
          UpdateItemRequest: {
            type: 'object',
            properties: {
              itemId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              width: { type: ['number', 'string'], format: 'double' },
              gridSize: { type: ['null', 'number', 'string'], format: 'double' },
              zIndex: { type: ['integer', 'string'], format: 'int32' },
            },
          },
        },
      },
    });

    expect(prepared.paths['/v1/items/{itemId}'].get.parameters).toEqual([
      expect.objectContaining({ name: 'itemId', in: 'path', required: true }),
      expect.objectContaining({ name: 'date', in: 'query', required: false }),
    ]);
    expect(prepared.paths['/v1/items/{itemId}'].get.requestBody).toBeUndefined();
    expect(prepared.paths['/v1/items/{itemId}'].put.parameters).toEqual([
      expect.objectContaining({ name: 'itemId', in: 'path', required: true }),
    ]);
    expect(prepared.components.schemas.UpdateItemRequest.properties).toEqual({
      name: { type: 'string' },
      width: { type: 'number', format: 'double' },
      gridSize: { type: ['null', 'number'], format: 'double' },
      zIndex: { type: 'integer', format: 'int32' },
    });
  });
});
