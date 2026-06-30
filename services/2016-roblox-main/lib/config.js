// Runtime configuration, sourced from environment variables (Phase 1).
//
// Unlike next/config's serverRuntimeConfig/publicRuntimeConfig (Pages Router only),
// this resolves in both the Pages Router and the App Router. The original
// { serverRuntimeConfig, publicRuntimeConfig } shape is preserved so existing
// consumers (lib/request.js, lib/getFlag.js, pages/api/*) keep working unchanged.
//
// Env vars are populated from config.json by next.config.js (or set directly). The
// NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they MUST
// be read as static `process.env.NEXT_PUBLIC_*` property accesses below — never via a
// computed key, or the inlining will not happen. The BACKEND_* secrets are server-only
// and resolve to undefined in the browser, which is fine: they are only read server-side.

const parseFlags = () => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_FLAGS || '{}');
  } catch (e) {
    return {};
  }
};

const config = {
  serverRuntimeConfig: {
    backend: {
      csrfKey: process.env.BACKEND_CSRF_KEY,
      authorization: process.env.BACKEND_AUTHORIZATION,
      authorizationHeader: process.env.BACKEND_AUTHORIZATION_HEADER,
    },
  },
  publicRuntimeConfig: {
    backend: {
      proxyEnabled: process.env.NEXT_PUBLIC_PROXY_ENABLED !== 'false',
      flags: parseFlags(),
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      apiFormat: process.env.NEXT_PUBLIC_API_FORMAT,
    },
  },
};

export default config;
