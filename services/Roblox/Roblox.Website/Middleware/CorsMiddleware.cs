using Microsoft.AspNetCore.Http.Extensions;

namespace Roblox.Website.Middleware;

public class RobloxPlayerCorsMiddleware
{
    private RequestDelegate _next;
    public RobloxPlayerCorsMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    // Host (authority) of the public site, derived from configured BaseUrl (e.g. "velina.lol").
    private static string? SiteHost
    {
        get
        {
            try { return new Uri(Roblox.Configuration.BaseUrl).Authority; }
            catch { return null; }
        }
    }

    // CDN origin (scheme://host) if a CdnBaseUrl is configured, else null.
    private static string? CdnOrigin
    {
        get
        {
            var cdn = Roblox.Configuration.CdnBaseUrl;
            if (string.IsNullOrWhiteSpace(cdn)) return null;
            try { var u = new Uri(cdn); return u.GetLeftPart(UriPartial.Authority); }
            catch { return null; }
        }
    }

    private string GenerateCspHeader(bool isAuthenticated)
    {
        var host = SiteHost;
        var cdn = CdnOrigin;

        // hCaptcha is required for the captcha widget; the site's own wss origin carries SignalR chat.
        var connectSrc = "'self' https://hcaptcha.com https://*.hcaptcha.com";
        if (host != null)
            connectSrc += " wss://" + host;
        if (cdn != null)
            connectSrc += " " + cdn;
#if DEBUG
        connectSrc += " ws://localhost:* http://localhost:*";
#endif

        // Images: self + inline data URIs, plus the CDN when configured.
        var imgSrc = "'self' data:";
        if (cdn != null)
            imgSrc += " " + cdn;

        // unsafe-eval is required by Next.js; bootstrap JS is loaded from jsDelivr.
        var scriptSrc =
            "'unsafe-eval' 'self' https://hcaptcha.com https://*.hcaptcha.com https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js";

        return "default-src 'self'; img-src " + imgSrc + "; child-src 'self'; script-src " + scriptSrc + "; frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com https://hcaptcha.com https://*.hcaptcha.com https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css; font-src 'self' fonts.gstatic.com; connect-src " + connectSrc + "; worker-src 'self'; frame-ancestors 'self';";
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        var isAuthenticated = ctx.Items.ContainsKey(".ROBLOSECURITY");
        ctx.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
        ctx.Response.Headers["Cross-Origin-Resource-Policy"] = "cross-origin";
        ctx.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
        // X-XSS-Protection is deprecated and should be disabled; CSP is the real defense (M8/L7).
        ctx.Response.Headers["X-XSS-Protection"] = "0";
        ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        ctx.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
        ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
        ctx.Response.Headers["Content-Security-Policy"] = GenerateCspHeader(isAuthenticated);
        await _next(ctx);
    }
}

public static class RobloxPlayerCorsMiddlewareExtensions
{
    public static IApplicationBuilder UseRobloxPlayerCorsMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RobloxPlayerCorsMiddleware>();
    }
}
