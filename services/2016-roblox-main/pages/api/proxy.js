import axios from 'axios';
import getConfig from 'next/config';
import { getBaseUrl } from '../../lib/request';

// The proxy may ONLY forward to the exact configured origin (protocol + host:port).
// This is the SSRF lockdown (security finding H6): the previous check compared only the
// registrable domain, ignoring scheme (file://, gopher://), port, userinfo (user:pass@),
// and allowing arbitrary subdomains. Exact-origin matching blocks all of those, plus IP
// literals and private/loopback targets (none of which equal our public host).
const getAllowedOrigin = () => {
  try {
    const u = new URL(getBaseUrl());
    return { protocol: u.protocol, host: u.host, hostname: u.hostname };
  } catch (e) {
    return null;
  }
};
const allowedOrigin = getAllowedOrigin();
const siteHostname = allowedOrigin ? allowedOrigin.hostname : '';

const UrlUtilities = (() => {
  return {
    isSafe: (rawUrl) => {
      if (typeof rawUrl !== 'string' || !allowedOrigin) return false;
      let parsed;
      try { parsed = new URL(rawUrl); } catch (e) { return false; }
      if (parsed.protocol !== allowedOrigin.protocol) return false;      // blocks file:/gopher:/http-vs-https
      if (parsed.host !== allowedOrigin.host) return false;              // exact host:port — blocks other hosts, IPs, subdomains
      if (parsed.username !== '' || parsed.password !== '') return false; // blocks user:pass@ confusion
      return true;
    },
  }
})();

const actualHandler = async (req, res) => {
  const fullUrl = req.query.url;
  // Right now we just validate the URL. 
  // A safer approach might be to just send the parts of the URL (query params, path, api site) to this handler, then construct the correct URL here.
  const isUrlSafe = UrlUtilities.isSafe(fullUrl);// typeof fullUrl === 'string' && fullUrl.toLowerCase().startsWith(getBaseUrl())

  if (getConfig().publicRuntimeConfig.backend.proxyEnabled !== true || !isUrlSafe) {
    return res.status(500).json({
      success: false,
    });
  }
  try {
    let requestHeaders = {
      cookie: req.headers['cookie'] || '',
      'x-csrf-token': req.headers['x-csrf-token'] || '',
      'user-agent': req.headers['user-agent'] || '',
    }
    // Forward only an explicit allowlist of client headers (security finding H6) — the previous
    // denylist loop forwarded nearly everything.
    const FORWARD_ALLOWLIST = ['content-type', 'accept', 'accept-language', 'x-csrf-token'];
    for (const key of FORWARD_ALLOWLIST) {
      if (typeof req.headers[key] !== 'undefined') {
        requestHeaders[key] = req.headers[key];
      }
    }
    // The internal authorization secret is added AFTER the destination is validated to be our own
    // origin (isSafe above), so it can never be forwarded to a user-controlled host.
    const authHeaderValue = getConfig().serverRuntimeConfig.backend.authorization;
    if (typeof authHeaderValue === 'string')
      requestHeaders[getConfig().serverRuntimeConfig.backend.authorizationHeader || 'authorization'] = authHeaderValue;
    const result = await axios.request({
      method: req.method,
      url: fullUrl,
      data: req.body,
      maxRedirects: 0,
      headers: requestHeaders,
      validateStatus: () => true,
    });
    for (const item of Object.getOwnPropertyNames(result.headers)) {
      let value = result.headers[item];
      if (item === 'set-cookie') {
        if (typeof value === 'string') {
          value = value.replace(/roblox\.com/g, siteHostname);
        } else {
          value.forEach((v, i, arr) => {
            arr[i] = v.replace(/roblox\.com/g, siteHostname);
          });
        }
      }
      res.setHeader(item, value);
    }
    res.status(result.status);
    res.send(result.data);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false
    })
    res.end();
  }
}

export default function handler(req, res) {
  return new Promise((resolve, reject) => {
    let chunks = []
    req.on('data', function (chunk) {
      chunks.push(chunk);
    })
    req.on('end', function () {
      req.body = Buffer.concat(chunks);
      actualHandler(req, res).then(() => resolve()).catch(e => reject(e));
    })
  })

}

export const config = {
  api: {
    bodyParser: false,
  },
}

export {
  UrlUtilities,
}