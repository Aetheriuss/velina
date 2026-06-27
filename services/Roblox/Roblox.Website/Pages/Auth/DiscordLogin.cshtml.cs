using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Roblox.Website.Lib;

namespace Roblox.Website.Pages.Auth;

public class DiscordLogin : RobloxPageModel
{
    public const string StateCookie = "es_discord_state";
    public const string PendingCookie = "es_discord_pending";

    // Short-lived, HttpOnly, Secure, SameSite=Lax so it survives the top-level redirect back from Discord.
    public static CookieOptions OauthCookie() => new()
    {
        Secure = true,
        HttpOnly = true,
        IsEssential = true,
        Path = "/",
        SameSite = SameSiteMode.Lax,
        MaxAge = TimeSpan.FromMinutes(10),
    };

    public IActionResult OnGet()
    {
        if (!DiscordOAuth.IsConfigured)
            return new ContentResult { StatusCode = 503, Content = "Discord login is not configured on this server." };
        // CSRF: random state echoed back by Discord and compared against this cookie in the callback.
        var state = Roblox.Libraries.CryptoRandom.TokenUrlSafe(32);
        Response.Cookies.Append(StateCookie, state, OauthCookie());
        return Redirect(DiscordOAuth.BuildAuthorizeUrl(state));
    }
}
