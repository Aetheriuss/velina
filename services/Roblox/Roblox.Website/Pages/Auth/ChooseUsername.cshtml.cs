using Microsoft.AspNetCore.Mvc;
using Roblox.Models.Users;
using Roblox.Website.Lib;

namespace Roblox.Website.Pages.Auth;

public class ChooseUsername : RobloxPageModel
{
    [BindProperty]
    public string? username { get; set; }
    public string? suggestedUsername { get; set; }
    public string? errorMessage { get; set; }

    private DiscordPendingSignup? ReadPending()
        => DiscordOAuth.ReadPending(Request.Cookies[DiscordLogin.PendingCookie]);

    public IActionResult OnGet()
    {
        var pending = ReadPending();
        if (pending == null)
            return Redirect("/auth/discord/login"); // expired / not in a Discord signup flow
        suggestedUsername = pending.suggestedUsername;
        return Page();
    }

    public async Task<IActionResult> OnPost()
    {
        var pending = ReadPending();
        if (pending == null)
            return Redirect("/auth/discord/login");
        suggestedUsername = pending.suggestedUsername;

        // If this Discord id already got an account (double-submit / race), just log in.
        var alreadyLinked = await services.users.GetUserIdFromDiscordId(pending.discordId);
        if (alreadyLinked != 0)
        {
            Response.Cookies.Delete(DiscordLogin.PendingCookie);
            await CreateSessionAndSetCookie(alreadyLinked);
            return Redirect("/home");
        }

        if (string.IsNullOrWhiteSpace(username) || !await services.users.IsUsernameValid(username))
        {
            errorMessage = "Invalid username. It must start and end with an alpha-numeric character, be between 3 and 21 characters, and contain at most one special character (space, period, or underscore). Some words are not allowed.";
            return Page();
        }
        if (!await services.users.IsNameAvailableForSignup(username))
        {
            errorMessage = "That username is already taken. Please choose another.";
            return Page();
        }

        long createdUserId;
        try
        {
            // No usable password: Discord is the only login for this account. The owner break-glass is
            // a separate, pre-provisioned account. The random value just satisfies the password column.
            var unusablePassword = Roblox.Libraries.CryptoRandom.TokenUrlSafe(48);
            var created = await services.users.CreateUser(username, unusablePassword, Gender.Unknown, null, pending.discordId);
            createdUserId = created.userId;
        }
        catch (Exception)
        {
            // Most likely a race on the username unique check.
            errorMessage = "That username is already taken. Please choose another.";
            return Page();
        }

        Response.Cookies.Delete(DiscordLogin.PendingCookie);
        await CreateSessionAndSetCookie(createdUserId);
        return Redirect("/home");
    }
}
