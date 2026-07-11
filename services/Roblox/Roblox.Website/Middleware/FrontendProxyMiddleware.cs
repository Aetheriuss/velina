using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Net.Http.Headers;
using Roblox.Logging;
using Roblox.Models.Sessions;
using Roblox.Models.Users;
using Roblox.Services;
using Roblox.Website.Lib;
using ServiceProvider = Microsoft.Extensions.DependencyInjection.ServiceProvider;

namespace Roblox.Website.Middleware;

public class FrontendProxyMiddleware
{
    private RequestDelegate _next;

    public FrontendProxyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public static List<string> BypassUrls = new()
    {
        "/apisite/",
        "/swagger/",
        "/api/",
        "/api/economy-chat/",
        // Razor Files
        "/feeds/getuserfeed",
        // Auth: the /auth/ catch-all was split in Phase 3. Only the endpoints that must stay on .NET
        // remain bypassed (Discord OAuth redirects, the bot-gate captcha, the staff break-glass login,
        // the support ticket form, and the ban page). Everything else under /auth/* (login CTA, signup,
        // home, tos, privacy, credits, password-reset, choose-username, account-deletion) now proxies
        // to the Next App Router. The interactive flows POST to JSON endpoints under /apisite/ instead.
        "/auth/discord/login",
        "/auth/discord/callback",
        "/auth/captcha",
        "/auth/break-glass",
        "/auth/ticket",
        // Pure server-side 302 redirects to Discord (no UI to re-skin); kept on .NET so they emit a
        // clean Location header rather than Next's JS-driven static redirect behind the caching proxy.
        "/auth/signup",
        "/auth/password-reset",
        "/membership/notapproved.aspx",
        // Razor Public
        "/unsecuredcontent/",
        // Razor - Internal. Phase 5 migrated updates/age/report-abuse/membership/place-update/
        // collectibles to the App Router (their mutations POST to /apisite/internal-forms/v1/*).
        // create-place stays on .NET (its OnPost anti-abuse validation is intentionally not ported).
        "/internal/year",
        "/internal/dev",
        "/internal/faq",
        "/internal/donate",
        "/internal/create-place",
        "/internal/contest/first-contest",
        "/auth/notapproved",
        // Admin. Phase 6 ported the Svelte admin SPA to the App Router, so `/admin` now proxies to
        // Next. Only the JSON API `/admin-api/api` stays on .NET (StaffFilter enforces access there).
        // NOTE: "/admin-api/api" must remain listed (it's a prefix-superset issue-free entry); the
        // "/admin" catch-all was removed so /admin/* reaches Next.
        "/admin-api/api",
        // Web
        "/thumbs/avatar.ashx",
        "/thumbs/avatar-headshot.ashx",
        "/thumbs/asset.ashx",
        "/user-sponsorship/",
        "/users/inventory/list-json",
        "/users/favorites/list-json",
        "/userads/redirect",
        "/users/profile/robloxcollections-json",
        "/asset/toggle-profile",
        "/comments/get-json",
        "/comments/post",
        "/usercheck/show-tos",
        "/search/users/results",
        "/users/set-builders-club",
        // Web - Game
        "/game/get-join-script",
        "/game/placelauncher.ashx",
        "/placelauncher.ashx",
        "/game/join.ashx",
        "/game/validate-machine",
        "/game/validateticket.ashx",
        "/game/get-join-script-debug",
        "/games/getgameinstancesjson",
        "/develop/upload",
        // gs
        "/gs/activity",
        "/gs/ping",
        "/gs/delete",
        "/gs/shutdown",
        "/gs/players/report",
        "/gs/a",
        "/api/moderation/filtertext",
        // hubs
        "/chat",
        "/chat/negotiate",
    };

    private static HttpClient _httpClient { get; set; } = new(new HttpClientHandler()
    {
        AllowAutoRedirect = false,
    });

    private static Uri? _frontendBaseUri;
    private static Uri FrontendBaseUri => _frontendBaseUri ??= new Uri(Roblox.Configuration.FrontendBaseUrl);

    private async Task<HttpResponseMessage> ProxyRequestAsync(string url)
    {
        // url is always a path+query (GetEncodedPathAndQuery), so it resolves against the
        // configured frontend authority. The Authority check is defense-in-depth against
        // anything that could turn it into an absolute URL pointing elsewhere.
        var safeUrl = new Uri(FrontendBaseUri, url);
        if (safeUrl.Authority != FrontendBaseUri.Authority || safeUrl.Scheme != FrontendBaseUri.Scheme)
            throw new ArgumentException("Unsafe Url: " + url);

        var result = await _httpClient.GetAsync(safeUrl);
        return result;
    }

    public async Task HandleProxyResult(string url, string? contentType, int statusCode, string? locationHeader, HttpContext ctx)
    {
        var frontendTimer = new MiddlewareTimer(ctx, "FProxy");
        ctx.Response.ContentType = contentType ?? "text/html";
        ctx.Response.StatusCode = statusCode;
        // required for redirects
        if (locationHeader != null)
        {
            ctx.Response.Headers["location"] = locationHeader;
        }
        // cache _next stuff
#if RELEASE
        if (url.StartsWith("/_next/") && statusCode == 200)
        {
            ctx.Response.Headers.CacheControl = new CacheControlHeaderValue()
            {
                MaxAge = TimeSpan.FromDays(30),
                Public = true,
            }.ToString();
        }
#endif
        // tell cloudflare to STOP CACHING 404 ERRORS ON NEW NEXTJS FILES!!!!!
        if (statusCode == 404 || (statusCode > 499 && statusCode < 599))
        {
            ctx.Response.Headers.CacheControl = new CacheControlHeaderValue()
            {
                MaxAge = TimeSpan.Zero,
                Public = true,
                NoCache = true,
                MustRevalidate = true,
            }.ToString();
        }
        frontendTimer.Stop();
    }

    private record CachedPage(string? ContentType, string Body, string? Location, int StatusCode, DateTime CachedAt);

    private static Dictionary<string, CachedPage> pageCache { get; set; } = new();
    private static Mutex pageCacheMux { get; set; } = new();

    // Entries must expire or a frontend redeploy leaves whatever was cached pre-deploy frozen at
    // the old build (old HTML referencing deleted /_next chunks → unstyled, never-hydrating pages).
    // Hashed /_next/static assets are immutable so they can live long; documents converge fast.
    private static TimeSpan GetCacheTtl(string url) =>
        url.StartsWith("/_next/static/") ? TimeSpan.FromHours(24) : TimeSpan.FromSeconds(60);

    private CachedPage? GetPageFromCache(string url)
    {
        pageCacheMux.WaitOne();
        try
        {
            if (pageCache.TryGetValue(url, out var value))
            {
                if (DateTime.UtcNow - value.CachedAt < GetCacheTtl(url))
                    return value;
                pageCache.Remove(url);
            }
            return null;
        }
        finally
        {
            pageCacheMux.ReleaseMutex();
        }
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        var requestUrl = ctx.Request.GetEncodedPathAndQuery();
        foreach (var item in BypassUrls)
        {
            if (requestUrl.ToLower().StartsWith(item))
            {
                await _next(ctx);
                return;
            }
        }
#if RELEASE
        var cached = GetPageFromCache(requestUrl);
        if (cached != null)
        {
            ctx.Response.Headers.Add("x-cache-dbg", "f-2016; memv2;");
            await HandleProxyResult(requestUrl, cached.ContentType, cached.StatusCode, cached.Location, ctx);
            await ctx.Response.WriteAsync(cached.Body);
            return;
        }
#endif
        var result = await ProxyRequestAsync(requestUrl);
        var str = await result.Content.ReadAsStreamAsync();
        // First, copy to memory
        var mem = new MemoryStream();
        await str.CopyToAsync(mem);
        mem.Position = 0;
        // Make a string
        var cacheStr = await new StreamReader(mem).ReadToEndAsync();
        mem.Position = 0;
        var contentType = result.Content.Headers.ContentType?.ToString();
        var locationHeader = result.Headers.Location?.ToString();
        var cacheable = contentType != null && result.IsSuccessStatusCode && (
                contentType.Contains("application/javascript") ||
                contentType.Contains("text/html"));
        if (cacheable)
        {
            pageCacheMux.WaitOne();
            try
            {
                if (pageCache.Count >= 1000)
                {
                    // Prune expired entries before giving up — otherwise dead entries pin the cap.
                    var now = DateTime.UtcNow;
                    foreach (var key in pageCache
                                 .Where(kv => now - kv.Value.CachedAt >= GetCacheTtl(kv.Key))
                                 .Select(kv => kv.Key).ToList())
                        pageCache.Remove(key);
                }
                if (pageCache.Count < 1000)
                {
                    pageCache[requestUrl] = new CachedPage(contentType, cacheStr, locationHeader, 200, DateTime.UtcNow);
                }
                else
                {
                    Writer.Info(LogGroup.PerformanceDebugging, "2016 frontend page cache is full, not saving {0}", requestUrl);
                }
            }
            finally
            {
                pageCacheMux.ReleaseMutex();
            }
        }
        await HandleProxyResult(requestUrl, contentType, (int)result.StatusCode, locationHeader, ctx);
        await mem.CopyToAsync(ctx.Response.BodyWriter.AsStream());

    }
}