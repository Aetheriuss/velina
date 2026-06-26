using Roblox.Website.Lib;

namespace Roblox.Website.Middleware;

/// <summary>
/// Runs first in the pipeline (before ForwardedHeaders / routing) and neutralizes
/// inbound headers that a client must never be allowed to set:
///
///  - <c>x-middleware-subrequest</c> — mitigation for Next.js CVE-2025-29927
///    (middleware auth bypass). The frontend never legitimately receives this from
///    an external client, so we always strip it (security finding C4 / P0-5).
///
///  - <c>cf-connecting-ip</c> — Cloudflare's real-client-IP header. It is only
///    trustworthy when the request actually arrived through our tunnel ingress,
///    i.e. the socket peer is the <c>cloudflared</c> container on a trusted internal
///    network. From any other peer it is spoofable and would let an attacker forge
///    a fresh IP per request, defeating all IP rate-limiting / abuse detection
///    (security finding H3 / P0-7). We strip it from untrusted peers and record the
///    trust decision for <see cref="Controllers.ControllerBase.GetRequesterIpRaw"/>.
/// </summary>
public class SpoofableHeaderGuardMiddleware
{
    /// <summary>HttpContext.Items key holding a bool: was the socket peer a trusted proxy?</summary>
    public const string TrustedPeerItemKey = "Roblox.TrustedProxyPeer";

    private readonly RequestDelegate _next;

    public SpoofableHeaderGuardMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        ctx.Request.Headers.Remove("x-middleware-subrequest");

        var trusted = TrustedProxy.IsTrusted(ctx.Connection.RemoteIpAddress);
        ctx.Items[TrustedPeerItemKey] = trusted;
        if (!trusted)
        {
            ctx.Request.Headers.Remove("cf-connecting-ip");
        }

        await _next(ctx);
    }
}
