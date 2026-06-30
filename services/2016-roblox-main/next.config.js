const fs = require('fs');
const path = require('path');

// Phase 1: runtime configuration now flows through environment variables instead of
// next/config's serverRuntimeConfig/publicRuntimeConfig. Those only resolve in the
// Pages Router (getConfig() returns null under the App Router), so the App Router tree
// (lib/apiClient.ts, app/*) could never read them. Env vars work in both routers.
//
// For backwards-compatibility we still read the legacy config.json (gitignored) and map
// it onto process.env here, BEFORE Next compiles. Any value already present in the real
// environment wins, so an env-only deployment (no config.json) also works.
const configPath = path.join(__dirname, path.sep + 'config.json');
let fileConfig = { serverRuntimeConfig: { backend: {} }, publicRuntimeConfig: { backend: {} } };
if (fs.existsSync(configPath)) {
  fileConfig = JSON.parse(fs.readFileSync(configPath).toString('utf-8'));
}
const srv = (fileConfig.serverRuntimeConfig && fileConfig.serverRuntimeConfig.backend) || {};
const pub = (fileConfig.publicRuntimeConfig && fileConfig.publicRuntimeConfig.backend) || {};

// Only fill a var from config.json when it is not already set in the real environment.
const setIfUnset = (key, value) => {
  if (process.env[key] === undefined && value !== undefined && value !== null) {
    process.env[key] = typeof value === 'string' ? value : String(value);
  }
};

// Public config — referenced as `process.env.NEXT_PUBLIC_*` in lib/config.js, so Next
// inlines these into the client bundle at build time. Setting them here (after Next has
// loaded .env files and before compilation) makes them available to that inlining pass.
setIfUnset('NEXT_PUBLIC_BASE_URL', pub.baseUrl);
setIfUnset('NEXT_PUBLIC_API_FORMAT', pub.apiFormat);
setIfUnset('NEXT_PUBLIC_PROXY_ENABLED', pub.proxyEnabled === false ? 'false' : 'true');
setIfUnset('NEXT_PUBLIC_FLAGS', JSON.stringify(pub.flags || {}));

// Server-only secrets — never NEXT_PUBLIC_, never referenced client-side, so they stay
// on the server process and are not inlined into the browser bundle.
setIfUnset('BACKEND_CSRF_KEY', srv.csrfKey);
setIfUnset('BACKEND_AUTHORIZATION', srv.authorization);
setIfUnset('BACKEND_AUTHORIZATION_HEADER', srv.authorizationHeader);

module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/catalog.aspx',
        destination: '/catalog',
        permanent: true,
      },
      /*
      {
        source: '/catalog/:id/:name',
        destination: '/redirect-item?id=:id',
        permanent: false,
      },
       */
      {
        source: '/groups/:id/:name',
        destination: '/My/Groups.aspx?gid=:id',
        permanent: false,
      },
    ]
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    return config
  },
}
