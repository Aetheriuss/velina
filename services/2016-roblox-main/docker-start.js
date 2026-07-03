// docker-start.js — container entrypoint for the standalone build.
//
// `next start` re-executes next.config.js at startup, which maps the gitignored
// config.json onto process.env (BACKEND_* secrets + NEXT_PUBLIC_* fallbacks). The
// standalone server.js does NOT load next.config.js, so replicate that mapping here
// before booting it. Keep the setIfUnset semantics: real environment variables win
// over config.json, so an env-only deployment still works.
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const srv = (fileConfig.serverRuntimeConfig && fileConfig.serverRuntimeConfig.backend) || {};
  const pub = (fileConfig.publicRuntimeConfig && fileConfig.publicRuntimeConfig.backend) || {};

  const setIfUnset = (key, value) => {
    if (process.env[key] === undefined && value !== undefined && value !== null) {
      process.env[key] = typeof value === 'string' ? value : String(value);
    }
  };

  // NEXT_PUBLIC_* are already inlined into the bundles at build time; setting them here
  // is defense-in-depth for any server code path that reads process.env directly.
  setIfUnset('NEXT_PUBLIC_BASE_URL', pub.baseUrl);
  setIfUnset('NEXT_PUBLIC_API_FORMAT', pub.apiFormat);
  setIfUnset('NEXT_PUBLIC_PROXY_ENABLED', pub.proxyEnabled === false ? 'false' : 'true');
  setIfUnset('NEXT_PUBLIC_FLAGS', JSON.stringify(pub.flags || {}));

  setIfUnset('BACKEND_CSRF_KEY', srv.csrfKey);
  setIfUnset('BACKEND_AUTHORIZATION', srv.authorization);
  setIfUnset('BACKEND_AUTHORIZATION_HEADER', srv.authorizationHeader);
}

require('./server.js');
