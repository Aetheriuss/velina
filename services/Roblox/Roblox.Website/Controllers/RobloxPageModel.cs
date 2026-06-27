using Microsoft.AspNetCore.Mvc.RazorPages;
using Roblox.Models.Sessions;
using Roblox.Website.Controllers;

namespace Roblox.Website.Pages;

public class RobloxPageModel : PageModel
{
    protected ControllerServices services { get; } = new();
    public Roblox.Models.Sessions.UserSession? userSession
    {
        get
        {
            var dict = HttpContext.Items;
            if (dict.ContainsKey(Roblox.Website.Middleware.SessionMiddleware.CookieName))
                return (UserSession?)dict[Middleware.SessionMiddleware.CookieName];

            return null;
        }
    }

    public bool isAuthenticated => userSession != null;
    protected string rawIpAddress => Roblox.Website.Controllers.ControllerBase.GetRequesterIpRaw(HttpContext);
    protected string hashedIp => Roblox.Website.Controllers.ControllerBase.GetIP(rawIpAddress);

    protected string GetIpHashWithSalt(string salt)
    {
        return Roblox.Website.Controllers.ControllerBase.GetIP(rawIpAddress, salt);
    }

    /// <summary>
    /// Create a session for the user and write the .ROBLOSECURITY cookie. Shared by every login path
    /// (Discord OAuth + the owner break-glass form) so they all set the session identically.
    /// </summary>
    protected async Task CreateSessionAndSetCookie(long userId)
    {
        var sess = await services.users.CreateSession(userId);
        var sessionCookie = Roblox.Website.Middleware.SessionMiddleware.CreateJwt(new Middleware.JwtEntry()
        {
            sessionId = sess,
            createdAt = DateTimeOffset.Now.ToUnixTimeSeconds(),
        });
        Roblox.Website.Lib.SessionCookie.Append(HttpContext.Response, sessionCookie);
    }

    public string nonce { get; set; }
}