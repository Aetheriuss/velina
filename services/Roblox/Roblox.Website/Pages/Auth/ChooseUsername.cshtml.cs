using Microsoft.AspNetCore.Mvc;
using Roblox.Models.Users;
using Roblox.Website.Lib;

namespace Roblox.Website.Pages.Auth;

public class ChooseUsername : RobloxPageModel
{
    [BindProperty]
    public string? username { get; set; }
    [BindProperty]
    public string? password { get; set; }
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

        // The password is optional. If the user sets one they can also log in with username + password
        // (in addition to Discord); if they leave it blank we store a random unusable value so Discord
        // stays the only way into the account.
        string accountPassword;
        if (!string.IsNullOrEmpty(password))
        {
            if (!services.users.IsPasswordValid(password))
            {
                errorMessage = "That password is too short. It must be at least 3 characters, or leave it blank to sign in with Discord only.";
                return Page();
            }
            accountPassword = password;
        }
        else
        {
            accountPassword = Roblox.Libraries.CryptoRandom.TokenUrlSafe(48);
        }

        long createdUserId;
        try
        {
            var created = await services.users.CreateUser(username, accountPassword, Gender.Unknown, null, pending.discordId);
            createdUserId = created.userId;
        }
        catch (Exception e)
        {
            // Only report "taken" if the name actually became unavailable (a race on the unique check);
            // otherwise surface a real error instead of silently mislabelling every failure as "taken".
            if (!await services.users.IsNameAvailableForSignup(username))
            {
                errorMessage = "That username is already taken. Please choose another.";
                return Page();
            }
            Roblox.Logging.Writer.Info(Roblox.Logging.LogGroup.SignUp, "Discord signup CreateUser failed: {0}", e.Message);
            errorMessage = "Something went wrong creating your account. Please try again.";
            return Page();
        }

        Response.Cookies.Delete(DiscordLogin.PendingCookie);
        await CreateSessionAndSetCookie(createdUserId);
        return Redirect("/home");
    }
}
