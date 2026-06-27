using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Roblox.Website.Lib;

namespace Roblox.Website.Pages.Auth;

public class DiscordCallback : RobloxPageModel
{
    public string? errorMessage { get; set; }

    public async Task<IActionResult> OnGet(string? code, string? state, string? error)
    {
        if (!DiscordOAuth.IsConfigured)
            return new ContentResult { StatusCode = 503, Content = "Discord login is not configured on this server." };

        // The user denied authorization, or Discord returned an error.
        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
        {
            errorMessage = "Discord sign-in was cancelled or failed. Please try again.";
            return Page();
        }

        // CSRF: state must match the cookie we set in /auth/discord/login (constant-time compare).
        var stateCookie = Request.Cookies[DiscordLogin.StateCookie];
        Response.Cookies.Delete(DiscordLogin.StateCookie);
        if (string.IsNullOrEmpty(stateCookie) ||
            !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(state), Encoding.UTF8.GetBytes(stateCookie)))
        {
            errorMessage = "Your sign-in session expired. Please try again.";
            return Page();
        }

        var discordUser = await DiscordOAuth.ExchangeCodeForUserAsync(code);
        if (discordUser == null)
        {
            errorMessage = "Could not verify your Discord account. Please try again.";
            return Page();
        }

        // Existing account → log straight in.
        var existingUserId = await services.users.GetUserIdFromDiscordId(discordUser.id);
        if (existingUserId != 0)
        {
            await CreateSessionAndSetCookie(existingUserId);
            return Redirect("/home");
        }

        // New Discord user → carry the (signed) discord id to the one-time username picker.
        var pending = DiscordOAuth.SignPending(discordUser.id, discordUser.username);
        Response.Cookies.Append(DiscordLogin.PendingCookie, pending, DiscordLogin.OauthCookie());
        return Redirect("/auth/choose-username");
    }
}
