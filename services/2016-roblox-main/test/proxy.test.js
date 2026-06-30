import { expect } from "chai";
// Config now flows through lib/config (env-backed) rather than next/config, and both
// pages/api/proxy.js and its dep lib/request.js read getBaseUrl() from it.
jest.mock('../lib/config', () => ({
  __esModule: true,
  default: {
    serverRuntimeConfig: { backend: {} },
    publicRuntimeConfig: {
      backend: {
        baseUrl: 'https://www.roblox.com',
        apiFormat: 'https://www.roblox.com/apisite/{0}{1}',
        proxyEnabled: true,
        flags: {},
      }
    }
  }
}));

import { UrlUtilities } from "../pages/api/proxy";

describe('UrlUtilities.IsSafe()', () => {
  it('must return that a valid URL is safe', () => {
    const result = UrlUtilities.isSafe('https://www.roblox.com/test/goodUrl');
    expect(result).eq(true);
  });
  it('must return that a valid uppercase URL is safe', () => {
    const result = UrlUtilities.isSafe(('https://www.roblox.com/test/goodUrl').toUpperCase());
    expect(result).eq(true);
  });
  it('must return that a DIFFERENT subdomain is NOT safe (P1-5 exact-host lockdown)', () => {
    // The SSRF lockdown (H6/P1-5) matches the exact origin host, not just the registrable domain,
    // so even a sibling subdomain of the configured host must be rejected.
    const result = UrlUtilities.isSafe('https://api.roblox.com/test/goodUrl');
    expect(result).eq(false);
  });
  it('must return that a similar but invalid url is NOT safe', () => {
    for (const item of ['https://www.robloxlabs.com/test/badUrl', 'https://www.roblox.co/test/badUrl', 'https://www.roblox-com.com/test/badUrl']) {
      const result = UrlUtilities.isSafe(item);
      expect(result).eq(false);
    }
  });
});