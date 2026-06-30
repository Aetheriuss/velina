/**
 * Typed API client for the App Router tree.
 *
 * The Next app is served same-origin behind the .NET proxy, so API calls use
 * relative `/apisite/{subdomain}{path}` URLs — no absolute base URL or the
 * legacy pages/api/proxy.js indirection is needed in the browser. Cookies
 * (.ROBLOSECURITY, rbxcsrf4) ride along automatically via `credentials`.
 *
 * Preserves the CSRF behavior of lib/request.js: a 403 carrying a fresh
 * `x-csrf-token` response header is retried once with that token.
 */

// Override only if the API is ever served from a different origin.
const API_FORMAT = process.env.NEXT_PUBLIC_API_FORMAT || '/apisite/{0}{1}';

let _csrf = '';

export class ApiError extends Error {
  status: number;
  code?: number;
  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const buildApiUrl = (apiSite: string, path: string): string =>
  API_FORMAT.replace(/\{0\}/g, apiSite).replace(/\{1\}/g, path);

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  /** Parsed `errors[0]` from a roblox-style error body, when present. */
  body?: unknown;
  headers?: Record<string, string>;
  /** When false, do not send/receive cookies (rarely needed). */
  credentials?: boolean;
}

const doRequest = async <T>(
  method: Method,
  url: string,
  opts: RequestOptions = {},
  isRetry = false,
): Promise<T> => {
  const headers: Record<string, string> = {
    'x-csrf-token': _csrf,
    ...(opts.headers || {}),
  };
  let payload: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: payload,
    credentials: opts.credentials === false ? 'omit' : 'include',
    redirect: 'manual',
  });

  // CSRF challenge: capture the rotated token and retry exactly once.
  if (res.status === 403 && res.headers.get('x-csrf-token') && !isRetry) {
    _csrf = res.headers.get('x-csrf-token') as string;
    return doRequest<T>(method, url, opts, true);
  }

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let code: number | undefined;
    const errBody = parsed as { errors?: Array<{ code?: number; message?: string }> };
    if (errBody && Array.isArray(errBody.errors) && errBody.errors.length) {
      code = errBody.errors[0].code;
      message = errBody.errors[0].message || message;
    }
    throw new ApiError(message, res.status, code);
  }

  return parsed as T;
};

/** Call an apisite endpoint, e.g. apiRequest('GET', 'users', '/v1/users/authenticated'). */
export const apiRequest = <T = unknown>(
  method: Method,
  apiSite: string,
  path: string,
  opts?: RequestOptions,
): Promise<T> => doRequest<T>(method, buildApiUrl(apiSite, path), opts);

/** Call a non-apisite same-origin endpoint by raw path, e.g. '/auth/login'. */
export const rawRequest = <T = unknown>(
  method: Method,
  path: string,
  opts?: RequestOptions,
): Promise<T> => doRequest<T>(method, path, opts);
