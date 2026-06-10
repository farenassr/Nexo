import { bffFetch } from './bffFetch';

export type RequestCredentials = 'omit' | 'same-origin' | 'include';

export interface RequestConfig<TData = unknown> {
  baseURL?: string;
  url?: string;
  method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD';
  params?: unknown;
  data?: TData | FormData;
  responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
  signal?: AbortSignal;
  headers?: [string, string][] | Record<string, string> | Headers;
  credentials?: RequestCredentials;
}

export interface ResponseConfig<TData = unknown> {
  data: TData;
  status: number;
  statusText: string;
  headers: Headers;
}

export type ResponseErrorConfig<TError = unknown> = TError;

export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TResponseData>>;

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly payload: unknown;

  constructor(code: string, message: string, status: number, payload: unknown = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.payload = payload;
    this.name = 'ApiClientError';
  }
}

export const apiClient: Client = async <TResponseData, _TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => {
  const path = buildPath(config);
  let response: Response;
  try {
    response = await bffFetch(path, {
      method: config.method ?? 'GET',
      body: config.data instanceof FormData ? config.data : serializeBody(config.data),
      signal: config.signal,
      headers: config.headers,
      credentials: config.credentials,
    });
  } catch {
    throw new ApiClientError('NetworkError', 'No se pudo conectar con el API de restaurante.', 0);
  }

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  return {
    data: (await readResponseData(response)) as TResponseData,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
};

export default apiClient;

function buildPath(config: RequestConfig) {
  const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value === undefined) {
      continue;
    }

    search.append(key, value === null ? 'null' : String(value));
  }

  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

function serializeBody(data: unknown) {
  return data === undefined ? undefined : JSON.stringify(data);
}

async function readResponseData(response: Response) {
  if ([204, 205, 304].includes(response.status) || !response.body) {
    return undefined;
  }

  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return response.text();
  }

  try {
    return await response.json();
  } catch {
    throw new ApiClientError('InvalidResponse', 'La respuesta del API de restaurante no es valida.', response.status);
  }
}

async function toApiClientError(response: Response) {
  const fallback = new ApiClientError(`Http${response.status}`, response.statusText || 'API request failed.', response.status);

  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return fallback;
  }

  try {
    const payload = (await response.json()) as Partial<{ code: string; message: string }>;
    return new ApiClientError(payload.code || fallback.code, payload.message || fallback.message, response.status, payload);
  } catch {
    return fallback;
  }
}
