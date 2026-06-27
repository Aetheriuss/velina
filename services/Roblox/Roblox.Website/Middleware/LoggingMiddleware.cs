using System.Diagnostics;
using Microsoft.AspNetCore.Http.Extensions;
using Roblox.Website.Lib;

namespace Roblox.Website.Middleware;

public class RobloxLoggingMiddleware
{
    private RequestDelegate _next;
    public RobloxLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }
    
    public async Task InvokeAsync(HttpContext ctx)
    {
        var watch = new Stopwatch();
        watch.Start();
        await _next(ctx);
        watch.Stop();

        // M20: log the path only, never the query string — it can carry tokens/secrets (e.g. reset
        // tokens, game-join tickets, the game-server token in WS URLs).
        var str = $"[{ctx.Request.Method.ToUpper()}] {ctx.Request.Path} - {watch.ElapsedMilliseconds}ms";
        Console.WriteLine(str);
    }
}

public static class RobloxLoggingMiddlewareExtensions
{
    public static IApplicationBuilder UseRobloxLoggingMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RobloxLoggingMiddleware>();
    }
}