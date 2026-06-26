using Microsoft.AspNetCore.Http;

namespace Roblox.Website.Lib;

/// <summary>
/// Single source of truth for the session (.ROBLOSECURITY) cookie attributes, so every login
/// path sets them identically: HttpOnly (not readable from JS) + Secure (HTTPS only).
/// Previously the Razor login/signup pages omitted HttpOnly while the v2 controller set it,
/// yielding a JS-readable 364-day session cookie from a web-form login (security finding H10).
/// </summary>
public static class SessionCookie
{
    public static void Append(HttpResponse response, string value)
    {
        response.Cookies.Append(Roblox.Website.Middleware.SessionMiddleware.CookieName, value, new CookieOptions
        {
            Secure = true,
            HttpOnly = true,
            Expires = DateTimeOffset.Now.Add(TimeSpan.FromDays(364)),
            IsEssential = true,
            Path = "/",
            SameSite = SameSiteMode.Lax,
        });
    }
}
