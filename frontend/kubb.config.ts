import { defineConfig } from '@kubb/core';
import { pluginClient } from '@kubb/plugin-client';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginReactQuery } from '@kubb/plugin-react-query';
import { pluginTs } from '@kubb/plugin-ts';

export default defineConfig({
  input: {
    path: './openapi/nexo.openapi.json',
  },
  output: {
    path: './src/lib/api/generated',
  },
  plugins: [
    pluginOas(),
    pluginTs({
      output: {
        path: 'types',
        barrelType: 'named',
      },
      enumType: 'asPascalConst',
      enumKeyCasing: 'pascalCase',
      syntaxType: 'interface',
      unknownType: 'unknown',
      paramsCasing: 'camelcase',
    }),
    pluginClient({
      output: {
        path: 'clients',
        barrelType: 'named',
      },
      importPath: '../../generatedClient',
      dataReturnType: 'data',
      paramsType: 'object',
      pathParamsType: 'object',
      paramsCasing: 'camelcase',
    }),
    pluginReactQuery({
      output: {
        path: 'hooks',
        barrelType: 'named',
      },
      client: {
        importPath: '../../generatedClient',
        dataReturnType: 'data',
        clientType: 'function',
        paramsCasing: 'camelcase',
      },
      query: {
        methods: ['get'],
      },
      mutation: {
        methods: ['post', 'put', 'delete'],
      },
      infinite: false,
      suspense: false,
      paramsType: 'object',
      pathParamsType: 'object',
      paramsCasing: 'camelcase',
    }),
  ],
});
