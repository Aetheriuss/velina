/**
 * Admin API client for the App Router admin port. Talks to the same-origin
 * `/admin-api/api/*` endpoints the Svelte admin used (see services/admin/src/lib/request.ts),
 * preserving its CSRF challenge-retry: a 403 carrying a fresh `x-csrf-token` is retried once.
 */
const BASE = '/admin-api/api';

let _csrf = '';

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Opts {
  body?: unknown;
  headers?: Record<string, string>;
}

const doRequest = async <T>(method: Method, path: string, opts: Opts = {}, isRetry = false): Promise<T> => {
  const headers: Record<string, string> = { 'x-csrf-token': _csrf, ...(opts.headers || {}) };
  let payload: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: payload,
    credentials: 'include',
    redirect: 'manual',
  });
  if (res.status === 403 && res.headers.get('x-csrf-token') && !isRetry) {
    _csrf = res.headers.get('x-csrf-token') as string;
    return doRequest<T>(method, path, opts, true);
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
    const eb = parsed as { errors?: Array<{ message?: string }> };
    if (eb && Array.isArray(eb.errors) && eb.errors.length) {
      message = eb.errors[0].message === 'Unauthorized'
        ? 'You do not have the proper permissions to perform this action.'
        : eb.errors[0].message || message;
    } else if (typeof parsed === 'string' && parsed) {
      message = parsed;
    }
    throw new AdminApiError(message, res.status);
  }
  return parsed as T;
};

export const adminGet = <T = unknown>(path: string, opts?: Opts) => doRequest<T>('GET', path, opts || {});
export const adminPost = <T = unknown>(path: string, body?: unknown, opts?: Opts) =>
  doRequest<T>('POST', path, { ...(opts || {}), body });
export const adminRequest = <T = unknown>(method: Method, path: string, opts?: Opts) =>
  doRequest<T>(method, path, opts || {});
